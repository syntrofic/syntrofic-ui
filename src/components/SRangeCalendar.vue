<script setup lang="ts">
import { RangeCalendarRoot, type DateValue, type DateRange } from 'reka-ui'
import { computed, shallowRef } from 'vue'
import { calendarPeriod, mapRange, monthCount, monthPaging, useMonthDates, type CalendarOptions, type CalendarPresentation, type RangeDateMatcher, type RangeOptions } from '../internal/date-controls'
import SCalendarPanel from '../internal/SCalendarPanel.vue'
import SCalendarPeriod from '../internal/SCalendarPeriod.vue'

const props = withDefaults(defineProps<Omit<CalendarOptions, 'isDateUnavailable'> & CalendarPresentation & RangeOptions & {
  isDateUnavailable?: RangeDateMatcher
}>(), { fixedWeeks: true, pagedNavigation: undefined })
const value = defineModel<DateRange>()
const placeholder = defineModel<DateValue>('placeholder')
const emit = defineEmits<{ 'start-change': [date: DateValue | undefined]; 'valid-change': [range: DateRange] }>()
const period = computed(() => calendarPeriod(props.visibleDuration))
const pendingStart = shallowRef<DateValue>()
const { locale: calendarLanguage, toDisplay, toModel, minValue: monthMin, maxValue: monthMax, defaultMonth } = useMonthDates(
  props, () => value.value?.start ?? value.value?.end ?? placeholder.value ?? props.defaultPlaceholder,
)
const monthValue = computed({
  get: () => mapRange(value.value, toDisplay),
  set: date => { value.value = mapRange(date, toModel) },
})
const monthPlaceholder = computed({
  get: () => placeholder.value && toDisplay(placeholder.value),
  set: date => { placeholder.value = date && toModel(date) },
})

function unavailable(date: DateValue) {
  const { start, end } = value.value ?? {}
  const anchor = props.fixedDate === 'end' ? end : props.fixedDate === 'start' ? start
    : !end ? pendingStart.value ?? start : undefined
  return props.isDateUnavailable?.(toModel(date), anchor) ?? false
}

function startChanged(date: DateValue | undefined) {
  pendingStart.value = date && toModel(date)
  emit('start-change', pendingStart.value)
}

function validChanged(range: DateRange) {
  emit('valid-change', { start: range.start && toModel(range.start), end: range.end && toModel(range.end) })
}
</script>

<template>
  <SCalendarPeriod
    v-if="period"
    v-bind="{ ...props, ...period }"
    v-model:range-value="value"
    v-model:placeholder="placeholder"
    range
    @start-change="emit('start-change', $event)"
    @valid-change="emit('valid-change', $event)"
  >
    <template v-if="$slots.indicator" #indicator="day"><slot name="indicator" v-bind="day" /></template>
  </SCalendarPeriod>
  <RangeCalendarRoot
    v-else
    v-slot="{ date, grid, weekDays, locale: calendarLocale }"
    v-model="monthValue"
    v-model:placeholder="monthPlaceholder"
    class="sy-calendar"
    data-sy-calendar-selection="range"
    role="group"
    :calendar-label="label"
    :aria-invalid="invalid || undefined"
    :disabled="disabled"
    :readonly="readonly"
    :locale="calendarLanguage"
    :dir="dir"
    :min-value="monthMin"
    :max-value="monthMax"
    :default-placeholder="defaultMonth(value?.start)"
    :fixed-weeks="weeksInMonth === undefined && fixedWeeks"
    :number-of-months="monthCount(props)"
    :week-starts-on="weekStartsOn"
    :weekday-format="weekdayFormat"
    :paged-navigation="monthPaging(props)"
    :prevent-deselect="preventDeselect"
    :initial-focus="initialFocus"
    :is-date-disabled="day => isDateDisabled?.(toModel(day)) ?? false"
    :is-date-unavailable="unavailable"
    :disable-days-outside-current-view="disableDaysOutsideCurrentView"
    :next-page="nextPage && (day => toDisplay(nextPage!(toModel(day))))"
    :prev-page="prevPage && (day => toDisplay(prevPage!(toModel(day))))"
    :allow-non-contiguous-ranges="allowNonContiguousRanges"
    :maximum-days="maximumDays"
    :is-date-highlightable="day => isDateHighlightable?.(toModel(day)) ?? false"
    :fixed-date="fixedDate"
    @update:start-value="startChanged"
    @update:valid-model-value="validChanged"
  >
    <SCalendarPanel
      :date="date"
      :grid="grid"
      :week-days="weekDays"
      :locale="calendarLocale"
      :dir="dir"
      :disabled="disabled"
      :min-value="monthMin"
      :max-value="monthMax"
      :year-picker="yearPicker"
      :navigation-labels="navigationLabels"
      :weeks-in-month="weeksInMonth"
      range
      @navigate="monthPlaceholder = $event"
    >
      <template v-if="$slots.indicator" #indicator="{ date: day, selected: marked }">
        <slot name="indicator" :date="toModel(day)" :selected="marked" />
      </template>
    </SCalendarPanel>
  </RangeCalendarRoot>
</template>
