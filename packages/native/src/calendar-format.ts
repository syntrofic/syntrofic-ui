import type { CalendarDate } from '@internationalized/date'
import { nativeCalendarWeekday, type NativeDatePart } from './calendar-state'

type DateShape = 'month' | 'weekday' | 'date' | 'day' | 'short'
const options: Record<DateShape, Intl.DateTimeFormatOptions> = {
  month: { year: 'numeric', month: 'long' },
  weekday: { weekday: 'narrow' },
  date: { year: 'numeric', month: 'long', day: 'numeric' },
  short: { year: 'numeric', month: '2-digit', day: '2-digit' },
  day: { day: 'numeric' },
}
const skeleton: Record<Exclude<DateShape, 'day'>, string> = { month: 'yMMMM', weekday: 'EEEEE', date: 'yMMMMd', short: 'yMMdd' }
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

type AndroidDateFormatter = {
  format(date: unknown): string
  setTimeZone(zone: unknown): void
}
const platform = globalThis as typeof globalThis & {
  android?: { icu?: {
    text: {
      DateFormat: { getInstanceForSkeleton: (skeleton: string, locale: unknown) => AndroidDateFormatter }
      DateTimePatternGenerator: { getInstance: (locale: unknown) => { getBestPattern(skeleton: string): string } }
      NumberFormat: { getIntegerInstance: (locale: unknown) => { format(value: number): string } }
    }
    util: { TimeZone: { getTimeZone(id: string): unknown } }
  } }
  java?: { util: {
    Locale: { forLanguageTag(tag: string): unknown }
    Date: new (milliseconds: number) => unknown
  } }
}

export function nativeDateLabel(date: CalendarDate, locale = 'en-US', style: DateShape = 'date') {
  if (style === 'day') {
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function')
        return new Intl.NumberFormat(locale, { useGrouping: false }).format(date.day)
      const java = platform.java?.util
      const numbers = platform.android?.icu?.text.NumberFormat
      if (java && numbers) return String(numbers.getIntegerInstance(java.Locale.forLanguageTag(locale)).format(date.day))
    } catch {
      // The calendar remains usable without localized digits.
    }
    return String(date.day)
  }
  const epoch = (date.calendar.toJulianDay(date) - 2_440_588) * 86_400_000 + 43_200_000
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      return new Intl.DateTimeFormat(locale, { ...options[style], timeZone: 'UTC', calendar: date.calendar.identifier }).format(epoch)
    } catch {
      // Use platform locale data when this runtime cannot format the requested calendar.
    }
  }
  const intl = platform.android?.icu
  const java = platform.java?.util
  if (intl && java) {
    try {
      const tag = `${locale.split('-u-')[0]}-u-ca-${date.calendar.identifier}`
      const formatter = intl.text.DateFormat.getInstanceForSkeleton(skeleton[style], java.Locale.forLanguageTag(tag))
      formatter.setTimeZone(intl.util.TimeZone.getTimeZone('UTC'))
      return String(formatter.format(new java.Date(epoch)))
    } catch {
      // Basic date labels work on systems without ICU.
    }
  }
  const chinese = /^zh\b/i.test(locale)
  if (style === 'weekday') return Array.from(chinese ? '日一二三四五六' : 'SMTWTFS')[nativeCalendarWeekday(date)]
  if (style === 'short') return date.toString()
  const month = chinese ? `${date.month}月` : months[date.month - 1] ?? String(date.month)
  const year = chinese ? `${date.year}年` : String(date.year)
  if (style === 'month') return chinese ? year + month : `${month} ${year}`
  return chinese ? `${year}${month}${date.day}日` : `${month} ${date.day}, ${year}`
}

const patterns = { y: 'year', M: 'month', L: 'month', d: 'day' } as const
export function nativeDatePartOrder(locale = 'en-US'): NativeDatePart[] {
  const sample = new Date(Date.UTC(2024, 10, 21))
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      const order = new Intl.DateTimeFormat(locale, { ...options.short, timeZone: 'UTC' }).formatToParts(sample)
        .flatMap(part => part.type === 'year' || part.type === 'month' || part.type === 'day' ? [part.type] : [])
      if (order.length === 3) return order
    } catch {
      // Locale data may be available through Android even if the JS formatter is incomplete.
    }
  }
  try {
    const java = platform.java?.util
    const generator = platform.android?.icu?.text.DateTimePatternGenerator
    if (java && generator) {
      const pattern = String(generator.getInstance(java.Locale.forLanguageTag(locale)).getBestPattern('yMMdd'))
      const fields = [...new Set(Array.from(pattern.replace(/'[^']*'/g, ''))
        .flatMap(symbol => patterns[symbol as keyof typeof patterns] ? [patterns[symbol as keyof typeof patterns]] : []))]
      if (fields.length === 3) return fields
    }
  } catch {
    // Fall back to a stable locale order.
  }
  if (/^(?:zh|ja|ko|sv|en-CA)\b/i.test(locale)) return ['year', 'month', 'day']
  return /^en(?:-US)?$/i.test(locale) ? ['month', 'day', 'year'] : ['day', 'month', 'year']
}
