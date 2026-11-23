import type { BrandMode } from '../platform/theme-workspace'

export function splitCssArguments(value: string) {
  const parts: string[] = []
  let start = 0
  let depth = 0
  for (let index = 0; index < value.length; index++) {
    const character = value[index]
    if (character === '(') depth++
    else if (character === ')') depth--
    else if (character === ',' && depth === 0) { parts.push(value.slice(start, index).trim()); start = index + 1 }
  }
  parts.push(value.slice(start).trim())
  return parts
}

export function resolveTone(value: string, mode: BrandMode) {
  if (!value.startsWith('light-dark(') || !value.endsWith(')')) return value
  const colors = splitCssArguments(value.slice('light-dark('.length, -1))
  if (colors.length === 2) return colors[mode === 'light' ? 0 : 1]
  return value
}
