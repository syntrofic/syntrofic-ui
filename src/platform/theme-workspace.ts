import { defineSyntaxTheme, syntaxStyle, type SyntaxThemeDefinition } from '../internal/syntax-theme'
import { dataColorNames, legacyChartColorNames } from '../internal/data-colors'
import { motionSprings, motionSpringToken, normalizeSpring, springFromPhysics, type MotionSpringName, type SpringDescription } from '../internal/motion-physics'
import { motionCurveCSS, motionDurationTokens, type MotionRole, type MotionTiming } from '../internal/motion-timing'
import type { ReducedMotionPolicy } from '../internal/reduced-motion'
import { brandFontRoleTokens, brandRuleKey, brandRuleStyle, brandShadowTokens, normalizeBrandRule, normalizeBrandToken, resolveBrandThemeRules, type BrandComponentRule } from './brand-rules'

export const brandColors = ['canvas', 'surface', 'surface-subtle', 'surface-muted', 'surface-sage', 'surface-blue', 'surface-clay', 'surface-lavender', 'control', 'text', 'text-muted',
  'border', 'border-strong', 'accent', 'accent-hover', 'accent-on', 'accent-soft', 'accent-text', 'focus',
  'success-soft', 'success', 'warning-soft', 'warning', 'danger-soft', 'danger', 'danger-hover', 'danger-on', 'info', 'info-soft',
  ...dataColorNames, ...legacyChartColorNames] as const
export type BrandColor = typeof brandColors[number]
export type BrandMode = 'light' | 'dark'
export const standardBrandPresets = ['neutral', 'stone', 'matcha', 'chocolate', 'butter', 'gothic', 'y2k'] as const
export type StandardBrandPreset = typeof standardBrandPresets[number]
export type BrandPreset = 'morandi' | 'slate' | 'mist' | 'clay' | StandardBrandPreset
export const standardBrandNames: Readonly<Record<StandardBrandPreset, string>> = Object.freeze({
  neutral: '中性灰', stone: '岩灰蓝', matcha: '抹茶绿', chocolate: '可可棕', butter: '奶油黄', gothic: '墨蓝紫', y2k: '复古粉',
})
export type BrandPart = keyof typeof brandPartTargets
export const brandButtonStates = ['hover', 'active', 'focus-visible', 'disabled'] as const
export type BrandButtonState = typeof brandButtonStates[number]
export interface BrandPartColors { background?: string; foreground?: string }
export interface BrandPartStyle extends BrandPartColors {
  radius?: number
  states?: Partial<Record<BrandButtonState, BrandPartColors>>
}
export interface BrandMotion {
  tempo?: number
  reducedMotion?: ReducedMotionPolicy
  character?: 'crisp' | 'standard' | 'expressive'
  timings?: Partial<Record<MotionRole, MotionTiming>>
  springs?: Partial<Record<MotionSpringName, Readonly<SpringDescription>>>
}
export interface BrandMediaStyle { colors?: Partial<Record<BrandColor, string>>; parts?: Partial<Record<BrandPart, BrandPartStyle>> }
export const brandPaletteFamilies = ['accent', 'neutral', 'success', 'warning', 'danger', 'info'] as const
export type BrandPaletteFamily = typeof brandPaletteFamilies[number]
export type BrandFontRole = keyof typeof brandFontRoleTokens
export interface BrandPaletteSettings {
  vibrancy?: number
  seeds?: Partial<Record<BrandPaletteFamily, string>>
  exact?: Partial<Record<BrandMode, Partial<Record<BrandColor, string>>>>
}
export interface BrandDesign {
  base?: BrandPreset | 'none'
  appearance?: 'both' | 'light-only' | 'dark-only'
  headingWeight?: number
  headingTracking?: number
  fonts?: Partial<Record<BrandFontRole, string>>
  shadows?: Partial<Record<BrandMode, Partial<Record<typeof brandShadowTokens[number], string>>>>
  surfaces?: 'flat' | 'outlined' | 'raised' | 'glass'
  buttons?: 'solid' | 'outline' | 'soft' | 'caps'
  badges?: 'solid' | 'soft' | 'outline'
  palette?: BrandPaletteSettings
  tokens?: Readonly<Record<string, string>>
}
export interface BrandTheme {
  version: 1
  id: string
  name: string
  revision: number
  modes: Record<BrandMode, Partial<Record<BrandColor, string>>>
  font: string
  radius: number
  spacing: number
  fontSize: number
  borderWidth: number
  shadow: 'none' | 'soft'
  design?: BrandDesign
  motion?: BrandMotion
  syntax?: SyntaxThemeDefinition
  media?: Partial<Record<BrandMode, BrandMediaStyle>>
  parts: Partial<Record<BrandPart, BrandPartStyle>>
  modeParts?: Partial<Record<BrandMode, Partial<Record<BrandPart, BrandPartStyle>>>>
  rules?: Readonly<Record<string, BrandComponentRule>>
  inheritedRules?: Readonly<Record<string, BrandComponentRule>>
  voice: string
  assets: readonly { label: string; url: string; license?: string }[]
  source?: string
}
export interface BrandThemeDefinition extends Omit<Partial<BrandTheme>, 'id' | 'modes'> {
  id: string
  base?: BrandPreset | BrandTheme
  modes?: Partial<BrandTheme['modes']>
}
export type BrandChange =
  | { type: 'color'; mode: BrandMode; key: BrandColor; value: string | undefined }
  | { type: 'part'; key: BrandPart; value: BrandPartStyle; mode?: BrandMode }
  | { type: 'rule'; key: string; value: BrandComponentRule }
  | { type: 'settings'; value: Partial<Pick<BrandTheme, 'name' | 'font' | 'radius' | 'spacing' | 'fontSize' | 'borderWidth' | 'shadow' | 'design' | 'motion' | 'syntax' | 'media' | 'voice' | 'assets' | 'source'>> }
