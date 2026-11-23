import { Time, toCalendarDate, toCalendarDateTime, type CalendarDate, type CalendarDateTime } from '@internationalized/date'
import { nativeNearestTime, nativeTimeOptions, type NativeTimeBounds } from './time-state'

export interface NativeDateTimeBounds {
  minDate?: CalendarDate
  maxDate?: CalendarDate
  minDateTime?: CalendarDateTime
  maxDateTime?: CalendarDateTime
  minuteInterval?: number
}

export function nativeDateTimeDays(options: NativeDateTimeBounds) {
  const clockStart = options.minDateTime && toCalendarDate(options.minDateTime)
  const clockEnd = options.maxDateTime && toCalendarDate(options.maxDateTime)
  return {
    first: options.minDate && (!clockStart || options.minDate.compare(clockStart) > 0) ? options.minDate : clockStart,
    last: options.maxDate && (!clockEnd || options.maxDate.compare(clockEnd) < 0) ? options.maxDate : clockEnd,
  }
}

export function nativeTimeBoundsForDay(day: CalendarDate, options: NativeDateTimeBounds): NativeTimeBounds | undefined {
  if ((options.minDate && day.compare(options.minDate) < 0) || (options.maxDate && day.compare(options.maxDate) > 0)) return undefined
  const lower = options.minDateTime && day.compare(toCalendarDate(options.minDateTime))
  const upper = options.maxDateTime && day.compare(toCalendarDate(options.maxDateTime))
  if ((lower !== undefined && lower < 0) || (upper !== undefined && upper > 0)) return undefined
  const timeOf = (clock: CalendarDateTime) => new Time(clock.hour, clock.minute, clock.second, clock.millisecond)
  return {
    minTime: lower === 0 && options.minDateTime ? timeOf(options.minDateTime) : undefined,
    maxTime: upper === 0 && options.maxDateTime ? timeOf(options.maxDateTime) : undefined,
    minuteInterval: options.minuteInterval,
  }
}

export function nativeDayHasSlots(day: CalendarDate, options: NativeDateTimeBounds) {
  const rules = nativeTimeBoundsForDay(day, options)
  if (!rules) return false
  if (!rules.minTime && !rules.maxTime) return true
  for (let hour = 0; hour < 24; hour++) {
    if (nativeTimeOptions(hour, rules).length) return true
  }
  return false
}

export function nativeAvailableDateTime(day: CalendarDate, time: Time, options: NativeDateTimeBounds) {
  const rules = nativeTimeBoundsForDay(day, options)
  const nearest = rules && nativeNearestTime(time, rules)
  return nearest ? toCalendarDateTime(day, nearest) : undefined
}
