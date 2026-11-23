import { borderWidthToken, shadowSettings, themeBorderInputTargets, themeConditions, themeEditorChange, themeEditorEntry, themeEditorGroups, themeEditorGroupScopes,
  themeEditorProperty, themeInputTargets, themeStateIncludes } from './theme-editor.mjs'
import { measuredStyleDifferences, measuredStyleProperties, styleSampleKey, writeMeasuredStyleRules } from './theme-measured-style.mjs'
import { measureThemeAppearances } from './theme-part-report.mjs'

const failure = (code, message) => Object.assign(new Error(message), { code })
const matches = (sample, { when, state, mode }) =>
  (!mode || sample.mode === mode) && themeStateIncludes(sample.state, state) &&
  Object.entries(when).every(([axis, value]) => sample.when?.[axis] === value)

function exceptionScopes(library, values, borderWidth) {
  const groups = { ...themeEditorGroups(library), buttons: ['button'],
    inputs: borderWidth ? themeBorderInputTargets : themeInputTargets, field: themeInputTargets }
  const scopes = new Map()
  for (const value of values) {
    const [name, qualifiers, ...extra] = value.split('/')
    if (!name || qualifiers === '' || extra.length) throw new Error('Use --except part[/axis:value+state:state+appearance:mode]')
    const pieces = qualifiers?.split('+') ?? []
    const start = pieces.findIndex(piece => piece.startsWith('state:'))
    const next = pieces.findIndex((piece, index) => index > start && piece.includes(':'))
    const state = start < 0 ? undefined : pieces.splice(start, (next < 0 ? pieces.length : next) - start).join('+').slice('state:'.length)
    const { state: duplicate, appearance, ...when } = themeConditions(pieces)
    if (duplicate || state === '') throw new Error('Choose one state condition per exception')
    const targets = Object.hasOwn(groups, name) ? groups[name] : [name]
    const structural = targets.some(part => library.brandRuleTargets[part]?.roles?.[name])
    const members = structural ? themeEditorGroupScopes(library, name, { when, state, mode: appearance }) : targets.map(target => {
      const variant = /^button-(primary|secondary|ghost|danger)$/.exec(target)?.[1]
      const part = variant ? 'button' : target
      if (variant && when.variant && variant !== when.variant) throw new Error('Choose one button variant per exception')
      const selection = variant ? { ...when, variant } : when
      const scope = library.normalizeBrandRule({ target: part, when: selection, state: state === 'rest' ? undefined : state, mode: appearance, declarations: {} })
      return { ...scope, state: scope.state ?? state }
    })
    if (!members.length) throw new Error('No part in ' + name + ' supports that exception')
    for (const { target: part, when = {}, state, mode } of members) {
      if (!scopes.has(part)) scopes.set(part, [])
      scopes.get(part).push({ when, state, ...(mode && { mode }) })
    }
  }
  return scopes
}

function pinBorderWidths(library, theme, context, edits) {
  let written = 0
  for (const exception of context.receipt.exceptions) {
    const { when, state, mode } = exception
    if (mode || state === 'rest' || !context.pending.some(diff => diff.property === borderWidthToken && matches(diff.sample, exception))) continue
    const widths = new Set([...context.desired.values()].filter(sample => matches(sample, exception))
      .map(sample => sample.values[borderWidthToken]))
    if (widths.size !== 1) continue
    const scope = { target: context.part, when, state }
    const key = library.brandRuleKey(scope)
    const current = edits.get(key)?.value ?? theme.rules?.[key]
    const declarations = { ...current?.declarations, [borderWidthToken]: widths.values().next().value }
    const authored = theme.inheritedRules && { ...current?.authored, [borderWidthToken]: true }
    const rule = library.normalizeBrandRule({ ...scope, declarations, authored })
    edits.set(key, { type: 'rule', key, value: rule })
    written++
  }
  return written
}

