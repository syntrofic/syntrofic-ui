<script setup lang="ts">
import type { CartesianChartProps, ChartFrameSlots } from '../chart-model/types'
import SNativeCartesianChart from './SNativeCartesianChart.vue'
const props = withDefaults(defineProps<CartesianChartProps>(), { axes: true, grid: true, showLegend: true, showData: true, inspect: true })
defineSlots<ChartFrameSlots>()
</script>

<template>
  <SNativeCartesianChart v-bind="props" mode="bar">
    <template v-if="$slots.legend" #legend="state"><slot name="legend" v-bind="state" /></template>
    <template v-if="$slots.tooltip" #tooltip="state"><slot name="tooltip" v-bind="state" /></template>
    <template v-if="$slots.data" #data="state"><slot name="data" v-bind="state" /></template>
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
  </SNativeCartesianChart>
</template>
