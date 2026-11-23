import { themeEditorChange, themeEditorCommand } from './theme-editor.mjs'
import { boxShadowLayers } from './theme-measured-style.mjs'

const activeStates = new Set(['rest', 'open'])
const pillParts = new Set(['button', 'badge', 'input-group', 'date-input'])
const overlayParts = new Set(['dialog', 'popover', 'toast'])
const statusParts = new Set(['badge', 'banner', 'toast'])
const selectedSurfaces = new Set(['side-nav-item', 'top-nav-item', 'tab', 'pagination-item',
  'selector-option-row', 'typeahead-option', 'combobox-option', 'listbox-option', 'menu-item'])
const variantStatus = new Set(['success', 'warning', 'danger', 'info'])
const order = ['disabled-fill', 'selected-fill', 'status-fill', 'pill-corners', 'container-corners', 'soft-shadow']
const corners = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius']
const keyOf = ({ part, when, placement, state }) => JSON.stringify([part, when, placement, state])
const sameFill = (first, second) => first?.fill.color === second?.fill.color && first?.fill.image === second?.fill.image
const rounded = paint => paint.radius.some(radius => parseFloat(radius) > 0)
const pill = paint => paint.radius.every(radius => parseFloat(radius) >= 70)
const flatRadius = (paint, value) => paint.radius.every(radius => radius.split(/\s+/).every(axis => axis === value))

function hardenShadow(value) {
  return boxShadowLayers(value).map(layer => {
    if (/\binset\b/.test(layer)) return layer
    return layer.replace(/(\)\s+-?[\d.]+px\s+-?[\d.]+px\s+)[\d.]+px(?=\s|$)/, (_, offset) => offset + '0px')
  }).join(', ')
}

function hasOverride(ui, theme, rules, candidate, readings, cases) {
  const concerned = candidate.steps.map(step => step.setting)
  return Object.entries(rules ?? {}).some(([key, rule]) => {
    if (rule.mode && rule.mode !== candidate.mode) return false
    if (candidate.kind === 'disabled-fill' && rule.state !== 'disabled') return false
    if (!candidate.indices.some(index => {
      const sample = cases[index]
      return readings.after[index] && (!rule.state || rule.state === sample.state)
        && Object.entries(rule.when ?? {}).every(([axis, value]) => sample.when[axis] === value)
        && (rule.target === sample.part || sample.part === 'button' && rule.target === 'button-' + sample.when.variant)
    })) return false
    return Object.keys(rule.declarations).some(property => {
      if (!rule.authored?.[property] && theme.inheritedRules?.[key]?.declarations[property] === rule.declarations[property]) return false
      const uses = ui.brandRuleTargets[rule.target]?.tokenProperties?.[property] ?? [property]
      return uses.some(name => concerned.includes(name)
        || name === 'background' && concerned.includes('background-color')
        || concerned.includes('border-radius') && corners.includes(name))
    })
  })
}

export function themeMissedCandidates(ui, theme, base, cases, readings) {
  const candidates = new Map()
  const resolvedRules = ui.resolveBrandThemeRules(theme).rules
  const indices = new Map(cases.flatMap((sample, index) => sample.surface ? [] : [[keyOf(sample), index]]))
  for (const [mode, paint] of readings) {
    const { before, after } = paint
    const oldTokens = ui.resolveThemeTokens(base, { mode })
    const tokens = ui.resolveThemeTokens(theme, { mode })
    const changed = token => tokens[token] !== oldTokens[token]
    const radius = tokens['--sy-radius-md']
    const square = radius === '0px' && changed('--sy-radius-md')
    const adjustContainer = !square && /^\d+(?:\.\d+)?px$/.test(radius)
      && changed('--sy-radius-md') && !changed('--sy-radius-lg') && radius !== tokens['--sy-radius-lg']
    const adjustShadow = square || changed('--sy-border-width') && parseFloat(tokens['--sy-border-width']) > 0

    function add(index, kind, steps, scope) {
      const sample = cases[index]
      const candidate = { kind, part: sample.part, mode, when: scope.when ?? sample.when, state: scope.state,
        steps: steps.map(([setting, value]) => ({ setting, value })), indices: [index] }
      const key = JSON.stringify([kind, candidate.part, mode, candidate.when, candidate.state, steps])
      const existing = candidates.get(key)
      if (existing) existing.indices.push(index)
      else candidates.set(key, candidate)
    }

    for (const [index, sample] of cases.entries()) {
      const original = before[index]
      const current = after[index]
      if (!original || !current || sample.surface) continue
      const { part, when, state } = sample
      const property = ui.brandRuleTargets[part].properties
      const rest = after[indices.get(keyOf({ ...sample, state: 'rest' }))]
      const tone = when.tone
      if (part === 'button' && state === 'disabled' && ['primary', 'danger'].includes(when.variant)
          && changed(when.variant === 'primary' ? '--sy-accent' : '--sy-danger')
          && current.opacity > 0 && current.opacity < 1 && current.fill.color
          && !current.fill.image && !sameFill(current, original) && sameFill(current, rest)) {
        add(index, 'disabled-fill', [['background-color', 'var(--sy-control)'], ['color', 'var(--sy-text)']],
          { state, when: { variant: when.variant } })
      }
      if (state === 'selected' && selectedSurfaces.has(part) && Object.hasOwn(property, 'background-color') && current.fill.color && !current.fill.image
          && changed('--sy-accent-soft') && sameFill(current, original) && !sameFill(current, rest)) {
        add(index, 'selected-fill', [['background-color', 'var(--sy-accent-soft)']], { state })
      }
      if (activeStates.has(state) && statusParts.has(part) && variantStatus.has(tone) && current.fill.color && !current.fill.image
          && changed('--sy-' + tone + '-soft') && sameFill(current, original)) {
        add(index, 'status-fill', [['background-color', 'var(--sy-' + tone + '-soft)']], { state: state === 'rest' ? undefined : state })
      }
      const keptCorners = Object.hasOwn(property, 'border-radius') && original.radius.join(' ') === current.radius.join(' ')
      if (activeStates.has(state) && keptCorners && square && pillParts.has(part) && pill(current)) {
        add(index, 'pill-corners', [['border-radius', '0px']], { when: {} })
      }
      if (activeStates.has(state) && keptCorners && adjustContainer && ['card', 'dialog', 'popover'].includes(part)
          && rounded(current) && !flatRadius(current, radius)) {
        add(index, 'container-corners', [['border-radius', radius]], { when: {} })
      }
      if (activeStates.has(state) && adjustShadow && overlayParts.has(part) && original.shadow === current.shadow
          && current.shadow !== 'none') {
        const shadow = hardenShadow(current.shadow)
        if (shadow !== current.shadow) add(index, 'soft-shadow', [['box-shadow', shadow]], { state: state === 'rest' ? undefined : state })
      }
    }
  }

  return [...candidates.values()].filter(candidate => !hasOverride(ui, theme, resolvedRules, candidate, readings.get(candidate.mode), cases))
}

