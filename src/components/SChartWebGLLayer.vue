<script lang="ts">
import type { ChartXValue } from '../charts/types'
export interface ChartStreamPoint { x: ChartXValue; y: number }
export interface ChartHeatmapCell { id: string; x: ChartXValue; y: number | string; value: number }
export interface ChartHeatmapRow { key: string; value: number }
</script>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import type { WebGLProjection } from '../charts/gl-plot'
import { streamBuffer } from '../charts/stream-buffer'
import type { ChartAxis, ChartPlotContext, ChartRange } from '../charts/types'
import { clamp, domainFor, finite, fraction, numberAt } from '../charts/values'

const props = withDefaults(defineProps<{
  plot: ChartPlotContext
  mark: 'heatmap' | 'stream'
  points?: readonly ChartStreamPoint[]
  cells?: readonly ChartHeatmapCell[]
  rows?: readonly ChartHeatmapRow[]
  axis?: ChartAxis
  bufferSize?: number
  lineWidth?: number
  color?: string
  colorRange?: readonly string[]
  colorDomain?: ChartRange
  cellGap?: number
  opacity?: number
  renderer?: 'webgl' | 'svg'
  canvasPlacement?: 'inline' | 'underlay' | 'overlay'
}>(), { points: () => [], cells: () => [], axis: 'left', bufferSize: 4096, lineWidth: 2, cellGap: .03,
  opacity: 1, renderer: 'webgl', canvasPlacement: 'inline' })

const SChartGLCanvas = defineAsyncComponent(() => import('../charts/SChartGLCanvas.vue'))
const root = useTemplateRef<SVGGElement>('layer')
const anchor = useTemplateRef<SVGRectElement>('rasterBounds')
const canvasHost = shallowRef<HTMLElement>()
const canvasBounds = shallowRef<{ left: string; top: string; width: string; height: string }>()
const ready = shallowRef(false)
const streamed = shallowRef<ChartStreamPoint[]>()
const capacity = computed(() => clamp(Math.trunc(numberAt(props.bufferSize, 4096)), 1, 100_000))
let pending: ReturnType<typeof streamBuffer<ChartStreamPoint>> | undefined
let frame = 0
let view: Window | null | undefined

function push(x: ChartXValue, y: number) {
  if (!finite(y)) return
  pending ??= streamBuffer(capacity.value, streamed.value ?? props.points)
  pending.push({ x, y })
  if (frame) return
  view = root.value?.ownerDocument.defaultView
  const publish = () => { frame = 0; streamed.value = pending?.items() ?? [] }
  if (view) frame = view.requestAnimationFrame(publish)
  else publish()
}
function cancel() { if (frame) view?.cancelAnimationFrame(frame); frame = 0 }
function clear() { cancel(); pending = undefined; streamed.value = [] }
watch(capacity, size => {
  if (pending) {
    pending = streamBuffer(size, pending.items())
    streamed.value = pending.items()
  }
})
watch([() => props.mark, () => props.renderer, () => props.canvasPlacement], () => { ready.value = false })
onBeforeUnmount(cancel)
defineExpose({ push, clear })

const area = computed(() => props.plot.area)
const width = computed(() => Math.max(1, area.value.right - area.value.left))
const height = computed(() => Math.max(1, area.value.bottom - area.value.top))
const colorRamp = computed(() => props.mark === 'heatmap' && props.colorRange?.length
  ? props.colorRange : props.mark === 'heatmap' ? ['var(--sy-surface-blue)', props.color ?? 'var(--sy-chart-sage)']
    : [props.color ?? 'var(--sy-chart-sage)'])
const opacity = computed(() => clamp(numberAt(props.opacity, 1), 0, 1))
const lineWidth = computed(() => clamp(numberAt(props.lineWidth, 2), 1, 24))
const gap = computed(() => clamp(numberAt(props.cellGap, .03), 0, .95))
const showRaster = computed(() => props.renderer === 'webgl' && ready.value)

function alignCanvas() {
  const host = canvasHost.value
  const bounds = anchor.value?.getBoundingClientRect()
  const outer = host?.getBoundingClientRect()
  if (!bounds || !outer || !(outer.width > 0) || !(outer.height > 0)) return
  const x = (value: number) => value / outer.width * 100 + '%'
  const y = (value: number) => value / outer.height * 100 + '%'
  canvasBounds.value = { left: x(bounds.x - outer.x), top: y(bounds.y - outer.y), width: x(bounds.width), height: y(bounds.height) }
}
watch([root, anchor, () => props.canvasPlacement], ([group, marker, placement], _, cleanup) => {
  canvasHost.value = undefined
  canvasBounds.value = undefined
  if (!group || !marker || placement === 'inline') return
  const svg = group.ownerSVGElement
  const host = svg?.parentElement
  const view = host?.ownerDocument.defaultView
  if (!svg || !host?.matches('.sy-chart__plot') || !view) return
  canvasHost.value = host
  alignCanvas()
  const resize = new view.ResizeObserver(alignCanvas)
  resize.observe(svg)
  cleanup(() => resize.disconnect())
}, { flush: 'post' })
watch(area, alignCanvas, { flush: 'post' })
const rowValues = computed(() => new Map(props.rows?.map(row => [row.key, row.value]) ??
  [...new Set(props.cells.map(cell => cell.y).filter((value): value is string => typeof value === 'string'))].map((key, index) => [key, index])))

