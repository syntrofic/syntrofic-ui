import {
  endOfMonth, getDayOfWeek, GregorianCalendar, isSameDay, startOfMonth, startOfWeek,
  toCalendar, toCalendarDate, toCalendarDateTime, toTimeZone,
  type CalendarDate, type CalendarDateTime, type DateValue,
} from '@internationalized/date'
import type { InjectionKey, Ref } from 'vue'
import { inject } from 'vue'

export type AgendaView = 'day' | 'week' | 'month'
export type AgendaWeekStart = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export type AgendaColor = 'sage' | 'blue' | 'rose' | 'sand' | 'neutral'

export interface AgendaEvent {
  id: string
  title: string
  start: DateValue
  end: DateValue
  color?: AgendaColor
  isAllDay?: boolean
  isReadOnly?: boolean
  status?: 'confirmed' | 'unconfirmed' | 'declined'
}

export interface AgendaInterval {
  start: CalendarDateTime
  end: CalendarDateTime
}

export interface AgendaLabels {
  previous?: string
  next?: string
  today?: string
  view?: string
  day?: string
  week?: string
  month?: string
  allDay?: string
  addEvent?: string
  empty?: string
  currentTime?: string
  more?: (count: number) => string
  count?: (count: number) => string
}

export interface AgendaControls {
  view: Readonly<Ref<AgendaView>>
  date: Readonly<Ref<CalendarDate>>
  visibleDays: Readonly<Ref<readonly CalendarDate[]>>
  selected: Readonly<Ref<string | null>>
  navigate: (direction: -1 | 1) => void
  setView: (view: AgendaView) => void
  setDate: (day: CalendarDate) => void
  setVisibleStart: (day: CalendarDate) => void
  goToday: () => void
}

export const agendaContext: InjectionKey<AgendaControls> = Symbol('agenda')
export function useAgenda() { return inject(agendaContext, null) }

type EventTime = AgendaInterval & { event: AgendaEvent; allDay: boolean }
export type TimedAgendaEvent = EventTime & { from: number; to: number; lane: number; lanes: number }
export type AgendaSpan = EventTime & { column: number; span: number; row: number }

const gregorian = new GregorianCalendar()

export function agendaCivil(value: DateValue, zone: string) {
  return toCalendar(toCalendarDateTime('timeZone' in value ? toTimeZone(value, zone) : value), gregorian)
}

export function agendaDays(start: CalendarDate, count: number) {
  return Array.from({ length: count }, (_, index) => start.add({ days: index }))
}

export function agendaWeekStart(date: CalendarDate, locale: string, firstDay?: AgendaWeekStart) {
  return startOfWeek(date, locale, firstDay)
}

export function agendaWeeks(date: CalendarDate, locale: string, firstDay?: AgendaWeekStart) {
  const end = endOfMonth(date)
  const weeks: CalendarDate[][] = []
  for (let day = agendaWeekStart(startOfMonth(date), locale, firstDay); day.compare(end) <= 0; day = day.add({ days: 7 })) {
    weeks.push(agendaDays(day, 7))
  }
  return weeks
}

export function isAgendaWeekend(date: CalendarDate) {
  const weekday = getDayOfWeek(date, 'en-US', 'sun')
  return weekday === 0 || weekday === 6
}

export function agendaMinute(dt: CalendarDateTime) {
  return dt.hour * 60 + dt.minute + dt.second / 60 + dt.millisecond / 60000
}

export function dayMinute(day: CalendarDate, minute: number) {
  return toCalendarDateTime(day).add({ minutes: minute })
}

export function minuteSpan(start: CalendarDateTime, end: CalendarDateTime) {
  return (end.toDate('UTC').getTime() - start.toDate('UTC').getTime()) / 60000
}

export function eventTimes(events: readonly AgendaEvent[], zone: string) {
  const valid: EventTime[] = []
  for (const event of events) {
    const start = agendaCivil(event.start, zone)
    const end = agendaCivil(event.end, zone)
    if (end.compare(start) < 0) continue
    const allDay = event.isAllDay ?? (!('hour' in event.start) && !('hour' in event.end))
    valid.push({ event, start, end, allDay })
  }
  return valid.sort((a, b) => a.start.compare(b.start) || b.end.compare(a.end))
}

export function timedAgendaEvents(events: readonly EventTime[], day: CalendarDate, first: number, last: number, minimum: number) {
  const windowStart = dayMinute(day, first)
  const windowEnd = dayMinute(day, last)
  const matches: TimedAgendaEvent[] = []
  for (const time of events) {
    if (time.allDay || time.start.compare(windowEnd) >= 0 || time.end.compare(windowStart) < 0 ||
      (time.end.compare(windowStart) === 0 && time.start.compare(windowStart) < 0)) continue
    const from = Math.max(first, first + minuteSpan(windowStart, time.start))
    const to = Math.min(last, Math.max(from + minimum, first + minuteSpan(windowStart, time.end)))
    matches.push({ ...time, from, to, lane: 0, lanes: 1 })
  }

  const activeEnds: number[] = []
  let packing: TimedAgendaEvent[] = []
  const finish = () => {
    for (const item of packing) item.lanes = activeEnds.length
    activeEnds.length = 0
    packing = []
  }
  for (const item of matches) {
    if (!activeEnds.some(end => end > item.from)) finish()
    const free = activeEnds.findIndex(end => end <= item.from)
    item.lane = free < 0 ? activeEnds.length : free
    activeEnds[item.lane] = item.to
    packing.push(item)
  }
  finish()
  return matches
}

function dayEnd(time: EventTime) {
  let end = toCalendarDate(time.end)
  if (agendaMinute(time.end) > 0 || isSameDay(time.start, time.end)) end = end.add({ days: 1 })
  return end
}

export function eventsOnDay(events: readonly EventTime[], day: CalendarDate, allDay: boolean) {
  return events.filter(time => time.allDay === allDay && toCalendarDate(time.start).compare(day) <= 0 && dayEnd(time).compare(day) > 0)
}

export function agendaSpans(events: readonly EventTime[], days: readonly CalendarDate[]) {
  const spans: AgendaSpan[] = []
  const laneEnds: number[] = []
  for (const item of events) {
    if (!item.allDay) continue
    const last = dayEnd(item)
    const start = toCalendarDate(item.start)
    const column = days.findIndex(day => start.compare(day) <= 0 && day.compare(last) < 0)
    if (column < 0) continue
    let end = column + 1
    while (end < days.length && days[end].compare(last) < 0) end++
    const row = laneEnds.findIndex(current => current <= column)
    const lane = row >= 0 ? row : laneEnds.length
    laneEnds[lane] = end
    spans.push({ ...item, column, span: end - column, row: lane })
  }
  return { items: spans, rows: laneEnds.length }
}
