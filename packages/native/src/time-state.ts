import { Time } from '@internationalized/date'

export type NativeHourFormat = 12 | 24
export type NativeTimePeriod = 'am' | 'pm'
export interface NativeTimeBounds {
  minTime?: Time
  maxTime?: Time
  minuteInterval?: number
}

export function nativeMinuteInterval(value = 1) {
  return Number.isFinite(value) ? Math.max(1, Math.min(60, Math.floor(value))) : 1
}

export function nativeTimeOptions(hour: number, options: NativeTimeBounds): Time[] {
  const result = []
  for (let minute = 0; minute < 60; minute += nativeMinuteInterval(options.minuteInterval)) {
    const time = new Time(hour, minute)
    if ((options.minTime && time.compare(options.minTime) < 0) || (options.maxTime && time.compare(options.maxTime) > 0)) continue
    result.push(time)
  }
  return result
}

export function nativeNearestTime(value: Time, options: NativeTimeBounds) {
  const current = (value.hour * 60 + value.minute) * 60 + value.second
  let selected: Time | undefined
  let nearest = Infinity
  for (let hour = 0; hour < 24; hour++) {
    for (const choice of nativeTimeOptions(hour, options)) {
      const distance = Math.abs((choice.hour * 60 + choice.minute) * 60 - current)
      if (distance < nearest) {
        selected = choice
        nearest = distance
      }
    }
  }
  return selected
}

export function nativeDisplayedHour(time: Time, format: NativeHourFormat) {
  return format === 12 ? time.hour % 12 || 12 : time.hour
}

export function nativeWallHour(hour: number, format: NativeHourFormat, period: NativeTimePeriod = 'am') {
  return format === 12 ? (hour % 12) + (period === 'pm' ? 12 : 0) : hour
}

export function nativeHourFormat(requested: NativeHourFormat | undefined, locale = 'en-US'): NativeHourFormat {
  if (requested) return requested
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try { return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 ? 12 : 24 }
    catch { /* Use the locale fallback. */ }
  }
  return /^(?:en|en-US|en-PH|ar|ar-EG)$/i.test(locale) ? 12 : 24
}

export function nativePeriodLabel(period: NativeTimePeriod, locale = 'en-US') {
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      const parts = new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true, timeZone: 'UTC' })
        .formatToParts(Date.UTC(2026, 0, 1, period === 'am' ? 8 : 17))
      const label = parts.find(part => part.type === 'dayPeriod')?.value
      if (label) return label
    } catch { /* Use the locale fallback. */ }
  }
  if (/^zh/i.test(locale)) return period === 'am' ? '上午' : '下午'
  if (/^ja/i.test(locale)) return period === 'am' ? '午前' : '午後'
  return period === 'am' ? 'AM' : 'PM'
}

export function nativeClockLabel(time: Time, locale = 'en-US', format = nativeHourFormat(undefined, locale)) {
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      const hourCycle = format === 12 ? 'h12' : 'h23'
      return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle })
        .format(Date.UTC(2026, 0, 1, time.hour, time.minute))
    } catch { /* Use the configured clock format. */ }
  }
  const clock = `${String(nativeDisplayedHour(time, format)).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
  if (format === 24) return clock
  const period = nativePeriodLabel(time.hour < 12 ? 'am' : 'pm', locale)
  return /^(?:zh|ja)/i.test(locale) ? `${period} ${clock}` : `${clock} ${period}`
}

export function nativeTimeOf(value: { hour: number; minute: number; second?: number; millisecond?: number }) {
  return new Time(value.hour, value.minute, value.second, value.millisecond)
}

export function nativeExactTime(value: Time, bounds: NativeTimeBounds) {
  return nativeTimeOptions(value.hour, bounds).some(time => value.compare(time) === 0)
}
