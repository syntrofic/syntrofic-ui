import { readFile } from 'node:fs/promises'
import { changePalette, generatedThemeColors, themeEditorPalette } from './theme-editor-palette.mjs'
import { themeFontPresets, themeFontStack } from './theme-fonts.mjs'

const corners = { square: 0, small: 8, medium: 14, large: 20, round: 28, pill: 45 }
const spacing = { tight: 2, compact: 3, medium: 4, roomy: 6, spacious: 9 }
const textSizes = { small: 13, medium: 15, large: 18, larger: 22 }
const borderWidths = { none: 0, thin: 1, medium: 2, thick: 3 }
const headingWeights = { light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, heavy: 800 }
const headingTracking = { tighter: -.045, tight: -.025, normal: 0, wide: .035 }
const typePresets = { compact: 13, standard: 15, editorial: 17, display: 21 }
const surfaces = ['flat', 'outlined', 'raised', 'glass']
const buttonStyles = ['solid', 'outline', 'soft', 'caps']
const badgeStyles = ['solid', 'soft', 'outline']
const appearances = ['both', 'light-only', 'dark-only']
const motionCharacters = ['crisp', 'standard', 'expressive']
const motionPreferences = ['system', 'always']
const motionTempos = { fast: .75, quick: .9, standard: 1, relaxed: 1.15, slow: 1.5 }
const tempoToken = '--sy-motion-tempo'
const motionDials = { 'motion-character': motionCharacters, 'reduced-motion': motionPreferences, 'motion-tempo': motionTempos }
export const editorDials = { corners, spacing, 'text-size': textSizes, 'border-width': borderWidths, font: themeFontPresets, shadow: ['none', 'soft'],
  'shadow-strength': 'Relative opacity, such as 125%, 75% or none', 'shadow-alpha': 'Absolute shadow opacity from 0% to 100%', name: 'Theme name',
  headings: { weight: headingWeights, tracking: headingTracking }, surfaces, buttons: buttonStyles, badges: badgeStyles, type: typePresets, mode: appearances,
  colors: ['accent', 'neutral', 'success', 'warning', 'danger', 'info'], vibrancy: '0–100', base: 'Built-in theme or none', ...motionDials }
export const editorInitialDials = ['corners', 'spacing', 'font', 'shadow', 'accent', 'neutral', 'success', 'warning', 'danger', 'info', 'vibrancy',
  'headings', 'surfaces', 'buttons', 'badges', 'type', 'text-size', 'mode']

export const editorGroups = {
  buttons: ['button-primary', 'button-secondary', 'button-ghost', 'button-danger'],
  inputs: ['field'],
  checks: ['checkbox', 'radio', 'switch'],
  containers: ['card', 'dialog', 'popover'],
  menus: ['dropdown-menu', 'selector-popup', 'multi-selector-popup', 'typeahead-dropdown', 'context-menu'],
}
export const themeInputTargets = ['input', 'textarea', 'select', 'date-input', 'number-input']
export const borderWidthToken = '--sy-border-width'
export const shadowSettings = ['shadow-strength', 'shadow-alpha']
export const themeBorderInputTargets = [...themeInputTargets, 'input-group', 'complex-selector', 'combobox', 'file-input']
const paddingInputTargets = ['typeahead', 'complex-selector', 'file-input']
const legacyProperties = { radius: 'border-radius', background: 'background', foreground: 'color' }
const cssAliases = { radius: 'border-radius', corners: 'border-radius', foreground: 'color', font: 'font-family', 'text-size': 'font-size' }
const pixelMeasurement = /^\d+(?:\.\d+)?(?:px)?$/

export function themeEditorProperty(setting) {
  return Object.hasOwn(cssAliases, setting) ? cssAliases[setting] : setting.replace(/^token:/, '')
}

export function themeEditorCommand(args) {
  return ['syntrofic', 'theme', 'editor', ...args].map(word => /^[\w./:-]+$/.test(word) ? word : `'${word.replaceAll("'", "'\\''")}'`).join(' ')
}

export function themePaginationFrames(library, theme, rules = library.resolveBrandThemeRules(theme).rules) {
  const colors = { light: library.brandThemeStyle(theme, 'light'), dark: library.brandThemeStyle(theme, 'dark') }
  return library.brandPaginationFrames(rules, colors).flatMap(({ rule, part, properties, hasEdge }) => properties.map(property => ({
    part, requested: rule.target, property, rule: library.brandRuleKey(rule), value: rule.declarations[property], hasEdge,
    ...(rule.when && { when: rule.when }), ...(rule.state && { state: rule.state }), ...(rule.mode && { mode: rule.mode }),
  })))
}

export function themeTargets(library, filter = '') {
  const terms = filter.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const targets = [...new Set([...Object.keys(library.brandPartTargets), ...Object.keys(library.brandRuleTargets)])]
  return targets.flatMap(part => {
    const { selector, components, variants, properties, family, textSize, optionText, tokenProperties, roles } = library.brandRuleTargets[part]
    if (!terms.every(term => [part, selector, ...components].some(value => value.toLowerCase().includes(term)))) return []
    const premise = Object.entries(variants ?? {}).map(([name, axis]) => [name, axis.values])
    return [{ part, selector, components, family, properties: Object.keys(properties), states: library.brandRuleStates(part), variants: Object.fromEntries(premise),
      modes: { light: ['background', 'foreground'], dark: ['background', 'foreground'] },
      ...(part.startsWith('button-') && { variant: part.slice('button-'.length) }), ...(textSize && { textSize }), ...(optionText && { optionText }),
      ...(tokenProperties && { tokenProperties }), ...(roles && { roles }),
      tokens: [...library.brandRuleTokens(part), ...(Object.hasOwn(library.brandPartTargets, part)
        ? Object.keys(legacyProperties).map(property => `--sy-brand-${part}-${property}`) : [])] }]
  })
}

export const themeAspects = {
  text: { properties: /^(?:color|font-size|font-weight|letter-spacing|line-height)$/, dials: ['text-size', 'headings', 'type'],
    tokens: /^--sy-(?:text(?:-muted)?|font-size|accent-text|accent-on)$/ },
  background: { properties: /^background(?:-|$)/, dials: ['surfaces', 'buttons', 'colors'],
    tokens: /^--sy-(?:canvas|control|surface(?:-[\w-]+)?|accent(?:-soft)?|danger-soft)$/ },
  border: { properties: /^border(?:$|-(?:width|style|color|top|right|bottom|left)$)/, dials: ['border-width'],
    tokens: /^--sy-border(?:-strong|-width)?$/ },
  corners: { properties: /^border(?:-[\w-]+)?-radius$/, dials: ['corners'], tokens: /^--sy-radius-/ },
  shadow: { properties: /^box-shadow$/, dials: ['shadow', 'shadow-strength', 'shadow-alpha'], tokens: /^--sy-shadow(?:-|$)/ },
  spacing: { properties: /^(?:padding(?:-|$)|gap$)/, dials: ['spacing'], tokens: /^--sy-space-/ },
  font: { properties: /^font-family$/, dials: ['font'], tokens: /^--sy-font(?:-body|-heading|-code)?$/ },
  size: { properties: /^(?:(?:min-)?(?:width|height)|font-size)$/, dials: ['text-size', 'type'], tokens: /^--sy-(?:control-height-|font-size$)/ },
}

