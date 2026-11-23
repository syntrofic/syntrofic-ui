<script setup lang="ts">
import type { RadialChartProps, ChartFrameSlots } from '../chart-model/types'
import SNativePolarChart from './SNativePolarChart.vue'
const props = withDefaults(defineProps<RadialChartProps>(), { showLegend: true, showData: true, inspect: true, track: true })
defineSlots<ChartFrameSlots>()
</script>

<template>
  <SNativePolarChart v-bind="props" mode="radial" :radial="props">
    <template v-if="$slots.legend" #legend="state"><slot name="legend" v-bind="state" /></template>
    <template v-if="$slots.tooltip" #tooltip="state"><slot name="tooltip" v-bind="state" /></template>
    <template v-if="$slots.data" #data="state"><slot name="data" v-bind="state" /></template>
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
  </SNativePolarChart>
</template>
