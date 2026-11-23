<script setup lang="ts">
import { AccessibilityState, type GridLayout, type SwipeGestureEventData } from '@nativescript/core'
import { nextTick, computed, shallowRef, ref, useTemplateRef, watch } from 'nativescript-vue'
import { isSameMonth, startOfMonth, toCalendar, type CalendarDate } from '@internationalized/date'
import { nativeDateLabel } from '../calendar-format'
import {
  nativeBoundedDate, nativeCalendarCanPage, nativeCalendarRows, nativeCalendarWeekday, nativeCalendarWeekStart,
  nativeDateToday, nativeSelectableDate, type NativeCalendarOptions,
} from '../calendar-state'
import type { NativeCollectionNavigation } from '../collection-keys'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import { nativeRangePosition, type NativeDateRange } from '../range-state'
import SNativeButton from './SNativeButton.vue'
import SNativeCalendarRangeBand from './SNativeCalendarRangeBand.vue'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeReveal from './SNativeReveal.vue'
import SNativeText from './SNativeText.vue'
import SNativeWheelPicker from './SNativeWheelPicker.vue'

const props = withDefaults(defineProps<NativeCalendarOptions & { activeRange?: NativeDateRange; rangeSelection?: boolean }>(), {
  locale: 'en-US', fixedWeeks: true, showOutsideMonth: true, yearPicker: true,
  previousMonthLabel: 'Previous month', nextMonthLabel: 'Next month', yearPickerLabel: 'Choose a year', closeYearPickerLabel: 'Show calendar',
})
const value = defineModel<CalendarDate>()
const month = defineModel<CalendarDate>('month')
const emit = defineEmits<{ select: [date: CalendarDate]; 'month-change': [month: CalendarDate]; 'day-focus': [date: CalendarDate] }>()
defineSlots<{ day(props: { date: CalendarDate; selected: boolean; today: boolean; outside: boolean; disabled: boolean }): unknown }>()
const { theme, direction } = useNativeUI()
const run = useNativeMotion()
const moveMark = useNativeMotion()
const host = useTemplateRef<{ nativeView: GridLayout }>('host')
const grid = useTemplateRef<{ nativeView: GridLayout }>('grid')
const mark = useTemplateRef<{ nativeView: GridLayout }>('mark')
const controls = new Map<number, InstanceType<typeof SNativePressableFeedback>>()
const today = nativeDateToday()
const opening = props.defaultMonth ?? value.value ?? today
const displayed = shallowRef(startOfMonth(nativeBoundedDate(opening, props)))
const yearOpen = ref(false)
const yearUsed = ref(false)
const rtl = computed(() => direction.value === 'rtl')
const period = computed(() => startOfMonth(month.value ?? displayed.value))
const weekStart = computed(() => props.weekStartsOn ?? nativeCalendarWeekStart(props.locale))
const rows = computed(() => nativeCalendarRows(period.value, weekStart.value, props.fixedWeeks))
const days = computed(() => rows.value.flatMap((row, offset) => row.map((date, column) => ({
  date, offset: offset + 1, column: rtl.value ? 6 - column : column,
  key: date.calendar.toJulianDay(date), outside: !isSameMonth(date, period.value),
  active: value.value?.compare(date) === 0, range: nativeRangePosition(date, props.activeRange), today: today.compare(date) === 0,
}))))
const weekdays = computed(() => rows.value[0].map(date => nativeDateLabel(date, props.locale, 'weekday')))
const chosen = computed(() => !props.rangeSelection ? days.value.find(day => day.active && (!day.outside || props.showOutsideMonth)) : undefined)
const marker = shallowRef(chosen.value)
const heading = computed(() => nativeDateLabel(period.value, props.locale, 'month'))
const tracks = computed(() => ['26', ...rows.value.map(() => '42')].join(','))
const available = (date: CalendarDate) => !props.disabled && nativeSelectableDate(date, props)
const usable = (date: CalendarDate) => available(date) && (props.selectOutsideMonth || isSameMonth(date, period.value))
const yearChoices = computed(() => {
  const day = period.value
  const minimum = props.minDate ? toCalendar(props.minDate, day.calendar).year : 1
  const maximum = props.maxDate ? toCalendar(props.maxDate, day.calendar).year : day.year + 50
  const lower = Math.max(minimum, Math.min(day.year - 30, maximum - 60), 1)
  const upper = Math.max(lower, Math.min(maximum, Math.max(day.year + 30, lower + 60)))
  return Array.from({ length: upper - lower + 1 }, (_, index) => ({ value: lower + index, label: String(lower + index) }))
})

