<script setup lang="ts">
import { computed } from 'vue'
import type { ChartAxis, ChartPlotContext } from '../charts/types'

const props = withDefaults(defineProps<{
  plot: ChartPlotContext
  position: 'top' | 'right' | 'bottom' | 'left'
  axis?: ChartAxis
  tickCount?: number
  maxTicks?: number
  tickFormat?: (value: string | number) => string | null | undefined
  truncate?: number
  animated?: boolean
  showAxisLine?: boolean
  showTicks?: boolean
}>(), { animated: true, showAxisLine: undefined })
const horizontal = computed(() => props.position === 'top' || props.position === 'bottom')
const outward = computed(() => props.position === 'top' || props.position === 'left' ? -1 : 1)
const edge = computed(() => props.plot.area[props.position])
const axis = computed(() => props.axis ?? (props.plot.rightAxis && !props.plot.area.horizontal && (props.position === 'right') !== props.plot.area.reverse ? 'right' : 'left'))
const ticks = computed(() => {
  const area = props.plot.area
  const available = horizontal.value ? area.right - area.left : area.bottom - area.top
  const limit = Math.max(1, Number.isFinite(props.maxTicks) ? Math.floor(props.maxTicks ?? 1) : Math.floor(available / (horizontal.value ? 58 : 20)))
  const entries = area.horizontal !== horizontal.value
    ? props.plot.categoryTicks?.(props.tickCount) ?? props.plot.categories : props.plot.valueTicks(axis.value, props.tickCount)
  if (entries.length <= limit) return entries
  if (limit === 1) return entries.slice(0, 1)
  return Array.from({ length: limit }, (_, index) => entries[Math.round(index * (entries.length - 1) / (limit - 1))])
})
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : undefined

function truncate(text: string) {
  if (props.truncate === undefined || !Number.isFinite(props.truncate)) return text
  const limit = Math.max(0, Math.trunc(props.truncate))
  const parts = segmenter ? [...segmenter.segment(text)].map(item => item.segment) : Array.from(text)
  return parts.length > limit ? parts.slice(0, limit).join('') + '…' : text
}
</script>

<template>
  <g class="sy-chart__ticks sy-chart-axis" :data-axis="horizontal ? (plot.area.horizontal ? axis : 'category') : (plot.area.horizontal ? 'category' : axis)"
    :data-edge="position" :data-animated="animated || undefined" aria-hidden="true" pointer-events="none">
    <line v-if="showTicks || (showAxisLine ?? position === 'bottom')" class="sy-chart-axis__line" :x1="horizontal ? plot.area.left : edge"
      :x2="horizontal ? plot.area.right : edge" :y1="horizontal ? edge : plot.area.top" :y2="horizontal ? edge : plot.area.bottom" />
    <g v-for="tick in ticks" :key="`${typeof tick.value}:${tick.value}`" class="sy-chart-axis__tick"
      :style="{ transform: horizontal ? `translate(${tick.position}px, ${edge}px)` : `translate(${edge}px, ${tick.position}px)` }">
      <line v-if="showTicks" class="sy-chart-axis__line" x1="0" y1="0" :x2="horizontal ? 0 : outward * 4" :y2="horizontal ? outward * 4 : 0" />
      <text :x="horizontal ? 0 : outward * (showTicks ? 9 : 6)" :y="horizontal ? (outward > 0 ? 16 : -6) : 4"
        :text-anchor="horizontal ? (tick.position < 20 ? 'start' : 'middle') : outward > 0 ? 'start' : 'end'">{{ truncate(tickFormat?.(tick.value) ?? tick.label) }}</text>
    </g>
  </g>
</template>