export interface BrandPatch { revision: number; changes: readonly BrandChange[] }

const palette: Record<BrandPreset, [string, string, string, string]> = {
  morandi: ['#425849', '#a8bda9', '#ffffff', '#1d1e1f'],
  slate: ['#3f5861', '#adbec9', '#f2f3ef', '#1e2529'],
  mist: ['#51647c', '#b4c6e0', '#f1f3f7', '#20252d'],
  clay: ['#744f45', '#d5aaa0', '#fbf2eb', '#28201e'],
  neutral: ['#4d514c', '#c1c6bd', '#ffffff', '#20211f'],
  stone: ['#4b5661', '#bdc9d6', '#ffffff', '#24282d'],
  matcha: ['#42614c', '#b6cfb7', '#ffffff', '#202922'],
  chocolate: ['#704d42', '#dfb9a7', '#ffffff', '#2b211e'],
  butter: ['#355e79', '#bbcfe9', '#ffffff', '#242b36'],
  gothic: ['#494b6c', '#c4c4e4', '#ffffff', '#222432'],
  y2k: ['#8a3764', '#efb0d1', '#ffffff', '#2d2330'],
}
const defaultFont = 'Arial, Arimo Variable, Microsoft YaHei, Noto Sans SC Variable, Noto Sans CJK SC, sans-serif'
const defaultCodeFont = 'ui-monospace, SFMono-Regular, Consolas, monospace'
const defaultShadows = { '--sy-shadow-low': 'var(--sy-default-shadow-low)', '--sy-shadow-med': 'var(--sy-default-shadow-med)',
  '--sy-shadow-high': 'var(--sy-default-shadow-high)' }
