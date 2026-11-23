<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { computed, shallowRef } from 'nativescript-vue'
import { nativeDateLabel } from '../calendar-format'
import type { NativeCalendarOptions } from '../calendar-state'
import { nativeOrderedDates, nativeRangeIssue, nativeRangePosition, type NativeDateRange, type NativeDateRangeRules } from '../range-state'
import SNativeCalendar from './SNativeCalendar.vue'
import SNativeFieldError from './SNativeFieldError.vue'
import SNativeMotionText from './SNativeMotionText.vue'

const props = withDefaults(defineProps<NativeCalendarOptions & NativeDateRangeRules & {
  startPrompt?: string
  endPrompt?: string
  invalidRangeText?: string
  maximumDays?: number
}>(), {
  locale: 'en-US', yearPicker: true, showOutsideMonth: true, fixedWeeks: true, selectOutsideMonth: true,
  startPrompt: 'Choose a start date', endPrompt: 'Choose an end date', invalidRangeText: 'Choose an available range.',
})
const value = defineModel<NativeDateRange>()
const month = defineModel<CalendarDate>('month')
const anchor = defineModel<CalendarDate>('anchor')
const candidate = shallowRef<CalendarDate>()
const feedback = shallowRef('')
const emit = defineEmits<{
  select: [range: NativeDateRange]
  preview: [range?: NativeDateRange]
  invalid: [reason: NonNullable<ReturnType<typeof nativeRangeIssue>>, range: NativeDateRange]
  'month-change': [month: CalendarDate]
}>()
const active = computed(() => {
  const begin = anchor.value
  if (!begin) return value.value
  if (!candidate.value) return nativeOrderedDates(begin, begin)
  const range = nativeOrderedDates(begin, candidate.value)
  return nativeRangeIssue(range, props) ? nativeOrderedDates(begin, begin) : range
})
const calendar = computed<NativeCalendarOptions>(() => ({
  label: props.label, locale: props.locale, weekStartsOn: props.weekStartsOn, fixedWeeks: props.fixedWeeks,
  defaultMonth: props.defaultMonth ?? value.value?.start,
  disabled: props.disabled, readonly: props.readonly, showOutsideMonth: props.showOutsideMonth,
  selectOutsideMonth: props.selectOutsideMonth, yearPicker: props.yearPicker,
  minDate: props.minDate, maxDate: props.maxDate, previousMonthLabel: props.previousMonthLabel, nextMonthLabel: props.nextMonthLabel,
  yearPickerLabel: props.yearPickerLabel, closeYearPickerLabel: props.closeYearPickerLabel,
  isDateDisabled: props.isDateDisabled, isDateUnavailable: props.isDateUnavailable,
}))
const status = computed(() => anchor.value ? props.endPrompt
  : value.value ? `${nativeDateLabel(value.value.start, props.locale, 'short')} – ${nativeDateLabel(value.value.end, props.locale, 'short')}` : props.startPrompt)
const cursor = computed<CalendarDate | undefined>({ get: () => anchor.value ?? value.value?.start, set: () => {} })

function preview(day: CalendarDate) {
  if (!anchor.value || props.disabled || props.readonly) return
  candidate.value = day
  const range = nativeOrderedDates(anchor.value, day)
  emit('preview', nativeRangeIssue(range, props) ? undefined : range)
}
function choose(day: CalendarDate) {
  feedback.value = ''
  if (!anchor.value) {
    anchor.value = day
    candidate.value = undefined
    return
  }
  const range = nativeOrderedDates(anchor.value, day)
  const failure = nativeRangeIssue(range, props)
  if (failure) {
    feedback.value = props.invalidRangeText
    emit('invalid', failure, range)
    return
  }
  value.value = range
  anchor.value = undefined
  candidate.value = undefined
  emit('select', range)
}
function reset() {
  anchor.value = undefined
  candidate.value = undefined
  feedback.value = ''
}
defineExpose({ reset })
</script>

<template>
  <StackLayout>
    <SNativeMotionText :value="status" :size="13" announce marginBottom="5" />
    <SNativeCalendar v-model="cursor" v-model:month="month" v-bind="calendar" :active-range="active" range-selection
      @select="choose" @day-focus="preview" @month-change="emit('month-change', $event)">
      <template v-if="$slots.day" #day="part">
        <slot name="day" v-bind="part" :range-position="nativeRangePosition(part.date, active)" :previewing="Boolean(anchor)" />
      </template>
    </SNativeCalendar>
    <SNativeFieldError :text="feedback" :minHeight="16" />
  </StackLayout>
</template>
