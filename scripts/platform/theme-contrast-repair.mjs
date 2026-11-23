import { lowTextContrast, textContrastRatio } from './theme-text-contrast.mjs'
import { themeEditorModes } from './theme-editor.mjs'

const editableTextTokens = {
  placeholder: ['--sy-field-placeholder-color', '--sy-text-muted'],
  prefix: ['--sy-input-group-prefix-color', '--sy-text-muted'],
  description: ['--sy-text-muted', '--sy-toast-text', '--sy-banner-ink'],
  title: ['--sy-toast-text', '--sy-banner-ink', '--sy-text'],
  text: ['--sy-text', '--sy-toast-text', '--sy-banner-ink'],
}
const smallScopeAxes = new Set(['variant', 'tone', 'type', 'mode', 'level', 'parity', 'checked'])
const drawnRatio = reading => reading.worstStopRatio ?? reading.ratio
const matches = (when, sample) => Object.entries(when).every(([axis, value]) => sample.when[axis] === value)
function matchesState(state, sample) {
  return !state || state.split('+').every(name => matchesStateName(name, sample))
}

function matchesStateName(state, sample) {
  if (sample.state.split('+').includes(state)) return true
  if (sample.part === 'selector-indicator-icon' && state === 'collapsed') return sample.state !== 'expanded'
  // The native mark remains checked or mixed during focus and disabled states.
  return sample.part === 'checkbox-indicator' && (state === 'checked' || state === 'selected'
    ? sample.when.checked === 'checked' : state === 'mixed' && sample.when.checked === 'indeterminate')
}
const belongs = (scope, sample) => scope.part === sample.part && matchesState(scope.state, sample) && matches(scope.when, sample)
const scopeKey = scope => JSON.stringify([scope.bothModes ? 'both' : scope.mode, scope.part, scope.state, scope.when, scope.settings])
const paint = sample => JSON.stringify(sample.fill)
const witnessKey = ({ mode, index }) => mode + '/' + index
const buttonIcons = new Set(['startIcon', 'endIcon'])
const indicatorPaint = new Set(['indicator', 'checkmark', 'mixedMark', 'icon', ...buttonIcons])

function editSettings(ui, sample, text) {
  if (buttonIcons.has(text)) return ['--sy-button-icon-color']
  if (indicatorPaint.has(text)) return [text === 'icon' ? 'color' : 'background-color']
  const target = ui.brandRuleTargets[sample.part]
  const option = target.optionText?.[text]
  if (option) return [option]
  const typed = ui.brandRuleTokens(sample.part, sample.when)
  const tokens = (editableTextTokens[text] ?? ['--sy-text']).filter(token => typed.includes(token))
  const color = Object.hasOwn(target.properties, 'color') ? ['color'] : []
  return ['placeholder', 'prefix', 'description'].includes(text) ? [...tokens, ...color] : [...color, ...tokens]
}

export function collectTextContrast(ui, cases, readings) {
  const problems = []
  let measured = 0
  let unmeasured = 0
  for (const [mode, { before, after }] of readings) {
    for (const [index, sample] of cases.entries()) {
      const original = before[index]?.contrast
      const current = after[index]?.contrast
      if (!current) continue
      for (const [text, reading] of Object.entries(current)) {
        if (reading.status === 'unmeasured') unmeasured++
        if (reading.status !== 'measured') continue
        measured++
        const base = original?.[text]
        // Components already below their threshold in the baseline keep their
        // baseline classification unless the edit makes them harder to read.
        if (!lowTextContrast(reading) || !base || base.status === 'inactive'
            || lowTextContrast(base) && drawnRatio(base) - drawnRatio(reading) < .001) continue
        problems.push({ mode, index, part: sample.part, state: sample.state, when: sample.when, placement: sample.placement, surface: sample.surface,
          text, reading, previousRatio: base.ratio ?? null, settings: editSettings(ui, sample, text) })
      }
    }
  }
  return { measured, unmeasured, problems }
}

function colorsFor(ui, theme, scope, findings) {
  const tokens = ui.resolveThemeTokens(findings.every(issue => issue.surface === 'media')
    ? ui.resolveBrandMediaTheme(theme, scope.mode) : theme, { mode: scope.mode })
  const description = findings.every(issue => issue.text === 'description' || issue.text === 'placeholder')
  const names = description ? ['text-muted', 'text', 'accent-on', 'accent-text'] : ['text', 'accent-on', 'accent-text', 'text-muted']
  const palette = names.map(token => tokens['--sy-' + token])
  const candidates = [...new Set([...palette, '#252525', '#f1f1f1', '#ffffff', '#000000'])].filter(Boolean)
  const scores = candidates.map(value => ({ value, margin: Math.min(...findings.map(({ reading }) => {
    const ratio = scope.part === 'progress-bar-track' ? ui.colorContrast(reading.foreground, value) : textContrastRatio(ui, reading, value)
    return (ratio ?? 0) - reading.minimum
  })) })).filter(color => color.margin >= 0)
  const preferred = scores[0]
  const highest = scores.reduce((best, candidate) => !best || candidate.margin > best.margin ? candidate : best, preferred)
  return [...new Set([preferred?.value, highest?.value])].filter(Boolean)
}

