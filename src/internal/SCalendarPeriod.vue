<script setup lang="ts">
import SIcon from '../components/SIcon.vue'
import { computed, nextTick, onMounted, ref, shallowRef, toRef, useId, useTemplateRef, watch } from 'vue'
import {
  DateFormatter, getLocalTimeZone, isSameDay,
  isToday, startOfWeek, toCalendar, toCalendarDate, today, type DayOfWeek,
} from '@internationalized/date'
import { useDirection, type DateRange, type DateValue } from 'reka-ui'
import SCalendarYearPicker from '../components/SCalendarYearPicker.vue'
import SFocusGroup from '../components/SFocusGroup.vue'
import SMotionText from '../components/SMotionText.vue'
import { calendarForLocale, useCalendarLocale, type CalendarOptions, type CalendarPresentation, type RangeDateMatcher, type RangeOptions } from './date-controls'

const props = withDefaults(defineProps<Omit<CalendarOptions, 'isDateUnavailable'> & CalendarPresentation & RangeOptions & {
  unit: 'days' | 'weeks'
  count: number
  multiple?: boolean
  range?: boolean
  isDateUnavailable?: RangeDateMatcher
}>(), { pagedNavigation: undefined })
const value = defineModel<DateValue | DateValue[]>()
const rangeValue = defineModel<DateRange>('rangeValue')
const placeholder = defineModel<DateValue>('placeholder')
const emit = defineEmits<{ 'start-change': [date: DateValue | undefined]; 'valid-change': [range: DateRange] }>()
defineSlots<{ indicator?: (props: { date: DateValue; selected?: boolean }) => unknown }>()

const locale = useCalendarLocale(props)
const direction = useDirection(toRef(props, 'dir'))
const weekdays: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const firstWeekday = computed(() => props.weekStartsOn === undefined ? undefined : weekdays[props.weekStartsOn])
const zone = getLocalTimeZone()
const grid = useTemplateRef<HTMLTableElement>('grid')
const yearButton = useTemplateRef<HTMLButtonElement>('yearButton')
const headingId = useId()
const yearOpen = ref(false)
const hoverDay = shallowRef<DateValue>()
const previousRange = shallowRef<DateRange>()
const editing = ref(false)

function compare(a: DateValue, b: DateValue) {
  return a.calendar.toJulianDay(a) - b.calendar.toJulianDay(b)
}

function clamp(date: DateValue) {
  const { minValue, maxValue } = props
  const bound = minValue && compare(date, minValue) < 0 ? minValue
    : maxValue && compare(date, maxValue) > 0 ? maxValue : undefined
  if (!bound) return date
  const { year, month, day, era } = toCalendar(bound, date.calendar)
  return date.set({ year, month, day, era })
}

function selectedDate() {
  if (props.range) return rangeValue.value?.start ?? rangeValue.value?.end
  return Array.isArray(value.value) ? value.value[0] : value.value
}

const columns = computed(() => props.unit === 'weeks' ? 7 : Math.min(7, props.count))
const dayCount = computed(() => props.count * (props.unit === 'weeks' ? 7 : 1))
const pageDays = computed(() => (props.pageBehavior ?? (props.pagedNavigation === false ? 'single' : 'visible')) === 'single'
  ? (props.unit === 'weeks' ? 7 : 1)
  : dayCount.value)
const cursor = shallowRef(clamp(placeholder.value ?? props.defaultPlaceholder ?? selectedDate() ?? today(zone)))

function startFor(date: DateValue, alignment = props.selectionAlignment ?? 'center') {
  const offset = alignment === 'center' ? Math.floor((props.count - 1) / 2)
    : alignment === 'end' ? props.count - 1 : 0
  if (props.unit === 'days') return date.subtract({ days: offset })
  return startOfWeek(date, locale.value, firstWeekday.value).subtract({ weeks: offset })
}

