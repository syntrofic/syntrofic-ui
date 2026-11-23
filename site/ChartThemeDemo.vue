<script setup lang="ts">
import { useTemplateRef, watchEffect } from 'vue'
import SBarChart from '../src/components/SBarChart.vue'
import { useChartColors } from '../src/charts/dom-palette'
import { dataColorVars } from '../src/internal/theme-tokens'

const keys = ['--sy-data-categorical-sage', '--sy-data-categorical-clay'] as const
const ramp = ([1, 2, 3, 4, 5] as const).map(step => dataColorVars[`--sy-data-sequential-sage-${step}`])
const data = [
  { label: '一月', values: { delivered: 32, planned: 45 } },
  { label: '二月', values: { delivered: 56, planned: 60 } },
  { label: '三月', values: { delivered: 72, planned: 80 } },
]
const series = [{ key: 'delivered', label: '已交付' }, { key: 'planned', label: '计划交付' }]
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const inks = [...keys, '--sy-border'].map(key => `var(${key})`)
const colors = useChartColors(canvas, () => inks)

watchEffect(() => {
  const context = canvas.value?.getContext('2d')
  if (!context || !colors.value.length) return
  const { width, height } = context.canvas
  const groupWidth = width / data.length
  const baseline = height - 18
  context.clearRect(0, 0, width, height)
  context.fillStyle = colors.value[2]
  context.fillRect(0, baseline, width, 1)
  data.forEach(({ values }, group) => {
    Object.values(values).forEach((value, index) => {
      const size = baseline * value / 100
      const left = groupWidth * (group + .18 + index * .34)
      context.fillStyle = colors.value[index]
      context.fillRect(left, baseline - size, groupWidth * .28, size)
    })
  })
}, { flush: 'post' })
</script>

<template>
  <div class="chart-theme__previews" role="group" aria-label="数据配色预览">
    <figure>
      <figcaption>SVG</figcaption>
      <SBarChart label="季度交付量" :data="data" :series="series" :domain="[0, 100]" :height="138" :show-data="false" />
    </figure>
    <figure>
      <figcaption>Canvas</figcaption>
      <canvas ref="canvas" width="480" height="276" aria-hidden="true" />
    </figure>
  </div>
  <div class="chart-theme__ramp" aria-label="由弱到强的灰绿色阶" role="img">
    <span>顺序色阶</span>
    <span v-for="ink in ramp" :key="ink" :style="{ '--chart-tone': ink }" />
  </div>
</template>

<style scoped>
.chart-theme__previews { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: var(--sy-space-4); }
figure { display: grid; gap: var(--sy-space-2); align-content: start; min-width: 0; margin: 0; }
figcaption, .chart-theme__ramp { color: var(--sy-text-muted); font-size: .78rem; }
.chart-theme__previews :deep(.sy-chart__plot) { background: var(--sy-canvas); }
canvas { display: block; width: 100%; height: 138px; }
.chart-theme__ramp { display: flex; align-items: center; flex-wrap: wrap; gap: var(--sy-space-1); }
.chart-theme__ramp span:first-child { margin-inline-end: var(--sy-space-1); }
.chart-theme__ramp span[style] { inline-size: 1.4rem; block-size: .55rem; background: var(--chart-tone); border-radius: var(--sy-radius-pill); }
@media (prefers-reduced-motion: no-preference) {
  .chart-theme__ramp span[style] { transition: background-color var(--sy-motion-replace) var(--sy-ease-settle); }
}
</style>
