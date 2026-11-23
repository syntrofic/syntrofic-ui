import { readFile } from 'node:fs/promises'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { editorGroups, themeEditorCommand, themeEditorModes } from './theme-editor.mjs'
import { distinctThemeParts, prepareThemeLightbox, themeMediaCases, themeMediaFixture, themeMediaPalette,
  themePartCases, themePartSlots, themePartSpecimen } from './theme-part-probes.mjs'
import { projectThemeInteractions } from './theme-interactions.mjs'
import { documentFor, themeContrastParts } from './theme-part-report.mjs'
import { withThemeBrowser } from './theme-pictures.mjs'
import { themeMissedCandidates, prepareThemeMisses, verifiedThemeMisses } from './theme-missed.mjs'
import { installThemeTextContrast, measuredTextContrast } from './theme-text-contrast.mjs'
import { collectTextContrast, contrastRepairCandidates, contrastRepairCovers, contrastResults, verifyContrastTrial } from './theme-contrast-repair.mjs'

const persistentStates = new Set(['rest', 'open', 'selected', 'mixed', 'striped', 'disabled', 'pressed', 'unpressed'])
const hiddenAtRest = new Set(['dialog', 'popover', 'tooltip', 'toast', ...editorGroups.menus])
const priority = ['overlays', 'feedback', 'navigation', 'actions', 'inputs', 'selection', 'data', 'containers']
const paintProperties = new Set(['background', 'background-color', 'background-image', 'color'])

async function specimens(ui, parts) {
  const cases = distinctThemeParts(ui).flatMap(([part, target]) => {
    if (parts && !parts.has(part)) return []
    const slots = Object.entries(themePartSlots(part)).filter(([, slot]) =>
      slot.fill || slot.text !== false && (!slot.properties || slot.properties.includes('color')))
    // In the full audit the indicator specimens already measure the same track.
    const contrastParts = part === 'progress-bar-track' && !parts ? [] : themeContrastParts(ui, part)
    const partCases = themePartCases(ui, part).flatMap(sample => {
      if (!(contrastParts.length || persistentStates.has(sample.state)) || sample.state === 'rest' && hiddenAtRest.has(part)
          || part.startsWith('pagination') && sample.when.variant === 'none') return []
      return [{ ...sample, selector: target.selector, family: target.family, text: target.textSize?.child, slots, contrastParts }]
    })
    return [...partCases, ...themeMediaCases(part, partCases)]
  })
  const app = createSSRApp({ render: () => h('main', cases.map((sample, index) =>
    h('div', { class: 'lookup-frame', 'data-theme-variant-selector': sample.selector },
      [themeMediaFixture(sample, themePartSpecimen(ui, sample, index))]))) })
  return { cases, markup: await renderToString(app) }
}

