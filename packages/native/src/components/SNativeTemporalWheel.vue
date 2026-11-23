<script setup lang="ts">
import { Time, toCalendar, toCalendarDate, toCalendarDateTime, type CalendarDate, type CalendarDateTime } from '@internationalized/date'
import { computed, shallowRef, watch } from 'nativescript-vue'
import { nativeDateLabel } from '../calendar-format'
import { nativeDateToday } from '../calendar-state'
import { nativeAvailableDateTime, nativeDateTimeDays, nativeDayHasSlots, nativeTimeBoundsForDay, type NativeDateTimeBounds } from '../datetime-state'
import type { NativeTimeWheelOptions } from '../temporal-picker'
import {
  nativeHourFormat, nativeMinuteInterval, nativeNearestTime, nativePeriodLabel, nativeTimeOf, nativeTimeOptions, nativeWallHour,
  type NativeTimeBounds, type NativeTimePeriod,
} from '../time-state'
import type { NativeWheelColumn, NativeWheelOption, NativeWheelValues } from '../wheel-state'
import SNativeWheelPickerGroup from './SNativeWheelPickerGroup.vue'

type Temporal = Time | CalendarDateTime
const props = withDefaults(defineProps<NativeTimeWheelOptions & NativeTimeBounds & NativeDateTimeBounds & {
  dateTime?: boolean
  defaultValue?: Temporal
  formatDay?: (day: CalendarDate) => string
}>(), { locale: 'en-US', dayLabel: 'Date', hourLabel: 'Hour', minuteLabel: 'Minute', periodLabel: 'AM or PM' })
const model = defineModel<Temporal>()
const emit = defineEmits<{ preview: [value: Temporal]; change: [value: Temporal]; commit: [value: Temporal] }>()
const then = new Date()
const today = nativeDateToday(then)
const now = new Time(then.getHours(), then.getMinutes())
const dateLike = (value: Temporal | undefined): value is CalendarDateTime => Boolean(value && 'day' in value)
const initial = shallowRef(model.value ?? props.defaultValue ?? (props.dateTime ? toCalendarDateTime(today, now) : now))
const format = computed(() => nativeHourFormat(props.hourFormat, props.locale))
const interval = computed(() => nativeMinuteInterval(props.minuteInterval))
const dateBounds = computed<NativeDateTimeBounds>(previous => {
  const next = {
    minDate: props.minDate, maxDate: props.maxDate, minDateTime: props.minDateTime, maxDateTime: props.maxDateTime, minuteInterval: interval.value,
  }
  const same = previous && (['minDate', 'maxDate', 'minDateTime', 'maxDateTime'] as const)
    .every(key => previous[key]?.toString() === next[key]?.toString())
  return same && previous.minuteInterval === next.minuteInterval ? previous : next
})
const timeBounds = computed<NativeTimeBounds>(previous => {
  const next = { minTime: props.minTime, maxTime: props.maxTime, minuteInterval: interval.value }
  return previous && previous.minTime?.toString() === next.minTime?.toString()
    && previous.maxTime?.toString() === next.maxTime?.toString() && previous.minuteInterval === next.minuteInterval ? previous : next
})
const availableDays = computed(() => {
  const days = new Map<string, CalendarDate>()
  if (!props.dateTime) return days
  const source = dateLike(initial.value) ? toCalendarDate(initial.value) : today
  const { first: min, last: max } = nativeDateTimeDays(dateBounds.value)
  const defaultStart = source.compare(today) < 0 ? source : today
  const defaultEnd = source.compare(today.add({ years: 1 })) > 0 ? source : today.add({ years: 1 })
  const first = toCalendar(min ?? (max && max.compare(defaultStart) < 0 ? max.subtract({ years: 1 }) : defaultStart), source.calendar)
  const last = toCalendar(max ?? (min && min.compare(defaultEnd) > 0 ? min.add({ years: 1 }) : defaultEnd), source.calendar)
  const span = last.calendar.toJulianDay(last) - first.calendar.toJulianDay(first)
  for (let index = 0; index <= span; index++) {
    const day = first.add({ days: index })
    if (nativeDayHasSlots(day, dateBounds.value)) days.set(day.toString(), day)
  }
  return days
})
const dateItems = computed<NativeWheelOption[]>(() => {
  const locale = props.locale
  const formatDay = props.formatDay
  return [...availableDays.value].map(([key, day]) => {
    let label: string | undefined
    return { value: key, get label() { return label ??= formatDay?.(day) ?? nativeDateLabel(day, locale, 'short') } }
  })
})
const hours = Array.from({ length: 24 }, (_, hour) => hour)
const twelve = [12, ...hours.slice(1, 12)]
function rawValues(value: Temporal): NativeWheelValues {
  return {
    ...(dateLike(value) ? { date: toCalendarDate(value).toString() } : {}),
    hour: format.value === 12 ? value.hour % 12 || 12 : value.hour,
    minute: value.minute,
    period: value.hour < 12 ? 'am' : 'pm',
  }
}
function findDay(key: string) {
  const items = availableDays.value
  const first = items.values().next().value as CalendarDate | undefined
  if (!first || !key) return first
  return items.get(key) ?? (key < first.toString() ? first : [...items.values()].at(-1))
}
function resolve(raw: NativeWheelValues) {
  const day = props.dateTime ? findDay(String(raw.date ?? '')) : undefined
  const rules = props.dateTime ? day && nativeTimeBoundsForDay(day, dateBounds.value) : timeBounds.value
  if (!rules) return undefined
  const period: NativeTimePeriod = raw.period === 'pm' ? 'pm' : 'am'
  const hour = nativeWallHour(Number(raw.hour), format.value, period)
  const minute = Number(raw.minute)
  const clock = new Time(hour, minute)
  const local = nativeTimeOptions(hour, rules)
  let selected = local.reduce<Time | undefined>((best, item) =>
    !best || Math.abs(item.minute - minute) < Math.abs(best.minute - minute) ? item : best, undefined)
  if (!selected && format.value === 12) {
    const lo = new Time(period === 'am' ? 0 : 12)
    const hi = new Time(period === 'am' ? 11 : 23, 59)
    selected = nativeNearestTime(clock, {
      ...rules, minTime: rules.minTime && rules.minTime.compare(lo) > 0 ? rules.minTime : lo,
      maxTime: rules.maxTime && rules.maxTime.compare(hi) < 0 ? rules.maxTime : hi,
    })
  }
  if (day) return selected ? toCalendarDateTime(day, selected) : nativeAvailableDateTime(day, clock, dateBounds.value)
  return selected ?? nativeNearestTime(clock, rules)
}
const selectedRaw = shallowRef<NativeWheelValues>(rawValues(initial.value))
let committed: Temporal | undefined
function sync(source: Temporal) {
  const raw = rawValues(source)
  const selected = resolve(raw)
  selectedRaw.value = selected ? rawValues(selected) : raw
}
sync(initial.value)

