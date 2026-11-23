import type { BrandMode } from '../platform/theme-workspace'
import { resolveTone } from './theme-color'

export const syntaxKeys = ['keyword', 'string', 'number', 'title', 'comment', 'function', 'type', 'variable', 'operator',
  'constant', 'tag', 'attribute', 'property', 'punctuation', 'background', 'added', 'removed', 'diff-header', 'added-marker', 'removed-marker'] as const
export type SyntaxThemeToken = typeof syntaxKeys[number]
export type SyntaxPalette = Partial<Record<SyntaxThemeToken, string>>
export type SyntaxThemeColors = Partial<Record<SyntaxThemeToken, string | readonly [light: string, dark: string]>>
export interface SyntaxThemeDefinition { name: string; tokens: SyntaxThemeColors }

function cssColor(value: string) {
  const text = value.trim()
  if (!text || !/^[-#\w(),. %+/]+$/.test(text) || /\burl\s*\(/i.test(text)) throw new TypeError('Invalid syntax color')
  return text
}

export function defineSyntaxTheme(theme: SyntaxThemeDefinition): SyntaxThemeDefinition {
  const name = theme.name?.trim()
  if (!name) throw new TypeError('Expected a syntax theme name')
  const tokens = Object.fromEntries(syntaxKeys.flatMap(key => {
    const color = theme.tokens[key]
    if (color === undefined) return []
    const normalized = typeof color === 'string' ? cssColor(color) : Object.freeze([cssColor(color[0]), cssColor(color[1])])
    return [[key, normalized]]
  }))
  return Object.freeze({ name, tokens: Object.freeze(tokens) })
}

export function syntaxPalette(tokens: SyntaxThemeColors, mode?: BrandMode): SyntaxPalette {
  return Object.fromEntries(syntaxKeys.flatMap(key => {
    const color = tokens[key]
    if (color === undefined) return []
    const value = typeof color === 'string' ? (mode ? resolveTone(color, mode) : color)
      : mode ? color[mode === 'light' ? 0 : 1] : `light-dark(${color[0]}, ${color[1]})`
    return [[key, value]]
  }))
}

export function syntaxStyle(tokens: SyntaxThemeColors) {
  return Object.fromEntries(Object.entries(syntaxPalette(tokens)).map(([key, color]) => ['--sy-syntax-' + key, color]))
}

function syntaxPreset(name: string, overrides: SyntaxThemeColors = {}) {
  const {
    keyword = ['#704a59', '#e8a9bc'], string = ['#3e6050', '#b5d3b4'], number = ['#745529', '#e0c096'],
    title = ['#395e74', '#a7cbe1'], comment = ['#565b52', '#c5ccc0'],
  } = overrides
  const foreground = ['#393d37', '#d5dcd1'] as const
  return defineSyntaxTheme({ name, tokens: {
    keyword, string, number, title, comment,
    function: title, type: title, variable: foreground, operator: foreground, constant: number,
    tag: keyword, attribute: number, property: title, punctuation: foreground,
    ...overrides,
  } })
}

export const syntaxThemes = Object.freeze({
  standard: syntaxPreset('Syntrofic'),
  ink: syntaxPreset('墨蓝', {
    keyword: ['#3a5578', '#9cbee9'], string: ['#4a5c45', '#b5c9a9'], number: ['#784e36', '#e7b698'],
    title: ['#5a4b73', '#cdb9e7'], comment: ['#58636a', '#a9bac4'], background: ['#ffffff', '#242a32'],
    added: ['#e7efe2', '#374b3e'], removed: ['#f4e5e5', '#513b40'],
  }),
  neutral: syntaxPreset('中性灰', {
    keyword: ['#434c43', '#c4d2c4'], title: ['#45596b', '#b8ccdc'], comment: ['#565a53', '#bfc6be'], background: ['#ffffff', '#20211f'],
  }),
  stone: syntaxPreset('岩灰蓝', {
    keyword: ['#455477', '#bac7e8'], string: ['#4f5e50', '#bdcbbb'], title: ['#3b626d', '#a5cbd2'], background: ['#ffffff', '#24282d'],
  }),
  matcha: syntaxPreset('抹茶绿', {
    keyword: ['#42614c', '#b6cfb7'], string: ['#596037', '#d1d8af'], title: ['#46706b', '#a8d4ca'], background: ['#ffffff', '#202922'],
  }),
  chocolate: syntaxPreset('可可棕', {
    keyword: ['#704d42', '#dfb9a7'], number: ['#7c4a59', '#e8adbb'], title: ['#695346', '#d6bea9'], background: ['#ffffff', '#2b211e'],
  }),
  butter: syntaxPreset('奶油黄', {
    keyword: ['#72572f', '#edcf96'], string: ['#5c632e', '#d4daae'], title: ['#355e79', '#bbcfe9'], background: ['#ffffff', '#242b36'],
  }),
  gothic: syntaxPreset('墨蓝紫', {
    keyword: ['#494b6c', '#c4c4e4'], string: ['#5d4f6c', '#d3b9df'], title: ['#394a75', '#afbbe8'], background: ['#ffffff', '#222432'],
  }),
  y2k: syntaxPreset('复古粉', {
    keyword: ['#8a3764', '#efb0d1'], title: ['#6f477e', '#d5b1e1'], number: ['#805246', '#ecb39b'], background: ['#ffffff', '#2d2330'],
  }),
  slate: syntaxPreset('雾灰蓝', {
    keyword: ['#3f5861', '#adbec9'], string: ['#365e57', '#afcdc5'], title: ['#5c4d6d', '#caabd8'], background: ['#ffffff', '#1e2529'],
  }),
})
