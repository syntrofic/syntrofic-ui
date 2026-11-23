<script setup lang="ts">
import SChartSwatch from './SChartSwatch.vue'
import type { ChartLegendAlignment, ChartLegendEntry, ChartLegendPosition } from '../charts/types'

withDefaults(defineProps<{
  items?: readonly ChartLegendEntry[]
  position?: ChartLegendPosition
  alignment?: ChartLegendAlignment
  label?: string
}>(), { items: () => [], position: 'bottom', alignment: 'start', label: 'Chart legend' })
</script>

<template>
  <ul v-if="items.length" class="sy-chart__legend" :aria-label="label" :data-position="position" :data-alignment="alignment" role="list">
    <li v-for="(item, index) in items" :key="item.key ?? index">
      <SChartSwatch :color="item.color" :variant="item.indicator ?? (item.type && item.type !== 'bar' ? 'line' : 'square')" />
      {{ item.label }}
    </li>
  </ul>
</template>
