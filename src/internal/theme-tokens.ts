import defaults from '../styles/tokens.css?raw'
import { brandThemeStyle, type BrandMode, type BrandTheme } from '../platform/theme-workspace'
import { colorInSpace, readColor } from './color'
import { dataColorNames, type DataColorToken } from './data-colors'
import { resolveTone, splitCssArguments } from './theme-color'

const themeBase = defaults.match(/:where\(:root,\s*\[data-sy-theme\]\)\s*\{([^}]+)\}/)?.[1] ?? ''
const defaultsByName = Object.fromEntries([...themeBase.matchAll(/(--sy-[\w-]+):\s*([^;]+);/g)].map(([, token, value]) => [token, value.trim()]))

export interface ResolveThemeTokensOptions { mode?: BrandMode }
export interface ResolveThemeTokenOptions extends ResolveThemeTokensOptions { fallback?: string }

export function tokenVar(name: string) {
  if (!/^--[\w-]+$/.test(name)) throw new TypeError('Expected a CSS custom property name')
  return `var(${name})`
}

export const tokenVars: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries(Object.keys(defaultsByName).map(name => [name, tokenVar(name)])))
export const dataColorVars = Object.freeze(Object.fromEntries(dataColorNames.map(name => {
  const key = `--sy-${name}` as const
  return [key, tokenVars[key]]
})) as Record<DataColorToken, string>)

function resolvedMix(value: string) {
  if (!value.startsWith('color-mix(') || !value.endsWith(')')) return value
  const [space, first, second] = splitCssArguments(value.slice(10, -1))
  if (space !== 'in srgb' || !first || !second) return value
  function readStop(stop: string) {
    const percent = /\s+([\d.]+)%$/.exec(stop)
    const parsed = readColor(percent ? stop.slice(0, percent.index) : stop)
    const rgb = parsed && colorInSpace(parsed, 'rgb')
    return { color: rgb?.space === 'rgb' ? rgb : undefined, weight: percent ? Number(percent[1]) / 100 : undefined }
  }
  const a = readStop(first)
  const b = readStop(second)
  const left = a.color
  const right = b.color
  if (!left || !right) return value
  const weightA = a.weight ?? (b.weight === undefined ? .5 : 1 - b.weight)
  const weightB = b.weight ?? 1 - weightA
  const total = weightA + weightB
  if (!(total > 0) || weightA < 0 || weightB < 0 || weightA > 1 || weightB > 1) return value
  const alphaA = weightA * left.alpha
  const alphaB = weightB * right.alpha
  const alpha = (alphaA + alphaB) / Math.max(1, total)
  if (alpha === 0) return 'transparent'
  const channels = (['r', 'g', 'b'] as const).map(key => Number(((left[key] * alphaA + right[key] * alphaB) / (alphaA + alphaB)).toFixed(3)))
  return `rgb(${channels.join(' ')}${alpha < 1 ? ' / ' + Number(alpha.toFixed(4)) : ''})`
}

function resolveValues(values: Record<string, string>, mode: BrandMode) {
  const result = new Map<string, string>()
  const stack = new Set<string>()
  function expand(value: string): string {
    const start = value.indexOf('var(')
    if (start < 0) return value
    let end = start + 4
    let depth = 1
    for (; end < value.length; end++) {
      if (value[end] === '(') depth++
      else if (value[end] === ')' && --depth === 0) break
    }
    if (depth) return value
    const [name, ...alternatives] = splitCssArguments(value.slice(start + 4, end))
    const found = lookup(name)
    const replacement = found && found !== 'initial' ? found : alternatives.length ? expand(alternatives.join(', ')) : value.slice(start, end + 1)
    return value.slice(0, start) + replacement + expand(value.slice(end + 1))
  }
  function lookup(name: string): string | undefined {
    if (result.has(name)) return result.get(name)
    if (!Object.hasOwn(values, name) || stack.has(name)) return
    stack.add(name)
    const value = resolvedMix(resolveTone(expand(resolveTone(values[name], mode)), mode))
    stack.delete(name)
    result.set(name, value)
    return value
  }
  return Object.freeze(Object.fromEntries(Object.keys(values).map(name => [name, lookup(name)!])))
}

const baseTokens = Object.freeze({
  light: resolveValues(defaultsByName, 'light'),
  dark: resolveValues(defaultsByName, 'dark'),
})

export function resolveThemeTokens(theme?: BrandTheme | null, { mode = 'light' }: ResolveThemeTokensOptions = {}): Readonly<Record<string, string>> {
  if (!theme) return baseTokens[mode]
  return resolveValues({ ...defaultsByName, ...brandThemeStyle(theme, mode) }, mode)
}

export function resolveThemeToken(theme: BrandTheme | null | undefined, name: string, options: ResolveThemeTokenOptions = {}) {
  const values = resolveThemeTokens(theme, options)
  return Object.hasOwn(values, name) ? values[name] : options.fallback ?? ''
}