function readPaint(cases) {
  if (typeof CSSScopeRule !== 'function') throw new Error('Theme inspection requires a browser with CSS @scope support.')
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Theme inspection could not read colors.')
  const colors = new Map()
  function color(value) {
    if (colors.has(value)) return colors.get(value)
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
    const result = a ? '#' + [r, g, b, ...(a < 255 ? [a] : [])].map(channel => channel.toString(16).padStart(2, '0')).join('') : null
    colors.set(value, result)
    return result
  }
  const frames = [...document.querySelectorAll('[data-theme-variant-selector]')]
  if (frames.length !== cases.length) throw new Error('Theme inspection is missing component specimens.')
  return cases.map(({ part, selector, state, slots, text, when, contrastParts }, index) => {
    const sample = frames[index]?.querySelector('[data-lookup-sample]')
    const page = part === 'pagination-item' && ['pages', 'dots'].includes(when.variant)
    const subject = page && state === 'selected' ? selector + '[aria-current="page"]'
      : page && state === 'rest' ? selector + ':is(.sy-pagination__page,.sy-pagination__dot):not([aria-current="page"])' : selector
    const element = sample?.matches(subject) ? sample : sample?.querySelector(subject)
    if (!element?.getClientRects().length) return null
    const surface = part === 'table-row' ? element.querySelector('td') ?? element : element
    const main = slots.find(([, slot]) => slot.primary && (!slot.when || element.matches(slot.when)))?.[1]
    const style = getComputedStyle(surface, main?.pseudo)
    if (style.visibility !== 'visible') return null
    const fill = { color: color(main?.fill === 'stroke' ? style.color : style.backgroundColor),
      image: style.backgroundImage === 'none' ? null : style.backgroundImage }
    const ink = {}
    const contrast = {}
    function capture(name, node, pseudo, fill) {
      if (!node?.getClientRects().length || getComputedStyle(node).visibility !== 'visible' || getComputedStyle(node).display === 'none') return
      if (!fill || fill === 'stroke' && !main) ink[name] = color(getComputedStyle(node, pseudo).color)
      if (contrastParts.includes(name) && (fill || node.textContent.trim() || node.matches('input,textarea'))) {
        contrast[name] = globalThis.themeTextContrast(element, node, pseudo, fill)
      }
    }
    const principal = text ? element.querySelector(text) : surface
    if (!main && principal && (principal.textContent.trim() || principal.matches('input,textarea'))) capture('text', principal)
    for (const [name, slot] of slots) {
      if (slot.when && !element.matches(slot.when)) continue
      capture(name, slot.selector ? element.querySelector(slot.selector) : element, slot.pseudo, slot.fill)
    }
    return { fill, ink, contrast, opacity: Number(style.opacity), shadow: style.boxShadow,
      radius: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius] }
  })
}

function explicitPaint(ui, settings, coverage) {
  const target = ui.brandRuleTargets[coverage.part]
  const stroke = Object.values(themePartSlots(coverage.part)).some(slot => slot.primary && slot.fill === 'stroke')
  return settings.some(({ part, state, when, mode, setting }) => {
    if (part !== coverage.part || state || Object.keys(when ?? {}).length) return false
    const observed = mode ? coverage.modes[mode] : coverage
    if (!observed) return false
    const properties = target.tokenProperties?.[setting]
      ?? (Object.values(target.optionText ?? {}).includes(setting) ? ['color'] : [setting])
    return properties.some(property => paintProperties.has(property) && (property === 'color' && !stroke
      ? observed.textChanged : observed.fillChanged))
  })
}

function summarize(ui, theme, base, cases, readings, settings) {
  const inspected = new Map()
  let compared = 0
  for (const [mode, { before, after }] of readings) {
    for (const [index, sample] of cases.entries()) {
      const previous = before[index]
      const current = after[index]
      if (!previous || !current) continue
      if (sample.surface || !persistentStates.has(sample.state) || sample.state === 'disabled') continue
      compared++
      const { part, family, state, when, placement } = sample
      if (!inspected.has(part)) inspected.set(part, { part, family, compared: 0, hasInk: false, fillChanged: false, textChanged: false,
        modes: {}, examples: [] })
      if (!previous.fill.color && !previous.fill.image && !current.fill.color && !current.fill.image) continue
      const record = inspected.get(part)
      const ink = Object.keys(previous.ink).filter(slot => Object.hasOwn(current.ink, slot) && (previous.ink[slot] || current.ink[slot]))
      const fillChanged = previous.fill.color !== current.fill.color || previous.fill.image !== current.fill.image
      const textChanged = ink.some(slot => previous.ink[slot] !== current.ink[slot])
      record.compared++
      record.hasInk ||= Boolean(ink.length)
      record.fillChanged ||= fillChanged
      record.textChanged ||= textChanged
      const inMode = record.modes[mode] ??= { fillChanged: false, textChanged: false }
      inMode.fillChanged ||= fillChanged
      inMode.textChanged ||= textChanged
      if ((!fillChanged || ink.length && !textChanged) && !record.examples.some(example => example.mode === mode)) {
        record.examples.push({
          mode, state, when, ...(placement && { placement }),
          unchanged: [...(!fillChanged ? ['fill'] : []), ...(ink.length && !textChanged ? ['text'] : [])],
          before: { fill: previous.fill, ink: previous.ink }, after: { fill: current.fill, ink: current.ink },
        })
      }
    }
  }
  if (!compared) throw new Error('Theme inspection could not compare any rendered specimens.')
  const parts = [...inspected.values()].filter(part => part.compared).map(({ hasInk, ...part }) => {
    const unchanged = [...(!part.fillChanged ? ['fill'] : []), ...(hasInk && !part.textChanged ? ['text'] : [])]
    const explicit = explicitPaint(ui, settings, part)
    return { ...part, textChanged: hasInk ? part.textChanged : null, unchanged,
      status: !unchanged.length ? 'reached' : explicit ? 'explicit' : 'unreached',
      inspect: themeEditorCommand(['show', theme.id, '--on', part.part]) }
  }).sort((a, b) => priority.indexOf(a.family) - priority.indexOf(b.family))
  const unmeasured = [...new Set(cases.map(sample => sample.part))].filter(part => !inspected.has(part))
  return { unreached: parts.filter(part => part.status === 'unreached').map(part => part.part),
    paintCoverage: { status: 'measured', base: base.id, modes: themeEditorModes(theme), compared, parts, unmeasured } }
}