export function themePropertyParts(library, property) {
  return Object.entries(library.brandRuleTargets).flatMap(([part, target]) =>
    Object.hasOwn(target.properties, property) ? [part] : [])
}

export function themePartCapabilities(library, part) {
  const target = themeTargets(library, part).find(target => target.part === part)
  if (!target) throw new Error('Unknown theme part: ' + part)
  const groups = Object.entries(themeEditorGroups(library)).flatMap(([group, parts]) => parts.includes(part) ? [group] : [])
  if (themeInputTargets.includes(part) && !groups.includes('inputs')) groups.push('inputs')
  const tokens = [
    ...Object.entries(target.tokenProperties ?? {}),
    ...Object.values(target.optionText ?? {}).map(token => [token, ['color']]),
    ...(target.textSize ? [[target.textSize.token, ['font-size']]] : []),
  ]
  const aspects = Object.fromEntries(Object.entries(themeAspects).flatMap(([aspect, definition]) => {
    const properties = target.properties.filter(property => definition.properties.test(property))
    const scopedTokens = tokens.flatMap(([token, reads]) => reads.some(property => definition.properties.test(property)) ? [token] : [])
    return properties.length || scopedTokens.length ? [[aspect, { properties, tokens: scopedTokens }]] : []
  }))
  return { ...target, groups, aspects, scope: [
    '--on ' + part,
    ...Object.entries(target.variants).flatMap(([axis, values]) => values.map(value => '--when ' + axis + ':' + value)),
    ...target.states.map(state => '--state ' + state),
  ] }
}

let stylesheetTokenReads

