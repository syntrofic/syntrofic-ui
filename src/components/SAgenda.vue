<script setup lang="ts">
import {
  fromAbsolute, getLocalTimeZone, isSameDay, isSameMonth, now, toCalendarDate, type CalendarDate, type CalendarDateTime,
} from '@internationalized/date'
import { computed, onBeforeUnmount, onMounted, provide, ref, shallowRef, useId, type CSSProperties } from 'vue'
import { isRTL, localeWithCalendar, useLocale } from '../rac/locale'
import {
  agendaCivil, agendaContext, agendaDays, agendaMinute, agendaSpans, agendaWeeks, agendaWeekStart,
  dayMinute, eventsOnDay, eventTimes, isAgendaWeekend, minuteSpan, timedAgendaEvents,
  type AgendaControls, type AgendaEvent, type AgendaInterval, type AgendaLabels, type AgendaView, type AgendaWeekStart,
} from '../internal/agenda'
import { useShellCompact } from '../internal/shell-layout'
import SAgendaEvent from '../internal/SAgendaEvent.vue'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'
import SSegment from './SSegment.vue'

type EditKind = 'create' | 'move' | 'resize'
type Edit =
  { kind: 'create'; day: CalendarDate; minute: number } |
  { kind: 'move' | 'resize'; event: AgendaEvent; original: AgendaInterval; offset: number }
type PointerEdit = {
  id: number; x: number; y: number; hasMoved: boolean; spec: Edit; result: AgendaInterval
}

const props = withDefaults(defineProps<{
  label?: string
  events: readonly AgendaEvent[]
  defaultView?: AgendaView
  defaultDate?: CalendarDate
  defaultSelected?: string | null
  locale?: string
  direction?: 'ltr' | 'rtl'
  timeZone?: string
  firstDayOfWeek?: AgendaWeekStart
  hourCycle?: 12 | 24
  weekDays?: number
  compactWeekDays?: number
  compactBreakpoint?: number
  startHour?: number
  endHour?: number
  slotDuration?: number
  snapMinutes?: number
  defaultEventDuration?: number
  maxMonthEvents?: number
  showAllDay?: boolean
  defaultAllDayExpanded?: boolean
  showCurrentTime?: boolean
  editable?: boolean
  allowCreate?: boolean
  allowMove?: boolean
  allowResize?: boolean
  allowDelete?: boolean
  touchEditing?: boolean
  allowsSwipe?: boolean
  referenceTime?: CalendarDateTime
  labels?: AgendaLabels
}>(), {
  label: 'Agenda', defaultView: 'week', weekDays: 7, compactBreakpoint: 540,
  startHour: 0, endHour: 24, slotDuration: 60, snapMinutes: 5, defaultEventDuration: 60,
  maxMonthEvents: 2, showAllDay: true, defaultAllDayExpanded: true, showCurrentTime: true,
  allowCreate: undefined, allowMove: undefined, allowResize: undefined, allowDelete: undefined,
})
const emit = defineEmits<{
  select: [event: AgendaEvent | null]
  create: [interval: AgendaInterval]
  move: [event: AgendaEvent, interval: AgendaInterval]
  resize: [event: AgendaEvent, interval: AgendaInterval]
  delete: [event: AgendaEvent]
}>()
const model = defineModel<CalendarDate>('date')
const viewModel = defineModel<AgendaView>('view')
const selectedModel = defineModel<string | null>('selected')
const root = ref<HTMLElement | null>(null)
const editor = ref<HTMLElement | null>(null)
const allDayExpanded = ref(props.defaultAllDayExpanded)
const clock = ref<number>()
const offset = shallowRef<CalendarDate>()
const movement = ref<1 | -1>(1)
const gesture = shallowRef<PointerEdit>()
const swipe = ref(0)
let swipePointer: { id: number; x: number; y: number } | undefined
let wheelDelta = 0
let wheelEnd: ReturnType<typeof setTimeout> | undefined
let stopClickUntil = 0
let clockTimer: ReturnType<typeof setInterval> | undefined

