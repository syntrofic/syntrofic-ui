<script setup lang="ts">
import type { Time } from '@internationalized/date'
import { useTemplateRef } from 'nativescript-vue'
import type { NativeTimeWheelOptions } from '../temporal-picker'
import type { NativeTimeBounds } from '../time-state'
import SNativeTemporalWheel from './SNativeTemporalWheel.vue'

const props = defineProps<NativeTimeWheelOptions & NativeTimeBounds & { defaultValue?: Time }>()
const time = defineModel<Time>()
const emit = defineEmits<{ preview: [value: Time]; change: [value: Time]; commit: [value: Time] }>()
const wheel = useTemplateRef<InstanceType<typeof SNativeTemporalWheel>>('wheel')
defineExpose({ current: () => wheel.value?.current() as Time | undefined })
</script>

<template>
  <SNativeTemporalWheel ref="wheel" v-bind="props" :model-value="time" @update:model-value="time = $event as Time"
    @preview="emit('preview', $event as Time)" @change="emit('change', $event as Time)" @commit="emit('commit', $event as Time)">
    <template v-if="$slots.item" #item="item"><slot name="item" v-bind="item" /></template>
    <template v-if="$slots.indicator" #indicator="indicator"><slot name="indicator" v-bind="indicator" /></template>
    <template v-if="$slots.mask" #mask="edge"><slot name="mask" v-bind="edge" /></template>
  </SNativeTemporalWheel>
</template>
