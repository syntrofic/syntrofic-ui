<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import type { GridLayout, SwipeGestureEventData } from '@nativescript/core'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'nativescript-vue'
import { editNativeAgendaEvent, nativeAgendaEventsForDay, type NativeAgendaBlock, type NativeAgendaEvent, type NativeAgendaView } from '../agenda-state'
import { nativeDateLabel } from '../calendar-format'
import { nativeBoundedDate, nativeCalendarWeekStart, nativeCalendarWeekday, nativeDateToday, nativeSelectableDate, type NativeCalendarOptions } from '../calendar-state'
import type { NativeCollectionKey } from '../collection-state'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import SNativeAgendaTimeline from './SNativeAgendaTimeline.vue'
import SNativeButton from './SNativeButton.vue'
import SNativeCalendar from './SNativeCalendar.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeReveal from './SNativeReveal.vue'
import SNativeText from './SNativeText.vue'
import SNativeToggleButtonGroup from './SNativeToggleButtonGroup.vue'

const props = withDefaults(defineProps<NativeCalendarOptions & {
  events: readonly NativeAgendaEvent[]
  viewLabels?: Partial<Record<NativeAgendaView, string>>
  previousLabel?: string
  nextLabel?: string
  showCalendarLabel?: string
  hideCalendarLabel?: string
  emptyLabel?: string
  earlierLabel?: string
  laterLabel?: string
  extendLabel?: string
  editable?: boolean
  increment?: number
  startHour?: number
  endHour?: number
  layout?: 'timeline' | 'list'
}>(), {
  locale: 'en-US', previousLabel: 'Previous period', nextLabel: 'Next period', showCalendarLabel: 'Show dates', hideCalendarLabel: 'Hide dates',
  emptyLabel: 'No scheduled events', earlierLabel: 'Move earlier', laterLabel: 'Move later', extendLabel: 'Extend event',
  startHour: 7, endHour: 21, increment: 15, layout: 'timeline',
})
const date = defineModel<CalendarDate>()
const view = defineModel<NativeAgendaView>('view', { default: 'week' })
const expanded = defineModel<boolean>('calendar', { default: false })
const selected = defineModel<string | number>('selected')
const emit = defineEmits<{ 'date-change': [date: CalendarDate]; 'view-change': [view: NativeAgendaView]; select: [event: NativeAgendaEvent]; edit: [event: NativeAgendaEvent] }>()
defineSlots<{ event(props: { event: NativeAgendaEvent; block: NativeAgendaBlock; selected?: boolean }): unknown }>()
const { theme, direction } = useNativeUI()
const motion = useNativeMotion()
const body = useTemplateRef<{ nativeView: GridLayout }>('body')
const initial = props.defaultMonth ?? nativeDateToday()
const day = computed(() => nativeBoundedDate(date.value ?? initial, props))
const weekStart = computed(() => props.weekStartsOn ?? nativeCalendarWeekStart(props.locale))
const week = computed(() => {
  const offset = (nativeCalendarWeekday(day.value) + 7 - weekStart.value) % 7
  return Array.from({ length: 7 }, (_, index) => day.value.add({ days: index - offset }))
})
const days = computed(() => view.value === 'week' ? week.value : [day.value])
const groups = computed(() => days.value.map(entry => ({
  key: entry.toString(), date: entry, blocks: nativeAgendaEventsForDay(props.events, entry),
})))
const heading = computed(() => {
  if (view.value === 'week') return `${nativeDateLabel(week.value[0], props.locale, 'short')} – ${nativeDateLabel(week.value[6], props.locale, 'short')}`
  return nativeDateLabel(day.value, props.locale, view.value === 'month' ? 'month' : 'date')
})
const choices = computed(() => (['day', 'week', 'month'] as const).map(item => ({
  id: item, label: props.viewLabels?.[item] ?? { day: 'Day', week: 'Week', month: 'Month' }[item],
})))
const picked = computed(() => {
  const item = props.events.find(event => Object.is(event.id, selected.value))
  return item && groups.value.some(group => group.blocks.some(block => Object.is(block.event.id, item.id))) ? item : undefined
})
const renderedEvent = shallowRef(picked.value)
const increment = computed(() => Number.isFinite(props.increment) ? Math.max(1, Math.floor(props.increment)) : 15)
const rtl = computed(() => direction.value === 'rtl')
const editing = computed(() => props.editable && !props.disabled && !props.readonly)
const calendar = computed<NativeCalendarOptions>(() => ({
  locale: props.locale, weekStartsOn: props.weekStartsOn, disabled: props.disabled, readonly: props.readonly,
  minDate: props.minDate, maxDate: props.maxDate, isDateDisabled: props.isDateDisabled, isDateUnavailable: props.isDateUnavailable,
  fixedWeeks: props.fixedWeeks, selectOutsideMonth: props.selectOutsideMonth, showOutsideMonth: props.showOutsideMonth,
  yearPicker: props.yearPicker, previousMonthLabel: props.previousMonthLabel, nextMonthLabel: props.nextMonthLabel,
  yearPickerLabel: props.yearPickerLabel, closeYearPickerLabel: props.closeYearPickerLabel,
}))

