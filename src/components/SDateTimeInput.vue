<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { toCalendarDate, toCalendarDateTime, toTime, type CalendarDateTime } from '@internationalized/date'
import type { DateValue, TimeValue } from 'reka-ui'
import { pickerCalendarOptions, useCalendarLocale, type DatePickerOptions } from '../internal/date-controls'
import type { TextControlProps } from '../internal/field'
import { useMediaQuery } from '../internal/interaction'
import type { FieldStatus, FieldStatusVariant } from '../internal/status-icon'
import { useTranslator } from '../rac/locale'
import SButton from './SButton.vue'
import SCalendar from './SCalendar.vue'
import SDatePicker from './SDatePicker.vue'
import SSheet from './SSheet.vue'
import STabs from './STabs.vue'
import STimeField from './STimeField.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<TextControlProps & Omit<DatePickerOptions, 'granularity'> & {
  name?: string
  seconds?: boolean
  status?: FieldStatus
  statusVariant?: FieldStatusVariant
  clearable?: boolean
  clearLabel?: string
  presentation?: 'popover' | 'sheet' | 'adaptive-sheet'
  labels?: Partial<{ title: string; picker: string; date: string; time: string; done: string }>
}>()
const model = defineModel<CalendarDateTime>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ clear: [] }>()
const coarse = useMediaQuery('(pointer: coarse)')
const sheet = computed(() => props.presentation === 'sheet' || props.presentation !== 'popover' && coarse.value)
const sheetId = `sy-date-time-${useId()}`
const tab = ref('date')
const translate = useTranslator({ 'dateTime.title': 'Choose date and time', 'dateTime.picker': 'Date and time', 'dateTime.date': 'Date', 'dateTime.time': 'Time', 'dateTime.done': 'Done' })
const text = (key: 'title' | 'picker' | 'date' | 'time' | 'done') => props.labels?.[key] ?? translate(`dateTime.${key}`)
const tabs = computed(() => [{ value: 'date', label: text('date') }, { value: 'time', label: text('time') }])
const pickerProps = computed(() => {
  const { seconds, presentation, labels, ...options } = props
  return { ...options, closeOnSelect: options.closeOnSelect ?? false, granularity: seconds ? 'second' as const : 'minute' as const }
})
const calendar = computed(() => pickerCalendarOptions(pickerProps.value, model.value))
const locale = useCalendarLocale(props)
function timeBound(date?: DateValue) {
  return date && 'hour' in date && model.value && toCalendarDate(date).compare(toCalendarDate(model.value)) === 0 ? toTime(date) : undefined
}
const pickerTime = computed(() => model.value ? toTime(model.value) : undefined)
const timeFieldProps = computed(() => ({ label: text('time'), locale: locale.value, hourCycle: props.hourCycle,
  granularity: pickerProps.value.granularity, step: props.step, minValue: timeBound(props.minValue), maxValue: timeBound(props.maxValue),
  disabled: props.disabled || !model.value, readonly: props.readonly }))
watch(open, visible => { if (visible) tab.value = 'date' })

function update(value?: DateValue) {
  if (props.disabled || props.readonly) return
  if (!value) { model.value = undefined; return }
  const dateTime = toCalendarDateTime(value)
  if (props.minValue && dateTime.compare(props.minValue) < 0
    || props.maxValue && dateTime.compare(props.maxValue) > 0
    || props.isDateDisabled?.(dateTime) || props.isDateUnavailable?.(dateTime)) return
  model.value = dateTime
}
function chooseDate(value?: DateValue | DateValue[]) {
  if (!value || Array.isArray(value)) return
  let next = toCalendarDateTime(toCalendarDate(value), model.value ? toTime(model.value) : undefined)
  const day = toCalendarDate(next)
  if (props.minValue && day.compare(toCalendarDate(props.minValue)) === 0 && next.compare(props.minValue) < 0) next = toCalendarDateTime(props.minValue)
  if (props.maxValue && day.compare(toCalendarDate(props.maxValue)) === 0 && next.compare(props.maxValue) > 0) next = toCalendarDateTime(props.maxValue)
  update(next)
  if (props.closeOnSelect) open.value = false
}
function chooseTime(value?: TimeValue) {
  if (!model.value || !value) return
  update(model.value.set({ hour: value.hour, minute: value.minute, second: value.second, millisecond: value.millisecond }))
}
function openSheet(event: MouseEvent) {
  (event.currentTarget as HTMLButtonElement).focus({ preventScroll: true })
  open.value = true
}
</script>

<template>
  <SDatePicker v-bind="{ ...$attrs, ...pickerProps }" :model-value="model" v-model:open="open" @update:model-value="update" @clear="emit('clear')">
    <template v-if="$slots.trigger" #trigger><slot name="trigger" /></template>
    <template v-if="sheet" #external-trigger="{ disabled }">
      <button type="button" class="sy-field-action sy-calendar-trigger" :disabled="disabled || readonly" :aria-label="triggerLabel ?? text('title')"
        aria-haspopup="dialog" :aria-expanded="open" :aria-controls="open ? sheetId : undefined" @click="openSheet">
        <slot name="trigger">{{ triggerText ?? text('date') }}</slot>
      </button>
    </template>
    <template #picker-calendar="{ options, disabled, invalid }">
      <SCalendar v-bind="options" :model-value="model" :label="label ?? text('date')" :disabled="disabled" :invalid="invalid" @update:model-value="chooseDate">
        <template v-if="$slots.indicator" #indicator="scope"><slot name="indicator" v-bind="scope" /></template>
      </SCalendar>
    </template>
    <template #picker-footer>
      <div class="sy-date-time-picker__footer">
        <STimeField v-bind="timeFieldProps" :model-value="pickerTime" @update:model-value="chooseTime" />
        <SButton size="sm" variant="secondary" @click="open = false">{{ text('done') }}</SButton>
      </div>
    </template>
  </SDatePicker>
  <SSheet v-if="sheet" v-model:open="open" :title="text('title')" :extent="500" :content-id="sheetId" :dismiss-label="text('done')">
    <STabs v-model="tab" :tabs="tabs" :label="text('picker')" :keyboard-hint="false">
      <template #panel="{ tab: panel }">
        <SCalendar v-if="panel.value === 'date'" v-bind="calendar" :model-value="model" :label="text('date')" :disabled="disabled" @update:model-value="chooseDate">
          <template v-if="$slots.indicator" #indicator="scope"><slot name="indicator" v-bind="scope" /></template>
        </SCalendar>
        <STimeField v-else v-bind="timeFieldProps" :model-value="pickerTime" @update:model-value="chooseTime" />
      </template>
    </STabs>
  </SSheet>
</template>
