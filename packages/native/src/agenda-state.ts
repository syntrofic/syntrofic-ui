import type { CalendarDate, CalendarDateTime } from '@internationalized/date'
import { nativeAgendaDayLimits, nativeAgendaWallMilliseconds } from './calendar-state'

export interface NativeAgendaEvent {
  id: string | number
  title: string
  start: CalendarDateTime
  end: CalendarDateTime
  description?: string
  allDay?: boolean
  disabled?: boolean
}

export interface NativeAgendaBlock {
  event: NativeAgendaEvent
  startsBefore: boolean
  endsAfter: boolean
  minute: number
  duration: number
}

export function nativeAgendaEventsForDay(events: readonly NativeAgendaEvent[], day: CalendarDate) {
  const { start, end } = nativeAgendaDayLimits(day)
  const first = nativeAgendaWallMilliseconds(start)
  const last = nativeAgendaWallMilliseconds(end)
  const blocks: NativeAgendaBlock[] = []
  for (const event of events) {
    const from = nativeAgendaWallMilliseconds(event.start)
    const until = nativeAgendaWallMilliseconds(event.end)
    if (from >= until || until <= first || from >= last) continue
    const minute = (Math.max(from, first) - first) / 60_000
    blocks.push({
      event,
      startsBefore: from < first,
      endsAfter: until > last,
      minute,
      duration: (Math.min(until, last) - first) / 60_000 - minute,
    })
  }
  return blocks.sort((left, right) => Number(Boolean(right.event.allDay)) - Number(Boolean(left.event.allDay))
    || left.minute - right.minute || right.duration - left.duration)
}

export function nativeAgendaLanes(blocks: readonly NativeAgendaBlock[]) {
  const positioned: (NativeAgendaBlock & { lane: number; lanes: number })[] = []
  let first = 0
  let endpoints: number[] = []
  let endOfGroup = -Infinity

  function flush() {
    for (let index = first; index < positioned.length; index++) positioned[index].lanes = endpoints.length
    first = positioned.length
    endpoints = []
    endOfGroup = -Infinity
  }

  for (const block of blocks) {
    if (block.event.allDay) continue
    if (block.minute >= endOfGroup) flush()
    const available = endpoints.findIndex(end => end <= block.minute)
    const lane = available < 0 ? endpoints.length : available
    const end = block.minute + block.duration
    endpoints[lane] = end
    endOfGroup = Math.max(endOfGroup, end)
    positioned.push({ ...block, lane, lanes: 1 })
  }
  flush()
  return positioned
}

export function editNativeAgendaEvent(event: NativeAgendaEvent, change: {
  minutes: number
  days?: number
  kind: 'move' | 'start' | 'end'
  increment?: number
  minDuration?: number
}) {
  if (event.disabled || !Number.isFinite(change.minutes) || !Number.isFinite(change.days ?? 0)) return undefined
  const step = Math.max(1, change.increment ?? 15)
  const delta = { minutes: Math.round(change.minutes / step) * step, days: Math.trunc(change.days ?? 0) }
  const start = change.kind === 'end' ? event.start : event.start.add(delta)
  const end = change.kind === 'start' ? event.end : event.end.add(delta)
  const duration = (nativeAgendaWallMilliseconds(end) - nativeAgendaWallMilliseconds(start)) / 60_000
  const minimum = Math.max(1, change.minDuration ?? step)
  if (duration < minimum || (start.compare(event.start) === 0 && end.compare(event.end) === 0)) return undefined
  return { ...event, start, end }
}

export type NativeAgendaView = 'day' | 'week' | 'month'
