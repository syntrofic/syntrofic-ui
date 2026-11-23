import { readFile } from 'node:fs/promises'
import { themeConditions, themeStateIncludes } from './theme-editor.mjs'
import { documentFor, measureThemeAppearances } from './theme-part-report.mjs'
import { withThemeBrowser } from './theme-pictures.mjs'
import { boxShadowLayers, measuredStyleDifferences, styleSampleKey, writeMeasuredStyleRules } from './theme-measured-style.mjs'

const shadow = 'box-shadow'
const noEffect = () => Object.assign(new Error('The selected shadows already have the requested strength.'), { code: 'ERR_THEME_NO_EFFECT' })
// SButton uses a viewport-sized inset layer for its press fill.
const pressFill = /(?:^|\s)0px 0px 0px \d{3,}(?:\.\d+)?px inset$/
const transparentRing = /^rgba\(0, 0, 0, 0\) 0px 0px 0px [\d.]+px inset$/

function adjustLayer(layer, { factor, alpha: absolute }) {
  const color = /([a-z]+)\(([^()]*)\)/i.exec(layer)
  if (!color) throw new Error('Cannot adjust the computed shadow color in ' + layer)
  const [, name, channels] = color
  const rgb = /^rgba?$/.test(name)
  const [body, slashAlpha] = channels.split(/\s*\/\s*/)
  const values = body.split(/,\s*/)
  const alpha = rgb && values.length === 4 ? values.pop() : slashAlpha ?? '1'
  const current = parseFloat(alpha) / (alpha.endsWith('%') ? 100 : 1)
  if (!Number.isFinite(current)) throw new Error('Cannot adjust the computed shadow opacity in ' + layer)
  const opacity = Number(Math.min(1, absolute ?? current * factor).toFixed(rgb && values.length === 3 ? 3 : 5))
  const adjusted = rgb && values.length === 3
    ? opacity === 1 ? `rgb(${values.join(', ')})` : `rgba(${values.join(', ')}, ${opacity})`
    : `${name}(${body}${opacity === 1 ? '' : ' / ' + opacity})`
  return layer.replace(color[0], adjusted)
}

function adjustShadow(value, adjustment, part, field) {
  if (value === 'none' || adjustment.factor === 1) return value
  const parts = boxShadowLayers(value)
  const keepPress = part && /^button(?:-(?:primary|secondary|ghost|danger))?$/.test(part) && pressFill.test(parts[0])
  const keepFirst = keepPress || field && transparentRing.test(parts[0])
  if (adjustment.factor === 0) return keepFirst ? parts[0] : 'none'
  return parts.map((layer, index) => index === 0 && keepFirst ? layer : adjustLayer(layer, adjustment)).join(', ')
}

async function editFieldHoverRing(library, theme, { part, when, adjustment, before, measure, patch, effective }) {
  const token = library.brandFieldHoverRingToken
  const cases = before.filter(sample => sample.state === 'hover')
  const readsRing = sample => sample.values[token] && sample.values[shadow].startsWith(sample.values[token] + ' 0px 0px 0px ')
  if (!cases.length || !cases.every(readsRing)) return
  const adjustColor = sample => adjustLayer(sample.values[token], adjustment)
  const desired = new Map(cases.map(sample => [styleSampleKey(sample), {
    ...sample, values: { [token]: adjustColor(sample) },
  }]))
  const pending = measuredStyleDifferences(desired, cases, [token])
  if (!pending.length) throw noEffect()
  const rules = new Map()
  writeMeasuredStyleRules(library, theme, { part, to: when, properties: [token] }, desired, pending, rules, false)
  const edits = [...rules.values()]
  const result = patch(edits)
  const expected = new Map(before.map(sample => [styleSampleKey(sample), { ...sample, values: {
    [shadow]: ['hover', 'active'].includes(sample.state) && readsRing(sample)
      ? sample.values[shadow].replace(sample.values[token], adjustColor(sample)) : sample.values[shadow],
  } }]))
  if (measuredStyleDifferences(expected, await measure(await effective(result)), [shadow]).length) return
  return { result, edits }
}