async function renderedPaint(ui, renderer, cases) {
  if (cases.some(sample => sample.part === 'lightbox')) await renderer.evaluate(prepareThemeLightbox)
  await renderer.evaluate(projectThemeInteractions)
  await renderer.evaluate(installThemeTextContrast)
  const values = await renderer.evaluate(readPaint, cases)
  return values.map(value => value && { ...value, contrast: measuredTextContrast(ui, value.contrast) })
}

async function renderTrials(ui, renderer, style, cached, cases, mode, trials) {
  if (!trials.length) return []
  const sections = trials.map(({ theme, samples }, at) => ({
    trial: { ...theme, id: 'repair-' + at }, samples,
    media: new Map(samples.filter(({ index }) => cases[index].surface === 'media')
      .map(({ mode }) => [mode, `repair-${at}-media-${mode}`])),
  }))
  const palette = sections.map(({ trial, media }) => ui.exportBrandTheme(trial)['theme.css']
    + [...media].map(([mode, id]) => themeMediaPalette(ui, trial, mode, id)).join('\n')).join('\n')
  const probes = sections.flatMap(({ trial, samples, media }) => samples.map(({ index, mode }) => ({
    trial, sample: cases[index], mode, mediaId: media.get(mode),
  })))
  const app = createSSRApp({ render: () => h('main', probes.map(({ trial, sample, mode, mediaId }, index) =>
    h('section', { 'data-sy-brand': trial.id, 'data-sy-theme': mode, style: { color: 'var(--sy-text)', background: 'var(--sy-canvas)' } },
      [h('div', { class: 'lookup-frame', 'data-theme-variant-selector': sample.selector },
        [themeMediaFixture(sample, themePartSpecimen(ui, sample, index), mediaId, mode)])]))) })
  const markup = await renderToString(app)
  const html = await documentFor({ style, palette, markup, mode, theme: 'repair-audit', fonts: { css: '' }, cached })
  await renderer.load({ mode, html })
  return renderedPaint(ui, renderer, probes.map(probe => probe.sample))
}