export async function themeTokenDetails(library, tokens, theme) {
  const matches = new Set(tokens)
  const reads = new Map(tokens.map(token => [token, []]))
  const kinds = { ...library.brandTypedTokens }
  for (const color of library.brandColors) kinds['--sy-' + color] = 'color'
  for (const [target, part] of Object.entries(library.brandRuleTargets)) {
    for (const token of new Set(library.brandRuleTokens(target))) {
      if (!matches.has(token)) continue
      reads.get(token).push(target)
      const property = part.tokenProperties?.[token]?.[0]
      kinds[token] ??= part.properties[property] ?? (part.textSize?.token === token ? 'size'
        : token === library.brandControlHeightParts[target]?.property ? 'length' : 'color')
    }
  }
  stylesheetTokenReads ??= readFile(new URL(import.meta.resolve('@syntrofic/ui/style.css')), 'utf8')
    .then(css => new Set(Array.from(css.matchAll(/\bvar\(\s*(--sy-[\w-]+)/g), match => match[1])))
  const stylesheet = await stylesheetTokenReads
  const modes = ['light', 'dark']
  const valuesOf = definition => modes.map(mode => ({ [tempoToken]: '1', ...library.resolveThemeTokens(definition, { mode }) }))
  const defaults = valuesOf()
  const effective = theme && valuesOf(theme)
  const inModes = (token, values) => Object.fromEntries(modes.flatMap((mode, index) =>
    values[index][token] === undefined ? [] : [[mode, values[index][token]]]))
  return Object.fromEntries(tokens.map(token => {
    const readBy = reads.get(token)
    return [token, { type: kinds[token] ?? 'custom-property', default: inModes(token, defaults), partCount: readBy.length,
      readBy, usedInStylesheet: stylesheet.has(token), ...(effective && { values: inModes(token, effective) }) }]
  }))
}

export function themeEditorTokenNames(library) {
  return [...new Set([
    ...Object.keys(library.brandTypedTokens),
    ...Object.keys(library.brandRuleTargets).flatMap(part => library.brandRuleTokens(part)),
  ])]
}

export function editorMotionSettings(theme) {
  return {
    'motion-tempo': Number(theme?.design?.tokens?.[tempoToken] ?? theme?.motion?.tempo ?? 1),
    'motion-character': theme?.motion?.character ?? 'standard',
    'reduced-motion': theme?.motion?.reducedMotion ?? 'system',
  }
}

export function themeEditorModes(theme) {
  switch (theme.design?.appearance) {
    case 'light-only': return ['light']
    case 'dark-only': return ['dark']
    default: return ['light', 'dark']
  }
}

const mediaParts = new Set(['button', 'lightbox', 'lightbox-caption-panel', 'dialog-header-close-icon'])

export function themePartSupportsMedia(part) {
  return mediaParts.has(part)
}

export function validateThemeEditorMode(theme, mode, part) {
  if (themePartSupportsMedia(part) && (mode === 'light' || mode === 'dark')) return
  const supported = themeEditorModes(theme)
  if (mode && !supported.includes(mode)) throw new Error(theme.id + ' has no ' + mode + ' appearance. Choose ' + supported.join(' or ') + '.')
}

export function themeConditions(input = []) {
  const tests = new Map()
  for (const text of input.flatMap(option => option.split('+'))) {
    const match = /^([a-z][a-z-]*):([a-z0-9][a-z0-9-]*)$/.exec(text.trim())
    if (!match || tests.has(match[1])) throw new Error('Use one value per condition, like --when variant:ghost+size:sm')
    tests.set(match[1], match[2])
  }
  return Object.fromEntries([...tests].sort(([a], [b]) => a.localeCompare(b)))
}

export function themeStateIncludes(state, condition) {
  return !condition || condition.split('+').every(name => state?.split('+').includes(name))
}

function compatiblePart(library, part, when, state) {
  try {
    library.normalizeBrandRule({ target: part, when, state, declarations: {} })
    return true
  } catch {
    return false
  }
}

const controlHeightGroups = new Set(['controls', 'buttons', 'inputs', 'field'])
const controlPart = (library, name) => Object.hasOwn(library.brandControlHeightParts, name) ? library.brandControlHeightParts[name] : undefined
const controlTargets = library => Object.keys(library.brandControlHeightParts).filter(part => !part.startsWith('button-'))

export function themeEditorGroups(library) {
  const groups = { ...editorGroups, controls: controlTargets(library) }
  for (const [part, target] of Object.entries(library.brandRuleTargets)) {
    for (const role of Object.keys(target.roles ?? {})) (groups[role] ??= []).push(part)
  }
  return groups
}

export function themeEditorGroupScopes(library, group, { when = {}, state, mode }, property) {
  const groups = themeEditorGroups(library)
  if (!Object.hasOwn(groups, group)) return
  const targets = group === 'inputs' && (Object.keys(when).length || state && state !== 'rest') ? themeInputTargets : groups[group]
  return targets.flatMap(target => {
    const part = library.brandRuleTargets[target]
    const role = part.roles?.[group]
    const qualifiers = role?.when ?? {}
    if (Object.entries(qualifiers).some(([axis, value]) => when[axis] !== undefined && when[axis] !== value)) return []
    const conditions = { ...qualifiers, ...when }
    if (property && !Object.hasOwn(part.properties, property) && !library.brandRuleTokens(target, conditions).includes(property)) return []
    if (role?.state && state === 'rest') return []
    const combined = new Set(state && state !== 'rest' ? state.split('+') : [])
    if (role?.state) {
      if (group === 'selected-items') combined.delete('selected')
      combined.add(role.state)
    }
    try {
      const scope = library.normalizeBrandRule({ target, when: conditions, state: [...combined].join('+') || undefined, mode, declarations: {} })
      return [{ ...scope, state: scope.state ?? state }]
    } catch { return [] }
  })
}

function sharedControlHeight(library, theme, size, value) {
  const token = '--sy-control-height-' + size
  const height = library.normalizeBrandToken(token, value)
  const changes = new Map()
  for (const [key, rule] of Object.entries(theme.rules ?? {})) {
    const control = controlPart(library, rule.target)
    const qualifiers = Object.keys(rule.when ?? {})
    if (!control?.sizes.includes(size) || rule.mode || rule.state || qualifiers.some(name => name !== 'size')
        || rule.when?.size && rule.when.size !== size) continue
    const declarations = { ...rule.declarations }
    const removed = {}
    for (const property of ['height', 'min-height', control.property, token]) {
      if (declarations[property] === undefined) continue
      removed[property] = declarations[property]
      delete declarations[property]
    }
    if (!Object.keys(removed).length) continue
    changes.set(key, { type: 'rule', key, value: { ...rule, declarations } })
    if (rule.when?.size) continue
    delete removed[token]
    if (!Object.keys(removed).length) continue
    // A legacy rule with no size qualified every size. Keep its dimensions on the other sizes.
    for (const other of control.sizes.filter(item => item !== size)) {
      const scope = { target: rule.target, when: { size: other } }
      const otherKey = library.brandRuleKey(scope)
      const precise = theme.rules?.[otherKey]?.declarations
      changes.set(otherKey, { type: 'rule', key: otherKey, value: { ...scope, declarations: { ...removed, ...precise } } })
    }
  }
  return [{ type: 'settings', value: { design: { tokens: { [token]: height } } } }, ...changes.values()]
}

function controlHeightChange(library, theme, value, options, when) {
  const control = controlPart(library, options.on)
  if (!control && !controlHeightGroups.has(options.on) || options.state || Object.keys(when).some(key => key !== 'size')) return
  const size = when.size ?? 'md'
  if (!['sm', 'md', 'lg'].includes(size) || control && !control.sizes.includes(size)) {
    throw new Error('Cannot select size:' + size + ' on ' + options.on + '. Choose ' + (control?.sizes ?? ['sm', 'md', 'lg']).join(', '))
  }
  if (options.mode) throw new Error('Control heights apply in both color modes')
  if (!options.only) return sharedControlHeight(library, theme, size, value)
  if (!control) throw new Error('--only requires one component part')
  const scope = { target: options.on, when: control.sizes.length === 1 ? undefined : { size } }
  const key = library.brandRuleKey(scope)
  const declarations = { ...theme.rules?.[key]?.declarations, [control.property]: value }
  delete declarations.height
  delete declarations['min-height']
  return [{ type: 'rule', key, value: library.normalizeBrandRule({ ...scope, declarations }) }]
}

function componentChange(library, theme, thing, value, options) {
  const when = themeConditions(options.when)
  const { on, state, mode, only } = options
  const property = themeEditorProperty(thing)
  if (mode && property === '--sy-shadow') {
    throw new Error('Mode-specific changes must be colors for theme tokens. Use box-shadow for a component shadow in one mode.')
  }
  const padding = /^padding(?:-|$)/.test(property)
  if (property === 'height') {
    const change = controlHeightChange(library, theme, value, options, when)
    if (change) return change
  }
  if (thing === 'font') value = themeFontStack(value)
  const existing = options.on === 'button' && when.variant && Object.keys(when).length === 1
    ? 'button-' + when.variant : options.on
  const legacy = property === 'background-color' ? 'background' : Object.entries(legacyProperties).find(([, name]) => name === property)?.[0]
  const oldParts = Object.hasOwn(editorGroups, existing) ? editorGroups[existing] : [existing]
  const oldScope = Object.keys(when).length === 0 || on === 'button' && Object.keys(when).length === 1 && Boolean(when.variant)
  const oldPaint = legacy === 'radius'
    ? pixelMeasurement.test(value) || Object.hasOwn(corners, value) || value === 'more' || value === 'less'
    : /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)
  const usesComponentRules = Object.values(theme.inheritedRules ?? {}).some(rule =>
    oldParts.some(part => rule.target === part || part.startsWith('button-') && rule.target === 'button'))
  if (!usesComponentRules && !only && legacy && oldScope && oldPaint
    && (!state || legacy !== 'radius' && library.brandButtonStates.includes(state) && oldParts.every(part => part.startsWith('button-')))
    && oldParts.every(part => Object.hasOwn(library.brandPartTargets, part))) {
    if (mode && (legacy === 'radius' || !['light', 'dark'].includes(mode))) throw new Error('Use --mode light or dark for part colors')
    return oldParts.map(part => {
      const current = mode ? theme.modeParts?.[mode]?.[part] : theme.parts[part]
      const style = { ...current }
      if (state) style.states = { ...current?.states, [state]: { ...current?.states?.[state], [legacy]: value } }
      else style[legacy] = legacy === 'radius' ? measurement(value, corners, current?.radius ?? theme.radius) : value
      return { type: 'part', key: part, mode, value: style }
    })
  }
  const precise = Object.keys(when).length > 0
  const structural = !Object.hasOwn(editorGroups, on) && on !== 'controls'
    ? themeEditorGroupScopes(library, on, { when, state, mode }, property) : undefined
  if (only && (structural || Object.hasOwn(editorGroups, on) || on === 'controls')) throw new Error('--only requires one component part')
  let targets = on === 'controls' ? controlTargets(library).filter(part => (!padding || part !== 'combobox') && compatiblePart(library, part, when, state))
    : Object.hasOwn(editorGroups, on) ? editorGroups[on] : [on]
  if (on === 'menus') {
    targets = targets.filter(part => compatiblePart(library, part, when, state))
    if (!targets.length && compatiblePart(library, 'menu-item', when, state)) targets = ['menu-item']
  }
  const spreadsInputs = !only && property !== 'height' && themeInputTargets.includes(on)
  if (on === 'inputs' || spreadsInputs) {
    const shadows = property === 'box-shadow' && on === 'inputs'
    const parts = shadows ? library.brandFieldShadowParts.filter(part =>
      precise || state ? part !== 'field' : !themeInputTargets.includes(part) && part !== 'tokenizer')
      : property === borderWidthToken && on === 'inputs' ? themeBorderInputTargets
        : precise || state ? themeInputTargets : editorGroups.inputs
    const candidates = padding ? [...parts, ...paddingInputTargets] : parts
    targets = candidates.filter(part => part === on || compatiblePart(library, part, when, state))
  }
  if (!only && (on === 'checks' || editorGroups.checks.includes(on))) {
    targets = editorGroups.checks.filter(part => part === on || compatiblePart(library, part, when, state))
  }
  if (!structural && property.startsWith('--sy-')) {
    targets = targets.filter(part => part === on || compatiblePart(library, part, when, state) && library.brandRuleTokens(part, when).includes(property))
    if (!targets.length) throw new Error('No part in ' + on + ' reads ' + property + ' in this scope')
  }
  const scopes = structural ?? targets.map(target => ({ target, when, state, mode }))
  if (!scopes.length) throw new Error('No part in ' + on + ' supports that property and scope')
  const changes = scopes.flatMap(scope => {
    const { target } = scope
    const key = library.brandRuleKey(scope)
    const paint = property === 'border-radius' && (Object.hasOwn(corners, value) || ['more', 'less'].includes(value) || /^\d+(?:\.\d+)?$/.test(value))
      ? measurement(value, corners, parseFloat(theme.rules?.[key]?.declarations[property]) || theme.radius) + 'px' : value
    const declarations = { ...theme.rules?.[key]?.declarations }
    if (target === 'checkbox-indicator' && (property === 'color' || property === 'background-color')) {
      delete declarations[property === 'color' ? 'background-color' : 'color']
    }
    if (property === 'padding') {
      for (const name of Object.keys(declarations).filter(name => name.startsWith('padding-'))) delete declarations[name]
    }
    const textSize = library.brandRuleTargets[target]?.textSize?.token
    if (textSize && property === 'font-size') delete declarations[textSize]
    if (textSize && property === textSize) delete declarations['font-size']
    declarations[property] = paint
    const authored = theme.inheritedRules && { ...theme.rules?.[key]?.authored, [property]: true }
    const rule = library.normalizeBrandRule({ ...scope, declarations, authored })
    if (padding) {
      const projection = library.brandPaddingProjection({ ...rule, declarations: { [property]: rule.declarations[property] } })
      if (projection) {
        const skipped = projection.policy === 'inline' && !projection.adjustments[0].inline.length
        options.reportPadding?.({ part: target, ...(rule.when && { when: rule.when }), ...(rule.state && { state: rule.state }), ...projection, skipped })
        if (skipped) return []
      }
    }
    return [{ type: 'rule', key, value: rule }]
  })
  if (!changes.length) {
    throw Object.assign(new Error(on + ' keeps its component padding on the block axis. Use padding-inline or set its height with --only.'),
      { code: 'ERR_THEME_NO_EFFECT' })
  }
  return changes
}

