<script setup lang="ts">
import { Time, toCalendarDate, toCalendarDateTime, type CalendarDate, type CalendarDateTime } from '@internationalized/date'
import { computed, ref, shallowRef, useTemplateRef, watch } from 'nativescript-vue'
import { nativeDateLabel } from '../calendar-format'
import { nativeDateTimeDays, nativeTimeBoundsForDay, type NativeDateTimeBounds } from '../datetime-state'
import type { NativeDialogCloseReason } from '../modal'
import { nativeDigitText } from '../number-state'
import { nativeTemporalField, type NativeTemporalPickerOptions, type NativeTimeWheelOptions } from '../temporal-picker'
import { nativeClockLabel, nativeExactTime, nativeHourFormat, nativePeriodLabel, nativeTimeOf, type NativeTimeBounds } from '../time-state'
import SNativeButton from './SNativeButton.vue'
import SNativeDateField from './SNativeDateField.vue'
import SNativeFieldError from './SNativeFieldError.vue'
import SNativeInput from './SNativeInput.vue'
import SNativeLabel from './SNativeLabel.vue'
import SNativeReveal from './SNativeReveal.vue'
import SNativeTemporalPickerField from './SNativeTemporalPickerField.vue'
import SNativeTemporalWheel from './SNativeTemporalWheel.vue'

type Temporal = Time | CalendarDateTime
const props = withDefaults(defineProps<NativeTemporalPickerOptions & Omit<NativeTimeWheelOptions, 'label'> & NativeTimeBounds & NativeDateTimeBounds & {
  dateTime?: boolean
  defaultValue?: Temporal
  dateLabel?: string
  timeLabel?: string
  timePlaceholder?: string
  editable?: boolean
  manualLabel?: string
  wheelLabel?: string
  format?: (value: Temporal) => string
  formatDay?: (date: CalendarDate) => string
}>(), {
  placeholder: 'Choose a time', requiredMessage: 'Choose a value.', invalidMessage: 'Enter an available value.',
  doneLabel: 'Done', clearLabel: 'Clear value', dateLabel: 'Date', timeLabel: 'Time', timePlaceholder: 'HH:mm',
  editable: true, manualLabel: 'Enter manually', wheelLabel: 'Use wheels',
})
const model = defineModel<Temporal>()
const opened = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ change: [value?: Temporal]; opened: []; closed: [reason: NativeDialogCloseReason]; popupError: [error: unknown] }>()
const field = useTemplateRef<InstanceType<typeof SNativeTemporalPickerField>>('field')
const wheel = useTemplateRef<InstanceType<typeof SNativeTemporalWheel>>('wheel')
const dateField = useTemplateRef<InstanceType<typeof SNativeDateField>>('dateField')
const clockInput = useTemplateRef<InstanceType<typeof SNativeInput>>('clockInput')
const pending = shallowRef<Temporal>()
const day = shallowRef<CalendarDate>()
const clock = ref('')
const manual = ref(false)
const checked = ref(false)
const problem = ref('')
const isDate = (value: Temporal | undefined): value is CalendarDateTime => Boolean(value && 'day' in value)
const hourFormat = computed(() => nativeHourFormat(props.hourFormat, props.locale))
const dateLimits = computed(() => nativeDateTimeDays(props))
const display = computed(() => {
  const value = model.value
  if (!value) return props.placeholder
  const time = nativeClockLabel(nativeTimeOf(value), props.locale, hourFormat.value)
  return props.format?.(value) ?? (isDate(value) ? `${nativeDateLabel(toCalendarDate(value), props.locale, 'short')} · ${time}` : time)
})
const status = computed(() => props.error || (checked.value ? validation() : ''))
const wheelOptions = computed(() => ({
  dayLabel: props.dayLabel, hourLabel: props.hourLabel, minuteLabel: props.minuteLabel, periodLabel: props.periodLabel,
  locale: props.locale, periodLabels: props.periodLabels, hourFormat: hourFormat.value, minuteInterval: props.minuteInterval,
  dateTime: props.dateTime, defaultValue: props.defaultValue, formatDay: props.formatDay,
  minDate: props.minDate, maxDate: props.maxDate, minDateTime: props.minDateTime, maxDateTime: props.maxDateTime,
  minTime: props.minTime, maxTime: props.maxTime, columnOrder: props.columnOrder,
  motion: props.motion, mask: props.mask, visibleCount: props.visibleCount, itemHeight: props.itemHeight,
}))
function validation(value = model.value) {
  if (!value) return props.required ? props.requiredMessage : ''
  if (Boolean(props.dateTime) !== isDate(value)) return props.invalidMessage
  const rules = isDate(value) ? nativeTimeBoundsForDay(toCalendarDate(value), props) : props
  return rules && nativeExactTime(nativeTimeOf(value), rules) ? '' : props.invalidMessage
}
function check() { checked.value = true; return !props.error && !validation() }
function reset() {
  manual.value = false
  pending.value = model.value
  problem.value = ''
}
function toggleManual() {
  problem.value = ''
  if (manual.value) {
    clockInput.value?.dismissKeyboard()
    manual.value = false
    return
  }
  const origin = wheel.value?.current() ?? pending.value
  day.value = isDate(origin) ? toCalendarDate(origin) : undefined
  clock.value = origin ? nativeTimeOf(origin).toString().slice(0, 5) : ''
  manual.value = true
}
function accept(value?: Temporal) {
  if (props.disabled || props.readonly) return
  if (value === undefined ? model.value === undefined : value.toString() === model.value?.toString()) return
  model.value = value
  emit('change', value)
}
function readClock(raw: string) {
  let text = nativeDigitText(raw).trim().toLocaleLowerCase()
  let period: 'am' | 'pm' | undefined
  for (const value of ['am', 'pm'] as const) {
    const labels = [value, value.split('').join('.') + '.', props.periodLabels?.[value] ?? nativePeriodLabel(value, props.locale)]
    const found = labels.map(label => label.toLocaleLowerCase()).find(label => label && (text.startsWith(label) || text.endsWith(label)))
    if (!found) continue
    period = value
    text = (text.startsWith(found) ? text.slice(found.length) : text.slice(0, -found.length)).trim()
    break
  }
  const parts = /^(\d{1,2})[:：]([0-5]\d)$/.exec(text)
  if (!parts) return undefined
  let hour = Number(parts[1])
  if (period) {
    if (hour < 1 || hour > 12) return undefined
    hour = hour % 12 + (period === 'pm' ? 12 : 0)
  }
  return hour <= 23 ? new Time(hour, Number(parts[2])) : undefined
}
function finish() {
  let next: Temporal | undefined
  if (manual.value) {
    if (props.dateTime && !dateField.value?.check()) return
    const time = readClock(clock.value)
    next = time && props.dateTime && day.value ? toCalendarDateTime(day.value, time) : time
  } else next = wheel.value?.current() ?? pending.value
  problem.value = next ? validation(next) : props.invalidMessage
  if (problem.value || props.error) return
  accept(next)
  clockInput.value?.dismissKeyboard()
  field.value?.close('confirm')
}
function wheelCommit(value: Temporal) {
  pending.value = value
  if (!props.closeOnSelect || validation(value) || props.error) return
  accept(value)
  field.value?.close('confirm')
}
watch(opened, visible => { if (visible) reset() }, { immediate: true })
defineExpose({ check, clear: () => accept(), show: () => field.value?.show() })
</script>