const contextLocale = useLocale()
const locale = computed(() => localeWithCalendar(props.locale ?? contextLocale.locale.value, contextLocale.calendar?.value))
const direction = computed(() => props.direction ?? (props.locale ? (isRTL(props.locale) ? 'rtl' : 'ltr') : contextLocale.direction.value))
const zone = computed(() => props.timeZone ?? getLocalTimeZone())
const wallNow = computed(() => props.referenceTime ? agendaCivil(props.referenceTime, zone.value) :
  agendaCivil(clock.value === undefined ? now(zone.value) : fromAbsolute(clock.value, zone.value), zone.value))
const today = computed(() => toCalendarDate(wallNow.value))
const view = computed(() => viewModel.value ?? props.defaultView)
const date = computed(() => toCalendarDate(agendaCivil(model.value ?? props.defaultDate ?? today.value, zone.value)))
const selected = computed(() => selectedModel.value === undefined ? props.defaultSelected ?? null : selectedModel.value)
const labels = computed(() => props.labels ?? {})
const compact = useShellCompact(root, () => props.compactBreakpoint)
const shownCount = computed(() => view.value === 'week' ?
  within(compact.value && props.compactWeekDays ? props.compactWeekDays : props.weekDays, 1, 7, 7) : 1)
const first = computed(() => view.value === 'day' ? date.value : offset.value ?? (shownCount.value >= 7 ?
  agendaWeekStart(date.value, locale.value, props.firstDayOfWeek) :
  date.value.subtract({ days: Math.floor(shownCount.value / 2) })))
const weeks = computed(() => agendaWeeks(date.value, locale.value, props.firstDayOfWeek))
const visibleDays = computed(() => view.value === 'month' ? weeks.value.flat() : agendaDays(first.value, shownCount.value))
const start = computed(() => within(props.startHour * 60, 0, 23 * 60, 0))
const end = computed(() => within(props.endHour * 60, start.value + 60, 1440, 1440))
const slot = computed(() => within(props.slotDuration, 5, 240, 60))
const snap = computed(() => within(props.snapMinutes, 1, 120, 5))
const duration = computed(() => within(props.defaultEventDuration, snap.value, 720, 60))
const maxMonthEvents = computed(() => within(props.maxMonthEvents, 1, 12, 2))
const hours = computed(() => Array.from({ length: Math.ceil((end.value - start.value) / slot.value) }, (_, index) => start.value + index * slot.value))
const period = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric', timeZone: zone.value, calendar: 'gregory' }))
const weekday = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: zone.value }))
const fullDate = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'full', timeZone: zone.value }))
const hour = computed(() => new Intl.DateTimeFormat(locale.value, {
  hour: props.hourCycle === 24 ? '2-digit' : 'numeric', minute: '2-digit', hourCycle: props.hourCycle === undefined ? undefined : props.hourCycle === 12 ? 'h12' : 'h23', timeZone: 'UTC',
}))
const items = computed(() => eventTimes(props.events, zone.value))
const timed = computed(() => visibleDays.value.map(day => timedAgendaEvents(items.value, day, start.value, end.value, Math.min(15, snap.value))))
const spans = computed(() => agendaSpans(items.value, visibleDays.value))
const allDayId = `sy-agenda-${useId()}`
const title = computed(() => period.value.format(date.value.toDate(zone.value)))
const phase = computed(() => movement.value * (direction.value === 'rtl' ? -1 : 1))
const slideKey = computed(() => `${view.value}-${view.value === 'month' ? date.value.toString().slice(0, -3) : first.value}`)
const currentMinute = computed(() => agendaMinute(wallNow.value))
const viewOptions = computed(() => [
  { value: 'day', label: labels.value.day ?? 'Day' },
  { value: 'week', label: labels.value.week ?? 'Week' },
  { value: 'month', label: labels.value.month ?? 'Month' },
])
const month = computed(() => weeks.value.map(days => {
  const all = agendaSpans(props.showAllDay ? items.value : [], days)
  const visible = all.items.filter(item => item.row < maxMonthEvents.value)
  return {
    days, spans: visible, rows: Math.min(all.rows, maxMonthEvents.value),
    entries: days.map((day, index) => {
      const full = eventsOnDay(items.value, day, false)
      const space = Math.max(0, maxMonthEvents.value - visible.filter(item => index >= item.column && index < item.column + item.span).length)
      const overflow = all.items.filter(item => item.row >= maxMonthEvents.value && index >= item.column && index < item.column + item.span).length
      return { shown: full.slice(0, space), more: Math.max(0, full.length - space) + overflow }
    }),
  }
}))
const canCreate = computed(() => props.allowCreate ?? props.editable)
const canMove = computed(() => props.allowMove ?? props.editable)
const canResize = computed(() => props.allowResize ?? props.editable)
const canDelete = computed(() => props.allowDelete ?? props.editable)
const hasTimed = computed(() => timed.value.some(day => day.length))