function chooseDate(next: CalendarDate) {
  if (props.disabled || props.readonly || !nativeSelectableDate(next, props)) return
  if (day.value.compare(next) === 0) return
  date.value = next
  emit('date-change', next)
}
function chooseMonth(month: CalendarDate) {
  const next = nativeBoundedDate(month.set({ day: day.value.day }), props)
  if (day.value.compare(next) === 0) return
  date.value = next
  emit('date-change', next)
}
function turn(offset: number) {
  if (props.disabled) return
  const increment = view.value === 'month' ? { months: offset } : { days: offset * (view.value === 'week' ? 7 : 1) }
  const next = nativeBoundedDate(day.value.add(increment), props)
  if (next.compare(day.value) === 0) return
  date.value = next
  emit('date-change', next)
}
function chooseView(next: NativeCollectionKey[]) {
  const selection = next[0]
  if ((selection === 'day' || selection === 'week' || selection === 'month') && selection !== view.value) {
    view.value = selection
    emit('view-change', selection)
  }
}
function swipe(event: SwipeGestureEventData) {
  if (event.direction === 1 || event.direction === 2) turn((event.direction === 2) !== rtl.value ? 1 : -1)
}
function select(event: NativeAgendaEvent) {
  if (props.disabled || event.disabled) return
  selected.value = Object.is(selected.value, event.id) ? undefined : event.id
  if (selected.value !== undefined) emit('select', event)
}
function edit(event: NativeAgendaEvent) {
  if (!editing.value) return
  emit('edit', event)
}
function nudge(kind: 'move' | 'end', time: number) {
  if (!picked.value) return
  const next = editNativeAgendaEvent(picked.value, { kind, minutes: time, increment: increment.value })
  if (next) edit(next)
}
function clock(block: NativeAgendaBlock) {
  if (block.event.allDay) return ''
  const time = block.event.start
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
}
watch(picked, next => { if (next) renderedEvent.value = next })
watch([day, view], async ([current, mode], [previous, oldMode], cleanup) => {
  if (current.compare(previous) === 0 && mode === oldMode) return
  let currentMotion = true
  cleanup(() => { currentMotion = false })
  await nextTick()
  const target = body.value?.nativeView
  if (!target || !currentMotion) return
  target.translateX = (current.compare(previous) >= 0 ? 1 : -1) * (rtl.value ? -1 : 1) * 12
  motion(() => [{ target, translate: { x: 0, y: 0 } }], 'replace')
})
</script>

