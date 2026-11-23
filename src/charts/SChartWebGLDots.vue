<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { useChartColors } from './dom-palette'
import { mountWebGLPlot } from './gl-plot'
import type { PlotArea, RenderSeries } from './cartesian'
import type { ChartHit } from './types'
import { clamp, numberAt } from './values'

const props = defineProps<{ entry: RenderSeries; area: PlotArea; width: number; height: number }>()
const emit = defineEmits<{ ready: [value: boolean] }>()
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const engine = shallowRef<ReturnType<typeof mountWebGLPlot>>()
const colors = useChartColors(canvas, () => [props.entry.series.color])
const hasColors = computed(() => colors.value.length > 0)
const ready = shallowRef(false)
const points = computed(() => {
  const { area, width, height } = props
  return props.entry.points.filter(({ point }) => point.x >= area.left && point.x <= area.right && point.y >= area.top && point.y <= area.bottom)
    .map(({ point, index }) => ({ x: 2 * point.x / width - 1, y: 1 - 2 * point.y / height, index }))
})
const interactive = computed(() => props.entry.series.renderer === 'webgl-interactive')
const pointSize = computed(() => clamp(numberAt(props.entry.series.radius, 2.5) * 2, 1, 64))
watch(canvas, (node, _, cleanup) => {
  if (!node) return
  try {
    const plot = mountWebGLPlot(node, value => { ready.value = value; emit('ready', value) })
    engine.value = plot
    cleanup(() => plot.dispose())
  } catch {
    ready.value = false
    emit('ready', false)
  }
}, { flush: 'post' })
watch([engine, hasColors, points, pointSize, interactive, () => props.entry.series.opacity], ([plot, available, projected, size, interactive, opacity]) => {
  if (!plot || !available) return
  plot.update([], interactive ? 'dot-interactive' : 'dot', { points: projected, cellWidth: 0, cellHeight: 0 },
    { colors: colors.value, cellGap: 0, opacity: clamp(numberAt(opacity, 1), 0, 1), pointSize: size })
})
watch(colors, palette => { if (palette.length) engine.value?.setColors(palette) })
function pick(position: ChartHit) {
  if (!ready.value || !interactive.value) return
  const index = engine.value?.pick(position)
  return index === undefined ? undefined : points.value[index]?.index
}
defineExpose({ pick })
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" class="sy-chart__webgl-dots" :data-ready="ready || undefined" :data-series="entry.series.key" />
</template>
