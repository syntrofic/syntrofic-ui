import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { readThemeOutput, writeThemeOutputs } from './theme-write.mjs'

const hexColor = /^#[\da-f]{6}$/i
const idPattern = /^[a-z][a-z\d-]*$/i
const recipes = new Set(['syntrofic-oklch-v1', 'syntrofic-oklch-v2', 'astryx-oklch-v1', 'astryx-oklch-v2'])
const modeNames = { 'light-only': ['light'], 'dark-only': ['dark'], 'light-and-dark': ['light', 'dark'] }
const dot = (row, vector) => row.reduce((sum, weight, i) => sum + weight * vector[i], 0)
export const multiply = (matrix, color) => matrix.map(row => dot(row, color))
const interpolate = (from, to, amount) => from.map((value, i) => value + (to[i] - value) * amount)
const black = [0, 0, 0]
const white = [1, 0, 0]

export function linearSRGB(hex) {
  if (!hexColor.test(hex ?? '')) throw new Error('Use six-digit hexadecimal colors')
  return hex.slice(1).match(/.{2}/g).map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
}

// D65 matrices from the Oklab reference implementation by Björn Ottosson.
export function linearSRGBToLab(rgb) {
  const lms = multiply([
    [.4122214708, .5363325363, .0514459929], [.2119034982, .6806995451, .1073969566], [.0883024619, .2817188376, .6299787005],
  ], rgb).map(Math.cbrt)
  return multiply([
    [.2104542553, .7936177850, -.0040720468], [1.9779984951, -2.4285922050, .4505937099], [.0259040371, .7827717662, -.8086757660],
  ], lms)
}
const labOf = hex => linearSRGBToLab(linearSRGB(hex))
function linearRGB(lab) {
  const lms = multiply([
    [1, .3963377774, .2158037573], [1, -.1055613458, -.0638541728], [1, -.0894841775, -1.2914855480],
  ], lab).map(value => value ** 3)
  return multiply([
    [4.0767416621, -3.3077115913, .2309699292], [-1.2684380046, 2.6097574011, -.3413193965], [-.0041960863, -.7034186147, 1.7076147010],
  ], lms)
}
export function hexOf([light, a, b]) {
  if (light <= 0 || light >= 1) return light <= 0 ? '#000000' : '#ffffff'
  let rgb = linearRGB([light, a, b])
  const inside = rgb => rgb.every(channel => channel >= -1e-6 && channel <= 1.000001)
  if (!inside(rgb)) {
    let low = 0
    let high = 1
    for (let index = 0; index < 17; index++) {
      const scale = (low + high) / 2
      if (inside(linearRGB([light, a * scale, b * scale]))) low = scale
      else high = scale
    }
    rgb = linearRGB([light, a * low, b * low])
  }
  return linearSRGBToHex(rgb)
}