export async function planThemeExceptions(library, directory, theme, property, value, options, effective) {
  const setting = themeEditorProperty(property)
  const borderWidth = setting === borderWidthToken || setting === 'border-width' && !options.on
  const scopes = exceptionScopes(library, options.except, borderWidth)
  const prior = await effective(theme)
  const baseEdits = shadowSettings.includes(setting)
    ? (await (await import('./theme-shadows.mjs')).themeShadowEdits(library, directory, theme, setting, value, options, effective)).edits
    : themeEditorChange(library, theme, property, value, options)
  const patch = changes => library.applyBrandPatch(theme, { revision: theme.revision, changes })
  const base = patch(baseEdits)
  const next = await effective(base)
  if (prior.design?.appearance !== next.design?.appearance) throw new Error('Choose layout or style settings when using --except')
  if (!themeEditorEntry(property, options, prior, next, baseEdits).fields.length) {
    throw failure('ERR_THEME_NO_EFFECT', 'The setting is already applied or overridden by the theme source.')
  }
  if (baseEdits.every(edit => edit.type === 'rule' && scopes.get(edit.value.target)?.some(scope => matches(edit.value, scope)))) {
    throw failure('ERR_THEME_NO_EFFECT', 'The exception covers every part of this edit.')
  }
  const modes = prior.design?.appearance === 'light-only' ? ['light'] : prior.design?.appearance === 'dark-only' ? ['dark'] : ['light', 'dark']
  const contexts = []
  for (const [part, exceptions] of scopes) {
    const target = library.brandRuleTargets[part]
    const borderReads = borderWidth && target.tokenProperties?.[borderWidthToken]
    const properties = [...new Set([...measuredStyleProperties(target), ...(borderReads
      ? [borderWidthToken, ...borderReads, ...(themeBorderInputTargets.includes(part) ? ['height'] : [])] : [])])]
    if (!properties.length) throw new Error(`No editable appearance to preserve on ${part}`)
    const measure = async theme => (await measureThemeAppearances(directory, library, theme, part, [{}], modes, properties))[0]
    const [before, candidate] = await Promise.all([measure(prior), measure(next)])
    const baseline = new Map(before.map(sample => [styleSampleKey(sample), sample]))
    measuredStyleDifferences(baseline, candidate, [])
    const protectedBy = sample => exceptions.some(scope => matches(sample, scope))
    if (exceptions.some(scope => !before.some(sample => matches(sample, scope)))) {
      throw new Error(`No rendered specimens matched an exception on ${part}`)
    }
    const desired = new Map(candidate.map(sample => {
      const key = styleSampleKey(sample)
      return [key, protectedBy(sample) ? baseline.get(key) : sample]
    }))
    const pending = measuredStyleDifferences(desired, candidate, properties)
    contexts.push({ part, to: {}, properties, measure, desired, pending, borderReads, receipt: {
      part, exceptions, samples: before.filter(protectedBy).length,
      restored: [...new Set(pending.map(({ property }) => property))],
    } })
  }
  const preservation = { modes, targets: contexts.map(context => context.receipt), viewport: { width: 1200, height: 960 } }
  const corrective = new Map()
  let result = base
  let edits = baseEdits
  for (let pass = 0; pass < 3; pass++) {
    if (contexts.every(context => !context.pending.length)) return { result, edits, preservation }
    let written = 0
    for (const context of contexts) {
      const pins = pass === 0 && context.borderReads ? pinBorderWidths(library, base, context, corrective) : 0
      if (pins) { written += pins; continue }
      const border = context.borderReads ? context.pending.filter(diff => diff.property === borderWidthToken) : []
      // Restore the token before comparing any values that depend on it.
      written += border.length
        ? writeMeasuredStyleRules(library, base, { ...context, properties: [borderWidthToken] }, context.desired, border, corrective, pass > 0)
        : writeMeasuredStyleRules(library, base, context, context.desired, context.pending, corrective, pass > 0)
    }
    if (!written) break
    edits = [...baseEdits.filter(edit => edit.type !== 'rule' || !corrective.has(edit.key)), ...corrective.values()]
    result = patch(edits)
    const proposal = await effective(result)
    for (const context of contexts) {
      context.pending = measuredStyleDifferences(context.desired, await context.measure(proposal), context.properties)
    }
  }
  const remaining = contexts.find(context => context.pending.length)
  if (!remaining) return { result, edits, preservation }
  const { property: unresolved, sample } = remaining.pending[0]
  throw failure('ERR_THEME_PRESERVATION_DIFF', `Could not preserve ${unresolved} on ${remaining.part} in ${sample.mode}/${sample.state}`)
}
