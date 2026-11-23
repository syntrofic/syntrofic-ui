import {
  createCalendar, fromDate, getLocalTimeZone, GregorianCalendar, parseDate, parseDateTime, toCalendar, toCalendarDate,
  type CalendarIdentifier, type DateValue,
} from '@internationalized/date'

const gregorian = new GregorianCalendar()
const calendarDay = /^\d{4}-\d{2}-\d{2}$/
const dateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/

export function searchDateZone(timeZone: string | undefined, dateOnly = true) {
  return timeZone ?? (dateOnly ? 'UTC' : getLocalTimeZone())
}

export function readSearchDate(input: string | number | Date, zone: string, dateOnly = true, calendar?: string): DateValue | undefined {
  try {
    let date: DateValue
    if (typeof input === 'string' && calendarDay.test(input)) {
      const day = parseDate(input)
      date = dateOnly ? day : fromDate(day.toDate(zone), zone)
    } else {
      const native = input instanceof Date ? input : typeof input === 'number' || /^-?\d{1,15}$/.test(input)
        ? new Date(Number(input) * 1000) : dateTime.test(input) ? parseDateTime(input).toDate(zone) : new Date(input)
      if (!Number.isFinite(native.valueOf())) return undefined
      const zoned = fromDate(native, zone)
      date = dateOnly ? toCalendarDate(zoned) : zoned
    }
    return calendar ? toCalendar(date, createCalendar(calendar as CalendarIdentifier)) : date
  } catch { return undefined }
}

export function storeSearchDate(date: DateValue | undefined, zone: string, dateOnly: boolean, storage: 'iso' | 'epoch' = 'iso') {
  if (!date) return undefined
  const normalized = toCalendar(dateOnly ? toCalendarDate(date) : date, gregorian)
  const native = 'timeZone' in normalized ? normalized.toDate() : normalized.toDate(zone)
  if (storage === 'epoch') return String(Math.floor(native.valueOf() / 1000))
  return dateOnly ? normalized.toString() : native.toISOString()
}

export function searchDateKey(input: string | number | Date, zone: string, dateOnly = true) {
  const date = readSearchDate(input, zone, dateOnly)
  return !date ? undefined : dateOnly ? toCalendarDate(date).toString()
    : ('timeZone' in date ? date.toDate() : date.toDate(zone)).valueOf()
}

export function formatSearchDate(input: string, zone: string, dateOnly: boolean, locale: string) {
  const date = readSearchDate(input, zone, dateOnly)
  if (!date) return input
  const value = 'timeZone' in date ? date.toDate() : date.toDate(zone)
  try {
    return new Intl.DateTimeFormat(locale, { timeZone: zone, dateStyle: 'medium', timeStyle: dateOnly ? undefined : 'short' }).format(value)
  } catch { return input }
}
