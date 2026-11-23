import {
  createCalendar, getLocalTimeZone, GregorianCalendar, toCalendar, toCalendarDateTime, today,
  type Calendar, type CalendarIdentifier,
} from '@internationalized/date'
import { computed, inject } from 'vue'
import { useLocale, type DateRange, type DateValue, type SegmentPart } from 'reka-ui'
import { localeContext, localeWithCalendar } from '../rac/locale'

export interface DateFormatOptions {
  locale?: string
  calendar?: string
  dir?: 'ltr' | 'rtl'
  hourCycle?: 12 | 24
  step?: { year?: number; month?: number; day?: number; hour?: number; minute?: number; second?: number }
  stepSnapping?: boolean
  hideTimeZone?: boolean
  readonly?: boolean
}

export interface DateFieldOptions extends DateFormatOptions {
  minValue?: DateValue
  maxValue?: DateValue
  defaultPlaceholder?: DateValue
  granularity?: 'day' | 'hour' | 'minute' | 'second'
  isDateUnavailable?: (date: DateValue) => boolean
}

export type CalendarDuration =
  | { months: number; weeks?: never; days?: never }
  | { months?: never; weeks: number; days?: never }
  | { months?: never; weeks?: never; days: number }

export interface CalendarPagingOptions {
  visibleDuration?: CalendarDuration
  pageBehavior?: 'visible' | 'single'
  selectionAlignment?: 'start' | 'center' | 'end'
  weeksInMonth?: number
}

export interface CalendarOptions extends CalendarPagingOptions {
  locale?: string
  calendar?: string
  dir?: 'ltr' | 'rtl'
  minValue?: DateValue
  maxValue?: DateValue
  defaultPlaceholder?: DateValue
  fixedWeeks?: boolean
  numberOfMonths?: number
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  weekdayFormat?: 'narrow' | 'short' | 'long'
  pagedNavigation?: boolean
  preventDeselect?: boolean
  disabled?: boolean
  readonly?: boolean
  initialFocus?: boolean
  isDateDisabled?: (date: DateValue) => boolean
  isDateUnavailable?: (date: DateValue) => boolean
  disableDaysOutsideCurrentView?: boolean
  nextPage?: (date: DateValue) => DateValue
  prevPage?: (date: DateValue) => DateValue
}

export interface RangeOptions {
  allowNonContiguousRanges?: boolean
  maximumDays?: number
  isDateHighlightable?: (date: DateValue) => boolean
  fixedDate?: 'start' | 'end'
}

export type RangeDateMatcher = (date: DateValue, anchor?: DateValue) => boolean

export interface CalendarLabels {
  previousMonth?: string
  nextMonth?: string
  previousWeek?: string
  nextWeek?: string
  previousDay?: string
  nextDay?: string
  chooseYear?: string
  previousYears?: string
  nextYears?: string
}

export interface CalendarPresentation {
  label?: string
  yearPicker?: boolean
  invalid?: boolean
  navigationLabels?: CalendarLabels
}

export interface DateInputSegment {
  part: SegmentPart
  value: string
}

export interface CalendarMonth {
  value: DateValue
  rows: DateValue[][]
}