function remember(key: number, control: unknown) {
  if (control && typeof control === 'object' && 'focus' in control) controls.set(key, control as InstanceType<typeof SNativePressableFeedback>)
  else controls.delete(key)
}
function show(date: CalendarDate) {
  const next = startOfMonth(nativeBoundedDate(date, props))
  if (next.compare(period.value) === 0) return
  displayed.value = next
  month.value = next
  emit('month-change', next)
}
function page(offset: number) {
  if (!props.disabled && nativeCalendarCanPage(period.value, offset, props)) show(period.value.add({ months: offset }))
}
function select(date: CalendarDate) {
  if (props.readonly || !usable(date)) return
  if (!isSameMonth(date, period.value)) show(date)
  value.value = date
  emit('select', date)
}
function toggleYear() {
  yearUsed.value = true
  yearOpen.value = !yearOpen.value
}
function pickYear(year: string | number) {
  if (typeof year !== 'number') return
  show(period.value.set({ year }))
  yearOpen.value = false
}
function swipe(event: SwipeGestureEventData) {
  if (event.direction === 1 || event.direction === 2) page((event.direction === 2) !== rtl.value ? 1 : -1)
}
function focus(date: CalendarDate) {
  return controls.get(date.calendar.toJulianDay(date))?.focus() ?? false
}
async function focusDate(date: CalendarDate) {
  if (!isSameMonth(date, period.value)) show(date)
  await nextTick()
  if (focus(date)) { emit('day-focus', date); return true }
  return false
}
function navigate(date: CalendarDate, key: NativeCollectionNavigation) {
  const column = (nativeCalendarWeekday(date) + 7 - weekStart.value) % 7
  const offset = { first: -column, last: 6 - column, previous: -7, next: 7, left: rtl.value ? 1 : -1, right: rtl.value ? -1 : 1 }[key as Exclude<NativeCollectionNavigation, 'escape'>]
  if (offset === undefined) return false
  let next = date.add({ days: offset })
  const step = Math.sign(offset) || 1
  for (let attempt = 0; attempt < 42; attempt++) {
    if (available(next)) { void focusDate(next); return true }
    next = next.add({ days: step })
  }
  return true
}
watch([value, () => props.defaultMonth], ([date, defaultMonth]) => {
  const next = date ?? defaultMonth
  if (next && !isSameMonth(next, period.value)) show(next)
})
watch(period, async (next, previous, cleanup) => {
  if (next.compare(previous) === 0) return
  let active = true
  cleanup(() => { active = false })
  await nextTick()
  const view = grid.value?.nativeView
  if (!active || !view) return
  const forward = next.compare(previous) > 0
  view.translateX = (forward !== rtl.value ? 1 : -1) * 12
  run(() => [{ target: view, translate: { x: 0, y: 0 } }], 'replace')
})
watch(chosen, async (next, previous, cleanup) => {
  const width = host.value?.nativeView.getActualSize().width
  let active = true
  cleanup(() => { active = false })
  if (!next) {
    const view = mark.value?.nativeView
    if (!view || (previous && !isSameMonth(previous.date, period.value))) marker.value = undefined
    else moveMark(() => [{ target: view, opacity: 0, scale: { x: .82, y: .82 } }], 'exit', () => {
      if (active) marker.value = undefined
    })
    return
  }
  marker.value = next
  await nextTick()
  const view = mark.value?.nativeView
  if (!active || !view) return
  const adjacent = Boolean(previous && isSameMonth(next.date, previous.date))
  if (previous && adjacent && width) {
    view.translateX += (previous.column - next.column) * width / 7
    view.translateY += (previous.offset - next.offset) * 42
  } else {
    view.opacity = 0
    view.scaleX = view.scaleY = .82
  }
  moveMark(() => [{ target: view, opacity: 1, scale: { x: 1, y: 1 }, translate: { x: 0, y: 0 } }], adjacent ? 'state' : 'enter')
})
defineExpose({ show, focusDate })
</script>