async function verifyContrastRepairs(ui, renderer, style, cache, cases, readings, contrast, registered, effective, theme) {
  const repairs = []
  const mode = readings.keys().next().value
  const attempted = new Set()
  for (const exact of [false, true]) {
    const pending = contrast.problems.filter(problem => !repairs.some(repair => contrastRepairCovers(repair, problem)))
    const candidates = contrastRepairCandidates(ui, theme, cases, readings, pending, { exact })
    const trials = (await prepareThemeMisses(ui, theme, registered, effective, candidates)).filter(trial => {
      const command = trial.steps[0].command
      if (attempted.has(command)) return false
      attempted.add(command)
      return true
    })
    const values = await renderTrials(ui, renderer, style, cache, cases, mode, trials)
    let cursor = 0
    for (const trial of trials) {
      const witnesses = values.slice(cursor, cursor + trial.samples.length)
      cursor += trial.samples.length
      if (trial.findings.every(problem => repairs.some(repair => contrastRepairCovers(repair, problem)))) continue
      const valid = verifyContrastTrial(trial, readings, witnesses)
      if (valid) repairs.push(valid)
    }
  }
  return repairs
}

export async function themePaintCoverage(directory, ui, report, base, {
  registered = report.theme, effective = async theme => theme, writable = true, parts, contrastOnly = false,
} = {}) {
  const { theme, settings } = report
  const baselineTheme = { ...base, id: theme.id }
  const original = ui.exportBrandTheme(baselineTheme)['theme.css']
  const customized = ui.exportBrandTheme(theme)['theme.css']
  if (original === customized && JSON.stringify(base.media ?? {}) === JSON.stringify(theme.media ?? {})) {
    return { unreached: [], missed: [], contrastRepairs: [], renderedContrast: { status: 'unchanged', issues: [] },
      paintCoverage: { status: 'unchanged', base: base.id, parts: [] } }
  }
  try {
    const [{ cases, markup }, style] = await Promise.all([
      specimens(ui, parts), readFile(new URL(import.meta.resolve('@syntrofic/ui/style.css')), 'utf8'),
    ])
    const cache = new Map()
    return await withThemeBrowser(directory, { timeout: 60000, timeoutMessage: 'Theme paint inspection exceeded 60 seconds.',
      missingBrowser: 'Install Playwright Chromium or Google Chrome to inspect component paint.' }, async renderer => {
      const result = new Map()
      const pageModes = themeEditorModes(theme)
      const hasMedia = cases.some(sample => sample.surface === 'media')
      for (const mode of hasMedia ? ['light', 'dark'] : pageModes) {
        const read = async (primary, rendered) => {
          const palette = hasMedia ? primary + themeMediaPalette(ui, rendered, mode) : primary
          const html = await documentFor({ style, palette, markup, mode, theme: theme.id, fonts: { css: '' }, cached: cache })
          await renderer.load({ mode, html })
          const values = await renderedPaint(ui, renderer, cases)
          return pageModes.includes(mode) ? values : values.map((value, index) => cases[index].surface === 'media' ? value : null)
        }
        result.set(mode, { before: await read(original, baselineTheme), after: await read(customized, theme) })
      }
      const coverage = contrastOnly ? {} : summarize(ui, theme, base, cases, result, settings)
      const contrast = collectTextContrast(ui, cases, result)
      if (!writable) return { ...coverage, ...contrastResults(contrast, []), missed: [] }
      let evidence
      try {
        const repairs = await verifyContrastRepairs(ui, renderer, style, cache, cases, result, contrast, registered, effective, theme)
        evidence = contrastResults(contrast, repairs)
      } catch (error) {
        evidence = contrastResults(contrast, [])
        evidence.renderedContrast.verificationError = error.message.split('\n')[0]
      }
      if (contrastOnly) return evidence
      try {
        const candidates = themeMissedCandidates(ui, theme, base, cases, result)
        const trials = await prepareThemeMisses(ui, theme, registered, effective, candidates)
        const values = await renderTrials(ui, renderer, style, cache, cases, result.keys().next().value, trials)
        return { ...coverage, ...evidence, missed: verifiedThemeMisses(ui, trials, result, values) }
      } catch (error) {
        return { ...coverage, ...evidence, missedError: error.message.split('\n')[0] }
      }
    })
  } catch (error) {
    return { paintCoverage: { status: error.code === 'ERR_THEME_BROWSER_REQUIRED' ? 'browser-unavailable' : 'render-failed',
      base: base.id, message: error.message.split('\n')[0] } }
  }
}