const start = shallowRef(startFor(cursor.value))
const end = computed(() => start.value.add({ days: dayCount.value - 1 }))
const days = computed(() => Array.from({ length: dayCount.value }, (_, day) => start.value.add({ days: day })))
const rows = computed(() => Array.from({ length: Math.ceil(days.value.length / columns.value) }, (_, row) =>
  days.value.slice(row * columns.value, (row + 1) * columns.value)))

const displayCalendar = computed(() => calendarForLocale(locale.value, cursor.value.calendar))
const formatters = computed(() => {
  const settings = { calendar: displayCalendar.value.identifier, timeZone: 'UTC' }
  return {
    heading: new DateFormatter(locale.value, { ...settings, year: 'numeric', month: 'long', day: 'numeric' }),
    full: new DateFormatter(locale.value, { ...settings, dateStyle: 'full' }),
    weekday: new DateFormatter(locale.value, { ...settings, weekday: props.weekdayFormat ?? 'short' }),
    weekdayFull: new DateFormatter(locale.value, { ...settings, weekday: 'long' }),
    number: new Intl.NumberFormat(locale.value, { useGrouping: false }),
  }
})
const nativeDate = (date: DateValue) => toCalendarDate(date).toDate('UTC')
const heading = computed(() => {
  const formatter = formatters.value.heading
  return isSameDay(start.value, end.value) ? formatter.format(nativeDate(start.value))
    : formatter.formatRange(nativeDate(start.value), nativeDate(end.value))
})
const weekHeaders = computed(() => days.value.slice(0, columns.value).map(date => ({
  short: formatters.value.weekday.format(nativeDate(date)),
  full: formatters.value.weekdayFull.format(nativeDate(date)),
})))

function inView(date: DateValue) {
  return compare(date, start.value) >= 0 && compare(date, end.value) <= 0
}

function isDisabled(date: DateValue) {
  return Boolean(props.disabled
    || (props.minValue && compare(date, props.minValue) < 0)
    || (props.maxValue && compare(date, props.maxValue) > 0)
    || props.isDateDisabled?.(date))
}

const anchor = computed(() => {
  if (!props.range) return
  const { start, end } = rangeValue.value ?? {}
  if (props.fixedDate === 'end' && end) return end
  if (props.fixedDate === 'start') return start
  if (!end) return start
})

function unavailable(date: DateValue, start = anchor.value) {
  return props.isDateUnavailable?.(date, start) ?? false
}

function orderedRange(first: DateValue, last: DateValue) {
  return compare(first, last) <= 0 ? { start: first, end: last } : { start: last, end: first }
}

function rangeAllowed(first: DateValue, last: DateValue) {
  const { start, end } = orderedRange(first, last)
  if (props.fixedDate === 'start' && compare(last, first) < 0) return false
  if (props.fixedDate === 'end' && compare(last, first) > 0) return false
  if (props.maximumDays && compare(end, start.add({ days: props.maximumDays - 1 })) > 0) return false
  if (isDisabled(start) || isDisabled(end) || unavailable(last, first)) return false
  if (!props.allowNonContiguousRanges && unavailable(first, first)) return false
  if (!props.isDateDisabled && (!props.isDateUnavailable || props.allowNonContiguousRanges)) return true
  for (let date = start.add({ days: 1 }); compare(date, end) < 0; date = date.add({ days: 1 })) {
    const blocked = isDisabled(date) || !props.allowNonContiguousRanges && unavailable(date, first)
    if (blocked && !props.isDateHighlightable?.(date)) return false
  }
  return true
}

const highlighted = computed(() => {
  const first = anchor.value
  const last = hoverDay.value
  if (!props.readonly && first && last && rangeAllowed(first, last)) return orderedRange(first, last)
})

function contains(range: DateRange | undefined, date: DateValue) {
  return !!range?.start && compare(date, range.start) >= 0
    && (range.end ? compare(date, range.end) <= 0 : isSameDay(date, range.start))
}

function isSelected(date: DateValue) {
  if (props.range) return contains(rangeValue.value, date)
  const selection = value.value
  return Array.isArray(selection) ? selection.some(day => isSameDay(day, date))
    : !!selection && isSameDay(selection, date)
}