<template>
  <StackLayout :accessibilityLabel="label">
    <GridLayout :columns="rtl ? '44,44,*' : '*,44,44'" direction="ltr" marginBottom="4">
      <SNativePressableFeedback v-if="yearPicker" :col="rtl ? 2 : 0" :label="yearOpen ? closeYearPickerLabel : yearPickerLabel"
        :accessibilityValue="heading" :disabled="disabled" :pressed="yearOpen" :paddingInline="6" fill="transparent" @tap="toggleYear">
        <SNativeMotionText :value="heading" :size="17" verticalAlignment="middle" />
      </SNativePressableFeedback>
      <SNativeMotionText v-else :col="rtl ? 2 : 0" :value="heading" :size="17" verticalAlignment="middle" />
      <SNativeButton col="1" :label="previousMonthLabel" :icon="rtl ? 'chevron-right' : 'chevron-left'" size="sm" variant="ghost" fullWidth
        :disabled="disabled || !nativeCalendarCanPage(period, -1, props)" @tap="page(-1)" />
      <SNativeButton :col="rtl ? 0 : 2" :label="nextMonthLabel" :icon="rtl ? 'chevron-left' : 'chevron-right'" size="sm" variant="ghost" fullWidth
        :disabled="disabled || !nativeCalendarCanPage(period, 1, props)" @tap="page(1)" />
    </GridLayout>
    <SNativeReveal :open="yearOpen">
      <SNativeWheelPicker v-if="yearUsed" :model-value="period.year" :items="yearChoices" :label="yearPickerLabel" :visible-count="3"
        :item-height="38" @commit="pickYear" />
    </SNativeReveal>
    <GridLayout ref="host" :clipToBounds="true">
      <GridLayout ref="grid" :rows="tracks" columns="*,*,*,*,*,*,*" direction="ltr" @swipe="swipe">
        <GridLayout v-if="marker" ref="mark" :row="marker.offset" :col="marker.column" margin="2"
          :borderRadius="theme.geometry.radiusMd" cornerShape="squircle" :backgroundColor="theme.colors.accentSoft" :isUserInteractionEnabled="false" :accessibilityHidden="true" />
        <SNativeText v-for="(day, index) in weekdays" :key="index" row="0" :col="rtl ? 6 - index : index"
          :text="day" size="caption" textAlignment="center" verticalAlignment="middle" />
        <template v-for="day in days" :key="day.key">
          <SNativeCalendarRangeBand v-if="rangeSelection && (!day.outside || selectOutsideMonth)" :row="day.offset" :col="day.column"
            :position="day.range" :column="day.column" marginTop="4" marginBottom="4" />
          <SNativePressableFeedback v-if="!day.outside || showOutsideMonth" :ref="control => remember(day.key, control)"
            :row="day.offset" :col="day.column" :label="nativeDateLabel(day.date, locale)" :disabled="!usable(day.date)"
            :accessibilityState="day.active || day.range ? AccessibilityState.Selected : undefined" :paddingInline="0" :minWidth="0" :minHeight="40"
            fill="transparent" :pressFill="theme.colors.surfaceSage" :navigate="key => navigate(day.date, key)" @pressed-change="held => held && emit('day-focus', day.date)" @tap="select(day.date)">
            <slot name="day" :date="day.date" :selected="Boolean(day.active || day.range)" :today="day.today" :outside="day.outside" :disabled="!usable(day.date)">
              <SNativeText :text="nativeDateLabel(day.date, locale, 'day')" textAlignment="center" verticalAlignment="middle"
                :emphasized="day.active || day.today || day.range === 'start' || day.range === 'end'" :color="day.active || day.today || day.range ? theme.colors.accentText : day.outside ? theme.colors.textMuted : theme.colors.text" />
            </slot>
          </SNativePressableFeedback>
        </template>
      </GridLayout>
    </GridLayout>
  </StackLayout>
</template>
