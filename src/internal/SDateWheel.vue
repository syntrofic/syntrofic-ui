<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { endOfMonth, endOfYear, getLocalTimeZone, GregorianCalendar, startOfMonth, startOfYear, toCalendar, toCalendarDate, today } from '@internationalized/date'
import type { DateValue } from 'reka-ui'
import SButton from '../components/SButton.vue'
import SPickerWheel from './SPickerWheel.vue'
import { useMonthDates, type DatePickerOptions } from './date-controls'

type Part = 'year' | 'month' | 'day'
type DateOption = { id: string; label: string; date: DateValue; disabled?: boolean }
const props = defineProps<DatePickerOptions & { value?: DateValue; applyLabel: string; haptics?: boolean }>()
const emit = defineEmits<{ apply: [value: DateValue] }>()
const { locale, toDisplay, toModel, minValue, maxValue, defaultMonth } = useMonthDates(props, () => props.value ?? props.defaultPlaceholder)
const first = toDisplay(props.value ?? defaultMonth(props.value) ?? today(getLocalTimeZone()))
const calendar = new GregorianCalendar()
const yearKey = (date: DateValue) => date.era + '-' + date.year
function inBounds(date: DateValue) {
  return (!minValue.value || date.compare(minValue.value) >= 0) && (!maxValue.value || date.compare(maxValue.value) <= 0)
}
function available(date: DateValue) {
  if (!inBounds(date)) return false
  const value = toModel(date)
  return !props.isDateDisabled?.(value) && !props.isDateUnavailable?.(value)
}
function fits(first: DateValue, last: DateValue) {
  return (!minValue.value || last.compare(minValue.value) >= 0) && (!maxValue.value || first.compare(maxValue.value) <= 0)
}
function days(date: DateValue) {
  return Array.from({ length: date.calendar.getDaysInMonth(date) }, (_, index) => date.set({ day: index + 1 }))
}
function months(date: DateValue) {
  return Array.from({ length: date.calendar.getMonthsInYear(date) }, (_, index) => date.set({ month: index + 1 }))
}
function matchingDay(date: DateValue) {
  return days(date).filter(available).sort((a, b) => Math.abs(a.day - date.day) - Math.abs(b.day - date.day))[0]
}
function matchingMonth(date: DateValue) {
  return months(date).sort((a, b) => Math.abs(a.month - date.month) - Math.abs(b.month - date.month))
    .map(matchingDay).find(Boolean)
}
const anchor = minValue.value && first.compare(minValue.value) < 0 ? minValue.value
  : maxValue.value && first.compare(maxValue.value) > 0 ? maxValue.value : first
const draft = shallowRef(matchingDay(anchor) ?? matchingMonth(anchor) ?? anchor)
const moving = shallowRef<ReadonlySet<Part>>(new Set())
const labels = computed(() => new Intl.DisplayNames(locale.value, { type: 'dateTimeField' }))
const dateOrder = computed(() => {
  const order = new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeZone: 'UTC' }).formatToParts(new Date())
    .map(({ type }: { type: string }) => type === 'relatedYear' || type === 'yearName' ? 'year' : type)
    .filter((part): part is Part => part === 'day' || part === 'month' || part === 'year')
  return [...new Set<Part>([...order, 'year', 'month', 'day'])]
})
const names = computed(() => ({
  day: new Intl.NumberFormat(locale.value),
  month: new Intl.DateTimeFormat(locale.value, { month: 'long', timeZone: 'UTC' }),
  year: new Intl.DateTimeFormat(locale.value, { year: 'numeric', timeZone: 'UTC' }),
}))
const asDate = (date: DateValue) => toCalendarDate(date).toDate('UTC')
const years = computed(() => {
  const baseYear = toCalendar(anchor, calendar).year
  const start = minValue.value ? toCalendar(minValue.value, calendar).year - baseYear - 1 : -100
  const end = maxValue.value ? toCalendar(maxValue.value, calendar).year - baseYear + 1 : 80
  const entries = new Map<string, DateOption>()
  for (let shift = Math.max(-9999, start); shift <= Math.min(end, 9999); shift++) {
    const date = anchor.add({ years: shift })
    if (fits(startOfYear(date), endOfYear(date))) {
      const id = yearKey(date)
      entries.set(id, { id, label: names.value.year.format(asDate(date)), date })
    }
  }
  return [...entries.values()]
})
const optionGroups = computed<Record<Part, DateOption[]>>(() => ({
  year: years.value,
  month: months(draft.value).map(date => ({ id: String(date.month), label: names.value.month.format(asDate(date)), date,
    disabled: !fits(startOfMonth(date), endOfMonth(date)) || !matchingDay(date) })),
  day: days(draft.value).map(date => ({ id: String(date.day), label: names.value.day.format(date.day), date, disabled: !available(date) })),
}))
const selected = computed<Record<Part, string>>(() => ({
  year: yearKey(draft.value), month: String(draft.value.month), day: String(draft.value.day),
}))
function select(part: Part, id: string) {
  const option = optionGroups.value[part].find(item => item.id === id)
  if (!option || option.disabled) return
  const current = draft.value
  const next = part === 'year' ? matchingMonth(option.date.set({ month: current.month, day: current.day }))
    : part === 'month' ? matchingDay(option.date) : option.date
  if (next) draft.value = next
}
function motion(part: Part, active: boolean) {
  const current = new Set(moving.value)
  if (active) current.add(part)
  else current.delete(part)
  moving.value = current
}
</script>

<template>
  <div class="sy-date-wheel" :dir="dir">
    <div class="sy-date-wheel__options">
      <SPickerWheel v-for="part in dateOrder" :key="part" :label="labels.of(part) ?? part" :options="optionGroups[part]" :model-value="selected[part]" :haptics="haptics"
        @update:model-value="select(part, $event)" @motion="motion(part, $event)" />
    </div>
    <SButton size="sm" :disabled="moving.size > 0 || !available(draft)" @click="emit('apply', toModel(draft))">{{ applyLabel }}</SButton>
  </div>
</template>