const tabDay = computed(() => {
  if (inView(cursor.value) && !isDisabled(cursor.value)) return cursor.value
  return days.value.find(day => !isDisabled(day))
})

function focusDay() {
  grid.value?.querySelector<HTMLElement>('[tabindex="0"]')?.focus({ preventScroll: true })
}

function setCursor(date: DateValue, nextStart = start.value) {
  start.value = nextStart
  if (!isSameDay(cursor.value, date)) {
    cursor.value = date
    placeholder.value = date
  }
}

function focusOn(date: DateValue, nextStart?: DateValue) {
  date = clamp(date)
  setCursor(date, nextStart ?? (inView(date) ? start.value : startFor(date, 'start')))
  void nextTick(focusDay)
}

watch(placeholder, date => {
  if (!date || date.calendar.identifier === cursor.value.calendar.identifier && date.toString() === cursor.value.toString()) return
  const target = clamp(date)
  if (!inView(target) || target.calendar.identifier !== cursor.value.calendar.identifier) start.value = startFor(target)
  cursor.value = target
})
watch(selectedDate, date => {
  if (!date || inView(date)) return
  const target = clamp(date)
  setCursor(target, startFor(target))
})
watch([() => props.unit, () => props.count, firstWeekday, locale], () => {
  start.value = startFor(cursor.value)
})
onMounted(() => { if (props.initialFocus) focusDay() })

function pageStart(direction: -1 | 1) {
  const custom = direction > 0 ? props.nextPage : props.prevPage
  return custom?.(start.value) ?? start.value.add({ days: direction * pageDays.value })
}

function canPage(direction: -1 | 1) {
  if (props.disabled) return false
  const next = pageStart(direction)
  if (direction * compare(next, start.value) <= 0) return false
  if (direction > 0) return !props.maxValue || compare(end.value, props.maxValue) < 0
    && compare(next, props.maxValue) <= 0
  return !props.minValue || compare(start.value, props.minValue) > 0
    && compare(next.add({ days: dayCount.value - 1 }), props.minValue) >= 0
}

function page(direction: -1 | 1, from?: DateValue) {
  if (!canPage(direction)) return
  const next = pageStart(direction)
  const target = clamp((from ?? cursor.value).add({ days: compare(next, start.value) }))
  if (from) focusOn(target, next)
  else setCursor(target, next)
}

function select(day: DateValue) {
  if (isDisabled(day)) return
  focusOn(day)
  if (props.readonly || unavailable(day)) return
  if (props.range) {
    const first = anchor.value
    const current = rangeValue.value
    if (!first) {
      if (!props.preventDeselect && current?.start && current.end
        && isSameDay(current.start, day) && isSameDay(current.end, day)) {
        rangeValue.value = { start: undefined, end: undefined }
        emit('start-change', undefined)
        return
      }
      previousRange.value = current
      editing.value = true
      rangeValue.value = { start: day, end: undefined }
      emit('start-change', day)
    } else if (rangeAllowed(first, day)) {
      const next = orderedRange(first, day)
      rangeValue.value = next
      editing.value = false
      if (!current?.start || !isSameDay(current.start, next.start)) emit('start-change', next.start)
      emit('valid-change', next)
    }
    return
  }
  if (props.multiple) {
    const selected = Array.isArray(value.value) ? value.value : value.value ? [value.value] : []
    if (!isSelected(day)) value.value = [...selected, day]
    else if (!props.preventDeselect) value.value = selected.filter(date => !isSameDay(date, day))
  } else if (!props.preventDeselect && isSelected(day)) value.value = undefined
  else value.value = day
}

function shiftFocus(day: DateValue, offset: number) {
  if (offset === 0) return
  let next = day.add({ days: offset })
  while (props.isDateDisabled?.(next)) {
    const later = next.add({ days: offset })
    if (isSameDay(later, next) || compare(later, start.value.subtract({ days: dayCount.value })) < 0
      || compare(later, end.value.add({ days: dayCount.value })) > 0) return
    next = later
  }
  focusOn(next)
}