function measurement(value, choices, current) {
  if (Object.hasOwn(choices, value)) return choices[value]
  const values = Object.values(choices)
  if (value === 'more') return values.find(next => next > current) ?? values.at(-1)
  if (value === 'less') return [...values].reverse().find(next => next < current) ?? values[0]
  if (!pixelMeasurement.test(value)) throw new Error('Choose a named size, more, less or a value in pixels')
  return Number.parseFloat(value)
}

function changeBase(library, theme, name) {
  const preset = name => name === 'none' ? 'morandi' : name
  const current = library.createBrandTheme(theme.id, theme.name, preset(theme.design?.base ?? 'morandi'))
  const next = library.createBrandTheme(theme.id, theme.name, preset(name))
  const design = { base: name }
  const changed = Object.fromEntries(['radius', 'spacing', 'font', 'fontSize', 'borderWidth', 'shadow']
    .filter(key => theme[key] === current[key] && current[key] !== next[key]).map(key => [key, next[key]]))
  const generated = generatedThemeColors(library, theme)
  const modes = ['light', 'dark']
  const colors = modes.flatMap(mode => library.brandColors.flatMap(key => {
    const value = next.modes[mode][key]
    return theme.modes[mode][key] === current.modes[mode][key] && theme.modes[mode][key] !== value
      && !generated[mode]?.[key] && !theme.design?.palette?.exact?.[mode]?.[key] ? [{ type: 'color', mode, key, value }] : []
  }))
  return [...colors, { type: 'settings', value: { ...changed, design } }]
}