const displayedDay = computed(() => props.dateTime ? findDay(String(selectedRaw.value.date ?? '')) : undefined)
const period = computed<NativeTimePeriod>(() => selectedRaw.value.period === 'pm' ? 'pm' : 'am')
const wallHour = computed(() => nativeWallHour(Number(selectedRaw.value.hour), format.value, period.value))
const rules = computed(() => props.dateTime ? displayedDay.value && nativeTimeBoundsForDay(displayedDay.value, dateBounds.value) : timeBounds.value)
const perHour = computed(() => hours.map(hour => rules.value ? nativeTimeOptions(hour, rules.value) : []))
const padded = (value: number) => String(value).padStart(2, '0')
const hourItems = computed(() => (format.value === 12 ? twelve : hours).map(hour => ({
  value: hour, label: format.value === 12 ? String(hour) : padded(hour),
  disabled: !perHour.value[nativeWallHour(hour, format.value, period.value)]?.length,
})))
const minuteItems = computed(() => {
  const allowed = new Set(perHour.value[wallHour.value]?.map(time => time.minute))
  return Array.from({ length: Math.ceil(60 / interval.value) }, (_, index) => {
    const value = index * interval.value
    return { value, label: padded(value), disabled: !allowed.has(value) }
  })
})
const periodItems = computed(() => (['am','pm'] as const).map(value => ({
  value, label: props.periodLabels?.[value] ?? nativePeriodLabel(value, props.locale),
  disabled: !perHour.value.slice(value === 'am' ? 0 : 12, value === 'am' ? 12 : 24).some(options => options.length),
})))
const nativeOrder = computed<NativeWheelColumn[]>(() => [
  ...(props.dateTime ? [{ name: 'date', label: props.dayLabel, items: dateItems.value, width: '2.1*' }] : []),
  { name: 'hour', label: props.hourLabel, items: hourItems.value },
  { name: 'minute', label: props.minuteLabel, items: minuteItems.value },
  ...(format.value === 12 ? [{ name: 'period', label: props.periodLabel, items: periodItems.value }] : []),
])
const columns = computed(() => {
  const order = props.columnOrder
  if (!order?.length) return nativeOrder.value
  return [...nativeOrder.value].sort((a, b) => {
    const priority = (name: string) => {
      const index = order.findIndex(key => key === name)
      return index < 0 ? order.length : index
    }
    return priority(a.name) - priority(b.name)
  })
})
function change(raw: NativeWheelValues) {
  const value = resolve(raw)
  if (value) emit('preview', value)
}
function finish(raw: NativeWheelValues) {
  const value = resolve(raw)
  if (!value) return
  const next = rawValues(value)
  if (Object.entries(next).some(([key, entry]) => raw[key] !== entry)) selectedRaw.value = next
  committed = value
  model.value = value
  emit('change', value)
  emit('commit', value)
}
watch(model, next => {
  if (!next) {
    committed = undefined
    sync(props.defaultValue ?? initial.value)
    return
  }
  if (next === committed || next.toString() === committed?.toString()) return
  if (dateLike(next) && !availableDays.value.has(toCalendarDate(next).toString())) initial.value = next
  committed = next
  sync(next)
})
watch([format, dateBounds, timeBounds], () => {
  sync(model.value ?? committed ?? initial.value)
})
defineExpose({ current: () => resolve(selectedRaw.value) })
</script>

<template>
  <SNativeWheelPickerGroup v-model="selectedRaw" :columns="columns" :label="label" :item-height="itemHeight"
    :visible-count="visibleCount" :disabled="disabled" :motion="motion" :mask="mask" @change="change" @commit="finish">
    <template v-if="$slots.item" #item="item"><slot name="item" v-bind="item" /></template>
    <template v-if="$slots.indicator" #indicator="indicator"><slot name="indicator" v-bind="indicator" /></template>
    <template v-if="$slots.mask" #mask="edge"><slot name="mask" v-bind="edge" /></template>
  </SNativeWheelPickerGroup>
</template>