function within(value: number, min: number, max: number, fallback: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? Math.floor(value) : fallback))
}

function formatMinute(minute: number) {
  const base = Date.UTC(2000, 0, 1, 0, minute)
  return hour.value.format(new Date(base))
}

function intervalLabel(from: number, to: number) {
  return `${formatMinute(from)} – ${formatMinute(to)}`
}

function setDate(day: CalendarDate) {
  movement.value = day.compare(date.value) < 0 ? -1 : 1
  offset.value = undefined
  model.value = day
}

function setView(next: AgendaView) {
  if (next === view.value) return
  offset.value = undefined
  viewModel.value = next
}

function navigate(step: -1 | 1) {
  if (view.value === 'month') setDate(date.value.add({ months: step }))
  else if (offset.value && view.value === 'week') setVisibleStart(offset.value.add({ days: shownCount.value * step }))
  else setDate(date.value.add({ days: shownCount.value * step }))
}

function setVisibleStart(day: CalendarDate) {
  if (view.value !== 'week') {
    setDate(day)
    return
  }
  movement.value = day.compare(first.value) < 0 ? -1 : 1
  offset.value = day
  model.value = day.add({ days: shownCount.value < 7 ? Math.floor(shownCount.value / 2) : 0 })
}

function goToday() { setDate(today.value) }

function openDay(day: CalendarDate, event: Event) {
  if ((event.currentTarget as HTMLElement).ownerDocument.activeElement === event.currentTarget) {
    root.value?.querySelector<HTMLElement>('.sy-agenda__heading')?.focus({ preventScroll: true })
  }
  setDate(day)
  setView('day')
}

function choose(event: AgendaEvent, input: MouseEvent) {
  if (input.detail && Date.now() < stopClickUntil) return
  const next = selected.value === event.id ? null : event
  selectedModel.value = next?.id ?? null
  emit('select', next)
}