export function themeEditorChange(library, theme, thing, value, options) {
  if (!thing || !value) throw new Error('Specify a setting and its value')
  if (Object.hasOwn(motionDials, thing)) {
    if (options.on || options.when || options.state || options.only || options.mode || options.except?.length) {
      throw new Error('Motion settings apply to the entire theme')
    }
    if (thing === 'motion-tempo') {
      const current = editorMotionSettings(theme)[thing]
      const values = Object.values(motionTempos)
      const selected = value === 'more' ? values.find(tempo => tempo > current) ?? values.at(-1)
        : value === 'less' ? values.findLast(tempo => tempo < current) ?? values[0]
        : Object.hasOwn(motionTempos, value) ? motionTempos[value] : value
      const tempo = library.normalizeBrandToken(tempoToken, String(selected))
      if (Number(tempo) === current) return []
      return [{ type: 'settings', value: { design: { tokens: { [tempoToken]: tempo } } } }]
    }
    const choices = motionDials[thing]
    if (!choices.includes(value)) throw new Error('Choose ' + choices.join(', '))
    if (value === editorMotionSettings(theme)[thing]) return []
    const field = thing === 'reduced-motion' ? 'reducedMotion' : 'character'
    return [{ type: 'settings', value: { motion: { [field]: value } } }]
  }
  const role = thing === 'font' && options.on?.toLowerCase()
  if (role && Object.hasOwn(library.brandFontRoleTokens, role)) {
    if (options.when || options.state || options.only || options.mode) {
      throw new Error('Use font for the entire body, heading or code role. Use font-family for a scoped component.')
    }
    const family = library.normalizeBrandToken(library.brandFontRoleTokens[role], themeFontStack(value))
    return [{ type: 'settings', value: { design: { fonts: { [role]: family } } } }]
  }
  if (options.on) return componentChange(library, theme, thing, value,
    thing === 'corners' && options.on === 'pagination' ? { ...options, on: 'pagination-item' } : options)
  if (options.when) throw new Error('--when needs a component part')
  if (options.state) throw new Error('--state needs a component part')
  if (options.only) throw new Error('--only needs a component part')
  if (!options.mode && (library.brandPaletteFamilies.includes(thing) || thing === 'vibrancy')) return changePalette(library, theme, thing, value)
  const token = thing.replace(/^(?:token:)?(?:--sy-)?/, '')
  if (library.brandColors.includes(token)) {
    const modes = options.mode ? [options.mode] : ['light', 'dark']
    if (modes.some(mode => !['light', 'dark'].includes(mode))) throw new Error('--mode expects light or dark')
    const exact = Object.fromEntries(modes.map(mode => [mode, { [token]: value }]))
    return [...modes.map(mode => ({ type: 'color', mode, key: token, value })),
      { type: 'settings', value: { design: { palette: { exact } } } }]
  }
  const literalToken = thing.replace(/^token:/, '')
  if (library.brandShadowTokens.includes(literalToken)) {
    const modes = options.mode ? [options.mode] : ['light', 'dark']
    if (modes.some(mode => !['light', 'dark'].includes(mode))) throw new Error('--mode expects light or dark')
    const shadow = library.normalizeBrandToken(literalToken, value)
    const shadows = Object.fromEntries(modes.map(mode => [mode, { [literalToken]: shadow }]))
    return [{ type: 'settings', value: { design: { shadows } } }]
  }
  if (literalToken === borderWidthToken || literalToken === 'border-width') {
    if (options.mode) throw new Error('Border thickness applies in both color modes.')
    const named = Object.hasOwn(borderWidths, value) ? borderWidths[value] + 'px' : value
    let width = /^\d+(?:\.\d+)?$/.test(named) ? named + 'px' : named
    if (['more', 'less'].includes(value)) {
      const reading = library.resolveThemeTokens(theme, { mode: 'light' })[borderWidthToken]
      if (!/^(?:0|\d+(?:\.\d+)?px)$/.test(reading)) throw new Error('Choose an explicit width when the current value is ' + reading)
      width = Math.max(0, Math.round((parseFloat(reading) + (value === 'more' ? 1 : -1)) * 100) / 100) + 'px'
    }
    return [{ type: 'settings', value: { design: { tokens: { [borderWidthToken]: library.normalizeBrandToken(borderWidthToken, width) } } } }]
  }
  if (Object.hasOwn(library.brandTypedTokens, literalToken)) {
    if (options.mode) throw new Error('--mode applies to color settings')
    const height = /^--sy-control-height-(sm|md|lg)$/.exec(literalToken)
    if (height) return sharedControlHeight(library, theme, height[1], value)
    return [{ type: 'settings', value: { design: { tokens: { [literalToken]: library.normalizeBrandToken(literalToken, value) } } } }]
  }
  if (options.mode) throw new Error('--mode applies to color settings')
  if (thing === 'base') return changeBase(library, theme, value)
  const styleDials = { surfaces, buttons: buttonStyles, badges: badgeStyles, mode: appearances }
  if (Object.hasOwn(styleDials, thing)) {
    const choices = styleDials[thing]
    if (!choices.includes(value)) throw new Error('Choose ' + choices.join(', '))
    const setting = thing === 'mode' ? 'appearance' : thing
    return [{ type: 'settings', value: { design: { [setting]: value } } }]
  }
  if (thing === 'headings') {
    const key = Object.hasOwn(headingWeights, value) ? 'headingWeight' : 'headingTracking'
    const choice = key === 'headingWeight' ? headingWeights[value] : headingTracking[value]
    if (typeof choice !== 'number') throw new Error('Choose a heading weight or letter spacing')
    return [{ type: 'settings', value: { design: { [key]: choice } } }]
  }
  if (thing === 'type') {
    if (!Object.hasOwn(typePresets, value)) throw new Error('Choose compact, standard, editorial or display')
    return [{ type: 'settings', value: { fontSize: typePresets[value] } }]
  }
  const scales = { corners: ['radius', corners], spacing: ['spacing', spacing], 'text-size': ['fontSize', textSizes] }
  if (Object.hasOwn(scales, thing)) {
    const [key, values] = scales[thing]
    return [{ type: 'settings', value: { [key]: measurement(value, values, theme[key]) } }]
  }
  if (thing === 'shadow' && !['none', 'soft'].includes(value)) throw new Error('Shadow expects none or soft')
  if (thing === 'font') value = themeFontStack(value)
  if (['font', 'name', 'shadow', 'voice'].includes(thing)) return [{ type: 'settings', value: { [thing]: value } }]
  throw new Error('Unknown theme setting: ' + thing)
}

