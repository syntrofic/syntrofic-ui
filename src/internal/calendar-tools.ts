import { CalendarDate, createCalendar, getLocalTimeZone, parseDate, startOfMonth, toCalendar, toCalendarDate, today,
  type CalendarIdentifier, type DateValue } from '@internationalized/date'
import { computed, readonly, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import { localeWithCalendar, useLocale } from '../rac/locale'

export type CalendarDayValue = string | DateValue
export type CalendarWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export interface CalendarDay {
  date: CalendarDate
  iso: string
  isOutside: boolean
  dayNumber: number
}

export interface CalendarDaysOptions {
  year: number
  month: number
  weekStartsOn?: CalendarWeekday
  hasVariableRowCount?: boolean
  calendar?: CalendarIdentifier
  locale?: string
  weekdayFormat?: 'narrow' | 'short' | 'long'
}
export interface CalendarConstraintsOptions {
  min?: CalendarDayValue | null
  max?: CalendarDayValue | null
  rangeAnchor?: CalendarDayValue | null
  minRangeSpan?: number
  maxRangeSpan?: number
  dateConstraints?: readonly ((date: Date) => boolean)[]
  timeZone?: string
}
export interface CalendarNavigationOptions {
  initialValue?: CalendarDayValue
  focusDate?: CalendarDayValue
  onFocusDateChange?: (iso: string) => void
  numberOfMonths?: 1 | 2
  calendar?: CalendarIdentifier
  locale?: string
  timeZone?: string
}

const gregorian = createCalendar('gregory')
const alignedYears: Partial<Record<CalendarIdentifier, number>> = {
  gregory: 0, iso8601: 0, buddhist: 543, roc: -1911, japanese: 0,
}
const gridSunday = new CalendarDate(2023, 1, 1)
const gregorianDate = (date: DateValue) => toCalendar(toCalendarDate(date), gregorian)
const julianDay = (date: DateValue) => date.calendar.toJulianDay(date)

interface TemporalCalendarDay {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly daysInMonth: number
  add(duration: { days?: number; months?: number }): TemporalCalendarDay
  with(fields: { day: number }): TemporalCalendarDay
  withCalendar(calendar: string): TemporalCalendarDay
  toString(options: { calendarName: 'never' }): string
}
interface TemporalCalendarFactory {
  from(value: string | { calendar: string; year: number; month: number; day: number }): TemporalCalendarDay
}

function calendarSystem(requested: CalendarIdentifier) {
  const identifier = requested === 'iso8601' ? 'gregory' : requested
  const calendar = createCalendar(identifier)
  if (calendar.identifier === identifier) return { identifier, calendar }
  const temporal = (globalThis as { Temporal?: { PlainDate: TemporalCalendarFactory } }).Temporal?.PlainDate
  try {
    if (temporal) {
      temporal.from('2026-01-01').withCalendar(identifier)
      return { identifier, calendar, temporal }
    }
  } catch { /* A browser can implement Temporal with a smaller calendar set. */ }
  return { identifier: 'gregory' as const, calendar: gregorian }
}

function readDay(value: CalendarDayValue | null | undefined) {
  if (typeof value === 'string') {
    try { return parseDate(value) } catch { return null }
  }
  return value ? gregorianDate(value) : null
}

function weekdayNames(locale: string, starts: number, width: CalendarDaysOptions['weekdayFormat']) {
  function names(weekday: NonNullable<CalendarDaysOptions['weekdayFormat']>) {
    const format = new Intl.DateTimeFormat(locale, { weekday, timeZone: 'UTC' })
    return Array.from({ length: 7 }, (_, day) => format.format(gridSunday.add({ days: (starts + day) % 7 }).toDate('UTC')))
  }
  const labels = names(width ?? 'short')
  return width || labels.every(label => Array.from(label).length <= 4) ? labels : names('narrow')
}

export function useCalendarDays(source: MaybeRefOrGetter<CalendarDaysOptions>) {
  const options = computed(() => toValue(source))
  const { locale } = useLocale()
  const starts = computed(() => options.value.weekStartsOn ?? 0)
  const dayNames = computed(() => weekdayNames(options.value.locale ?? locale.value, starts.value, options.value.weekdayFormat))
  const days = computed<CalendarDay[]>(() => {
    const { year, month, calendar: requested = 'gregory', hasVariableRowCount } = options.value
    const { identifier, calendar, temporal } = calendarSystem(requested)
    const offset = alignedYears[identifier]
    const monthDate = temporal?.from({ calendar: identifier, year, month, day: 1 })
    const first = monthDate ? parseDate(monthDate.toString({ calendarName: 'never' }))
      : offset === undefined ? new CalendarDate(calendar, year, month, 1) : new CalendarDate(year - offset, month, 1)
    const start = (first.toDate('UTC').getUTCDay() - starts.value + 7) % 7
    const monthLength = monthDate?.daysInMonth ?? first.calendar.getDaysInMonth(first)
    const length = hasVariableRowCount ? Math.ceil((start + monthLength) / 7) * 7 : 42
    return Array.from({ length }, (_, index) => {
      const offset = index - start
      const cell = first.add({ days: offset })
      const date = gregorianDate(cell)
      return { date, iso: date.toString(), isOutside: offset < 0 || offset >= monthLength, dayNumber: monthDate?.add({ days: offset }).day ?? cell.day }
    })
  })
  const weeks = computed(() => Array.from({ length: days.value.length / 7 }, (_, index) => days.value.slice(index * 7, index * 7 + 7)))
  const totalCells = computed(() => days.value.length)
  return { days, weeks, dayNames, totalCells }
}

export function useCalendarConstraints(source: MaybeRefOrGetter<CalendarConstraintsOptions> = {}) {
  const options = computed(() => toValue(source))
  const minDate = computed(() => readDay(options.value.min))
  const maxDate = computed(() => readDay(options.value.max))
  const anchor = computed(() => readDay(options.value.rangeAnchor))
  function isDateDisabled(value: CalendarDayValue) {
    const date = readDay(value)
    if (!date || minDate.value && date.compare(minDate.value) < 0 || maxDate.value && date.compare(maxDate.value) > 0) return true
    const { minRangeSpan, maxRangeSpan, dateConstraints, timeZone } = options.value
    if (anchor.value) {
      const distance = Math.abs(julianDay(date) - julianDay(anchor.value))
      if (maxRangeSpan !== undefined && distance >= maxRangeSpan) return true
      if (minRangeSpan !== undefined && distance > 0 && distance < minRangeSpan - 1) return true
    }
    return dateConstraints?.some(accept => !accept(date.toDate(timeZone ?? getLocalTimeZone()))) ?? false
  }
  return { isDateDisabled, minDate, maxDate }
}

export function useCalendarNavigation(source: MaybeRefOrGetter<CalendarNavigationOptions> = {}) {
  const options = computed(() => toValue(source))
  const { locale } = useLocale()
  const focus = shallowRef(readDay(options.value.focusDate ?? options.value.initialValue) ?? today(options.value.timeZone ?? getLocalTimeZone()))
  const pending = shallowRef<string | null>(null)
  const system = computed(() => calendarSystem(options.value.calendar ?? 'gregory'))
  const controlled = computed(() => options.value.focusDate !== undefined && Boolean(options.value.onFocusDateChange))
  function monthAt(offset: number) {
    const { identifier, calendar, temporal } = system.value
    const active = controlled.value ? readDay(options.value.focusDate) ?? focus.value : focus.value
    if (temporal) {
      const day = temporal.from(active.toString()).withCalendar(identifier).with({ day: 1 }).add({ months: offset })
      return { start: parseDate(day.toString({ calendarName: 'never' })), year: day.year, month: day.month }
    }
    const yearOffset = alignedYears[identifier]
    const day = startOfMonth(yearOffset !== undefined ? active : toCalendar(active, calendar)).add({ months: offset })
    return { start: gregorianDate(day), year: day.year + (yearOffset ?? 0), month: day.month }
  }
  const months = computed(() => Array.from({ length: options.value.numberOfMonths === 2 ? 2 : 1 }, (_, index) => monthAt(index)))
  const visibleMonths = computed(() => months.value.map(date => date.start))
  const baseMonth = computed(() => visibleMonths.value[0])
  const visibleCalendarMonths = computed(() => months.value.map(({ year, month }) => ({ year, month })))
  const monthYearLabel = computed(() => {
    const format = new Intl.DateTimeFormat(localeWithCalendar(options.value.locale ?? locale.value, system.value.identifier),
      { month: 'long', year: 'numeric', timeZone: 'UTC' })
    return visibleMonths.value.map(date => format.format(date.add({ days: 2 }).toDate('UTC'))).join(' – ')
  })
  function navigateMonth(delta: number, focusedDate?: CalendarDayValue, offset = 7) {
    if (!Number.isSafeInteger(delta) || delta === 0) return
    const next = monthAt(delta).start
    if (focusedDate !== undefined) pending.value = readDay(focusedDate)?.add({ days: delta * offset }).toString() ?? null
    if (!controlled.value) focus.value = next
    options.value.onFocusDateChange?.(next.toString())
  }
  return { baseMonth, visibleMonths, visibleCalendarMonths, monthYearLabel, navigateMonth, pendingFocus: readonly(pending),
    clearPendingFocus() { pending.value = null } }
}
