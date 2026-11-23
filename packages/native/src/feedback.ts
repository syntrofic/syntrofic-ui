import { Device } from '@nativescript/core'
import { nativeCompactValue, nativeScientificValue } from './feedback-state'
import { nativeNumberAdapter } from './number-state'

export type NativeProgressState = 'determinate' | 'indeterminate' | 'complete' | 'error'
export type NativeFeedbackTone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger'
export type NativeProgressSize = 'sm' | 'md' | 'lg'
export type NativeTrendDirection = 'up' | 'down' | 'flat'

export interface NativeProgressOptions {
  value?: number
  min?: number
  max?: number
  state?: NativeProgressState
  size?: NativeProgressSize
  tone?: NativeFeedbackTone
  label?: string
  locale?: string
  formatOptions?: Intl.NumberFormatOptions
  formatValue?: (value: number, ratio: number) => string
  waitingLabel?: string
  completeLabel?: string
  errorLabel?: string
  showValue?: boolean
  animated?: boolean
  announce?: boolean
  disabled?: boolean
}

const platform = globalThis as typeof globalThis & {
  android?: { icu?: { text?: { CompactDecimalFormat?: {
    getInstance: (locale: unknown, style: unknown) => { format(value: number): string }
    CompactStyle: { SHORT: unknown; LONG: unknown }
  } } } }
  java?: { util?: { Locale?: { forLanguageTag: (locale: string) => unknown } } }
}

export function nativeFeedbackFormatter(locale = Device.language || 'en-US', options: Intl.NumberFormatOptions = {}) {
  if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') return new Intl.NumberFormat(locale, options)
  function fallback(settings: Intl.NumberFormatOptions) {
    const adapter = nativeNumberAdapter(locale, settings)
    if (settings.signDisplay === 'exceptZero') return { format: (value: number) => value > 0 ? '+' + adapter.format(value) : adapter.format(value) }
    if (settings.signDisplay === 'never') return { format: (value: number) => adapter.format(Math.abs(value)) }
    return adapter
  }
  const number = fallback(options)
  if (options.notation === 'scientific' || options.notation === 'engineering') {
    return {
      format(value: number) {
        const amount = nativeScientificValue(value, options.notation === 'engineering')
        return `${number.format(amount.value)}E${amount.exponent}`
      },
    }
  }
  if (options.notation !== 'compact') return number
  const compact = platform.android?.icu?.text?.CompactDecimalFormat
  const javaLocale = platform.java?.util?.Locale
  const long = options.compactDisplay === 'long'
  try {
    if (compact && javaLocale && (!options.style || options.style === 'decimal') &&
      options.maximumFractionDigits === undefined && options.minimumFractionDigits === undefined && !options.signDisplay) {
      const formatter = compact.getInstance(javaLocale.forLanguageTag(locale), long ? compact.CompactStyle.LONG : compact.CompactStyle.SHORT)
      return { format: (value: number) => String(formatter.format(value)) }
    }
  } catch {
    // The common unit scales work when the platform compact formatter is unavailable.
  }
  const formatter = fallback({ maximumFractionDigits: 1, ...options })
  return {
    format(value: number) {
      const amount = nativeCompactValue(value, locale, long)
      return formatter.format(amount.value) + amount.suffix
    },
  }
}
