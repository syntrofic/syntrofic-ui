<script setup lang="ts">
import type { CalendarDate, CalendarDateTime } from '@internationalized/date'
import { useTemplateRef } from 'nativescript-vue'
import type { NativeDateTimeBounds } from '../datetime-state'
import type { NativeDialogCloseReason } from '../modal'
import type { NativeTemporalPickerOptions, NativeTimeWheelOptions } from '../temporal-picker'
import SNativeTimePickerInput from './SNativeTimePickerInput.vue'

const props = withDefaults(defineProps<NativeTemporalPickerOptions & Omit<NativeTimeWheelOptions, 'label'> & NativeDateTimeBounds & {
  defaultValue?: CalendarDateTime
  editable?: boolean
  manualLabel?: string
  wheelLabel?: string
  dateLabel?: string
  timeLabel?: string
  timePlaceholder?: string
  format?: (value: CalendarDateTime) => string
  formatDay?: (day: CalendarDate) => string
}>(), { placeholder: 'Choose a date and time', editable: true })
const model = defineModel<CalendarDateTime>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ change: [value?: CalendarDateTime]; opened: []; closed: [reason: NativeDialogCloseReason]; popupError: [error: unknown] }>()
const field = useTemplateRef<InstanceType<typeof SNativeTimePickerInput>>('field')
defineExpose({ check: () => field.value?.check(), clear: () => field.value?.clear(), show: () => field.value?.show() })
</script>

<template>
  <SNativeTimePickerInput ref="field" v-bind="props" date-time :model-value="model" v-model:open="open"
    :format="format ? value => format!(value as CalendarDateTime) : undefined"
    @update:model-value="model = $event as CalendarDateTime | undefined" @change="emit('change', $event as CalendarDateTime | undefined)"
    @opened="emit('opened')" @closed="emit('closed', $event)" @popup-error="emit('popupError', $event)">
    <template v-if="$slots.end" #end><slot name="end" /></template>
    <template v-if="$slots.item" #item="item"><slot name="item" v-bind="item" /></template>
  </SNativeTimePickerInput>
</template>
