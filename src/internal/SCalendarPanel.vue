<script setup lang="ts">
import SIcon from '../components/SIcon.vue'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { toCalendarDate } from '@internationalized/date'
import {
  CalendarCell, CalendarCellTrigger, CalendarGrid, CalendarGridBody, CalendarGridHead,
  CalendarGridRow, CalendarHeadCell, CalendarHeader, CalendarHeading, CalendarNext, CalendarPrev,
  RangeCalendarCell, RangeCalendarCellTrigger, RangeCalendarGrid, RangeCalendarGridBody,
  RangeCalendarGridHead, RangeCalendarGridRow, RangeCalendarHeadCell, RangeCalendarHeader,
  RangeCalendarHeading, RangeCalendarNext, RangeCalendarPrev, type DateValue,
} from 'reka-ui'
import { positiveCount, type CalendarLabels, type CalendarMonth } from './date-controls'
import { createAnimator } from './motion'
import SCalendarYearPicker from '../components/SCalendarYearPicker.vue'
import SFocusGroup from '../components/SFocusGroup.vue'
import SMotionText from '../components/SMotionText.vue'

const props = defineProps<{
  date: DateValue
  grid: CalendarMonth[]
  weekDays: string[]
  locale: string
  dir?: 'ltr' | 'rtl'
  range?: boolean
  yearPicker?: boolean
  disabled?: boolean
  minValue?: DateValue
  maxValue?: DateValue
  navigationLabels?: CalendarLabels
  weeksInMonth?: number
}>()
const emit = defineEmits<{ navigate: [date: DateValue] }>()
defineSlots<{ indicator?: (props: { date: DateValue; selected?: boolean }) => unknown }>()

const dayParts = {
  header: CalendarHeader, heading: CalendarHeading, previous: CalendarPrev, next: CalendarNext,
  grid: CalendarGrid, head: CalendarGridHead, headCell: CalendarHeadCell, body: CalendarGridBody,
  row: CalendarGridRow, cell: CalendarCell, trigger: CalendarCellTrigger,
}
const rangeParts = {
  header: RangeCalendarHeader, heading: RangeCalendarHeading, previous: RangeCalendarPrev, next: RangeCalendarNext,
  grid: RangeCalendarGrid, head: RangeCalendarGridHead, headCell: RangeCalendarHeadCell, body: RangeCalendarGridBody,
  row: RangeCalendarGridRow, cell: RangeCalendarCell, trigger: RangeCalendarCellTrigger,
}
const parts = computed(() => props.range ? rangeParts : dayParts)
const yearOpen = ref(false)
const yearButton = useTemplateRef<HTMLButtonElement>('yearButton')
const stack = useTemplateRef<HTMLDivElement>('stack')
const monthFormat = computed(() => new Intl.DateTimeFormat(props.locale, {
  calendar: props.date.calendar.identifier, month: 'long', year: 'numeric', timeZone: 'UTC',
}))
const months = computed(() => props.grid.map(month => {
  const count = positiveCount(props.weeksInMonth, month.rows.length)
  const lastDay = month.rows.at(-1)?.at(-1)
  if (!lastDay || count <= month.rows.length) return month
  const extra = Array.from({ length: count - month.rows.length }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => lastDay.add({ days: week * 7 + day + 1 })))
  return { ...month, rows: [...month.rows, ...extra] }
}))

watch(() => props.grid[0]?.value, (page, previous, onCleanup) => {
  if (!page || !previous || page.compare(previous) === 0 || yearOpen.value) return
  const track = stack.value?.querySelector<HTMLElement>('.sy-calendar__months')
  if (typeof track?.animate !== 'function') return
  const direction = (page.compare(previous) > 0 ? 1 : -1) * (props.dir === 'rtl' ? -1 : 1)
  const animator = createAnimator(track)
  animator.animate('calendar-page', [{ opacity: .25, translate: `${direction * 8}px 0` }, { opacity: 1, translate: '0 0' }], { role: 'move' })
  onCleanup(animator.dispose)
}, { flush: 'post' })

function closeYears() {
  yearOpen.value = false
  void nextTick(() => yearButton.value?.focus())
}

