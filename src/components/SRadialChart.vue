<script setup lang="ts">
import SChartPolar from '../charts/SChartPolar.vue'
import type { RadialChartProps, ChartFrameSlots, ChartSelection } from '../charts/types'
import { chartDefaults } from '../charts/values'

withDefaults(defineProps<RadialChartProps>(), { ...chartDefaults, track: true })
defineSlots<ChartFrameSlots & { center(props: { value?: number; label?: string }): unknown }>()
const emit = defineEmits<{ inspect: [selection?: ChartSelection, index?: number] }>()
</script>

<template>
  <SChartPolar :radial="$props" @inspect="(...args) => emit('inspect', ...args)">
    <template v-if="$slots.legend" #legend="scope"><slot name="legend" v-bind="scope" /></template>
    <template v-if="$slots.tooltip" #tooltip="scope"><slot name="tooltip" v-bind="scope" /></template>
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
    <template v-if="$slots.data" #data="scope"><slot name="data" v-bind="scope" /></template>
    <template v-if="$slots.center" #center="scope"><slot name="center" v-bind="scope" /></template>
  </SChartPolar>
</template>
