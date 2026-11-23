<script setup lang="ts">
import { computed, shallowRef, watch } from 'nativescript-vue'
import type { ChartOptions } from '../chart-model/types'
import SNativeCartesianChart from './SNativeCartesianChart.vue'
import SNativeNumberValue from './SNativeNumberValue.vue'
import SNativeText from './SNativeText.vue'

export interface NativeChartSample { time: number; value: number | null }
const props = withDefaults(defineProps<ChartOptions & {
  samples: readonly NativeChartSample[]
  window?: number
  maxSamples?: number
  paused?: boolean
  disconnected?: boolean
  disconnectedLabel?: string
  valueLabel?: string
  color?: string
}>(), { window: 30000, maxSamples: 240, disconnectedLabel: 'Reconnecting', valueLabel: 'Latest value', showLegend: false })
const visible = shallowRef<readonly NativeChartSample[]>([])
watch([() => props.samples, () => props.paused, () => props.disconnected], ([samples, paused, disconnected]) => {
  if ((paused || disconnected) && visible.value.length) return
  visible.value = [...samples]
}, { deep: true, immediate: true })
const points = computed(() => {
  const samples = [...new Map(visible.value.filter(sample => Number.isFinite(sample.time)).map(sample => [sample.time, sample])).values()]
    .sort((a, b) => a.time - b.time)
  const cutoff = (samples.at(-1)?.time ?? 0) - Math.max(1, props.window)
  return samples.filter(sample => sample.time >= cutoff).slice(-Math.max(2, props.maxSamples))
})
const data = computed(() => points.value.map(({ time, value }) => ({
  id: String(time), label: new Date(time).toTimeString().slice(0, 8), values: { live: value },
})))
const series = computed(() => [{ key: 'live', label: props.valueLabel, color: props.color, dots: true }])
const latest = computed(() => points.value.at(-1)?.value)
</script>

<template>
  <StackLayout>
    <SNativeCartesianChart v-bind="props" mode="line" :data="data" :series="series" direction="ltr" />
    <SNativeNumberValue v-if="latest != null" :value="latest" :label="valueLabel" :reserveFor="999.99" />
    <SNativeText v-if="disconnected" :text="disconnectedLabel" tone="warning" size="caption" />
  </StackLayout>
</template>
