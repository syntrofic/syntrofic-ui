<script setup lang="ts">
import SChartCartesian from '../charts/SChartCartesian.vue'
import type { CartesianChartProps, CartesianChartSlots, ChartSelection } from '../charts/types'
import { cartesianDefaults } from '../charts/values'

withDefaults(defineProps<CartesianChartProps>(), cartesianDefaults)
defineSlots<CartesianChartSlots>()
const emit = defineEmits<{ inspect: [selection?: ChartSelection, index?: number] }>()
</script>

<template>
  <SChartCartesian v-bind="$props" mode="line" @inspect="(...args) => emit('inspect', ...args)">
    <template v-if="$slots.legend" #legend="scope"><slot name="legend" v-bind="scope" /></template>
    <template v-if="$slots.axes" #axes="scope"><slot name="axes" v-bind="scope" /></template>
    <template v-if="$slots.grid" #grid="scope"><slot name="grid" v-bind="scope" /></template>
    <template v-if="$slots.underlay" #underlay="scope"><slot name="underlay" v-bind="scope" /></template>
    <template v-if="$slots.tooltip" #tooltip="scope"><slot name="tooltip" v-bind="scope" /></template>
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
    <template v-if="$slots.data" #data="scope"><slot name="data" v-bind="scope" /></template>
    <template v-if="$slots.interactions" #interactions="scope"><slot name="interactions" v-bind="scope" /></template>
    <template v-if="$slots.default" #default="scope"><slot v-bind="scope" /></template>
  </SChartCartesian>
</template>
