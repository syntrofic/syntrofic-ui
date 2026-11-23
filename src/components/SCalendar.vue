<script setup lang="ts">
import { CalendarRoot, type DateValue } from 'reka-ui'
import { computed } from 'vue'
import { calendarPeriod, monthCount, monthPaging, useMonthDates, type CalendarOptions, type CalendarPresentation } from '../internal/date-controls'
import SCalendarPanel from '../internal/SCalendarPanel.vue'
import SCalendarPeriod from '../internal/SCalendarPeriod.vue'

const props = withDefaults(defineProps<CalendarOptions & CalendarPresentation & { multiple?: boolean }>(), { fixedWeeks: true, pagedNavigation: undefined })
const value = defineModel<DateValue | DateValue[]>()
const placeholder = defineModel<DateValue>('placeholder')
const period = computed(() => calendarPeriod(props.visibleDuration))
const selected = computed(() => Array.isArray(value.value) ? value.value.at(-1) : value.value)
const { locale: calendarLanguage, display, toDisplay, toModel, minValue: monthMin, maxValue: monthMax, defaultMonth } = useMonthDates(
  props, () => selected.value ?? placeholder.value ?? props.defaultPlaceholder,
)
const monthValue = computed({
  get: () => Array.isArray(value.value) ? value.value.map(toDisplay) : selected.value && toDisplay(selected.value),
  set: date => { value.value = Array.isArray(date) ? date.map(toModel) : date && toModel(date) },
})
const monthPlaceholder = computed({
  get: () => placeholder.value && toDisplay(placeholder.value),
  set: date => { placeholder.value = date && toModel(date) },
})
</script>

<template>
  <SCalendarPeriod v-if="period" v-bind="{ ...props, ...period }" v-model="value" v-model:placeholder="placeholder">
    <template v-if="$slots.indicator" #indicator="day"><slot name="indicator" v-bind="day" /></template>
  </SCalendarPeriod>
  <CalendarRoot
    v-else
    v-slot="{ date, grid, weekDays, locale: calendarLocale }"
    v-model="monthValue"
    v-model:placeholder="monthPlaceholder"
    class="sy-calendar"
    :data-sy-calendar-selection="multiple ? 'multiple' : 'single'"
    :data-calendar="display.identifier"
    role="group"
    :calendar-label="label"
    :aria-invalid="invalid || undefined"
    :disabled="disabled"
    :readonly="readonly"
    :locale="calendarLanguage"
    :dir="dir"
    :min-value="monthMin"
    :max-value="monthMax"
    :default-placeholder="defaultMonth(selected)"
    :fixed-weeks="weeksInMonth === undefined && fixedWeeks"
    :number-of-months="monthCount(props)"
    :week-starts-on="weekStartsOn"
    :weekday-format="weekdayFormat"
    :paged-navigation="monthPaging(props)"
    :prevent-deselect="preventDeselect"
    :initial-focus="initialFocus"
    :is-date-disabled="day => isDateDisabled?.(toModel(day)) ?? false"
    :is-date-unavailable="day => isDateUnavailable?.(toModel(day)) ?? false"
    :disable-days-outside-current-view="disableDaysOutsideCurrentView"
    :next-page="nextPage && (day => toDisplay(nextPage!(toModel(day))))"
    :prev-page="prevPage && (day => toDisplay(prevPage!(toModel(day))))"
    :multiple="multiple"
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
      @navigate="monthPlaceholder = $event"
    >
      <template v-if="$slots.indicator" #indicator="{ date: day, selected: marked }">
        <slot name="indicator" :date="toModel(day)" :selected="marked" />
      </template>
    </SCalendarPanel>
  </CalendarRoot>
</template>
