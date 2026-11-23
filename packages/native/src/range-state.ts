import type { CalendarDate } from '@internationalized/date'

export interface NativeDateRange {
  start: CalendarDate
  end: CalendarDate
}

export interface NativeDateRangeRules {
  minDate?: CalendarDate
  maxDate?: CalendarDate
  maximumDays?: number
  minimumDays?: number
  allowNonContiguousRanges?: boolean
  isDateUnavailable?: (date: CalendarDate) => boolean
  isDateDisabled?: (date: CalendarDate) => boolean
}

export function nativeOrderedDates(start: CalendarDate, end: CalendarDate): NativeDateRange {
  return start.compare(end) <= 0 ? { start, end } : { start: end, end: start }
}

export function nativeRangeLength(range: NativeDateRange) {
  return range.end.calendar.toJulianDay(range.end) - range.start.calendar.toJulianDay(range.start) + 1
}

export function nativeRangeIssue(range: NativeDateRange, rules: NativeDateRangeRules) {
  const days = nativeRangeLength(range)
  if (days < 1 || (Number.isFinite(rules.minimumDays) && days < rules.minimumDays!)
    || (Number.isFinite(rules.maximumDays) && days > rules.maximumDays!)) return 'length'
  if ((rules.minDate && range.start.compare(rules.minDate) < 0)
    || (rules.maxDate && range.end.compare(rules.maxDate) > 0)) return 'bounds'
  const blocked = (day: CalendarDate) => rules.isDateDisabled?.(day) || rules.isDateUnavailable?.(day)
  if (blocked(range.start) || blocked(range.end)) return 'unavailable'
  if (!rules.allowNonContiguousRanges && (rules.isDateDisabled || rules.isDateUnavailable)) {
    for (let offset = 1; offset < days - 1; offset++) {
      if (blocked(range.start.add({ days: offset }))) return 'unavailable'
    }
  }
}

export function nativeRangePosition(day: CalendarDate, range: NativeDateRange | undefined): 'start' | 'end' | 'single' | 'inside' | undefined {
  if (!range) return undefined
  const from = day.compare(range.start)
  const to = day.compare(range.end)
  if (from < 0 || to > 0) return undefined
  if (from === 0 && to === 0) return 'single'
  if (from === 0) return 'start'
  if (to === 0) return 'end'
  return 'inside'
}
