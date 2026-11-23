<script setup lang="ts">
import type { CalendarDate, CalendarDateTime } from '@internationalized/date'
import { useTemplateRef } from 'nativescript-vue'
import type { NativeDateTimeBounds } from '../datetime-state'
import type { NativeTimeWheelOptions } from '../temporal-picker'
import SNativeTemporalWheel from './SNativeTemporalWheel.vue'

const props = defineProps<NativeTimeWheelOptions & NativeDateTimeBounds & {
  defaultValue?: CalendarDateTime
  formatDay?: (day: CalendarDate) => string
}>()
const value = defineModel<CalendarDateTime>()
const emit = defineEmits<{ preview: [value: CalendarDateTime]; change: [value: CalendarDateTime]; commit: [value: CalendarDateTime] }>()
const wheel = useTemplateRef<InstanceType<typeof SNativeTemporalWheel>>('wheel')
defineExpose({ current: () => wheel.value?.current() as CalendarDateTime | undefined })
</script>

<template>
  <SNativeTemporalWheel ref="wheel" v-bind="props" date-time :model-value="value" @update:model-value="value = $event as CalendarDateTime"
    @preview="emit('preview', $event as CalendarDateTime)" @change="emit('change', $event as CalendarDateTime)" @commit="emit('commit', $event as CalendarDateTime)">
    <template v-if="$slots.item" #item="item"><slot name="item" v-bind="item" /></template>
    <template v-if="$slots.indicator" #indicator="indicator"><slot name="indicator" v-bind="indicator" /></template>
    <template v-if="$slots.mask" #mask="edge"><slot name="mask" v-bind="edge" /></template>
  </SNativeTemporalWheel>
</template>