const presetSettings: Record<BrandPreset, Pick<BrandTheme, 'font' | 'radius' | 'spacing' | 'borderWidth' | 'shadow'>> = {
  morandi: { font: defaultFont, radius: 18, spacing: 4, borderWidth: 0, shadow: 'none' },
  slate: { font: defaultFont, radius: 13, spacing: 4, borderWidth: 0, shadow: 'none' },
  mist: { font: defaultFont, radius: 21, spacing: 5, borderWidth: 0, shadow: 'none' },
  clay: { font: defaultFont, radius: 16, spacing: 5, borderWidth: 0, shadow: 'none' },
  neutral: { font: defaultFont, radius: 15, spacing: 4, borderWidth: 0, shadow: 'none' },
  stone: { font: defaultFont, radius: 12, spacing: 4, borderWidth: 0, shadow: 'none' },
  matcha: { font: defaultFont, radius: 18, spacing: 4, borderWidth: 0, shadow: 'none' },
  chocolate: { font: defaultFont, radius: 14, spacing: 5, borderWidth: 0, shadow: 'none' },
  butter: { font: defaultFont, radius: 21, spacing: 4, borderWidth: 0, shadow: 'none' },
  gothic: { font: defaultFont, radius: 8, spacing: 4, borderWidth: 1, shadow: 'none' },
  y2k: { font: defaultFont, radius: 24, spacing: 4, borderWidth: 1, shadow: 'none' },
}
const standardSurfaces: Partial<Record<BrandPreset, [string, string, string, string]>> = {
  neutral: ['#f3f3f0', '#2c2d2a', '#e6e8e3', '#373a35'],
  stone: ['#eff1f3', '#2d333b', '#e4e9ed', '#3b4550'],
  matcha: ['#eef3ea', '#2d382e', '#dbe8d8', '#384a3b'],
  chocolate: ['#f6ede8', '#372d29', '#eee0d8', '#4b3b34'],
  butter: ['#faf3db', '#333744', '#f3e8bd', '#3b4559'],
  gothic: ['#f0eff5', '#2b2c3c', '#e6e4ee', '#3a3c55'],
  y2k: ['#fbecf4', '#402e3e', '#f7daeb', '#503649'],
}
export const brandPartTargets = Object.freeze({
  'button-primary': ".sy-button[data-variant='primary']",
  'button-secondary': ".sy-button[data-variant='secondary']",
  'button-ghost': ".sy-button[data-variant='ghost']",
  'button-danger': ".sy-button[data-variant='danger']",
  card: '.sy-card', field: '.sy-field__control', dialog: '.sy-dialog__panel',
  badge: '.sy-badge', tooltip: '.sy-tooltip', popover: '.sy-popover:not([data-bare])',
})
const layout = { radius: [0, 45], spacing: [1, 14], fontSize: [10, 32], borderWidth: [0, 6] } as const
const surfaceStyles = {
  flat: { '--sy-design-surface-outline': 'none', '--sy-design-surface-shadow': 'none' },
  outlined: { '--sy-design-surface-outline-color': 'var(--sy-border-strong)', '--sy-design-surface-shadow': 'none' },
  raised: { '--sy-design-surface-outline': 'none', '--sy-design-surface-shadow': '0 8px 24px color-mix(in srgb, var(--sy-text) 14%, transparent)' },
  glass: { '--sy-design-surface-fill': 'color-mix(in srgb, var(--sy-surface) 78%, transparent)', '--sy-design-surface-filter': 'blur(12px)' },
}
const buttonStyles = {
  solid: {},
  outline: { '--sy-design-primary-bg': 'transparent', '--sy-design-primary-fg': 'var(--sy-accent-text)',
    '--sy-design-primary-border': 'var(--sy-accent)', '--sy-design-primary-hover': 'var(--sy-accent-soft)' },
  soft: { '--sy-design-primary-bg': 'var(--sy-accent-soft)', '--sy-design-primary-fg': 'var(--sy-accent-text)',
    '--sy-design-primary-hover': 'color-mix(in srgb, var(--sy-accent-soft) 85%, var(--sy-accent))' },
  caps: { '--sy-design-button-case': 'uppercase' },
}
const solidBadgeColors = {
  neutral: ['text-muted', 'canvas'], accent: ['accent', 'accent-on'], success: ['success', 'canvas'],
  warning: ['warning', 'canvas'], danger: ['danger', 'danger-on'],
}
const badgeStyles = {
  soft: {},
  solid: Object.fromEntries(Object.entries(solidBadgeColors).flatMap(([tone, [fill, ink]]) => [
    [`--sy-design-badge-${tone}-fill`, `var(--sy-${fill})`], [`--sy-design-badge-${tone}-ink`, `var(--sy-${ink})`],
  ])),
  outline: { '--sy-design-badge-fill': 'transparent', '--sy-design-badge-outline-color': 'currentColor' },
}
const characters = {
  crisp: ['cubic-bezier(.18, .76, .22, 1)', 'cubic-bezier(.45, .03, .82, .48)'],
  standard: ['cubic-bezier(.23, .72, .24, 1)', 'cubic-bezier(.44, .05, .72, .48)'],
  expressive: ['cubic-bezier(.2, .84, .28, 1.06)', 'cubic-bezier(.48, .04, .78, .42)'],
}
function brandMotionTokens(motion: BrandMotion | undefined) {
  const style: Record<string, string> = {}
  for (const [role, timing] of Object.entries(motion?.timings ?? {})) {
    if (!Object.hasOwn(motionDurationTokens, role) || !timing) throw new TypeError('Unknown motion timing: ' + role)
    if (timing.duration !== undefined) {
      if (!Number.isFinite(timing.duration) || timing.duration < 0) throw new RangeError('Expected a finite motion duration')
      style['--sy-motion-duration-' + role] = timing.duration + 'ms'
    }
    if (timing.curve) style['--sy-ease-' + role] = motionCurveCSS(timing.curve)
  }
  for (const [name, value] of Object.entries(motion?.springs ?? {})) {
    if (!Object.hasOwn(motionSprings, name) || !value) throw new TypeError('Unknown motion spring: ' + name)
    const { mass, stiffness, damping } = springFromPhysics({ ...normalizeSpring(value), allowOverdamping: true })
    style[motionSpringToken(name as MotionSpringName)] = `${mass} ${stiffness} ${damping}`
  }
  return style
}
function color(input: string) {
  if (/^#[\da-f]{6}$/i.test(input)) return input.toLowerCase()
  if (/^#[\da-f]{3}$/i.test(input)) return '#' + [...input.slice(1)].map(value => value.repeat(2)).join('').toLowerCase()
  throw new TypeError('Expected a hexadecimal color')
}
function blend(first: string, second: string, share: number) {
  const start = color(first)
  const end = color(second)
  return '#' + [1, 3, 5].map(index => {
    const a = Number.parseInt(start.slice(index, index + 2), 16)
    const b = Number.parseInt(end.slice(index, index + 2), 16)
    return Math.round(a + (b - a) * share).toString(16).padStart(2, '0')
  }).join('')
}
function font(input: string) {
  if (!/^[\p{L}\p{N} ,'".-]{1,100}$/u.test(input)) throw new TypeError('Invalid font name')
  return input
}
function partColors(input: BrandPartColors) {
  return {
    ...(input.background !== undefined && { background: color(input.background) }),
    ...(input.foreground !== undefined && { foreground: color(input.foreground) }),
  }
}
function part(key: BrandPart, input: BrandPartStyle): BrandPartStyle {
  if (input.states && (!key.startsWith('button-') || Object.keys(input.states).some(state => !brandButtonStates.includes(state as BrandButtonState)))) {
    throw new TypeError('Unknown state for component part: ' + key)
  }
  const states = Object.fromEntries(brandButtonStates.flatMap(state => {
    const value = input.states?.[state]
    return value ? [[state, partColors(value)]] : []
  }))
  return {
    ...partColors(input),
    ...(input.radius !== undefined && { radius: range(input.radius, 0, 45) }),
    ...(Object.keys(states).length > 0 && { states }),
  }
}
function mergePart(base?: BrandPartStyle, override?: BrandPartStyle): BrandPartStyle {
  if (!base?.states || !override?.states) return { ...base, ...override }
  const states = { ...base.states }
  for (const state of brandButtonStates) {
    if (override.states[state]) states[state] = { ...states[state], ...override.states[state] }
  }
  return { ...base, ...override, states }
}
function range(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`Value outside ${min}–${max}`)
  return value
}
function brandDesign(previous: BrandDesign | undefined, value: BrandDesign): BrandDesign {
  const result = { ...previous }
  if (value.base !== undefined) {
    if (value.base !== 'none' && !Object.hasOwn(palette, value.base)) throw new TypeError('Unknown base theme')
    result.base = value.base
  }
  if (value.appearance !== undefined) {
    if (!['both', 'light-only', 'dark-only'].includes(value.appearance)) throw new TypeError('Unknown theme appearance')
    result.appearance = value.appearance
  }
  if (value.surfaces !== undefined) {
    if (!Object.hasOwn(surfaceStyles, value.surfaces)) throw new TypeError('Unknown surface style')
    result.surfaces = value.surfaces
  }
  if (value.buttons !== undefined) {
    if (!Object.hasOwn(buttonStyles, value.buttons)) throw new TypeError('Unknown button style')
    result.buttons = value.buttons
  }
  if (value.badges !== undefined) {
    if (!Object.hasOwn(badgeStyles, value.badges)) throw new TypeError('Unknown badge style')
    result.badges = value.badges
  }
  if (value.headingWeight !== undefined) result.headingWeight = range(value.headingWeight, 300, 900)
  if (value.headingTracking !== undefined) result.headingTracking = range(value.headingTracking, -.1, .1)
  if (value.fonts) {
    result.fonts = { ...result.fonts }
    for (const [role, font] of Object.entries(value.fonts)) {
      if (!Object.hasOwn(brandFontRoleTokens, role)) throw new TypeError('Unknown theme font role ' + role)
      const key = role as BrandFontRole
      result.fonts[key] = normalizeBrandToken(brandFontRoleTokens[key], font)
    }
  }
  if (value.shadows) {
    result.shadows = { ...result.shadows }
    for (const mode of ['light', 'dark'] as const) {
      const overrides = value.shadows[mode]
      if (!overrides) continue
      const shadows = { ...result.shadows[mode] }
      for (const token of brandShadowTokens) {
        const shadow = overrides[token]
        if (shadow !== undefined) shadows[token] = normalizeBrandToken(token, shadow)
      }
      result.shadows[mode] = shadows
    }
  }
  if (value.palette) {
    const settings = value.palette
    const palette = { ...result.palette }
    if (settings.vibrancy !== undefined) palette.vibrancy = range(settings.vibrancy, 0, 100)
    if (settings.seeds) {
      palette.seeds = { ...palette.seeds }
      for (const family of brandPaletteFamilies) {
        if (settings.seeds[family] !== undefined) palette.seeds[family] = color(settings.seeds[family]!)
      }
    }
    if (settings.exact) {
      palette.exact = { ...palette.exact }
      for (const mode of ['light', 'dark'] as const) {
        const tokens = settings.exact[mode]
        if (!tokens) continue
        const existing = { ...palette.exact[mode] }
        for (const key of brandColors) if (tokens[key] !== undefined) existing[key] = color(tokens[key]!)
        palette.exact[mode] = existing
      }
    }
    result.palette = palette
  }
  if (value.tokens !== undefined) result.tokens = { ...result.tokens, ...Object.fromEntries(Object.entries(value.tokens)
    .map(([name, value]) => [name, normalizeBrandToken(name, value)])) }
  return result
}
function sourceURL(input: string) {
  const url = new URL(input)
  if (url.protocol !== 'https:' || url.username || url.password) throw new TypeError('Source must be HTTPS')
  return url.href
}
export function createBrandTheme(id = 'syntrofic', name = 'Syntrofic', preset: BrandPreset = 'morandi'): BrandTheme {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new TypeError('Invalid theme identifier')
  if (!Object.hasOwn(palette, preset)) throw new TypeError('Unknown theme preset')
  const [light, dark, day, night] = palette[preset]
  const modes: BrandTheme['modes'] = { light: { accent: light, canvas: day }, dark: { accent: dark, canvas: night } }
  const surfaces = standardSurfaces[preset]
  if (surfaces) {
    const [lightSurface, darkSurface, lightSoft, darkSoft] = surfaces
    const paint = (mode: BrandMode, ink: string, canvas: string, surface: string, muted: string) => {
      const lightMode = mode === 'light'
      const text = blend(lightMode ? '#232622' : '#f6f2ed', ink, .14)
      return {
        accent: ink, canvas, surface, text, control: blend(surface, muted, .5), 'surface-muted': muted,
        'text-muted': blend(text, canvas, lightMode ? .22 : .2), border: blend(canvas, ink, lightMode ? .23 : .25),
        'border-strong': blend(canvas, ink, .68), 'accent-soft': muted, 'accent-text': ink, 'accent-on': lightMode ? '#ffffff' : canvas,
        'accent-hover': blend(ink, lightMode ? '#000000' : '#ffffff', .16), focus: ink,
      }
    }
    modes.light = paint('light', light, day, lightSurface, lightSoft)
    modes.dark = paint('dark', dark, night, darkSurface, darkSoft)
  }
  return { version: 1, id, name, revision: 0, modes,
    ...presetSettings[preset], design: { base: preset }, fontSize: 15, parts: {}, voice: '', assets: [] }
}
export function createStandardBrandTheme(preset: StandardBrandPreset): BrandTheme {
  return createBrandTheme(preset, standardBrandNames[preset], preset)
}
export function defineBrandTheme(definition: BrandThemeDefinition): BrandTheme {
  const { id, base, version = 1, revision = 0, name = id } = definition
  if (version !== 1 || typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id) || typeof name !== 'string' || !name.trim()) {
    throw new TypeError('Expected a version-one theme with a valid identifier and name')
  }
  const initial = typeof base === 'object' && base
    ? { ...defineBrandTheme({ ...base, base: undefined }), id, name }
    : createBrandTheme(id, name, base)
  const changes: BrandChange[] = [{ type: 'settings', value: { ...definition, name } }]
  for (const mode of ['light', 'dark'] as const) {
    const colors = definition.modes?.[mode]
    for (const key of Object.keys(colors ?? {}) as BrandColor[]) changes.push({ type: 'color', mode, key, value: colors![key]! })
    const parts = definition.modeParts?.[mode]
    for (const key of Object.keys(parts ?? {}) as BrandPart[]) {
      changes.push({ type: 'part', key, value: mergePart(initial.modeParts?.[mode]?.[key], parts![key]), mode })
    }
  }
  for (const key of Object.keys(definition.parts ?? {}) as BrandPart[]) {
    changes.push({ type: 'part', key, value: mergePart(initial.parts[key], definition.parts![key]) })
  }
  for (const [key, value] of Object.entries(definition.rules ?? {})) changes.push({ type: 'rule', key, value })
  const theme = applyBrandPatch(initial, { revision: initial.revision, changes })
  if (definition.inheritedRules) {
    theme.inheritedRules = Object.fromEntries(Object.entries(definition.inheritedRules).map(([key, value]) => {
      const rule = normalizeBrandRule(value)
      if (brandRuleKey(rule) !== key) throw new TypeError('Invalid inherited component rule key')
      return [key, rule]
    }))
  }
  return { ...theme, revision: Number.isSafeInteger(revision) && revision >= 0 ? revision : 0 }
}

export function applyBrandPatch(theme: BrandTheme, patch: BrandPatch): BrandTheme {
  if (theme.revision !== patch.revision) throw new Error('Theme revision has changed')
  const next: BrandTheme = { ...theme, modes: { light: { ...theme.modes.light }, dark: { ...theme.modes.dark } }, parts: { ...theme.parts } }
  for (const change of patch.changes) {
    if (change.type === 'color') {
      if (!brandColors.includes(change.key) || !['light', 'dark'].includes(change.mode)) throw new TypeError('Unknown color token')
      if (change.value === undefined) delete next.modes[change.mode][change.key]
      else next.modes[change.mode][change.key] = color(change.value)
    } else if (change.type === 'part') {
      if (!Object.hasOwn(brandPartTargets, change.key)) throw new TypeError('Unknown component part')
      if (change.mode === undefined) next.parts[change.key] = part(change.key, change.value)
      else {
        if (!['light', 'dark'].includes(change.mode) || change.value.radius !== undefined) throw new TypeError('Only part colors can vary by mode')
        next.modeParts = { ...next.modeParts, [change.mode]: { ...next.modeParts?.[change.mode], [change.key]: part(change.key, change.value) } }
      }
    } else if (change.type === 'rule') {
      const rule = normalizeBrandRule(change.value)
      if (brandRuleKey(rule) !== change.key) throw new TypeError('Invalid component rule key')
      const rules = { ...next.rules }
      if (Object.keys(rule.declarations).length) rules[change.key] = rule
      else delete rules[change.key]
      next.rules = rules
    } else if (change.type === 'settings') {
      const values = change.value
      if (values.name !== undefined) next.name = values.name.trim().slice(0, 100) || next.name
      if (values.font !== undefined) next.font = font(values.font)
      if (values.voice !== undefined) next.voice = values.voice.trim().slice(0, 1000)
      if (values.source !== undefined) next.source = values.source ? sourceURL(values.source) : undefined
      if (values.assets) next.assets = values.assets.slice(0, 50).map(asset => ({
        label: asset.label.slice(0, 100), license: asset.license?.slice(0, 160), url: sourceURL(asset.url),
      }))
      for (const key of Object.keys(layout) as (keyof typeof layout)[]) {
        const value = values[key]
        if (value !== undefined) next[key] = range(value, layout[key][0], layout[key][1])
      }
      if (values.shadow === 'none' || values.shadow === 'soft') next.shadow = values.shadow
      if (values.design !== undefined) next.design = brandDesign(next.design, values.design)
      if (values.motion !== undefined) {
        const { tempo, character, timings, springs, reducedMotion } = values.motion
        if (character !== undefined && !Object.hasOwn(characters, character)) throw new TypeError('Unknown motion character')
        if (reducedMotion !== undefined && reducedMotion !== 'always' && reducedMotion !== 'system') throw new TypeError('Unknown reduced motion policy')
        const updated = { ...next.motion, ...(tempo === undefined ? {} : { tempo: range(tempo, .75, 1.5) }),
          ...(character === undefined ? {} : { character }),
          ...(reducedMotion === undefined ? {} : { reducedMotion }),
          ...(timings === undefined ? {} : { timings: { ...next.motion?.timings, ...timings } }),
          ...(springs === undefined ? {} : { springs: { ...next.motion?.springs, ...springs } }) }
        brandMotionTokens(updated)
        next.motion = updated
      }
      if (values.syntax !== undefined) next.syntax = defineSyntaxTheme(values.syntax)
      if (values.media !== undefined) {
        next.media = { ...next.media }
        for (const mode of ['light', 'dark'] as const) {
          const overrides = values.media[mode]
          if (!overrides) continue
          const colors = Object.fromEntries(brandColors.flatMap(key => overrides.colors?.[key] ? [[key, color(overrides.colors[key]!)]] : []))
          const parts = Object.fromEntries((Object.keys(brandPartTargets) as BrandPart[]).flatMap(key => overrides.parts?.[key] ? [[key, part(key, overrides.parts[key]!)]] : []))
          next.media[mode] = { colors: { ...next.media[mode]?.colors, ...colors }, parts: { ...next.media[mode]?.parts, ...parts } }
        }
      }
    } else throw new TypeError('Unknown theme operation')
  }
  return { ...next, revision: next.revision + 1 }
}
export function brandThemeSuggestions(css: string, mode: BrandMode): BrandChange[] {
  const text = css.slice(0, 200000)
  const changes: BrandChange[] = []
  for (const key of brandColors) {
    const match = new RegExp(`--sy-${key}\\s*:\\s*(#[a-f0-9]{3,6})(?![a-f0-9])`, 'i').exec(text)
    if (match && [4, 7].includes(match[1].length)) changes.push({ type: 'color', key, mode, value: color(match[1]) })
  }
  if (!changes.length) {
    const samples = [...new Set((text.match(/#[a-f0-9]{6}(?![a-f0-9])/gi) ?? []).map(color))].slice(0, 2)
    if (samples[0]) changes.push({ type: 'color', mode, key: 'accent', value: samples[0] })
    if (samples[1]) changes.push({ type: 'color', mode, key: 'surface', value: samples[1] })
  }
  return changes
}
export function brandThemeStyle(theme: BrandTheme, mode: BrandMode): Record<string, string> {
  const colors = Object.fromEntries(brandColors.flatMap(key => theme.modes[mode][key] ? [[`--sy-${key}`, theme.modes[mode][key]!]] : []))
  const parts = Object.fromEntries((Object.keys(brandPartTargets) as BrandPart[]).flatMap(key => {
    const value = mergePart(theme.parts[key], theme.modeParts?.[mode]?.[key])
    return [
      ...(value.radius !== undefined ? [[`--sy-brand-${key}-radius`, value.radius + 'px']] : []),
      ...(value.background ? [[`--sy-brand-${key}-background`, value.background]] : []),
      ...(value.foreground ? [[`--sy-brand-${key}-foreground`, value.foreground]] : []),
      ...(key.startsWith('button-') && value.background ? [[`--sy-brand-${key}-hover`, `color-mix(in srgb, ${value.background} 85%, var(--sy-text))`]] : []),
      ...brandButtonStates.flatMap(state => {
        const colors = value.states?.[state]
        return Object.entries(colors ?? {}).map(([property, color]) => [`--sy-brand-${key}-${state}-${property}`, color])
      }),
    ]
  }))
  const character = theme.motion?.character && characters[theme.motion.character]
  const tempo = theme.motion?.tempo
  const design = theme.design
  const baseFont = design?.tokens?.['--sy-font'] ?? theme.font
  const bodyFont = design?.tokens?.['--sy-font-body'] ?? design?.fonts?.body ?? baseFont
  return {
    ...colors, ...parts, ...syntaxStyle(theme.syntax?.tokens ?? {}), '--sy-radius-sm': Math.round(theme.radius * .62) + 'px',
    '--sy-radius-md': theme.radius + 'px', '--sy-radius-lg': Math.round(theme.radius * 1.77) + 'px',
    '--sy-font-size': theme.fontSize + 'px', '--sy-border-width': (theme.borderWidth || 1) + 'px',
    '--sy-shadow': theme.shadow === 'none' ? 'none' : '0 6px 18px rgb(28 31 29 / .12)',
    ...defaultShadows,
    ...(design?.headingWeight !== undefined && { '--sy-design-heading-weight': String(design.headingWeight) }),
    ...(design?.headingTracking !== undefined && { '--sy-design-heading-tracking': design.headingTracking + 'em' }),
    ...(design?.surfaces && surfaceStyles[design.surfaces]),
    ...(design?.buttons && buttonStyles[design.buttons]),
    ...(design?.badges && badgeStyles[design.badges]),
    ...(tempo !== undefined ? { '--sy-motion-tempo': String(tempo) } : {}),
    ...(character ? { '--sy-ease-settle': character[0], '--sy-ease-exit': character[1] } : {}),
    ...brandMotionTokens(theme.motion),
    ...Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`--sy-space-${index + 1}`, (index + 1) * theme.spacing + 'px'])),
    ...design?.tokens,
    ...design?.shadows?.[mode],
    '--sy-font': bodyFont,
    '--sy-font-body': bodyFont,
    '--sy-font-heading': design?.tokens?.['--sy-font-heading'] ?? design?.fonts?.heading ?? baseFont,
    '--sy-font-code': design?.tokens?.['--sy-font-code'] ?? design?.fonts?.code ?? defaultCodeFont,
  }
}

export function resolveBrandMediaTheme(theme: BrandTheme, mode: BrandMode) {
  const settings = theme.media?.[mode]
  if (!settings) return theme
  const parts = { ...theme.modeParts?.[mode] }
  for (const [key, value] of Object.entries(settings.parts ?? {})) {
    const part = key as BrandPart
    parts[part] = mergePart(parts[part], value)
  }
  return { ...theme, modes: { ...theme.modes, [mode]: { ...theme.modes[mode], ...settings.colors } },
    modeParts: { ...theme.modeParts, [mode]: parts } }
}

export function mediaThemeStyle(theme: BrandTheme, mode: BrandMode) {
  return brandThemeStyle(resolveBrandMediaTheme(theme, mode), mode)
}
export function exportBrandTheme(theme: BrandTheme) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(theme.id)) throw new TypeError('Invalid theme identifier')
  const selector = `[data-sy-brand="${theme.id}"]`
  const light = brandThemeStyle(theme, 'light')
  const dark = brandThemeStyle(theme, 'dark')
  const names = new Set([...Object.keys(light), ...Object.keys(dark)])
  const declarations = (mode: BrandMode, prefix = '  ') => {
    const style = mode === 'light' ? light : dark
    return [`${prefix}color-scheme: ${mode};`,
      ...Array.from(names, name => `${prefix}${name}: ${style[name] ?? 'initial'};`)].join('\n')
  }
  const defaultMode = theme.design?.appearance === 'dark-only' ? 'dark' : 'light'
  const defaultSelector = `${selector}:not([data-sy-theme]),\n`
  const css = [
    `${defaultMode === 'light' ? defaultSelector : ''}${selector}[data-sy-theme="light"],\n${selector}[data-sy-theme="system"] {\n${declarations('light')}\n}`,
    `${defaultMode === 'dark' ? defaultSelector : ''}${selector}[data-sy-theme="dark"] {\n${declarations('dark')}\n}`,
    `@media (prefers-color-scheme: dark) {\n  ${selector}[data-sy-theme="system"] {\n${declarations('dark', '    ')}\n  }\n}`,
    brandRuleStyle(resolveBrandThemeRules(theme).rules, selector, undefined, defaultMode, { light, dark }),
  ].filter(Boolean).join('\n\n')
  const native = Object.fromEntries((['light', 'dark'] as const).map(mode => [mode, {
    appearance: mode, fontFamily: theme.font === defaultFont ? undefined : theme.font,
    colors: Object.fromEntries(Object.entries(theme.modes[mode]).map(([key, value]) => [key.replace(/-([a-z])/g, (_, point: string) => point.toUpperCase()), value])),
    geometry: { radiusSm: Math.round(theme.radius * .62), radiusMd: theme.radius, radiusLg: Math.round(theme.radius * 1.77),
      ...Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`space${index + 1}`, (index + 1) * theme.spacing])) },
  }]))
  return {
    'theme.css': css + '\n',
    'native-theme.json': JSON.stringify(native, null, 2) + '\n',
    'manifest.json': JSON.stringify(theme, null, 2) + '\n',
    'DESIGN.md': `# ${theme.name}\n\n修订 ${theme.revision}\n\n字体 ${theme.font}\n\n圆角 ${theme.radius}px\n\n间距单位 ${theme.spacing}px\n${theme.motion?.reducedMotion === 'always'
      ? '\n主题开启减少动效。仅引入 CSS 时，在主题根元素上添加 `data-sy-reduced-motion`。\n' : ''}`,
    'PRODUCT.md': `# ${theme.name}\n\n${theme.voice || '界面用语保持简洁。'}\n`,
  }
}