export function contrastRepairCandidates(ui, theme, cases, readings, problems, { exact = false } = {}) {
  const groups = new Map()
  const published = themeEditorModes(theme)
  for (const problem of problems) {
    if (!problem.settings.length) continue
    const { mode, part, when, settings, state } = problem
    const qualifiers = exact ? when : Object.fromEntries(Object.entries(when).filter(([axis]) => smallScopeAxes.has(axis)))
    const applicableModes = published.includes(mode) ? [false] : [true, false]
    for (const bothModes of applicableModes) {
      const scope = { mode, part, when: qualifiers, settings, state: state === 'rest' ? undefined : state, bothModes }
      const key = scopeKey(scope)
      if (!groups.has(key)) groups.set(key, scope)
    }
  }
  return [...groups.values()].flatMap(scope => {
    const findings = problems.filter(problem => (scope.bothModes || problem.mode === scope.mode) && belongs(scope, problem)
      && scope.settings.join() === problem.settings.join())
    const guards = (scope.bothModes ? [...readings.keys()] : [scope.mode]).flatMap(mode => {
      const { after } = readings.get(mode)
      return cases.flatMap((sample, index) => belongs(scope, sample) && after[index] ? [{ mode, index }] : [])
    })
    return colorsFor(ui, theme, scope, findings).flatMap(value => scope.settings.map(setting => ({
      ...scope, kind: findings.every(issue => indicatorPaint.has(issue.text)) ? 'indicator-contrast' : 'text-contrast',
      guards, findings, steps: [{ setting, value }],
    })))
  })
}

export function verifyContrastTrial(candidate, readings, rendered) {
  const revisions = new Map()
  for (const [at, { mode, index }] of candidate.samples.entries()) {
    const before = readings.get(mode).after[index]
    const after = rendered[at]
    if (!after || candidate.kind !== 'indicator-contrast' && paint(before) !== paint(after)) return
    for (const [name, previous] of Object.entries(before.contrast ?? {})) {
      if (previous.status !== 'measured') continue
      const current = after.contrast?.[name]
      if (current?.status !== 'measured') return
      if (previous.ratio >= previous.minimum ? current.ratio < current.minimum : current.ratio + .001 < previous.ratio) return
    }
    revisions.set(witnessKey({ mode, index }), after)
  }
  const ratios = candidate.findings.map(problem => revisions.get(witnessKey(problem))?.contrast?.[problem.text])
  if (!ratios.length || ratios.some(reading => reading?.status !== 'measured' || reading.ratio < reading.minimum)) return
  const { part, mode, bothModes, when, state, steps, findings } = candidate
  return { kind: candidate.kind, part, ...(!bothModes && { mode }), ...(state && { state }), ...(Object.keys(when).length && { when }),
    text: [...new Set(findings.map(problem => problem.text))], steps, line: steps[0].command,
    surfaces: [...new Set(findings.map(problem => problem.surface ?? 'page'))],
    verifiedModes: [...new Set(candidate.samples.map(sample => sample.mode))],
    beforeRatio: Math.min(...findings.map(problem => problem.reading.ratio)), afterRatio: Math.min(...ratios.map(reading => reading.ratio)),
    minimum: Math.max(...ratios.map(reading => reading.minimum)), verifiedSamples: candidate.samples.length }
}

export function contrastRepairCovers(repair, issue) {
  return repair.part === issue.part && repair.verifiedModes.includes(issue.mode) && matchesState(repair.state, issue)
    && repair.surfaces.includes(issue.surface ?? 'page')
    && repair.text.includes(issue.text) && matches(repair.when ?? {}, issue)
}

export function contrastResults(coverage, repairs) {
  const groups = new Map()
  for (const { mode, part, state, when, text, reading, previousRatio, placement, surface } of coverage.problems) {
    const scope = Object.fromEntries(Object.entries(when).filter(([axis]) => smallScopeAxes.has(axis)))
    const key = JSON.stringify([mode, part, state, scope, text, placement, surface])
    const issue = groups.get(key)
    if (issue) {
      issue.samples++
      if (reading.ratio >= issue.ratio) continue
    }
    groups.set(key, { mode, part, state, when, text, ...(placement && { placement }), ...(surface && { surface }),
      ...reading, previousRatio, samples: issue?.samples ?? 1 })
  }
  return { renderedContrast: { status: 'measured', measured: coverage.measured, unmeasured: coverage.unmeasured,
    issues: [...groups.values()].map(issue => {
      const repair = repairs.find(repair => contrastRepairCovers(repair, issue))
      return repair ? { ...issue, fix: repair.line } : issue
    }) }, contrastRepairs: repairs }
}
