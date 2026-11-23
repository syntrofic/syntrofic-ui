import { readFile, realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { installedAt, readJSON } from './project-discovery.mjs'

const systemPresets = {
  system: 'system-ui, -apple-system, sans-serif',
  tahoma: 'Tahoma, Verdana, sans-serif',
  verdana: 'Verdana, Tahoma, sans-serif',
  segoe: '"Segoe UI", Arial, sans-serif',
  helvetica: 'Helvetica, Arial, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  courier: '"Courier New", Courier, monospace',
  comic: '"Comic Sans MS", cursive',
}
const openPresets = {
  inter: ['Inter'], roboto: ['Roboto'], poppins: ['Poppins'], figtree: ['Figtree'], 'dm-sans': ['DM Sans'],
  manrope: ['Manrope'], 'space-grotesk': ['Space Grotesk'], 'ibm-plex-sans': ['IBM Plex Sans'],
  'ibm-plex-mono': ['IBM Plex Mono'], 'jetbrains-mono': ['JetBrains Mono'], nunito: ['Nunito'],
  'source-serif': ['Source Serif 4', 'source-serif-4'], 'mona-sans': ['Mona Sans'],
  geist: ['Geist Sans', 'geist-sans'], 'geist-mono': ['Geist Mono'],
}
const installedFamilies = new Map(Object.entries(openPresets).map(([key, [family, slug = key]]) => [family.toLowerCase(), slug]))
const systemFamilies = new Set([
  'system-ui', '-apple-system', 'sans-serif', 'serif', 'monospace', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
  'cursive', 'fantasy', 'inherit', 'initial', 'unset', 'revert', 'revert-layer',
  'arial', 'helvetica', 'segoe ui', 'verdana', 'tahoma', 'times new roman', 'georgia', 'courier new', 'courier',
  'sf mono', 'menlo', 'consolas', 'comic sans ms', 'syntrofic sans', 'arimo variable', 'noto sans sc variable',
])
export const themeFontPresets = [...Object.keys(systemPresets), ...Object.keys(openPresets), 'rounded']

export function themeFontStack(value) {
  const key = value.trim().toLowerCase()
  if (Object.hasOwn(systemPresets, key)) return systemPresets[key]
  const open = openPresets[key === 'rounded' ? 'nunito' : key] ??
    Object.values(openPresets).find(([family]) => family.toLowerCase() === key)
  if (!Array.isArray(open)) return value
  const [family] = open
  const generic = /Mono/.test(family) ? 'ui-monospace, monospace' : /Serif/.test(family) ? 'Georgia, serif' : 'system-ui, sans-serif'
  return JSON.stringify(family) + ', ' + generic
}

function firstFamily(value) {
  if (typeof value !== 'string') return ''
  const match = /^(?:"([^"]+)"|'([^']+)'|([^,]+))/.exec(value.trim())
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim()
}

function familiesFor(theme) {
  const { tokens = {}, fonts = {} } = theme.design ?? {}
  const base = tokens['--sy-font'] ?? theme.font
  const custom = Object.values(theme.rules ?? {}).flatMap(rule => [
    rule.declarations['font-family'], rule.declarations['--sy-font'], rule.declarations['--sy-font-heading'], rule.declarations['--sy-font-code'],
  ])
  const body = tokens['--sy-font-body'] ?? fonts.body ?? base
  const heading = tokens['--sy-font-heading'] ?? fonts.heading ?? base
  const code = tokens['--sy-font-code'] ?? fonts.code
  return [body, heading, code, ...custom].map(firstFamily).filter(Boolean)
}

function installCommand(name, packageManager) {
  const manager = packageManager?.split('@')[0]
  if (manager === 'npm') return 'npm install ' + name
  if (manager === 'yarn' || manager === 'bun') return manager + ' add ' + name
  return 'pnpm add ' + name
}

async function optional(path) {
  try { return await readFile(path, 'utf8') }
  catch (error) { if (error.code !== 'ENOENT') throw error }
}

async function fontFaces(installed, family, variable, observe) {
  const root = await realpath(installed.path)
  const names = variable ? ['index.css'] : [100, 200, 300, 400, 500, 600, 700, 800, 900].map(weight => weight + '.css')
  const files = await Promise.all(names.map(async name => {
    const path = resolve(root, name)
    const source = await optional(path)
    if (source !== undefined) observe?.(path)
    return source
  }))
  const license = await optional(resolve(root, 'LICENSE'))
  const assets = new Map()
  const safeDescriptors = new Set(['font-weight', 'font-style', 'font-stretch', 'font-display', 'unicode-range'])
  const css = await Promise.all(files.filter(Boolean).flatMap(file => [...file.matchAll(/@font-face\s*\{([^{}]+)\}/g)].map(async ([, body]) => {
    const url = /url\(\s*['"]?\.?\/?(files\/[\w.-]+\.woff2)['"]?\s*\)/i.exec(body)?.[1]
    if (!url) return ''
    if (!assets.has(url)) assets.set(url, (async () => {
      const file = resolve(root, url)
      const path = await realpath(file)
      const within = relative(root, path)
      if (isAbsolute(within) || within === '..' || within.startsWith('..' + sep)) throw new Error('Font asset is outside its package: ' + url)
      observe?.(file)
      return readFile(path, 'base64')
    })())
    const descriptors = body.split(';').flatMap(line => {
      const [key, value] = line.split(':').map(item => item.trim())
      return safeDescriptors.has(key) && /^[\w\s,+.%-]+$/.test(value ?? '') ? [key + ':' + value + ';'] : []
    })
    return '@font-face{font-family:' + JSON.stringify(family) + ';' + descriptors.join('')
      + 'src:url(data:font/woff2;base64,' + await assets.get(url) + ") format('woff2');}"
  })))
  const faces = css.filter(Boolean).join('\n')
  return faces && (license ? '/* ' + license.replaceAll('*/', '* /') + ' */\n' : '') + faces
}

export async function resolveThemeFonts(directory, themes, observe) {
  const manifest = await readJSON(resolve(directory, 'package.json'))
  const candidates = new Map()
  for (const family of themes.flatMap(familiesFor)) {
    const key = family.toLowerCase()
    if (!systemFamilies.has(key) && /^[\p{L}\p{N} .-]+$/u.test(family)) candidates.set(key, family)
  }
  const fonts = await Promise.all([...candidates].map(async ([key, family]) => {
    const known = installedFamilies.get(key)
    const slug = known ?? key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (slug) {
      for (const scope of ['@fontsource-variable', '@fontsource']) {
        const name = scope + '/' + slug
        const installed = await installedAt(directory, name)
        if (!installed) continue
        const css = await fontFaces(installed, family, scope.endsWith('-variable'), observe)
        if (css) return { css, note: { family, package: name, status: 'embedded' } }
        return { note: { family, package: name, status: 'no-font-faces' } }
      }
    }
    if (known) {
      const name = '@fontsource/' + known
      return { note: { family, package: name, status: 'missing', install: installCommand(name, manifest?.packageManager) } }
    }
    return { note: { family, status: 'external', message: 'Load this font in the app to use it across devices.' } }
  }))
  return { css: fonts.map(font => font.css).filter(Boolean).join('\n'), notes: fonts.map(font => font.note) }
}
