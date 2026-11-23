<script lang="ts">
export interface CandlestickPoint {
  id: string
  label: string
  open: number
  close: number
  low: number
  high: number
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SChartFrame from '../charts/SChartFrame.vue'
import type { ChartFrameSlots, ChartHit, ChartOptions, ChartRange, ChartSelection } from '../charts/types'
import { chartDefaults, clamp, domainFor, finite, fraction, frameOptions, numberAt, stepValues } from '../charts/values'

const props = withDefaults(defineProps<ChartOptions & {
  data: readonly CandlestickPoint[]
  domain?: ChartRange
  ticks?: number
  labels?: Partial<Record<'open' | 'close' | 'low' | 'high', string>>
  format?: (value: number) => string
}>(), chartDefaults)
const emit = defineEmits<{ inspect: [selection?: ChartSelection, index?: number] }>()
defineSlots<ChartFrameSlots>()
const width = ref(640)
const height = computed(() => clamp(numberAt(props.height, 232), 72, 960))
const rows = computed(() => props.data.filter(({ low, high, open, close }) =>
  [low, high, open, close].every(finite) && low <= Math.min(open, close) && high >= Math.max(open, close)))
const range = computed(() => domainFor(rows.value.flatMap(point => [point.low, point.high]), props.domain))
const formatter = computed(() => props.format ?? new Intl.NumberFormat(props.locale, { maximumFractionDigits: 2 }).format)
const labels = computed(() => ({ open: 'Open', high: 'High', low: 'Low', close: 'Close', ...props.labels }))
const digits = computed(() => Math.max(...stepValues(range.value, props.ticks).map(value => formatter.value(value).length)))
const margin = computed(() => Math.min(Math.max(34, digits.value * 7 + 14), Math.max(26, width.value / 3)))
const edge = computed(() => Math.max(margin.value + 8, width.value - 10))
const step = computed(() => (edge.value - margin.value) / Math.max(1, rows.value.length))
const bodyWidth = computed(() => Math.max(1, Math.min(21, step.value * .59)))
const plotBottom = computed(() => height.value - 25)
const tickRate = computed(() => Math.max(1, Math.ceil(rows.value.length * 52 / (edge.value - margin.value))))
function x(index: number) {
  const position = props.direction === 'rtl' ? rows.value.length - 1 - index : index
  return margin.value + step.value * (position + .5)
}
function y(value: number) { return plotBottom.value - fraction(value, range.value) * (plotBottom.value - 12) }
function hit({ x, y }: ChartHit) {
  if (x < margin.value || x > edge.value || y > plotBottom.value + 17 || !rows.value.length) return undefined
  const index = clamp(Math.floor((x - margin.value) / step.value), 0, rows.value.length - 1)
  return props.direction === 'rtl' ? rows.value.length - index - 1 : index
}
const options = computed<ChartSelection[]>(() => rows.value.map(point => ({
  key: point.id, label: point.label,
  items: (['open', 'high', 'low', 'close'] as const).map(key => ({ key, label: labels.value[key], value: point[key], format: formatter.value })),
})))
</script>

<template>
  <SChartFrame v-bind="frameOptions($props)" class="sy-candlestick" :options="options" :is-empty="!rows.length" :hit="hit"
    :anchor="index => ({ x: x(index), y: y(rows[index]?.close ?? range[0]) })" @resize="width = $event" @inspect="(...args) => emit('inspect', ...args)">
    <template #plot="{ active }">
      <svg v-if="rows.length" :viewBox="'0 0 ' + width + ' ' + height" class="sy-chart__svg" aria-hidden="true" preserveAspectRatio="none"
        :data-animate="animate || undefined">
        <g v-for="value in stepValues(range, ticks)" :key="value">
          <line :x1="margin" :x2="edge" :y1="y(value)" :y2="y(value)" class="sy-candlestick__grid" />
          <text :x="margin - 6" :y="y(value) + 3" text-anchor="end" class="sy-candlestick__label">{{ formatter(value) }}</text>
        </g>
        <g v-for="(point, index) in rows" :key="point.id">
          <g v-if="point.high >= range[0] && point.low <= range[1]" class="sy-candlestick__mark"
            :data-change="point.close > point.open ? 'up' : point.close < point.open ? 'down' : 'flat'"
            :data-active="index === active || undefined">
            <line :x1="x(index)" :x2="x(index)" :y1="y(clamp(point.high, ...range))" :y2="y(clamp(point.low, ...range))" />
            <rect v-if="Math.max(point.open, point.close) >= range[0] && Math.min(point.open, point.close) <= range[1]"
              :x="x(index) - bodyWidth / 2" :width="bodyWidth" :y="y(clamp(Math.max(point.open, point.close), ...range))"
              :height="Math.max(1, Math.abs(y(clamp(point.open, ...range)) - y(clamp(point.close, ...range))))" rx="2" />
          </g>
          <text v-if="index % tickRate === 0" :x="x(index)" :y="height - 7" text-anchor="middle" class="sy-candlestick__label">{{ point.label }}</text>
        </g>
      </svg>
    </template>
    <template v-if="$slots.tooltip" #tooltip="scope"><slot name="tooltip" v-bind="scope" /></template>
    <template v-if="$slots.data" #data="scope"><slot name="data" v-bind="scope" /></template>
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
  </SChartFrame>
</template>
