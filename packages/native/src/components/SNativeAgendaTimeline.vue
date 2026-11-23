<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { computed, ref } from 'nativescript-vue'
import type { EventData, View } from '@nativescript/core'
import { nativeAgendaEventsForDay, nativeAgendaLanes, type NativeAgendaBlock, type NativeAgendaEvent } from '../agenda-state'
import { nativeDateLabel } from '../calendar-format'
import { useNativeUI } from '../context'
import SNativeAgendaBlock from './SNativeAgendaBlock.vue'
import SNativeButton from './SNativeButton.vue'
import SNativeText from './SNativeText.vue'

const props = defineProps<{
  days: readonly CalendarDate[]
  events: readonly NativeAgendaEvent[]
  locale: string
  startHour: number
  endHour: number
  increment: number
  selected?: string | number
  editable?: boolean
  emptyLabel: string
}>()
const emit = defineEmits<{ select: [event: NativeAgendaEvent]; edit: [event: NativeAgendaEvent] }>()
const { theme, direction } = useNativeUI()
const available = ref(320)
const hourHeight = 49
const labelArea = 44
const scale = hourHeight / 60
const dayWidth = computed(() => props.days.length === 1 ? Math.max(150, available.value - labelArea) : Math.max(95, Math.floor((available.value - labelArea) / props.days.length)))
const first = computed(() => Math.min(23, Math.max(0, Math.trunc(props.startHour))))
const last = computed(() => Math.min(24, Math.max(first.value + 1, Math.trunc(props.endHour))))
const hours = computed(() => Array.from({ length: last.value - first.value }, (_, index) => first.value + index))
const bodyHeight = computed(() => hours.value.length * hourHeight)
const visual = computed(() => direction.value === 'rtl' ? [...props.days].reverse() : props.days)
const columns = computed(() => [labelArea, ...visual.value.map(() => dayWidth.value)].join(','))
const schedules = computed(() => visual.value.map(day => {
  const blocks = nativeAgendaEventsForDay(props.events, day)
  const list = nativeAgendaLanes(blocks)
  const firstMinute = first.value * 60
  const lastMinute = last.value * 60
  const timed = list.filter(block => block.minute < lastMinute && block.minute + block.duration > firstMinute).map(block => {
    const start = Math.max(firstMinute, block.minute)
    const until = Math.min(lastMinute, block.minute + block.duration)
    const width = dayWidth.value / block.lanes
    return { block, top: (start - firstMinute) * scale, height: Math.max(18, (until - start) * scale), left: block.lane * width + 1, width: width - 3 }
  })
  const pinned = blocks.filter(block => block.event.allDay || block.minute >= lastMinute || block.minute + block.duration <= firstMinute)
  return { key: day.toString(), day, pinned, timed }
}))
const hasPinned = computed(() => schedules.value.some(schedule => schedule.pinned.length))
const hasEvents = computed(() => schedules.value.some(schedule => schedule.pinned.length || schedule.timed.length))
function layout(event: EventData) {
  const width = (event.object as View).getActualSize().width
  if (width > 0 && width !== available.value) available.value = width
}
defineSlots<{ event(props: { event: NativeAgendaEvent; block: NativeAgendaBlock; selected?: boolean }): unknown }>()
</script>

<template>
  <StackLayout>
    <SNativeText v-if="!hasEvents" :text="emptyLabel" size="caption" marginBottom="6" />
    <ScrollView orientation="horizontal" :scrollBarIndicatorVisible="days.length > 1" direction="ltr" @layoutChanged="layout">
      <GridLayout :width="labelArea + dayWidth * days.length" :columns="columns" :rows="`26,${hasPinned ? 'auto' : '0'},${bodyHeight}`" direction="ltr">
        <template v-for="(schedule, index) in schedules" :key="schedule.key">
          <SNativeText row="0" :col="index + 1" :text="nativeDateLabel(schedule.day, locale, 'short')" size="caption"
            textAlignment="center" verticalAlignment="middle" />
          <StackLayout v-if="hasPinned" row="1" :col="index + 1">
            <SNativeButton v-for="item in schedule.pinned" :key="item.event.id" :label="item.event.title" :disabled="item.event.disabled"
              :pressed="selected === item.event.id" size="sm" variant="secondary" fullWidth marginBottom="3" @tap="emit('select', item.event)" />
          </StackLayout>
          <AbsoluteLayout row="2" :col="index + 1" :width="dayWidth" :height="bodyHeight" :clipToBounds="false">
            <ContentView v-for="(hour, row) in hours" :key="hour" :top="row * hourHeight" left="0" :width="dayWidth" height="1"
              :backgroundColor="theme.colors.border" :isUserInteractionEnabled="false" :accessibilityHidden="true" />
            <SNativeAgendaBlock v-for="entry in schedule.timed" :key="entry.block.event.id" :block="entry.block" :top="entry.top"
              :left="entry.left" :width="entry.width" :height="entry.height" :scale="scale" :day-width="dayWidth"
              :multiple-days="days.length > 1" :selected="selected === entry.block.event.id" :editable="editable" :increment="increment"
              @select="emit('select', $event)" @edit="emit('edit', $event)">
              <template v-if="$slots.event" #default="item"><slot name="event" v-bind="item" /></template>
            </SNativeAgendaBlock>
          </AbsoluteLayout>
        </template>
        <StackLayout row="2" col="0" :width="labelArea">
          <SNativeText v-for="hour in hours" :key="hour" :text="`${String(hour).padStart(2, '0')}:00`" :height="hourHeight"
            size="caption" textAlignment="left" verticalAlignment="top" />
        </StackLayout>
      </GridLayout>
    </ScrollView>
  </StackLayout>
</template>
