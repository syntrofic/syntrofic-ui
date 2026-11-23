<script setup lang="ts">
import type { Time } from '@internationalized/date'
import { useTemplateRef } from 'nativescript-vue'
import type { NativeDialogCloseReason } from '../modal'
import type { NativeTemporalPickerOptions, NativeTimeWheelOptions } from '../temporal-picker'
import type { NativeTimeBounds } from '../time-state'
import SNativeTimePickerInput from './SNativeTimePickerInput.vue'

const props = withDefaults(defineProps<NativeTemporalPickerOptions & Omit<NativeTimeWheelOptions, 'label'> & NativeTimeBounds & {
  defaultValue?: Time
  editable?: boolean
  manualLabel?: string
  wheelLabel?: string
  timeLabel?: string
  timePlaceholder?: string
  format?: (value: Time) => string
}>(), { editable: true })
const model = defineModel<Time>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ change: [value?: Time]; opened: []; closed: [reason: NativeDialogCloseReason]; popupError: [error: unknown] }>()
const field = useTemplateRef<InstanceType<typeof SNativeTimePickerInput>>('field')
defineExpose({ check: () => field.value?.check(), clear: () => field.value?.clear(), show: () => field.value?.show() })
</script>

<template>
  <SNativeTimePickerInput ref="field" v-bind="props" :model-value="model" v-model:open="open" :format="format ? value => format!(value as Time) : undefined"
    @update:model-value="model = $event as Time | undefined" @change="emit('change', $event as Time | undefined)"
    @opened="emit('opened')" @closed="emit('closed', $event)" @popup-error="emit('popupError', $event)">
    <template v-if="$slots.end" #end><slot name="end" /></template>
    <template v-if="$slots.item" #item="item"><slot name="item" v-bind="item" /></template>
  </SNativeTimePickerInput>
</template>