<template>
  <StackLayout :accessibilityLabel="label">
    <SNativeToggleButtonGroup :items="choices" :selected="[view]" :allow-empty="false" :disabled="disabled" size="sm" fullWidth @change="chooseView" />
    <GridLayout v-if="view !== 'month'" :columns="rtl ? '44,44,*' : '*,44,44'" direction="ltr" marginTop="4" marginBottom="4" @swipe="swipe">
      <SNativePressableFeedback :col="rtl ? 2 : 0" :label="expanded ? hideCalendarLabel : showCalendarLabel"
        :accessibilityValue="heading" :disabled="disabled" :pressed="expanded" :paddingInline="6"
        fill="transparent" @tap="expanded = !expanded">
        <SNativeMotionText :value="heading" :size="14" verticalAlignment="middle" />
      </SNativePressableFeedback>
      <SNativeButton col="1" :label="previousLabel" :icon="rtl ? 'chevron-right' : 'chevron-left'" :disabled="disabled"
        size="sm" variant="ghost" fullWidth @tap="turn(-1)" />
      <SNativeButton :col="rtl ? 0 : 2" :label="nextLabel" :icon="rtl ? 'chevron-left' : 'chevron-right'" :disabled="disabled"
        size="sm" variant="ghost" fullWidth @tap="turn(1)" />
    </GridLayout>
    <SNativeReveal :open="expanded && view !== 'month'">
      <SNativeCalendar v-bind="calendar" :model-value="day" @select="chooseDate" />
    </SNativeReveal>
    <GridLayout :clipToBounds="true">
      <GridLayout ref="body">
        <StackLayout>
          <SNativeCalendar v-if="view === 'month'" v-bind="calendar" :model-value="day" :month="day" @select="chooseDate" @month-change="chooseMonth">
            <template #day="{ date: cell, selected: active }">
              <StackLayout verticalAlignment="middle">
                <SNativeText :text="nativeDateLabel(cell, locale, 'day')" :emphasized="active" textAlignment="center" />
                <ContentView :style="{ opacity: nativeAgendaEventsForDay(events, cell).length ? 1 : 0 }"
                  :backgroundColor="theme.colors.accent" width="4" height="4" :borderRadius="2" horizontalAlignment="center" />
              </StackLayout>
            </template>
          </SNativeCalendar>
          <SNativeReveal :open="Boolean(picked)" :transition-key="picked?.id">
            <StackLayout v-if="renderedEvent" :backgroundColor="theme.colors.surfaceMuted" :borderRadius="theme.geometry.radiusMd" cornerShape="squircle" padding="7" marginBottom="6">
              <SNativeMotionText :value="renderedEvent.title" announce />
              <SNativeDescription v-if="renderedEvent.description" :text="renderedEvent.description" marginTop="2" />
              <GridLayout v-if="editing && !renderedEvent.disabled" columns="*,*,*" marginTop="4">
                <SNativeButton col="0" :label="earlierLabel" size="sm" variant="ghost" fullWidth @tap="nudge('move', -increment)" />
                <SNativeButton col="1" :label="laterLabel" size="sm" variant="ghost" fullWidth @tap="nudge('move', increment)" />
                <SNativeButton col="2" :label="extendLabel" size="sm" variant="ghost" fullWidth @tap="nudge('end', increment)" />
              </GridLayout>
            </StackLayout>
          </SNativeReveal>
          <SNativeAgendaTimeline v-if="layout === 'timeline' && view !== 'month'" :days="days" :events="events" :locale="locale"
            :start-hour="startHour" :end-hour="endHour" :increment="increment" :editable="editing" :selected="selected"
            :empty-label="emptyLabel" @select="select" @edit="edit">
            <template v-if="$slots.event" #event="item"><slot name="event" v-bind="item" /></template>
          </SNativeAgendaTimeline>
          <StackLayout v-else>
            <StackLayout v-for="group in groups" :key="group.key" marginBottom="7">
              <SNativeText :text="nativeDateLabel(group.date, locale, 'date')" size="caption" emphasized marginBottom="3" />
              <SNativeDescription v-if="!group.blocks.length" :text="emptyLabel" />
              <SNativePressableFeedback v-for="block in group.blocks" :key="block.event.id" :label="block.event.title"
                :accessibilityHint="block.event.description" :disabled="disabled || block.event.disabled" :pressed="selected === block.event.id"
                :paddingInline="7" :fill="theme.colors.surface" :pressFill="theme.colors.accentSoft" marginBottom="3" @tap="select(block.event)">
                <slot name="event" :event="block.event" :block="block" :selected="selected === block.event.id">
                  <GridLayout :columns="block.event.allDay ? '*': '55,*'" verticalAlignment="middle">
                    <SNativeText v-if="!block.event.allDay" :text="clock(block)" size="caption" verticalAlignment="middle" />
                    <SNativeText :col="block.event.allDay ? 0 : 1" :text="block.event.title" emphasized verticalAlignment="middle" />
                  </GridLayout>
                </slot>
              </SNativePressableFeedback>
            </StackLayout>
          </StackLayout>
        </StackLayout>
      </GridLayout>
    </GridLayout>
  </StackLayout>
</template>