function eventKey(event: KeyboardEvent, item: AgendaEvent) {
  if (item.isReadOnly || event.defaultPrevented || event.isComposing) return
  if (canDelete.value && (event.key === 'Delete' || event.key === 'Backspace')) {
    event.preventDefault()
    if (selected.value === item.id) {
      selectedModel.value = null
      emit('select', null)
    }
    emit('delete', item)
    root.value?.querySelector<HTMLElement>('.sy-agenda__heading')?.focus({ preventScroll: true })
    return
  }
  const timed = !items.value.find(entry => entry.event.id === item.id)?.allDay
  if (!timed || !event.altKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
  const from = agendaCivil(item.start, zone.value)
  const to = agendaCivil(item.end, zone.value)
  const key = event.key
  const sign = key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1
  if (event.shiftKey && canResize.value && (key === 'ArrowUp' || key === 'ArrowDown')) {
    event.preventDefault()
    const updated = to.add({ minutes: sign * snap.value })
    if (minuteSpan(from, updated) >= snap.value) emit('resize', item, { start: from, end: updated })
  } else if (!event.shiftKey && canMove.value) {
    event.preventDefault()
    const change = key === 'ArrowUp' || key === 'ArrowDown' ? { minutes: sign * snap.value } :
      { days: direction.value === 'rtl' ? -sign : sign }
    emit('move', item, { start: from.add(change), end: to.add(change) })
  }
}

function createSlot(day: CalendarDate, minute: number) {
  const startAt = dayMinute(day, minute)
  return { start: startAt, end: dayMinute(day, Math.min(end.value, minute + duration.value)) }
}

function inputMinute(node: Element, y: number) {
  const rect = node.getBoundingClientRect()
  return within(start.value + (y - rect.top) * (end.value - start.value) / Math.max(1, rect.height),
    start.value, end.value - snap.value, start.value)
}

function aligned(minute: number, round: (value: number) => number) {
  return start.value + round((minute - start.value) / snap.value) * snap.value
}

function beginEdit(pointer: PointerEvent, day: CalendarDate, item?: AgendaEvent) {
  if (pointer.button !== 0 || gesture.value || (pointer.pointerType === 'touch' && !props.touchEditing)) return
  const target = pointer.target as Element
  const dayNode = target.closest('[data-agenda-day]')
  if (!dayNode) return
  const minute = inputMinute(dayNode, pointer.clientY)
  const resize = !!target.closest('[data-agenda-resize]')
  let spec: Edit
  let result: AgendaInterval
  if (item) {
    if (item.isReadOnly || (resize ? !canResize.value : !canMove.value)) return
    result = { start: agendaCivil(item.start, zone.value), end: agendaCivil(item.end, zone.value) }
    spec = { kind: resize ? 'resize' : 'move', event: item, original: result,
      offset: minuteSpan(result.start, dayMinute(day, minute)) }
  } else {
    if (!canCreate.value) return
    spec = { kind: 'create', day, minute: aligned(minute, Math.floor) }
    result = createSlot(day, spec.minute)
  }
  gesture.value = { id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY, hasMoved: false, spec, result }
}

function pointerPosition(pointer: PointerEvent) {
  const document = editor.value?.ownerDocument
  const column = document?.elementFromPoint(pointer.clientX, pointer.clientY)?.closest('[data-agenda-day]')
  if (!column || !editor.value?.contains(column)) return
  const day = visibleDays.value.find(day => day.toString() === column.getAttribute('data-agenda-day'))
  if (day) return { day, minute: inputMinute(column, pointer.clientY) }
}

function updateEdit(pointer: PointerEvent) {
  const edit = gesture.value
  if (!edit || edit.id !== pointer.pointerId) return
  if (!edit.hasMoved && Math.hypot(pointer.clientX - edit.x, pointer.clientY - edit.y) < 5) return
  if (!edit.hasMoved) editor.value?.setPointerCapture(pointer.pointerId)
  const target = pointerPosition(pointer)
  const spec = edit.spec
  let result = edit.result
  if (target) {
    if (spec.kind === 'create') {
      const origin = dayMinute(spec.day, spec.minute)
      const finish = dayMinute(target.day, aligned(target.minute + 1, Math.ceil))
      if (origin.compare(finish) <= 0) result = { start: origin, end: finish.compare(origin) === 0 ? origin.add({ minutes: snap.value }) : finish }
      else result = { start: finish, end: origin.add({ minutes: snap.value }) }
    } else if (spec.kind === 'move') {
      const next = dayMinute(target.day, aligned(target.minute - spec.offset, Math.round))
      result = { start: next, end: next.add({ minutes: minuteSpan(spec.original.start, spec.original.end) }) }
    } else {
      const finish = dayMinute(target.day, aligned(target.minute + 1, Math.ceil))
      const minimum = spec.original.start.add({ minutes: snap.value })
      result = { start: spec.original.start, end: finish.compare(minimum) < 0 ? minimum : finish }
    }
  }
  gesture.value = { ...edit, hasMoved: true, result }
}

function endEdit(pointer: PointerEvent, commit: boolean) {
  const edit = gesture.value
  if (!edit || edit.id !== pointer.pointerId) return
  gesture.value = undefined
  if (!commit) return
  if (edit.hasMoved) stopClickUntil = Date.now() + 170
  const { kind } = edit.spec
  if (kind === 'create') {
    if (edit.hasMoved || pointerPosition(pointer)) emit('create', edit.result)
  } else if (edit.hasMoved) {
    if (kind === 'move') emit('move', edit.spec.event, edit.result)
    else emit('resize', edit.spec.event, edit.result)
  }
}

const editingEvent = computed(() => {
  const edit = gesture.value
  return edit?.hasMoved && edit.spec.kind !== 'create' ? edit.spec.event.id : undefined
})
const preview = computed(() => {
  const edit = gesture.value
  if (!edit?.hasMoved) return []
  const event: AgendaEvent = { id: '', title: '', ...edit.result }
  return visibleDays.value.map(day => timedAgendaEvents(eventTimes([event], zone.value), day, start.value, end.value, snap.value)[0])
})

function beginSwipe(pointer: PointerEvent) {
  if (!props.allowsSwipe || view.value === 'month' || pointer.pointerType !== 'touch' || props.touchEditing) return
  swipePointer = { id: pointer.pointerId, x: pointer.clientX, y: pointer.clientY }
}

function moveSwipe(pointer: PointerEvent) {
  if (swipePointer?.id !== pointer.pointerId) return
  const dx = pointer.clientX - swipePointer.x
  const dy = pointer.clientY - swipePointer.y
  if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return
  const node = pointer.currentTarget as HTMLElement
  if (!node.hasPointerCapture(pointer.pointerId)) node.setPointerCapture(pointer.pointerId)
  swipe.value = Math.max(-110, Math.min(110, dx * .7))
}

function finishSwipe(pointer: PointerEvent, commit: boolean) {
  if (swipePointer?.id !== pointer.pointerId) return
  swipePointer = undefined
  const distance = swipe.value
  swipe.value = 0
  if (commit && Math.abs(distance) >= 22) {
    stopClickUntil = Date.now() + 170
    stepDays(distance < 0 ? 1 : -1)
  }
}

function stepDays(physicalDirection: -1 | 1) {
  const logical = direction.value === 'rtl' ? -physicalDirection : physicalDirection
  setVisibleStart(first.value.add({ days: logical }))
}

function wheel(event: WheelEvent) {
  if (!props.allowsSwipe || view.value === 'month' || gesture.value || event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
  event.preventDefault()
  wheelDelta += event.deltaX
  clearTimeout(wheelEnd)
  wheelEnd = setTimeout(() => {
    if (Math.abs(wheelDelta) >= 24) stepDays(wheelDelta > 0 ? 1 : -1)
    wheelDelta = 0
  }, 115)
}

function position(from: number, to: number, lane = 0, lanes = 1): CSSProperties {
  const range = end.value - start.value
  return {
    insetBlockStart: `${(from - start.value) * 100 / range}%`,
    blockSize: `${(to - from) * 100 / range}%`,
    insetInlineStart: `${lane * 100 / lanes}%`,
    inlineSize: `${100 / lanes}%`,
  }
}

function spanPosition(item: { row: number; column: number; span: number }): CSSProperties {
  return { gridColumn: `${item.column + 1} / span ${item.span}`, gridRow: item.row + 1 }
}

function showClock(day: CalendarDate) {
  return props.showCurrentTime && isSameDay(day, today.value) &&
    currentMinute.value >= start.value && currentMinute.value < end.value
}

function hideOutgoing(node: Element) {
  node.setAttribute('inert', '')
  node.setAttribute('aria-hidden', 'true')
}

function announceCount(count: number) { return labels.value.count?.(count) ?? `${count} events` }

const controls: AgendaControls = { view, date, visibleDays, selected, setView, setDate, navigate, setVisibleStart, goToday }
provide(agendaContext, controls)
defineExpose(controls)

onMounted(() => {
  clock.value = Date.now()
  clockTimer = setInterval(() => { clock.value = Date.now() }, 20000)
})
onBeforeUnmount(() => {
  clearTimeout(wheelEnd)
  clearInterval(clockTimer)
})
</script>

<template>
  <section
    ref="root" class="sy-agenda" :aria-label="label" :dir="direction" :data-view="view"
    :style="{ '--sy-agenda-direction': phase, '--sy-agenda-cols': shownCount }"
  >
    <header class="sy-agenda__header">
      <h3 class="sy-agenda__heading" tabindex="-1"><SMotionText :value="title" announce /></h3>
      <slot name="header" v-bind="controls">
        <div class="sy-agenda__actions">
          <SSegment
            :model-value="view" :items="viewOptions" :label="labels.view ?? 'Calendar view'" size="sm"
            @update:model-value="(next) => { if (next === 'day' || next === 'week' || next === 'month') setView(next) }"
          />
          <div class="sy-agenda__navigation">
            <SButton size="sm" variant="ghost" @click="navigate(-1)">{{ labels.previous ?? 'Previous' }}</SButton>
            <SButton size="sm" variant="secondary" @click="goToday">{{ labels.today ?? 'Today' }}</SButton>
            <SButton size="sm" variant="ghost" @click="navigate(1)">{{ labels.next ?? 'Next' }}</SButton>
          </div>
        </div>
      </slot>
    </header>
    <div
      class="sy-agenda__deck" :data-swipeable="allowsSwipe && view !== 'month' && !touchEditing || undefined"
      :data-swiping="swipe !== 0 || undefined" :style="{ '--sy-agenda-swipe': `${swipe}px` }"
      @pointerdown="beginSwipe" @pointermove="moveSwipe" @pointerup="finishSwipe($event, true)"
      @pointercancel="finishSwipe($event, false)" @wheel="wheel"
    >
      <Transition name="sy-agenda-slide" @before-leave="hideOutgoing">
        <div :key="slideKey" class="sy-agenda__page">
          <template v-if="view === 'month'">
            <div class="sy-agenda__month-head">
              <span v-for="day in weeks[0]" :key="day.toString()">{{ weekday.format(day.toDate(zone)) }}</span>
            </div>
            <div class="sy-agenda__month">
              <section v-for="week in month" :key="week.days[0].toString()" class="sy-agenda__month-week">
                <div class="sy-agenda__month-days">
                  <div v-for="day in week.days" :key="day.toString()" :data-outside="!isSameMonth(day, date) || undefined" :data-weekend="isAgendaWeekend(day) || undefined">
                    <button
                      type="button" class="sy-agenda__date" :aria-label="fullDate.format(day.toDate(zone))"
                      :aria-current="isSameDay(day, today) ? 'date' : undefined" @click="openDay(day, $event)"
                    >{{ day.day }}</button>
                  </div>
                </div>
                <div v-if="week.rows" class="sy-agenda__spans sy-agenda__month-spans">
                  <SAgendaEvent
                    v-for="item in week.spans" :key="item.event.id" :event="item.event" :placement="spanPosition(item)" compact
                    :selected="selected === item.event.id" :past="item.end.compare(wallNow) < 0"
                    @click="choose(item.event, $event)" @keydown="eventKey($event, item.event)"
                  ><template v-if="$slots.event" #default="scope"><slot name="event" v-bind="scope" /></template></SAgendaEvent>
                </div>
                <div class="sy-agenda__month-items">
                  <div v-for="(cell, index) in week.entries" :key="week.days[index].toString()" :data-weekend="isAgendaWeekend(week.days[index]) || undefined">
                    <SAgendaEvent
                      v-for="item in cell.shown" :key="item.event.id" :event="item.event" compact
                      :selected="selected === item.event.id" :past="item.end.compare(wallNow) < 0"
                      @click="choose(item.event, $event)" @keydown="eventKey($event, item.event)"
                    ><template v-if="$slots.event" #default="scope"><slot name="event" v-bind="scope" /></template></SAgendaEvent>
                    <button v-if="cell.more" type="button" class="sy-agenda__more" @click="openDay(week.days[index], $event)">
                      {{ labels.more?.(cell.more) ?? `+${cell.more} more` }}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </template>
          <template v-else>
            <div class="sy-agenda__day-head">
              <span aria-hidden="true" />
              <div class="sy-agenda__columns">
                <button
                  v-for="day in visibleDays" :key="day.toString()" type="button" class="sy-agenda__date sy-agenda__date--column"
                  :aria-label="fullDate.format(day.toDate(zone))" :aria-current="isSameDay(day, today) ? 'date' : undefined"
                  @click="openDay(day, $event)"
                ><span>{{ weekday.format(day.toDate(zone)) }}</span><strong>{{ day.day }}</strong></button>
              </div>
            </div>
            <div v-if="showAllDay && spans.rows" class="sy-agenda__all-day">
              <button
                type="button" class="sy-agenda__all-day-toggle" :aria-controls="allDayId"
                :aria-expanded="allDayExpanded" @click="allDayExpanded = !allDayExpanded"
              >{{ labels.allDay ?? 'All day' }}</button>
              <div :id="allDayId" class="sy-agenda__all-day-body">
                <div class="sy-agenda__all-day-reveal" :data-open="allDayExpanded || undefined" :inert="!allDayExpanded" :aria-hidden="!allDayExpanded || undefined">
                  <div class="sy-agenda__reveal-inner">
                    <div class="sy-agenda__spans">
                      <SAgendaEvent
                        v-for="item in spans.items" :key="item.event.id" :event="item.event" :placement="spanPosition(item)" compact
                        :selected="selected === item.event.id" :past="item.end.compare(wallNow) < 0"
                        @click="choose(item.event, $event)" @keydown="eventKey($event, item.event)"
                      ><template v-if="$slots.event" #default="scope"><slot name="event" v-bind="scope" /></template></SAgendaEvent>
                    </div>
                  </div>
                </div>
                <div class="sy-agenda__all-day-reveal" :data-open="!allDayExpanded || undefined" :inert="allDayExpanded" :aria-hidden="allDayExpanded || undefined">
                  <div class="sy-agenda__reveal-inner">
                    <div class="sy-agenda__columns sy-agenda__counts">
                      <span v-for="day in visibleDays" :key="day.toString()"><SMotionText :value="announceCount(eventsOnDay(items, day, true).length)" /></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="sy-agenda__scroll">
              <div
                ref="editor" class="sy-agenda__time-grid" :data-editing="gesture?.hasMoved || undefined"
                :style="{ '--sy-agenda-slot-count': (end - start) / slot }"
                @pointermove="updateEdit"
                @pointerup="endEdit($event, true)"
                @pointercancel="endEdit($event, false)"
                @pointerleave="!gesture?.hasMoved && endEdit($event, false)"
                @lostpointercapture="endEdit($event, false)"
              >
                <div class="sy-agenda__hours" aria-hidden="true">
                  <span v-for="minute in hours" :key="minute" :style="{ insetBlockStart: `${(minute - start) * 100 / (end - start)}%` }">{{ formatMinute(minute) }}</span>
                </div>
                <div class="sy-agenda__columns sy-agenda__timed">
                  <div
                    v-for="(day, index) in visibleDays" :key="day.toString()" class="sy-agenda__day"
                    :data-agenda-day="day.toString()" :data-weekend="isAgendaWeekend(day) || undefined"
                    :aria-label="fullDate.format(day.toDate(zone))" role="group"
                    @pointerdown="beginEdit($event, day)"
                  >
                    <SAgendaEvent
                      v-for="item in timed[index]" :key="item.event.id" :event="item.event" class="sy-agenda__timed-event"
                      :data-edited="editingEvent === item.event.id || undefined" :data-overlap="item.lanes > 1 || undefined"
                      :time="intervalLabel(item.from, item.to)" :placement="position(item.from, item.to, item.lane, item.lanes)"
                      :selected="selected === item.event.id" :past="item.end.compare(wallNow) < 0" :compact="item.lanes > 1 || item.to - item.from < slot * .7"
                      :resizable="canResize && !item.event.isReadOnly" @pointerdown.stop="beginEdit($event, day, item.event)"
                      @click="choose(item.event, $event)" @keydown="eventKey($event, item.event)"
                    ><template v-if="$slots.event" #default="scope"><slot name="event" v-bind="scope" /></template></SAgendaEvent>
                    <span v-if="preview[index]" class="sy-agenda__preview" :style="position(preview[index].from, preview[index].to)" aria-hidden="true" />
                    <span
                      v-if="showClock(day)" class="sy-agenda__now"
                      :style="{ insetBlockStart: `${(currentMinute - start) * 100 / (end - start)}%` }"
                      :aria-label="`${labels.currentTime ?? 'Current time'} ${formatMinute(currentMinute)}`"
                    />
                  </div>
                  <div v-if="!hasTimed && !spans.rows && !gesture" class="sy-agenda__empty">
                    <slot name="empty" v-bind="controls">{{ labels.empty ?? 'No scheduled events' }}</slot>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="canCreate" class="sy-agenda__footer">
              <slot name="footer" v-bind="controls">
                <SButton size="sm" variant="secondary" @click="emit('create', createSlot(date, start))">{{ labels.addEvent ?? 'Add event' }}</SButton>
              </slot>
            </div>
          </template>
        </div>
      </Transition>
    </div>
  </section>
</template>