function editorSteps(theme, candidate) {
  const { part, when, state, mode, steps } = candidate
  const dimensions = candidate.kind.endsWith('-corners')
  const options = { on: part, when: Object.entries(when).map(pair => pair.join(':')), state, ...(dimensions || candidate.bothModes ? {} : { mode }), only: true }
  return steps.map(({ setting, value }) => {
    const scope = ['--on', part, ...options.when.flatMap(condition => ['--when', condition]),
      ...(state ? ['--state', state] : []), ...(options.mode ? ['--mode', options.mode] : []), '--only']
    const edit = ['set', theme.id, setting, value, ...scope]
    return { setting, value, options, command: themeEditorCommand(edit) }
  })
}

export async function prepareThemeMisses(ui, theme, registered, effective, candidates) {
  const trials = []
  const grouped = new Map()
  for (const candidate of candidates) {
    const steps = editorSteps(theme, candidate)
    const key = steps.map(step => step.command).join(' && ')
    const samples = candidate.guards ?? candidate.indices.map(index => ({ mode: candidate.mode, index }))
    const existing = grouped.get(key)
    if (existing && candidate.findings) {
      existing.findings = [...new Set([...existing.findings, ...candidate.findings])]
    } else if (existing) existing.samples.push(...samples)
    else grouped.set(key, { ...candidate, steps, samples })
  }
  for (const candidate of grouped.values()) {
    let trial = registered
    try {
      for (const step of candidate.steps) {
        const changes = themeEditorChange(ui, trial, step.setting, step.value, step.options)
        trial = ui.applyBrandPatch(trial, { revision: trial.revision, changes })
      }
      trial = await effective(trial)
    } catch {
      continue
    }
    trials.push({ ...candidate, theme: trial })
  }
  return trials
}

function verified(ui, candidate, previous, current) {
  if (!current || !previous) return false
  switch (candidate.kind) {
    case 'disabled-fill': return current.opacity === previous.opacity && !sameFill(previous, current) && Boolean(current.ink.text)
    case 'selected-fill':
    case 'status-fill': {
      if (sameFill(previous, current) || !current.fill.color) return false
      return Object.entries(previous.ink).every(([slot, ink]) => {
        if (!ink) return true
        const before = ui.colorContrast(ink, previous.fill.color)
        const after = ui.colorContrast(current.ink[slot], current.fill.color)
        return after !== undefined && before !== undefined && after >= Math.min(4.5, before)
      })
    }
    case 'pill-corners': return flatRadius(current, '0px')
    case 'container-corners': return flatRadius(current, candidate.steps[0].value)
    case 'soft-shadow': return current.shadow !== previous.shadow && current.shadow === hardenShadow(previous.shadow)
  }
}

const descriptions = {
  'disabled-fill': 'The disabled control still uses the enabled fill at reduced opacity.',
  'selected-fill': 'The selected state still uses the base fill.',
  'status-fill': 'The status still uses the base fill.',
  'pill-corners': 'This part keeps its pill shape after the theme switches to square corners.',
  'container-corners': 'This container keeps its base corners after the control radius changes.',
  'soft-shadow': 'This overlay keeps its blurred shadow beside square corners or an edited border width.',
}

export function verifiedThemeMisses(ui, trials, readings, rendered) {
  const results = []
  let cursor = 0
  for (const candidate of trials) {
    const { kind, part, mode, state, when } = candidate
    const samples = candidate.samples.map(({ mode, index }) => ({ before: readings.get(mode).after[index], after: rendered[cursor++] }))
    if (!samples.length || !samples.every(({ before, after }) => verified(ui, candidate, before, after))) continue
    const steps = kind === 'disabled-fill' && samples.every(({ before, after }) => before.ink.text === after.ink.text)
      ? candidate.steps.filter(step => step.setting !== 'color') : candidate.steps
    results.push({ kind, part, ...(!kind.endsWith('-corners') && { mode }), ...(state && { state }),
      ...(Object.keys(when).length && { when }), why: descriptions[kind], line: steps.map(step => step.command).join(' && '),
      steps, verifiedSamples: samples.length, verifiedModes: [...new Set(candidate.samples.map(sample => sample.mode))] })
  }
  // Show one finding of each kind first so related variants do not hide other repairs.
  const first = order.flatMap(kind => results.find(result => result.kind === kind) ?? [])
  return [...first, ...results.filter(result => !first.includes(result))]
}