function themeEditorSettings(library, theme, base, registered) {
  const result = []
  const generated = generatedThemeColors(library, theme)
  const compare = (setting, source, path, scope = {}) => {
    const value = fieldValue(theme, path)
    const authored = registered && fieldValue(registered, path) !== value
    const explicit = path[0] === 'rules' && theme.rules?.[path[1]]?.authored?.[path[3]]
    if (value !== undefined && (authored || explicit || fieldValue(base, path) !== value)) {
      result.push({ setting, value, source, ...scope, ...(authored && { authored: true }) })
    }
  }
  const dials = {
    corners: ['radius'], spacing: ['spacing'], font: ['font'], 'text-size': ['fontSize'], 'border-width': ['borderWidth'], shadow: ['shadow'],
    mode: ['design', 'appearance'], surfaces: ['design', 'surfaces'], buttons: ['design', 'buttons'], badges: ['design', 'badges'],
    'headings-weight': ['design', 'headingWeight'], 'headings-tracking': ['design', 'headingTracking'],
    vibrancy: ['design', 'palette', 'vibrancy'],
    'motion-tempo': ['motion', 'tempo'], 'motion-character': ['motion', 'character'], 'reduced-motion': ['motion', 'reducedMotion'],
  }
  const preset = theme.design?.base ?? 'morandi'
  result.push({ setting: 'base', value: preset, source: 'dial', ...(registered?.design?.base && registered.design.base !== preset && { authored: true }) })
  for (const [setting, path] of Object.entries(dials)) compare(setting, 'dial', path)
  for (const [role, token] of Object.entries(library.brandFontRoleTokens)) {
    compare('font', 'dial', ['design', 'fonts', role], { role, token })
  }
  for (const family of library.brandPaletteFamilies) compare(family, 'dial', ['design', 'palette', 'seeds', family])
  for (const token of Object.keys(theme.design?.tokens ?? {}).sort()) compare(token, 'token', ['design', 'tokens', token])
  for (const mode of ['light', 'dark']) {
    for (const token of library.brandShadowTokens) compare(token, 'token', ['design', 'shadows', mode, token], { mode })
    for (const key of library.brandColors) {
      const path = ['modes', mode, key]
      if (theme.design?.palette?.exact?.[mode]?.[key] !== undefined) {
        result.push({ setting: '--sy-' + key, source: 'token', mode, value: theme.modes[mode][key],
          ...(registered && fieldValue(registered, path) !== theme.modes[mode][key] && { authored: true }) })
      } else if (generated[mode]?.[key] !== theme.modes[mode][key]) compare('--sy-' + key, 'token', path, { mode })
    }
  }
  const partSources = [[undefined, theme.parts, ['parts']],
    ...['light', 'dark'].map(mode => [mode, theme.modeParts?.[mode], ['modeParts', mode]])]
  for (const [mode, parts, root] of partSources) {
    for (const [part, style] of Object.entries(parts ?? {})) {
      const scope = { part, ...(mode && { mode }) }
      for (const [key, property] of Object.entries(legacyProperties)) compare(property, 'property', [...root, part, key], scope)
      for (const [state, colors] of Object.entries(style.states ?? {})) {
        for (const key of Object.keys(colors)) compare(legacyProperties[key], 'property', [...root, part, 'states', state, key], { ...scope, state })
      }
    }
  }
  for (const [key, rule] of Object.entries(theme.rules ?? {})) {
    const { target: part, when, mode, state } = rule
    const scope = { part, ...(when && { when }), ...(mode && { mode }), ...(state && { state }) }
    const { textSize, optionText } = library.brandRuleTargets[part]
    for (const name of Object.keys(rule.declarations)) {
      compare(name, name.startsWith('--sy-') ? 'token' : 'property', ['rules', key, 'declarations', name],
        name === 'font-size' && textSize ? { ...scope, token: textSize.token }
          : name === 'color' && optionText ? { ...scope, tokens: Object.values(optionText) } : scope)
    }
  }
  return result
}

export function themeEditorReport(library, theme, history = [], registered, originalTheme) {
  const resolved = Object.fromEntries(['light', 'dark'].map(mode => [mode, library.resolveThemeTokens(theme, { mode })]))
  const { rules, lifted } = library.resolveBrandThemeRules(theme)
  const contrast = Object.entries(resolved).flatMap(([mode, tokens]) => lowContrast(library, mode, tokens, rules))
  const preset = theme.design?.base ?? 'morandi'
  const base = originalTheme ?? {
    ...library.createBrandTheme('contrast-base', 'Contrast baseline', preset === 'none' ? 'morandi' : preset), rules: theme.inheritedRules,
  }
  const baseline = new Map(['light', 'dark'].flatMap(mode => lowContrast(library, mode, library.resolveThemeTokens(base, { mode }),
    base.rules ?? rules, !base.rules))
    .map(problem => [`${problem.mode}/${problem.target}`, problem.ratio]))
  const introducedContrast = contrast.filter(problem => problem.ratio < (baseline.get(`${problem.mode}/${problem.target}`) ?? 4.5))
  const navigationReach = library.brandNavigationReach(rules)
  const paginationFrames = themePaginationFrames(library, theme, rules)
  const paddingAdjustments = Object.values(theme.rules ?? {}).flatMap(rule => {
    const projection = library.brandPaddingProjection(rule)
    return projection ? [{ part: rule.target, ...(rule.when && { when: rule.when }), ...(rule.state && { state: rule.state }), ...projection }] : []
  })
  const fontRoles = Object.fromEntries(Object.entries(library.brandFontRoleTokens).map(([role, token]) => {
    const roleFamily = theme.design?.fonts?.[role]
    const exact = theme.design?.tokens?.[token]
    const inherited = role !== 'code' && theme.design?.tokens?.['--sy-font']
    return [role, { token, family: resolved.light[token], source: exact ? 'token' : roleFamily ? 'role' : inherited ? 'token' : role === 'code' ? 'default' : 'font',
      ...(exact && roleFamily && { roleFamily }) }]
  }))
  return { theme, settings: themeEditorSettings(library, theme, base, registered), motionSettings: editorMotionSettings(theme),
    fontRoles,
    ...(lifted.length && { lifted }),
    ...(paddingAdjustments.length && { paddingAdjustments }),
    ...(paginationFrames.length && { paginationFrames }),
    ...(navigationReach && { navigationReach }), layoutIssues: barLayoutIssues(theme.id, rules, navigationReach),
    history: history.map(({ label, revision }) => ({ label, revision })),
    tokens: { light: library.brandThemeStyle(theme, 'light'), dark: library.brandThemeStyle(theme, 'dark') },
    resolved, contrast, introducedContrast, ...themeEditorPalette(library, theme),
    rebuild: 'syntrofic theme build ' + theme.id }
}

function lowContrast(library, mode, tokens, rules, baseline = false) {
  const values = { primary: ['accent-on', 'accent', 'accent-hover'], secondary: ['text', 'surface-muted', 'border'],
    ghost: ['text', 'canvas', 'surface-muted'], danger: ['danger-on', 'danger', 'danger-hover'] }
  const read = name => tokens['--sy-' + name]
  const pairs = [
    ['正文', read('text'), read('canvas')], ['辅助文字', read('text-muted'), read('canvas')],
    ['成功提示', read('success'), read('success-soft')], ['警告提示', read('warning'), read('warning-soft')],
    ['错误提示', read('danger'), read('danger-soft')], ['信息提示', read('info'), read('info-soft')],
  ]
  for (const [variant, [ink, fill, hover]] of Object.entries(values)) {
    const part = 'brand-button-' + variant
    const primary = variant === 'primary'
    const foreground = read(part + '-foreground') ?? (primary ? read('design-primary-fg') : undefined) ?? read(ink)
    const fillValue = read(part + '-background') ?? (primary ? read('design-primary-bg') : undefined) ?? read(fill)
    const background = fillValue === 'transparent' ? read('canvas') : fillValue
    pairs.push([variant, foreground, background])
    for (const state of ['hover', 'active', 'focus-visible']) {
      const stateForeground = read(part + '-' + state + '-foreground')
      const stateBackground = read(part + '-' + state + '-background')
      if (stateForeground || stateBackground) {
        const fallback = state === 'hover' ? read(part + '-hover') ?? (primary ? read('design-primary-hover') : undefined) ?? read(hover) : background
        pairs.push([variant + ' / ' + state, stateForeground ?? foreground, stateBackground ?? fallback])
      }
    }
  }
  pairs.push(...partContrastPairs(library, mode, tokens, rules, baseline))
  return pairs.flatMap(([target, foreground, background]) => {
    const ratio = library.colorContrast(foreground, background)
    return ratio !== undefined && ratio < 4.5 ? [{ mode, target, ratio, foreground, background }] : []
  })
}

