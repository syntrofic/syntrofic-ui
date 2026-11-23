import type { ChartFormatter, ChartOptions, ChartRange, ChartTooltipItem, ChartValue } from './types'
import { categoricalChartColorNames } from '../internal/data-colors'

export const seriesColor = (index: number) => `var(--sy-${categoricalChartColorNames[index % categoricalChartColorNames.length]})`
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
export const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
export const numberAt = (value: unknown, fallback: number) => finite(value) ? value : fallback
export const lerp = (a: number, b: number, p: number) => a * (1 - p) + b * p

export function cleanValue(value: unknown): ChartValue {
  if (finite(value)) return value
  if (Array.isArray(value) && value.length === 2 && value.every(finite)) return [Math.min(...value), Math.max(...value)]
  return null
}

export function fraction(value: number, [min, max]: ChartRange) {
  const span = max - min
  return Number.isFinite(span) ? (value - min) / span : (value / 2 - min / 2) / (max / 2 - min / 2)
}

export function validDomain(domain?: ChartRange): domain is ChartRange {
  return Boolean(domain && finite(domain[0]) && finite(domain[1]) && domain[1] > domain[0])
}

export function domainFor(values: Iterable<number>, explicit?: ChartRange, zero = false): ChartRange {
  if (validDomain(explicit)) return explicit
  let min = zero ? 0 : Infinity
  let max = zero ? 0 : -Infinity
  for (const value of values) {
    if (!finite(value)) continue
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (!finite(min) || !finite(max)) return [0, 1]
  if (min !== max) return [min, max]
  if (min === 0) return zero ? [0, 1] : [-1, 1]
  const width = Math.max(Number.MIN_VALUE, Math.abs(min) * .1)
  const lower = min - width
  const upper = max + width
  return [finite(lower) ? lower : min, finite(upper) ? upper : max]
}

export function stepValues([min, max]: ChartRange, requested = 5) {
  const length = Math.round(clamp(numberAt(requested, 5), 2, 9))
  return Array.from({ length }, (_, index) => {
    const value = lerp(min, max, index / (length - 1))
    const rounded = Number(value.toPrecision(14))
    return finite(rounded) ? rounded : value
  }).filter((value, index, entries) => index === 0 || value !== entries[index - 1])
}

export function textValue(item: ChartTooltipItem, formatter: ChartFormatter, missing: string) {
  if (item.text !== undefined) return item.text
  const print = item.format ?? formatter
  const value = cleanValue(item.value)
  if (value === null) return missing
  const formatted = typeof value === 'number' ? print(value) : value.map(print).join('–')
  if (!item.unit) return formatted
  return `${formatted}${/^[%‰°]$/.test(item.unit) ? '' : ' '}${item.unit}`
}

export const chartDefaults = { inspect: true, showLegend: true, showData: true, animate: true } as const
export const cartesianDefaults = { ...chartDefaults, axes: true, grid: true } as const

export function frameOptions(options: ChartOptions): ChartOptions {
  const { label, description, height, width, locale, direction, inspect, tooltipPlacement,
    showLegend, showData, animate, loading, loadingText, error, retry, retryLabel,
    emptyText, missingText, dataLabel, legendLabel, legendPosition, legendAlignment, categoryLabel } = options
  return { label, description, height, width, locale, direction, inspect, tooltipPlacement,
    showLegend, showData, animate, loading, loadingText, error, retry, retryLabel,
    emptyText, missingText, dataLabel, legendLabel, legendPosition, legendAlignment, categoryLabel }
}