<template>
  <SNativeTemporalPickerField ref="field" v-model:open="opened" v-bind="nativeTemporalField(props)" :display="display"
    :hasValue="Boolean(model)" :status="status" @opening="reset" @clear="accept()" @opened="emit('opened')"
    @closed="emit('closed', $event)" @error="emit('popupError', $event)">
    <template v-if="$slots.end" #end><slot name="end" /></template>
    <SNativeReveal :transition-key="manual ? 1 : 0">
      <StackLayout v-if="manual">
        <SNativeDateField v-if="dateTime" ref="dateField" v-model="day" :locale="locale" :label="dateLabel" :picker="false"
          :minDate="dateLimits.first" :maxDate="dateLimits.last" :defaultMonth="dateLimits.first" :required-message="requiredMessage" required />
        <SNativeLabel :text="timeLabel" marginBottom="4" @tap="clockInput?.focus()" />
        <SNativeInput ref="clockInput" v-model="clock" :label="timeLabel" :placeholder="timePlaceholder"
          :invalid="Boolean(problem)" returnKeyType="done" :autocorrect="false" @submit="finish" @update:model-value="problem = ''" />
      </StackLayout>
      <SNativeTemporalWheel v-else ref="wheel" :model-value="pending" v-bind="wheelOptions" @commit="wheelCommit">
        <template v-if="$slots.item" #item="item"><slot name="item" v-bind="item" /></template>
      </SNativeTemporalWheel>
      <SNativeFieldError :text="problem" :minHeight="14" />
    </SNativeReveal>
    <template #footer>
      <GridLayout :columns="editable ? '*,*' : '*'">
        <SNativeButton v-if="editable" :label="manual ? wheelLabel : manualLabel" size="sm" variant="ghost" fullWidth @tap="toggleManual" />
        <SNativeButton :col="editable ? 1 : 0" :label="doneLabel" size="sm" fullWidth @tap="finish" />
      </GridLayout>
    </template>
  </SNativeTemporalPickerField>
</template>
