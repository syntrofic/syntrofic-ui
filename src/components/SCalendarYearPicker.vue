<script setup lang="ts">
import SIcon from './SIcon.vue'
import {
  YearPickerRoot, YearPickerHeader, YearPickerHeading, YearPickerPrev, YearPickerNext,
  YearPickerGrid, YearPickerGridBody, YearPickerGridRow, YearPickerCell, YearPickerCellTrigger,
  type DateValue,
} from 'reka-ui'
import SMotionText from './SMotionText.vue'
import { useCalendarLocale } from '../internal/date-controls'

const props = withDefaults(defineProps<{
  label?: string
  previousLabel?: string
  nextLabel?: string
  locale?: string
  calendar?: string
  dir?: 'ltr' | 'rtl'
  yearsPerPage?: number
  minValue?: DateValue
  maxValue?: DateValue
  defaultPlaceholder?: DateValue
  disabled?: boolean
  readonly?: boolean
  initialFocus?: boolean
  preventDeselect?: boolean
  multiple?: boolean
  isYearDisabled?: (year: DateValue) => boolean
  isYearUnavailable?: (year: DateValue) => boolean
}>(), { previousLabel: 'Previous years', nextLabel: 'Next years' })

const value = defineModel<DateValue | DateValue[]>()
const calendarLanguage = useCalendarLocale(props)
const placeholder = defineModel<DateValue>('placeholder')
</script>

<template>
  <YearPickerRoot
    v-slot="{ grid }"
    v-model="value"
    v-model:placeholder="placeholder"
    class="sy-calendar sy-year-picker"
    :calendar-label="label"
    :locale="calendarLanguage"
    :dir="dir"
    :years-per-page="yearsPerPage"
    :min-value="minValue"
    :max-value="maxValue"
    :default-placeholder="defaultPlaceholder"
    :disabled="disabled"
    :readonly="readonly"
    :initial-focus="initialFocus"
    :prevent-deselect="preventDeselect"
    :multiple="multiple"
    :is-year-disabled="isYearDisabled"
    :is-year-unavailable="isYearUnavailable"
  >
    <YearPickerHeader class="sy-calendar__header">
      <YearPickerPrev class="sy-field-action sy-calendar__previous" :aria-label="previousLabel"><SIcon name="chevron-left" /></YearPickerPrev>
      <YearPickerHeading v-slot="{ headingValue }" class="sy-calendar__title">
        <SMotionText :value="headingValue" motion="roll" />
      </YearPickerHeading>
      <YearPickerNext class="sy-field-action sy-calendar__next" :aria-label="nextLabel"><SIcon name="chevron-right" /></YearPickerNext>
    </YearPickerHeader>
    <YearPickerGrid class="sy-calendar__grid">
      <YearPickerGridBody>
        <YearPickerGridRow v-for="(row, index) in grid.rows" :key="index">
          <YearPickerCell v-for="year in row" :key="year.toString()" :date="year" class="sy-calendar__cell">
            <YearPickerCellTrigger :year="year" class="sy-calendar__day sy-calendar__year" />
          </YearPickerCell>
        </YearPickerGridRow>
      </YearPickerGridBody>
    </YearPickerGrid>
  </YearPickerRoot>
</template>
