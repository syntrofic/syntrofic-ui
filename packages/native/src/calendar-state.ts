import {
  CalendarDate, CalendarDateTime, getDayOfWeek, startOfMonth, toCalendar, toCalendarDateTime,
  type Calendar,
} from '@internationalized/date'

export type NativeWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type NativeDatePart = 'year' | 'month' | 'day'
export type NativeDateDraft = Record<NativeDatePart, string>
export interface NativeDateBounds {
  minDate?: CalendarDate
  maxDate?: CalendarDate
  isDateDisabled?: (date: CalendarDate) => boolean
  isDateUnavailable?: (date: CalendarDate) => boolean
}

export function nativeDateToday(now = new Date()) {
  return new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function nativeCalendarWeekStart(locale: string): NativeWeekday {
  if (typeof Intl !== 'undefined' && typeof Intl.Locale === 'function') {
    try {
      const local = new Intl.Locale(locale) as Intl.Locale & {
        weekInfo?: { firstDay: number }
        getWeekInfo?: () => { firstDay: number }
      }
      const day = local.getWeekInfo?.().firstDay ?? local.weekInfo?.firstDay
      if (day) return day % 7 as NativeWeekday
    } catch {
      // Follow the locale tag when the runtime lacks week data.
    }
  }
  const region = locale.toUpperCase().split(/[-_]/).find((part, i) => i > 0 && /^[A-Z]{2}$/.test(part))
  if (region === 'US' || region === 'CA' || region === 'JP' || region === 'BR' || region === 'IN') return 0
  if (region === 'EG' || region === 'SA') return 6
  return locale.toLowerCase() === 'en' ? 0 : 1
}

export function nativeCalendarRows(date: CalendarDate, start: NativeWeekday, fixedWeeks = true) {
  const first = startOfMonth(date)
  const lead = (nativeCalendarWeekday(first) + 7 - start) % 7
  const days = first.calendar.getDaysInMonth(first)
  const count = fixedWeeks ? Math.max(6, Math.ceil((lead + days) / 7)) : Math.ceil((lead + days) / 7)
  const head = first.subtract({ days: lead })
  return Array.from({ length: count }, (_, row) =>
    Array.from({ length: 7 }, (_, column) => head.add({ days: row * 7 + column })))
}

export function nativeCalendarWeekday(date: CalendarDate): NativeWeekday {
  return getDayOfWeek(date, 'en-US', 'sun') as NativeWeekday
}

export function nativeSelectableDate(date: CalendarDate, bounds: NativeDateBounds) {
  return (!bounds.minDate || date.compare(bounds.minDate) >= 0) &&
    (!bounds.maxDate || date.compare(bounds.maxDate) <= 0) &&
    !bounds.isDateDisabled?.(date) && !bounds.isDateUnavailable?.(date)
}

export function nativeBoundedDate(date: CalendarDate, bounds: NativeDateBounds) {
  if (bounds.minDate && date.compare(bounds.minDate) < 0) return toCalendar(bounds.minDate, date.calendar)
  if (bounds.maxDate && date.compare(bounds.maxDate) > 0) return toCalendar(bounds.maxDate, date.calendar)
  return date
}

export function nativeCalendarCanPage(date: CalendarDate, offset: number, bounds: NativeDateBounds) {
  const month = startOfMonth(date).add({ months: offset })
  if (month.compare(startOfMonth(date)) === 0) return false
  const end = month.set({ day: month.calendar.getDaysInMonth(month) })
  return (!bounds.minDate || end.compare(bounds.minDate) >= 0) &&
    (!bounds.maxDate || month.compare(bounds.maxDate) <= 0)
}

export function nativeDateDraft(date?: CalendarDate): NativeDateDraft {
  return {
    day: date ? String(date.day).padStart(2, '0') : '',
    month: date ? String(date.month).padStart(2, '0') : '',
    year: date ? String(date.year).padStart(4, '0') : '',
  }
}

export function readNativeDateDraft(draft: NativeDateDraft, calendar: Calendar, era: string) {
  if (!/^\d{1,2}$/.test(draft.day) || !/^\d{1,2}$/.test(draft.month) || !/^\d{1,4}$/.test(draft.year)) return undefined
  const [year, month, day] = [Number(draft.year), Number(draft.month), Number(draft.day)]
  const result = new CalendarDate(calendar, era, year, month, day)
  return result.year === year && result.month === month && result.day === day && result.era === era ? result : undefined
}

export function nativeAgendaWallMilliseconds(date: CalendarDateTime) {
  return ((date.calendar.toJulianDay(date) * 24 + date.hour) * 60 + date.minute) * 60_000 + date.second * 1_000 + date.millisecond
}

export function nativeAgendaDayLimits(day: CalendarDate) {
  const start = toCalendarDateTime(day)
  return { start, end: start.add({ days: 1 }) }
}

export interface NativeCalendarOptions extends NativeDateBounds {
  label?: string
  locale?: string
  weekStartsOn?: NativeWeekday
  fixedWeeks?: boolean
  defaultMonth?: CalendarDate
  disabled?: boolean
  readonly?: boolean
  selectOutsideMonth?: boolean
  showOutsideMonth?: boolean
  yearPicker?: boolean
  previousMonthLabel?: string
  nextMonthLabel?: string
  yearPickerLabel?: string
  closeYearPickerLabel?: string
}