function dismissYears(event: KeyboardEvent) {
  if (!yearOpen.value) return
  event.preventDefault()
  event.stopPropagation()
  closeYears()
}

function jump(year: DateValue | DateValue[] | undefined) {
  if (!year || Array.isArray(year)) return
  const date = props.date.set({ year: year.year, era: year.era })
  if (props.minValue && date.compare(props.minValue) < 0) emit('navigate', props.minValue)
  else if (props.maxValue && date.compare(props.maxValue) > 0) emit('navigate', props.maxValue)
  else emit('navigate', date)
  closeYears()
}
</script>

<template>
  <component :is="parts.header" class="sy-calendar__header">
    <component
      :is="parts.previous"
      class="sy-field-action sy-calendar__previous"
      :aria-hidden="yearOpen || undefined"
      :inert="yearOpen"
      :aria-label="navigationLabels?.previousMonth ?? 'Previous month'"
    ><SIcon name="chevron-left" /></component>
    <component :is="parts.heading" v-slot="{ headingValue }" class="sy-calendar__title">
      <button
        v-if="yearPicker"
        ref="yearButton"
        type="button"
        class="sy-calendar__heading-button"
        :aria-label="navigationLabels?.chooseYear ?? 'Choose year'"
        :aria-expanded="yearOpen"
        :disabled="disabled"
        @click="yearOpen = !yearOpen"
        @keydown.escape="dismissYears"
      ><SMotionText :value="headingValue" motion="roll" /></button>
      <SMotionText v-else :value="headingValue" motion="roll" />
    </component>
    <component
      :is="parts.next"
      class="sy-field-action sy-calendar__next"
      :aria-hidden="yearOpen || undefined"
      :inert="yearOpen"
      :aria-label="navigationLabels?.nextMonth ?? 'Next month'"
    ><SIcon name="chevron-right" /></component>
  </component>
  <div ref="stack" class="sy-calendar__stack">
    <SFocusGroup
      class="sy-calendar__months"
      :inert="yearOpen"
      :aria-hidden="yearOpen || undefined"
      :style="{ '--sy-calendar-months': grid.length }"
    >
      <div v-for="(month, index) in months" :key="index" class="sy-calendar__month">
        <div v-if="grid.length > 1" class="sy-calendar__month-label">
          <SMotionText :value="monthFormat.format(toCalendarDate(month.value).toDate('UTC'))" motion="roll" />
        </div>
        <component :is="parts.grid" class="sy-calendar__grid">
          <component :is="parts.head">
            <component :is="parts.row">
              <component
                :is="parts.headCell"
                v-for="(weekday, weekdayIndex) in weekDays"
                :key="weekdayIndex"
                class="sy-calendar__weekday"
              >{{ weekday }}</component>
            </component>
          </component>
          <component :is="parts.body">
            <component :is="parts.row" v-for="(week, weekIndex) in month.rows" :key="weekIndex">
              <component
                :is="parts.cell"
                v-for="(day, dayIndex) in week"
                :key="dayIndex"
                :date="day"
                class="sy-calendar__cell"
              >
                <component
                  :is="parts.trigger"
                  v-slot="{ dayValue, selected }"
                  :day="day"
                  :month="month.value"
                  class="sy-calendar__day"
                  data-sy-focus-target
                >
                  <SMotionText :value="dayValue" motion="roll" />
                  <slot name="indicator" :date="day" :selected="selected" />
                </component>
              </component>
            </component>
          </component>
        </component>
      </div>
    </SFocusGroup>
    <Transition name="sy-calendar-years">
      <div v-if="yearOpen" class="sy-calendar__years" @keydown.escape.stop.prevent="closeYears">
        <SCalendarYearPicker
          :model-value="date"
          :default-placeholder="date"
          :label="navigationLabels?.chooseYear ?? 'Choose year'"
          :previous-label="navigationLabels?.previousYears"
          :next-label="navigationLabels?.nextYears"
          :min-value="minValue"
          :max-value="maxValue"
          :years-per-page="16"
          :locale="locale"
          :dir="dir"
          initial-focus
          prevent-deselect
          @update:model-value="jump"
        />
      </div>
    </Transition>
  </div>
</template>
