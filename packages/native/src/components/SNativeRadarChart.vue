<script setup lang="ts">
import type { RadarChartProps, ChartFrameSlots } from '../chart-model/types'
import SNativePolarChart from './SNativePolarChart.vue'
const props = withDefaults(defineProps<RadarChartProps>(), { showLegend: true, showData: true, inspect: true })
defineSlots<ChartFrameSlots>()
</script>

<template>
  <SNativePolarChart v-bind="props" mode="radar" :radar="props">
    <template v-if="$slots.legend" #legend="state"><slot name="legend" v-bind="state" /></template>
    <template v-if="$slots.tooltip" #tooltip="state"><slot name="tooltip" v-bind="state" /></template>
    <template v-if="$slots.data" #data="state"><slot name="data" v-bind="state" /></template>
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
  </SNativePolarChart>
</template>