async function sharedShadows(library, directory, theme, modes) {
  const style = await readFile(new URL(import.meta.resolve('@syntrofic/ui/style.css')), 'utf8')
  const palette = library.exportBrandTheme(theme)['theme.css']
  const tokens = library.brandShadowTokens
  const markup = tokens.map(token => `<div data-shadow="${token}" style="box-shadow:var(${token})"></div>`).join('')
  return withThemeBrowser(directory, { timeout: 60000, timeoutMessage: 'Measuring the shared shadows exceeded 60 seconds.',
    missingBrowser: 'Install Playwright Chromium or Google Chrome to measure theme shadows.' }, async renderer => {
    const result = {}
    const cached = new Map()
    for (const mode of modes) {
      const html = await documentFor({ style, palette, markup, mode, theme: theme.id, fonts: { css: '' }, cached })
      await renderer.load({ mode, html })
      result[mode] = await renderer.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-shadow]')]
        .map(element => [element.dataset.shadow, getComputedStyle(element).boxShadow])))
    }
    return result
  })
}

export async function themeShadowEdits(library, directory, theme, setting, value, options, effective) {
  const absolute = setting === 'shadow-alpha'
  const percent = /^\d+(?:\.\d+)?%$/.test(value) ? parseFloat(value) / 100 : !absolute && value === 'none' ? 0 : NaN
  if (!Number.isFinite(percent) || absolute && percent > 1) {
    throw new Error(absolute ? 'Use a shadow alpha between 0% and 100%.' : 'Use a shadow strength like 125%, 75% or none.')
  }
  const adjustment = absolute ? { alpha: percent } : { factor: percent }
  const prior = await effective(theme)
  const supported = { 'light-only': ['light'], 'dark-only': ['dark'] }[prior.design?.appearance] ?? ['light', 'dark']
  if (options.mode && !supported.includes(options.mode)) throw new Error('Choose an appearance supported by this theme.')
  const modes = options.mode ? [options.mode] : supported
  const { on: part, state: requestedState } = options
  const when = themeConditions(options.when)
  const patch = changes => library.applyBrandPatch(theme, { revision: theme.revision, changes })
  if (!part) {
    if (requestedState || Object.keys(when).length || options.only) throw new Error('Choose the part using --on to scope a shadow to a variant or state.')
    const before = await sharedShadows(library, directory, prior, modes)
    const shadows = {}
    for (const [mode, readings] of Object.entries(before)) {
      const changes = Object.entries(readings).flatMap(([token, reading]) => {
        const adjusted = adjustShadow(reading, adjustment)
        return adjusted === reading ? [] : [[token, adjusted]]
      })
      if (changes.length) shadows[mode] = Object.fromEntries(changes)
    }
    if (!Object.keys(shadows).length) throw noEffect()
    const edits = [{ type: 'settings', value: { design: { shadows } } }]
    const result = patch(edits)
    const after = await sharedShadows(library, directory, await effective(result), modes)
    for (const [mode, tokens] of Object.entries(shadows)) {
      for (const [token, adjusted] of Object.entries(tokens)) {
        if (after[mode][token] !== adjusted) throw new Error(`Existing theme styles override ${token} in ${mode} mode.`)
      }
    }
    return { result, edits }
  }
  const scope = library.normalizeBrandRule({ target: part, when, state: requestedState === 'rest' ? undefined : requestedState, declarations: { [shadow]: 'none' } })
  const state = scope.state ?? requestedState
  const field = library.brandFieldShadowParts.includes(part)
  const hoverRing = state === 'hover' && field
  const properties = hoverRing ? [shadow, library.brandFieldHoverRingToken] : [shadow]
  const measure = async theme => (await measureThemeAppearances(directory, library, theme, part, [when], modes, properties))[0]
  const before = await measure(prior)
  if (hoverRing) {
    const ring = await editFieldHoverRing(library, theme, { part, when, adjustment, before, measure, patch, effective })
    if (ring) return ring
  }
  const desired = new Map(before.map(sample => [styleSampleKey(sample), {
    ...sample, values: { [shadow]: themeStateIncludes(sample.state, state) ? adjustShadow(sample.values[shadow], adjustment, part, field) : sample.values[shadow] },
  }]))
  if (desired.size !== before.length) throw new Error('The shadow scope has duplicate rendered samples.')
  let pending = measuredStyleDifferences(desired, before, [shadow])
  if (!pending.length) throw noEffect()
  const rules = new Map()
  const spec = { part, to: when, properties: [shadow] }
  for (const precise of [false, false, true]) {
    writeMeasuredStyleRules(library, theme, spec, desired, pending, rules, precise)
    const edits = [...rules.values()]
    const result = patch(edits)
    pending = measuredStyleDifferences(desired, await measure(await effective(result)), [shadow])
    if (!pending.length) return { result, edits }
  }
  throw new Error(`Existing theme styles override the adjusted shadow on ${part}.`)
}
