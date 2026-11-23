import { computed } from 'vue'

export type MeasureTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral'
export const progressFillDuration = 1000

export interface MeasurementProps {
  value?: number | null
  min?: number
  max?: number
  label?: string
  locale?: string
  formatOptions?: Intl.NumberFormatOptions
  formatValue?: (value: number, max: number, min: number) => string
  showValue?: boolean
  size?: 'sm' | 'md' | 'lg'
  tone?: MeasureTone
}

export function measurementBounds(min?: number, max?: number) {
  const lower = typeof min === 'number' && Number.isFinite(min) ? min : 0
  const upper = typeof max === 'number' && Number.isFinite(max) && max > lower ? max : Math.max(100, lower + 1)
  return { lower, upper }
}

export function useMeasurement(props: MeasurementProps, allowIndeterminate: boolean, percentage: boolean) {
  const bounds = computed(() => measurementBounds(props.min, props.max))
  const value = computed(() => {
    const { lower, upper } = bounds.value
    return typeof props.value === 'number' && Number.isFinite(props.value)
      ? Math.min(upper, Math.max(lower, props.value))
      : allowIndeterminate ? undefined : lower
  })
  const fraction = computed(() => {
    const { lower, upper } = bounds.value
    return ((value.value ?? lower) - lower) / (upper - lower)
  })
  const formatter = computed(() => new Intl.NumberFormat(props.locale ?? 'en', props.formatOptions ?? (
    percentage ? { style: 'percent', maximumFractionDigits: 0 } : { maximumFractionDigits: 2 }
  )))
  const display = computed(() => {
    if (value.value === undefined) return ''
    if (props.formatValue) return props.formatValue(value.value, bounds.value.upper, bounds.value.lower)
    return formatter.value.format(percentage && !props.formatOptions ? fraction.value : value.value)
  })
  const bars = computed(() => ({
    '--sy-measure-percent': `${fraction.value * 100}%`,
    '--sy-arc-target': fraction.value,
  }))
  const aria = computed(() => ({
    'aria-valuemin': bounds.value.lower,
    'aria-valuemax': bounds.value.upper,
    'aria-valuenow': value.value,
    'aria-valuetext': display.value || undefined,
  }))

  return { value, fraction, display, bars, aria }
}