function handleKey(event: KeyboardEvent, day: DateValue) {
  if (event.altKey || event.metaKey || event.ctrlKey) return
  const sign = direction.value === 'rtl' ? -1 : 1
  switch (event.key) {
    case 'ArrowLeft': shiftFocus(day, -sign); break
    case 'ArrowRight': shiftFocus(day, sign); break
    case 'ArrowUp': shiftFocus(day, -columns.value); break
    case 'ArrowDown': shiftFocus(day, columns.value); break
    case 'Home':
    case 'End': {
      const offset = compare(day, start.value)
      const rowStart = day.subtract({ days: offset % columns.value })
      const rowEnd = rowStart.add({ days: columns.value - 1 })
      const row = days.value.filter(date => compare(date, rowStart) >= 0 && compare(date, rowEnd) <= 0 && !isDisabled(date))
      const target = event.key === 'Home' ? row[0] : row.at(-1)
      if (target) focusOn(target)
      break
    }
    case 'PageUp':
    case 'PageDown': {
      const direction = event.key === 'PageUp' ? -1 : 1
      if (event.shiftKey) focusOn(day.add({ years: direction }))
      else page(direction, day)
      break
    }
    case 'Escape':
      if (!editing.value) return
      rangeValue.value = previousRange.value ?? { start: undefined, end: undefined }
      hoverDay.value = undefined
      editing.value = false
      emit('start-change', rangeValue.value?.start)
      break
    default: return
  }
  event.preventDefault()
  event.stopPropagation()
}

function handleFocus(day: DateValue) {
  setCursor(day)
  hoverDay.value = day
}

function closeYears() {
  yearOpen.value = false
  void nextTick(() => yearButton.value?.focus())
}

function handleYearEscape(event: KeyboardEvent) {
  if (!yearOpen.value) return
  event.preventDefault()
  event.stopPropagation()
  closeYears()
}

function handleYearBlur(event: FocusEvent) {
  if (event.relatedTarget === yearButton.value) return
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) yearOpen.value = false
}

function jumpToYear(year: DateValue | DateValue[] | undefined) {
  if (!year || Array.isArray(year)) return
  const displayDate = toCalendar(cursor.value, displayCalendar.value).set({ year: year.year, era: year.era })
  const target = clamp(toCalendar(displayDate, cursor.value.calendar))
  setCursor(target, startFor(target))
  closeYears()
}
</script>