export function linearSRGBToHex(rgb) {
  const srgb = channel => channel <= .0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - .055
  return '#' + rgb.map(channel => Math.round(Math.max(0, Math.min(1, srgb(channel))) * 255).toString(16).padStart(2, '0')).join('')
}
export function generatePalette(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Expected a palette request object')
  const recipe = config.recipe ?? 'syntrofic-oklch-v1'
  if (!recipes.has(recipe)) throw new Error('Unknown palette recipe: ' + recipe)
  const modes = modeNames[config.modeStrategy ?? 'light-and-dark']
  if (!Array.isArray(modes)) throw new Error('Choose light-only, dark-only or light-and-dark')
  const steps = config.stops ?? Array.from({ length: 21 }, (_, index) => index * 5)
  if (!Array.isArray(steps) || !steps.length || !steps.every(stop => Number.isFinite(stop) && stop >= 0 && stop <= 100)
    || new Set(steps).size !== steps.length) throw new Error('Choose unique numeric stops between 0 and 100')
  const vibrancy = config.vibrancy ?? 20
  if (!Number.isFinite(vibrancy) || vibrancy < 0 || vibrancy > 100) throw new Error('Vibrancy must be between 0 and 100')
  const ids = new Set()
  if (!Array.isArray(config.families) || !config.families.length) throw new Error('Provide at least one palette family')
  const families = config.families.map(family => {
    if (!family || !idPattern.test(family.id ?? '') || ids.has(family.id)) throw new Error('Each palette family needs a unique ID')
    ids.add(family.id)
    const seed = labOf(family.seed)
    const anchors = new Map()
    for (const anchor of family.anchors ?? []) {
      if (!anchor || !['light', 'dark'].includes(anchor.mode) || !steps.includes(anchor.stop)
        || !['exact', 'bounded', 'flexible'].includes(anchor.policy)) throw new Error('Invalid palette anchor in ' + family.id)
      const key = anchor.mode + ':' + anchor.stop
      if (anchors.has(key) || anchor.policy === 'bounded' && (!Number.isFinite(anchor.maxDeltaE) || anchor.maxDeltaE < 0)) {
        throw new Error('Invalid or duplicate palette anchor in ' + family.id)
      }
      anchors.set(key, { ...anchor, lab: labOf(anchor.color) })
    }
    const byMode = Object.fromEntries(modes.map(mode => [mode, steps.map(stop => {
      const anchor = anchors.get(mode + ':' + stop)
      if (anchor?.policy === 'exact') return { stop, color: anchor.color.toLowerCase() }
      const base = stop <= 50 ? interpolate(black, seed, stop / 50) : interpolate(seed, white, (stop - 50) / 50)
      if (recipe.endsWith('v2') && stop !== 50) {
        const scale = 1 + vibrancy / 100 * Math.sin(stop / 100 * Math.PI) * Math.abs(stop - 50) / 50 * (mode === 'dark' ? .85 : 1)
        base[1] *= scale
        base[2] *= scale
      }
      if (!anchor) return { stop, color: hexOf(base) }
      if (anchor.policy === 'flexible') return { stop, color: hexOf(interpolate(base, anchor.lab, .45)) }
      const delta = Math.hypot(...base.map((value, index) => value - anchor.lab[index]))
      const color = hexOf(interpolate(anchor.lab, base, delta ? Math.min(1, anchor.maxDeltaE / delta) : 0))
      const rounded = labOf(color)
      return { stop, color: Math.hypot(...rounded.map((value, index) => value - anchor.lab[index])) <= anchor.maxDeltaE ? color : anchor.color.toLowerCase() }
    })]))
    return { id: family.id, name: typeof family.name === 'string' ? family.name : family.id, seed: family.seed.toLowerCase(), modes: byMode }
  })
  return { recipe, stops: steps, modes, black: '#000000', white: '#ffffff', families }
}
const json = data => JSON.stringify(data, null, 2) + '\n'
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
function previewFor(result) {
  const groups = result.families.flatMap(family => Object.entries(family.modes).map(([mode, colors]) =>
    '<section><h2>' + escape(family.name) + ' · ' + mode + '</h2><ul>' + colors.map(({ stop, color }) =>
      '<li><i style="background-color:' + color + '"></i><strong>' + stop + '</strong><code>' + color + '</code></li>').join('') + '</ul></section>'))
  return '<!doctype html>\n<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Syntrofic 配色预览</title><style>body{font:16px/1.55 system-ui;background:#fff;color:#17251e;max-width:76rem;margin:auto;padding:2rem}h2{font-size:1rem}ul{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:.5rem;padding:0}i{display:block;height:3rem;border-radius:.5rem;border:1px solid #e1e7e0}strong,code{display:block}</style>'
    + '<main><h1>Syntrofic 配色预览</h1>' + groups.join('\n') + '</main></html>\n'
}
export async function generateThemePalette(directory, file, options) {
  const request = await readFile(resolve(directory, file), 'utf8')
  const palette = generatePalette(JSON.parse(request))
  const { out, preview, overwrite } = options
  if (out && !['.ts', '.json'].includes(extname(out))) throw new Error('Palette output must be a .ts or .json file')
  if (preview && extname(preview) !== '.html') throw new Error('Palette preview must be an .html file')
  const receipt = out && out.slice(0, -extname(out).length) + '.receipt.json'
  const outputs = [out, receipt, preview].filter(Boolean)
  const paths = outputs.map(path => resolve(directory, path))
  if (new Set(paths).size !== paths.length || paths.includes(resolve(directory, file))) throw new Error('Choose distinct palette output paths')
  const prior = await Promise.all(paths.map(path => readThemeOutput(path)))
  const written = Boolean(outputs.length && !options['dry-run'] && (overwrite || prior.every(value => value === undefined)))
  const data = { recipe: palette.recipe, modes: palette.modes, stopCount: palette.stops.length, output: out, receipt, preview, written, palette }
  if (written) {
    const files = {}
    if (out) {
      files[out] = extname(out) === '.ts' ? 'export const palette = ' + json(palette).trimEnd() + ' as const\n' : json(palette)
      files[receipt] = json({ version: 1, recipe: palette.recipe, source: file, sha256: createHash('sha256').update(request).digest('hex') })
    }
    if (preview) files[preview] = previewFor(palette)
    await writeThemeOutputs(directory, outputs.map((file, index) => ({ file, expected: files[file], previous: prior[index] })))
  }
  return { type: 'theme.palette.generate', data }
}