const partPaint = {
  card: ['text', 'surface'], dialog: ['text', 'surface'], 'dialog-header': ['text', 'surface'], 'dialog-header-title-block': ['text', 'surface'],
  popover: ['text', 'canvas'], tooltip: ['canvas', 'text'], body: ['text', 'canvas'], code: ['text', 'surface-muted'], heading: ['text', 'canvas'],
  badge: ['text-muted', 'surface-muted'], 'app-shell-header': ['text', 'canvas'], 'layout-header': ['text', 'canvas'], 'top-nav': ['text', 'canvas'],
  'top-nav-item': ['text', 'canvas'],
  'menu-item': ['text', 'surface-muted'], 'selector-option-row': ['text', 'surface-muted'],
  'typeahead-option': ['text', 'canvas'], 'combobox-option': ['text', 'surface-muted'], 'listbox-option': ['text', 'canvas'],
  tab: ['text', 'canvas'], 'table-row': ['text', 'canvas'],
  field: ['text', 'control'], input: ['text', 'control'], textarea: ['text', 'control'], select: ['text', 'control'],
  'date-input': ['text', 'control'], 'number-input': ['text', 'control'],
}
const buttonPaint = { primary: ['accent-on', 'accent'], secondary: ['text', 'surface-muted'], ghost: ['text', 'canvas'], danger: ['danger-on', 'danger'] }
const isButton = target => target === 'button' || Object.hasOwn(buttonPaint, target.replace(/^button-/, ''))

function partContrastPairs(library, mode, tokens, definitions, baseline) {
  const rules = Object.values(definitions ?? {}).filter(rule => !rule.mode || rule.mode === mode).sort(library.compareBrandRules)
  const contexts = new Map()
  for (const rule of rules) {
    if (!Object.hasOwn(partPaint, rule.target) && !isButton(rule.target)) continue
    const variants = rule.target === 'button' && !rule.when?.variant ? Object.keys(buttonPaint) : [undefined]
    for (const variant of variants) {
      const target = isButton(rule.target) ? 'button' : rule.target
      const when = target === 'button' ? { variant: rule.when?.variant ?? variant ?? rule.target.slice('button-'.length), ...rule.when } : rule.when
      const key = [target, ...Object.entries(when ?? {}).sort().map(([axis, value]) => axis + ':' + value), rule.state].filter(Boolean).join(' / ')
      contexts.set(key, { target, when, state: rule.state })
    }
  }
  return [...contexts].flatMap(([key, context]) => {
    const { target, when, state } = context
    const color = target === 'button' ? buttonPaint[when.variant] : partPaint[target]
    const row = library.brandRuleTargets[target]?.optionText
    if (!color || row && state === 'disabled') return []
    const matching = baseline ? [] : rules.filter(rule => {
      const matches = rule.target === target || target === 'button' && rule.target === 'button-' + when?.variant
        || ['input', 'textarea', 'select', 'date-input', 'number-input'].includes(target) && rule.target === 'field'
      return matches && (themeStateIncludes(state, rule.state) || state === 'active' && rule.state === 'hover')
        && Object.entries(rule.when ?? {}).every(([axis, value]) => when?.[axis] === value)
    })
    const declarations = {}
    for (const rule of matching) {
      for (const [property, value] of library.brandRuleDeclarations(rule)) {
        declarations[property === 'background-color' ? 'background' : property] = value
      }
    }
    const paint = value => {
      for (let depth = 0; depth < 8; depth++) {
        const expr = /^var\((--sy-[\w-]+)(?:,\s*(.+))?\)$/.exec(value ?? '')
        if (!expr) return value
        value = declarations[expr[1]] ?? tokens[expr[1]] ?? expr[2]
      }
    }
    const part = target === 'button' ? '--sy-brand-button-' + when.variant : null
    const outlined = part && declarations['button-style'] === 'outline'
    const outlineInk = when?.variant === 'primary' ? 'accent-text' : when?.variant === 'danger' ? 'danger' : 'text'
    const highlighted = row && state === 'highlighted'
    const panel = 'var(--sy-' + color[1] + ')'
    const fill = declarations.background ?? (outlined ? 'transparent' : part ? tokens[part + '-background'] : undefined)
      ?? (highlighted ? 'var(--sy-accent-soft)' : panel)
    const ink = (row ? declarations[row.label] : declarations.color)
      ?? (outlined ? 'var(--sy-' + outlineInk + ')' : part ? tokens[part + '-foreground'] : undefined)
      ?? (highlighted && target !== 'selector-option-row' || row && state === 'selected' && target === 'selector-option-row'
        ? 'var(--sy-accent-text)' : 'var(--sy-' + color[0] + ')')
    const background = paint(fill)
    const foreground = paint(ink)
    const surface = background === 'transparent' ? (row ? paint(panel) : tokens['--sy-canvas']) : background
    return [[key, foreground, surface], ...(row ? [[key + ' / description', paint(declarations[row.description] ?? 'var(--sy-text-muted)'), surface]] : [])]
  })
}

function fixedPixels(value) {
  if (value === '0') return 0
  if (/^\d+(?:\.\d+)?px$/.test(value ?? '')) return Number.parseFloat(value)
}

function barLayoutIssues(id, rules, reach) {
  if (!reach) return []
  const navigation = rules?.['top-nav-both-base']?.declarations ?? {}
  const minimum = Math.max(fixedPixels(navigation.height) ?? 0, fixedPixels(navigation['min-height']) ?? 0)
  const item = rules?.['top-nav-item-both-base']?.declarations
  const itemPadding = (fixedPixels(reach.item.start) ?? 0) + (fixedPixels(reach.item.end) ?? 0)
  const itemBorder = item?.border?.split(/\s+/).map(fixedPixels).find(Number.isFinite) ?? 0
  const itemLine = fixedPixels(item?.['line-height'])
  const itemHeight = Math.max(fixedPixels(item?.height) ?? 0, fixedPixels(item?.['min-height']) ?? 0,
    itemLine === undefined ? 0 : itemLine + itemPadding + 2 * itemBorder)
  return reach.bars.flatMap(bar => {
    const height = fixedPixels(bar.height)
    const top = fixedPixels(bar.start)
    const bottom = fixedPixels(bar.end)
    if (height === undefined || top === undefined || bottom === undefined) return []
    const padding = top + bottom
    const available = Math.max(0, height - padding)
    const prefix = 'syntrofic experimental theme editor set ' + id
    const largerBar = needed => prefix + ' height ' + (needed + padding) + 'px --on ' + bar.part
    return [
      ...(minimum > available ? [{ part: 'top-nav', bar: bar.part, height: minimum, available, fix: largerBar(minimum) }] : []),
      ...(itemHeight > available ? [{ part: 'top-nav-item', bar: bar.part, height: itemHeight, available, fix: largerBar(itemHeight) }] : []),
    ]
  })
}