function project(x: ChartXValue, y: number) {
  const category = props.plot.positionX?.(x)
  const value = props.plot.positionY?.(y, props.axis)
  if (!finite(category) || !finite(value)) return
  const { horizontal, left, top } = area.value
  return { x: (horizontal ? value : category) - left, y: (horizontal ? category : value) - top }
}

function bins(values: number[], size: number) {
  const centers = [...new Set(values)].sort((a, b) => a - b)
  return new Map(centers.map((value, index) => {
    const start = index ? (centers[index - 1] + value) / 2 : centers.length > 1 ? value - (centers[1] - value) / 2 : 0
    const end = index + 1 < centers.length ? (value + centers[index + 1]) / 2 : index ? value + (value - centers[index - 1]) / 2 : size
    const lower = clamp(start, 0, size)
    const upper = clamp(end, lower, size)
    return [value, { start: lower, center: (lower + upper) / 2, size: upper - lower }]
  }))
}

const stream = computed(() => (streamed.value ?? props.points).slice(-capacity.value).flatMap(({ x, y }) => {
  const projected = project(x, y)
  return projected ? [projected] : []
}))
const tiles = computed(() => {
  const candidates = props.cells.flatMap(cell => {
    const value = typeof cell.y === 'number' ? cell.y : rowValues.value.get(cell.y)
    if (!finite(value) || !finite(cell.value)) return []
    const point = project(cell.x, value)
    if (!point || point.x < 0 || point.x > width.value || point.y < 0 || point.y > height.value) return []
    return [{ cell, point }]
  })
  const columns = bins(candidates.map(({ point }) => point.x), width.value)
  const rows = bins(candidates.map(({ point }) => point.y), height.value)
  return candidates.map(({ cell, point }) => ({ cell, column: columns.get(point.x)!, row: rows.get(point.y)! }))
    .filter(({ column, row }) => column.size > 0 && row.size > 0)
})
const data = computed(() => props.mark === 'heatmap' ? tiles.value.map(({ cell }) => ({
  id: cell.id, x: cell.x instanceof Date ? cell.x.valueOf() : cell.x, y: cell.y, value: cell.value,
})) : [])
const domain = computed(() => domainFor(data.value.map(item => item.value), props.colorDomain))
const projection = computed<WebGLProjection>(() => ({
  points: props.mark === 'stream'
    ? stream.value.map(({ x, y }) => ({ x: 2 * x / width.value - 1, y: 1 - 2 * y / height.value }))
    : tiles.value.map(({ column, row }) => ({ x: 2 * column.center / width.value - 1, y: 1 - 2 * row.center / height.value,
      width: 2 * column.size / width.value, height: 2 * row.size / height.value })),
  cellWidth: 0, cellHeight: 0,
}))
const options = computed(() => ({ colors: colorRamp.value, colorDomain: domain.value, cellGap: gap.value,
  opacity: opacity.value, pointSize: 1, lineWidth: lineWidth.value }))
const streamPath = computed(() => stream.value.map(({ x, y }, index) => (index ? 'L' : 'M') + x + ',' + y).join(' '))

function fill(value: number) {
  const colors = colorRamp.value
  if (colors.length === 1) return colors[0]
  const position = clamp(fraction(value, domain.value), 0, 1) * (colors.length - 1)
  const first = Math.floor(position)
  const second = Math.min(colors.length - 1, first + 1)
  return 'color-mix(in srgb-linear, ' + colors[first] + ', ' + colors[second] + ' ' + ((position - first) * 100) + '%)'
}
</script>

<template>
  <g ref="layer" class="sy-chart__gl-layer" :data-mark="mark" :data-renderer="showRaster ? 'webgl' : 'svg'" pointer-events="none">
    <rect v-if="canvasPlacement !== 'inline'" ref="rasterBounds" :x="area.left" :y="area.top" :width="width" :height="height"
      fill="none" stroke="none" data-raster-bounds aria-hidden="true" />
    <svg v-show="!showRaster" :x="area.left" :y="area.top" :width="width" :height="height" overflow="hidden" aria-hidden="true">
      <path v-if="mark === 'stream'" :d="streamPath" fill="none" :stroke="colorRamp[0]" :stroke-width="lineWidth"
        :stroke-opacity="opacity" stroke-linejoin="round" stroke-linecap="round" />
      <rect v-for="{ cell, column, row } in mark === 'heatmap' ? tiles : []" :key="cell.id"
        :x="column.start + column.size * gap / 2" :y="row.start + row.size * gap / 2"
        :width="column.size * (1 - gap)" :height="row.size * (1 - gap)" :fill="fill(cell.value)" :fill-opacity="opacity" />
    </svg>
    <!-- Establish the HTML namespace for the canvas before moving it into the plot. -->
    <foreignObject v-if="renderer === 'webgl' && canvasHost && canvasBounds" width="0" height="0" aria-hidden="true">
      <Teleport :to="canvasHost">
        <div class="sy-chart__gl-canvas" :data-placement="canvasPlacement" :data-mark="mark" :style="canvasBounds" aria-hidden="true">
          <SChartGLCanvas :key="mark" :data="data" :kind="mark" :projection="projection" :options="options" @ready="ready = $event" />
        </div>
      </Teleport>
    </foreignObject>
    <foreignObject v-else-if="renderer === 'webgl' && canvasPlacement === 'inline'" :x="area.left" :y="area.top" :width="width" :height="height" aria-hidden="true">
      <SChartGLCanvas :key="mark" :data="data" :kind="mark" :projection="projection" :options="options" @ready="ready = $event" />
    </foreignObject>
  </g>
</template>