export interface DatePickerOptions extends Omit<DateFieldOptions, 'stepSnapping'>, CalendarPagingOptions {
  triggerText?: string
  triggerLabel?: string
  yearPicker?: boolean
  navigationLabels?: CalendarLabels
  closeOnSelect?: boolean
  preventDeselect?: boolean
  weekStartsOn?: CalendarOptions['weekStartsOn']
  weekdayFormat?: CalendarOptions['weekdayFormat']
  fixedWeeks?: boolean
  numberOfMonths?: number
  pagedNavigation?: boolean
  isDateDisabled?: (date: DateValue) => boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export function positiveCount(count: number | undefined, fallback: number) {
  return count && Number.isSafeInteger(count) && count > 0 ? count : fallback
}

export function calendarPeriod(duration: CalendarDuration | undefined) {
  if (duration?.weeks !== undefined) return { unit: 'weeks', count: positiveCount(duration.weeks, 1) } as const
  if (duration?.days !== undefined) return { unit: 'days', count: positiveCount(duration.days, 1) } as const
}

export function monthCount(options: CalendarPagingOptions & { numberOfMonths?: number }) {
  return positiveCount(options.visibleDuration?.months, positiveCount(options.numberOfMonths, 1))
}

export function monthPaging(options: CalendarPagingOptions & { pagedNavigation?: boolean }) {
  if (options.pageBehavior) return options.pageBehavior === 'visible'
  return options.pagedNavigation ?? options.visibleDuration?.months !== undefined
}

export function initialMonth(options: CalendarOptions, selection: DateValue | undefined) {
  if (options.defaultPlaceholder || !options.selectionAlignment || !selection) return options.defaultPlaceholder
  const months = monthCount(options) - 1
  const offset = options.selectionAlignment === 'center' ? Math.floor(months / 2)
    : options.selectionAlignment === 'end' ? months : 0
  const start = selection.subtract({ months: offset })
  if (options.minValue && start.compare(options.minValue) < 0) return options.minValue
  return start
}

const gregorian = new GregorianCalendar()

export function calendarForLocale(locale: string, original: Calendar = gregorian) {
  const local = new Intl.Locale(locale)
  const calendar = new Intl.DateTimeFormat(locale).resolvedOptions().calendar
  return local.calendar || calendar !== 'gregory' ? createCalendar(calendar as CalendarIdentifier) : original
}

export function useCalendarLocale(options: { locale?: string; calendar?: string }) {
  const locale = useLocale(computed(() => options.locale))
  const local = inject(localeContext, null)
  return computed(() => localeWithCalendar(locale.value, options.calendar ?? local?.calendar?.value))
}

export function useMonthDates(options: CalendarOptions, source: () => DateValue | undefined) {
  const locale = useCalendarLocale(options)
  const original = computed(() => source()?.calendar ?? gregorian)
  const display = computed(() => calendarForLocale(locale.value, original.value))
  const toDisplay = (date: DateValue) => toCalendar(date, display.value)
  const toModel = (date: DateValue) => toCalendar(date, original.value)
  const minValue = computed(() => options.minValue && toDisplay(options.minValue))
  const maxValue = computed(() => options.maxValue && toDisplay(options.maxValue))
  function defaultMonth(selection: DateValue | undefined) {
    if (options.defaultPlaceholder) return toDisplay(options.defaultPlaceholder)
    if (selection) return initialMonth({ ...options, minValue: minValue.value }, toDisplay(selection))
    const date = source()
    return !date && display.value.identifier !== 'gregory' ? toDisplay(today(getLocalTimeZone())) : undefined
  }
  return { locale, display, toDisplay, toModel, minValue, maxValue, defaultMonth }
}

export function mapRange(range: DateRange | undefined, convert: (date: DateValue) => DateValue) {
  return range && { start: range.start && convert(range.start), end: range.end && convert(range.end) }
}

export function pickerCalendarOptions(options: DatePickerOptions, selection: DateValue | undefined) {
  const dateTime = !options.defaultPlaceholder && !selection && options.granularity && options.granularity !== 'day'
    ? toCalendarDateTime(today(getLocalTimeZone()))
    : undefined
  return {
    locale: options.locale,
    calendar: options.calendar,
    dir: options.dir,
    defaultPlaceholder: options.defaultPlaceholder ?? dateTime,
    minValue: options.minValue,
    maxValue: options.maxValue,
    readonly: options.readonly,
    yearPicker: options.yearPicker,
    navigationLabels: options.navigationLabels,
    visibleDuration: options.visibleDuration,
    fixedWeeks: options.fixedWeeks,
    weeksInMonth: options.weeksInMonth,
    numberOfMonths: options.numberOfMonths,
    pageBehavior: options.pageBehavior,
    pagedNavigation: options.pagedNavigation,
    selectionAlignment: options.selectionAlignment,
    weekStartsOn: options.weekStartsOn,
    weekdayFormat: options.weekdayFormat,
    preventDeselect: options.preventDeselect,
    isDateDisabled: options.isDateDisabled,
    isDateUnavailable: options.isDateUnavailable,
  }
}

export function focusPeriodOnOpen(event: Event) {
  const root = event.target
  if (!(root instanceof HTMLElement)) return
  const day = root.querySelector<HTMLElement>('.sy-calendar--period .sy-calendar__day[tabindex="0"]')
  const next = day ?? root.querySelector<HTMLElement>('.sy-calendar--period button:not(:disabled, [aria-disabled="true"])')
  if (!next) return
  event.preventDefault()
  next.focus({ preventScroll: true })
}
