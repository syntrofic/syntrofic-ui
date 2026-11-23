<script setup lang="ts">
import { computed } from 'vue'
import type { ChartPlotContext } from '../charts/types'

const props = withDefaults(defineProps<{ plot: ChartPlotContext; horizontal?: boolean; vertical?: boolean; tickCount?: number }>(), { horizontal: true })
const values = computed(() => props.plot.valueTicks('left', props.tickCount).filter(tick => tick.value !== 0))
const categories = computed(() => props.plot.categoryTicks?.(props.tickCount) ?? props.plot.categories)
const x = computed(() => props.plot.area.horizontal ? values.value : categories.value)
const y = computed(() => props.plot.area.horizontal ? categories.value : values.value)
</script>

<template>
  <g v-if="horizontal || vertical" class="sy-chart__grid" aria-hidden="true" pointer-events="none">
    <template v-if="vertical">
      <line v-for="(tick, index) in x" :key="`x-${index}`" :x1="tick.position" :x2="tick.position" :y1="plot.area.top" :y2="plot.area.bottom" />
    </template>
    <template v-if="horizontal">
      <line v-for="(tick, index) in y" :key="`y-${index}`" :x1="plot.area.left" :x2="plot.area.right" :y1="tick.position" :y2="tick.position" />
    </template>
  </g>
</template>