<template>
  <div
    class="sy-calendar sy-calendar--period"
    :data-calendar="displayCalendar.identifier"
    role="group"
    :aria-label="label"
    :aria-labelledby="label ? undefined : headingId"
    :aria-invalid="invalid || undefined"
    :data-invalid="invalid || undefined"
    :data-range="range || undefined"
    :data-sy-calendar-selection="range ? 'range' : multiple ? 'multiple' : 'single'"
    :data-view="unit === 'weeks' ? 'week' : 'day'"
    :data-single-day="unit === 'days' && count === 1 || undefined"
    :dir="direction"
  >
    <div class="sy-calendar__header">
      <button
        type="button"
        class="sy-field-action sy-calendar__previous"
        :aria-label="unit === 'weeks' ? navigationLabels?.previousWeek ?? 'Previous week' : navigationLabels?.previousDay ?? 'Previous day'"
        :aria-disabled="!canPage(-1) || undefined"
        :tabindex="canPage(-1) ? undefined : -1"
        :inert="yearOpen"
        @click="page(-1)"
      ><SIcon name="chevron-left" /></button>
      <div class="sy-calendar__title">
        <button
          v-if="yearPicker"
          ref="yearButton"
          type="button"
          class="sy-calendar__heading-button"
          :aria-label="navigationLabels?.chooseYear ?? 'Choose year'"
          :aria-expanded="yearOpen"
          :disabled="disabled"
          @click="yearOpen = !yearOpen"
          @keydown.escape="handleYearEscape"
        ><SMotionText :id="headingId" :value="heading" motion="roll" announce /></button>
        <SMotionText v-else :id="headingId" :value="heading" motion="roll" announce />
      </div>
      <button
        type="button"
        class="sy-field-action sy-calendar__next"
        :aria-label="unit === 'weeks' ? navigationLabels?.nextWeek ?? 'Next week' : navigationLabels?.nextDay ?? 'Next day'"
        :aria-disabled="!canPage(1) || undefined"
        :tabindex="canPage(1) ? undefined : -1"
        :inert="yearOpen"
        @click="page(1)"
      ><SIcon name="chevron-right" /></button>
    </div>
    <div class="sy-calendar__stack">
      <SFocusGroup :inert="yearOpen">
        <table
          ref="grid"
          class="sy-calendar__grid"
          role="grid"
          :aria-label="heading"
          :aria-disabled="disabled || undefined"
          :aria-readonly="readonly || undefined"
          :aria-multiselectable="range || multiple || undefined"
          @pointerleave="hoverDay = undefined"
          @focusout="!grid?.contains($event.relatedTarget as Node | null) && (hoverDay = undefined)"
        >
          <thead>
            <tr>
              <th v-for="(day, column) in weekHeaders" :key="column" scope="col" class="sy-calendar__weekday" :abbr="day.full" :title="day.full">
                <SMotionText :value="day.short" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in rows" :key="index">
              <td v-for="(day, column) in row" :key="column" class="sy-calendar__cell" :aria-selected="isSelected(day)" role="gridcell">
                <button
                  type="button"
                  class="sy-calendar__day"
                  data-sy-focus-target
                  :aria-label="formatters.full.format(nativeDate(day))"
                  :aria-current="isToday(day, zone) ? 'date' : undefined"
                  :aria-disabled="isDisabled(day) || unavailable(day) || (anchor && !rangeAllowed(anchor, day)) || undefined"
                  :data-value="day.toString()"
                  :data-selected="isSelected(day) || undefined"
                  :data-selection-start="rangeValue?.start && isSameDay(rangeValue.start, day) || undefined"
                  :data-selection-end="rangeValue?.end && isSameDay(rangeValue.end, day) || undefined"
                  :data-highlighted="contains(highlighted, day) || undefined"
                  :data-highlighted-start="highlighted?.start && isSameDay(highlighted.start, day) || undefined"
                  :data-highlighted-end="highlighted?.end && isSameDay(highlighted.end, day) || undefined"
                  :data-today="isToday(day, zone) || undefined"
                  :data-disabled="isDisabled(day) || undefined"
                  :data-unavailable="unavailable(day) || undefined"
                  :tabindex="tabDay && isSameDay(tabDay, day) ? 0 : -1"
                  :disabled="isDisabled(day)"
                  @focus="handleFocus(day)"
                  @pointerenter="hoverDay = day"
                  @click="select(day)"
                  @keydown="handleKey($event, day)"
                >
                  <SMotionText :value="formatters.number.format(toCalendar(day, displayCalendar).day)" motion="roll" />
                  <slot name="indicator" :date="day" :selected="isSelected(day)" />
                </button>
              </td>
              <td v-for="column in columns - row.length" :key="`empty-${column}`" />
            </tr>
          </tbody>
        </table>
      </SFocusGroup>
      <Transition name="sy-calendar-years">
        <div
          v-if="yearOpen"
          class="sy-calendar__years sy-calendar__years--period"
          @keydown.escape.stop.prevent="closeYears"
          @focusout="handleYearBlur"
        >
          <SCalendarYearPicker
            :model-value="toCalendar(cursor, displayCalendar)"
            :label="navigationLabels?.chooseYear ?? 'Choose year'"
            :previous-label="navigationLabels?.previousYears"
            :next-label="navigationLabels?.nextYears"
            :locale="locale"
            :dir="direction"
            :min-value="minValue"
            :max-value="maxValue"
            :years-per-page="16"
            prevent-deselect
            initial-focus
            @update:model-value="jumpToYear"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>
