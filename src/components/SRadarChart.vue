<script setup lang="ts">
import SChartPolar from '../charts/SChartPolar.vue'
import type { RadarChartProps, ChartFrameSlots, ChartSelection } from '../charts/types'
import { chartDefaults } from '../charts/values'

withDefaults(defineProps<RadarChartProps>(), chartDefaults)
defineSlots<ChartFrameSlots>()
const emit = defineEmits<{ inspect: [selection?: ChartSelection, index?: number] }>()
</script>

<template>
  <SChartPolar :radar="$props" @inspect="(...args) => emit('inspect', ...args)">
    <template v-if="$slots.legend" #legend="scope"><slot name="legend" v-bind="scope" /></template>
    <template v-if="$slots.tooltip" #tooltip="scope"><slot name="tooltip" v-bind="scope" /></template>
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
    <template v-if="$slots.data" #data="scope"><slot name="data" v-bind="scope" /></template>
  </SChartPolar>
</template>