const fieldValue = (value, path) => path.reduce((record, key) => record?.[key], value)
const changeScope = (thing, options) => JSON.stringify([thing, thing === 'font' && options.on ? options.on.toLowerCase() : options.on,
  Object.entries(themeConditions(options.when)).map(([name, value]) => name + ':' + value), options.mode,
  ...(options.state ? [options.state] : []), ...(options.only ? ['only'] : []),
  ...(options.except?.length ? [['except', [...new Set(options.except)].sort()]] : [])])

function themeEditorFields(before, after, changes) {
  function leaves(value, path) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? Object.entries(value).flatMap(([key, child]) => leaves(child, [...path, key])) : [path]
  }
  return changes.flatMap(change => {
    if (change.type === 'settings') return Object.keys(change.value).flatMap(key => key === 'design' || key === 'motion'
      ? leaves(change.value[key], [key]) : [[key]])
    if (change.type === 'color') return [['modes', change.mode, change.key]]
    if (change.type === 'rule') return ['declarations', 'authored'].flatMap(field =>
      [...new Set([...Object.keys(before.rules?.[change.key]?.[field] ?? {}), ...Object.keys(change.value[field] ?? {})])]
        .map(name => ['rules', change.key, field, name]))
    const root = change.mode ? ['modeParts', change.mode, change.key] : ['parts', change.key]
    return Object.entries(change.value).flatMap(([key, value]) => key === 'states'
      ? Object.entries(value).flatMap(([state, colors]) => Object.keys(colors).map(property => [...root, key, state, property]))
      : [[...root, key]])
  }).filter(path => fieldValue(before, path) !== fieldValue(after, path))
}

export function themeEditorUndo(library, theme, history, thing, options) {
  const scope = changeScope(thing, options)
  const heading = options.heading ?? (thing === 'headings' && theme.design?.headingWeight !== undefined ? 'headingWeight' : undefined)
  const matches = note => note.scope === scope && Array.isArray(note.fields) && (!heading || note.fields.some(path => path[0] === 'design' && path[1] === heading))
  const index = history.findLastIndex(matches)
  const edit = history[index]
  if (!edit) throw new Error('No recorded change matches that setting and scope')
  const later = new Set(history.slice(index + 1).flatMap(note => Array.isArray(note.fields) ? note.fields.map(path => JSON.stringify(path)) : []))
  const fields = edit.fields.filter(path => Array.isArray(path) && path.length && path.every(key => typeof key === 'string'
    && /^(?:[a-z][\w-]*|--sy-[a-z\d-]+)$/i.test(key) && !['constructor', 'prototype'].includes(key)) && !later.has(JSON.stringify(path)))
  if (options.expected !== undefined) {
    const same = value => String(value).toLowerCase() === options.expected.toLowerCase()
    if (!fields.length || !(edit.value !== undefined ? same(edit.value) : fields.every(path => same(fieldValue(theme, path))))) {
      throw new Error('The named setting has a different value')
    }
  }
  const restored = structuredClone(theme)
  const applied = new Map()
  function earlier(path) {
    let previous = edit
    const encoded = JSON.stringify(path)
    for (let cursor = index - 1; cursor >= 0; cursor--) {
      const candidate = history[cursor]
      if (!Array.isArray(candidate.fields) || !candidate.fields.some(field => JSON.stringify(field) === encoded)) continue
      if (candidate.scope !== scope) break
      previous = candidate
    }
    return previous.theme
  }
  function replace(path, value) {
    const destination = path.slice(0, -1).reduce((record, key) => (record[key] ??= {}), restored)
    if (value === undefined) delete destination[path.at(-1)]
    else destination[path.at(-1)] = value
    applied.set(path.join('.'), value ?? null)
  }
  if (!fields.length) throw new Error('Later changes already replaced that setting')
  for (const path of fields) {
    const source = earlier(path)
    const value = fieldValue(source, path)
    if (path[0] === 'rules' && path[2] === 'declarations' && value !== undefined && !restored.rules?.[path[1]]) {
      const rules = restored.rules ??= {}
      rules[path[1]] = { ...source.rules[path[1]], declarations: {} }
    }
    replace(path, value)
  }
  const family = library.brandPaletteFamilies.includes(thing) && !options.on && !options.mode
  if (family || thing === 'vibrancy') {
    const palette = restored.design?.palette
    if (family && palette?.vibrancy !== undefined && !Object.keys(palette.seeds ?? {}).length) {
      const path = ['design', 'palette', 'vibrancy']
      replace(path, undefined)
      fields.push(path)
    }
    const source = generatedThemeColors(library, theme)
    const destination = generatedThemeColors(library, restored)
    const previous = family ? earlier(['design', 'palette', 'seeds', thing]) : undefined
    for (const [mode, colors] of Object.entries(source)) {
      for (const [key, current] of Object.entries(colors)) {
        if (palette?.exact?.[mode]?.[key] || theme.modes[mode][key] !== current) continue
        const value = destination[mode]?.[key] ?? previous?.modes?.[mode]?.[key]
        if (restored.modes[mode][key] === value) continue
        const path = ['modes', mode, key]
        replace(path, value)
        if (!fields.some(field => field.join('.') === path.join('.'))) fields.push(path)
      }
    }
  }
  return { theme: restored, fields, applied: [...applied].map(([path, value]) => ({ path, value })) }
}

export function themeEditorEntry(thing, options, before, after, changes, value) {
  const fields = themeEditorFields(before, after, changes)
  if (value !== undefined) {
    const recorded = new Set(fields.map(path => JSON.stringify(path)))
    for (const [root, key, area, property] of fields) {
      if (root !== 'rules' || area !== 'declarations' || !after.rules?.[key]?.authored?.[property]) continue
      const authorship = [root, key, 'authored', property]
      if (!recorded.has(JSON.stringify(authorship))) fields.push(authorship)
    }
  }
  return { scope: changeScope(thing, options), fields, value }
}
