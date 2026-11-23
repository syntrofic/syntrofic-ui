<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import SChartFrame from '../charts/SChartFrame.vue'
import { useChartColors } from '../charts/dom-palette'
import { mountWebGLPlot, plotPoints, type WebGLDatum, type WebGLMark } from '../charts/gl-plot'
import { streamBuffer } from '../charts/stream-buffer'
import type { ChartFrameSlots, ChartHit, ChartOptions, ChartRange, ChartSelection } from '../charts/types'
import { chartDefaults, clamp, finite, frameOptions, numberAt } from '../charts/values'

const props = withDefaults(defineProps<ChartOptions & {
  data?: readonly WebGLDatum[]
  mark?: WebGLMark
  bufferSize?: number
  pointSize?: number
  lineWidth?: number
  opacity?: number
  color?: string
  colorRange?: readonly string[]
  colorDomain?: ChartRange
  xDomain?: ChartRange
  yDomain?: ChartRange
  cellGap?: number
  unavailableLabel?: string
  valueLabel?: string
}>(), { ...chartDefaults, data: () => [], mark: 'dot', bufferSize: 4096, pointSize: 5, cellGap: .03, opacity: 1,
  unavailableLabel: 'WebGL rendering is unavailable.', valueLabel: 'Value', lineWidth: 1 })
defineSlots<Omit<ChartFrameSlots, 'tooltip'> & {
  tooltip?(scope: { selection: ChartSelection; index: number; datum: WebGLDatum }): unknown
}>()
const emit = defineEmits<{ inspect: [selection?: ChartSelection, index?: number] }>()
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const engine = shallowRef<ReturnType<typeof mountWebGLPlot>>()
const available = shallowRef<boolean>()
const width = shallowRef(640)
const height = computed(() => clamp(numberAt(props.height, 232), 72, 960))
const stream = shallowRef<WebGLDatum[]>()
const capacity = computed(() => clamp(Math.trunc(numberAt(props.bufferSize, 4096)), 1, 100_000))
function coordinate(value: unknown) { return finite(value) || props.mark === 'heatmap' && typeof value === 'string' && Boolean(value.trim()) }
const data = computed(() => (props.mark === 'stream' ? stream.value ?? props.data.slice(-capacity.value) : props.data)
  .filter(point => coordinate(point.x) && coordinate(point.y) && (point.value === undefined || finite(point.value))))
let sequence = 0
let ring: ReturnType<typeof streamBuffer<WebGLDatum>> | undefined
let frame = 0
function push(x: number, y: number, value?: number, label?: string) {
  if (!finite(x) || !finite(y) || value !== undefined && !finite(value)) return
  ring ??= streamBuffer(capacity.value, stream.value ?? props.data)
  ring.push({ id: 'stream:' + sequence++, x, y, value, label })
  if (frame) return
  const win = canvas.value?.ownerDocument.defaultView
  const commit = () => {
    frame = 0
    stream.value = ring?.items() ?? []
  }
  if (win) frame = win.requestAnimationFrame(commit)
  else commit()
}
function clear() {
  if (frame) canvas.value?.ownerDocument.defaultView?.cancelAnimationFrame(frame)
  frame = 0
  ring = undefined
  stream.value = []
}
defineExpose({ push, clear })
watch(capacity, size => {
  if (!ring) return
  stream.value = ring.items().slice(-size)
  ring = streamBuffer(size, stream.value)
}, { flush: 'sync' })

const plot = computed(() => plotPoints(data.value, props.mark, props.xDomain, props.yDomain))
const colorValues = computed(() => props.mark === 'heatmap'
  ? props.colorRange?.length ? props.colorRange : ['var(--sy-surface-blue)', props.color ?? 'var(--sy-chart-sage)']
  : [props.color ?? 'var(--sy-chart-sage)'])
const palette = useChartColors(canvas, () => colorValues.value)
const hasColors = computed(() => palette.value.length > 0)
const options = computed<ChartSelection[]>(() => data.value.map(point => ({
  key: point.id, label: point.label ?? point.id, items: [
    { key: 'x', label: 'X', value: finite(point.x) ? point.x : null, text: typeof point.x === 'string' ? point.x : undefined },
    { key: 'y', label: 'Y', value: finite(point.y) ? point.y : null, text: typeof point.y === 'string' ? point.y : undefined },
    ...(point.value === undefined ? [] : [{ key: 'value', label: props.valueLabel, value: point.value }]),
  ],
})))
function anchor(index: number) {
  const position = plot.value.points[index]
  return { x: ((position?.x ?? 0) + 1) * width.value / 2, y: (1 - (position?.y ?? 0)) * height.value / 2 }
}
function hit(event: ChartHit) {
  if (!available.value) return
  if (props.mark === 'dot-interactive') return engine.value?.pick(event)
  let nearest: number | undefined
  let distance = props.mark === 'heatmap' ? Infinity : Math.max(14, numberAt(props.pointSize, 5) / 2)
  const halfWidth = event.width / 2
  const halfHeight = event.height / 2
  const { cellWidth, cellHeight } = plot.value
  const gap = (1 - clamp(numberAt(props.cellGap, .03), 0, .95)) / 2
  plot.value.points.forEach((point, index) => {
    const x = event.x - (point.x + 1) * halfWidth
    const y = event.y - (1 - point.y) * halfHeight
    if (props.mark === 'heatmap' && (Math.abs(x) > cellWidth * halfWidth * gap || Math.abs(y) > cellHeight * halfHeight * gap)) return
    const next = Math.hypot(x, y)
    if (next < distance) { distance = next; nearest = index }
  })
  return nearest
}

watch(canvas, (node, _, cleanup) => {
  const root = node?.parentElement
  if (!node || !root) return
  let active: ReturnType<typeof mountWebGLPlot>
  try { active = mountWebGLPlot(node, ready => { available.value = ready }) }
  catch { available.value = false; return }
  engine.value = active
  cleanup(() => {
    if (frame) node.ownerDocument.defaultView?.cancelAnimationFrame(frame)
    frame = 0
    active.dispose()
    engine.value = undefined
  })
}, { flush: 'post' })
const drawing = computed(() => ({ colorDomain: props.colorDomain,
  opacity: clamp(numberAt(props.opacity, 1), 0, 1), cellGap: clamp(numberAt(props.cellGap, .03), 0, .95),
  pointSize: clamp(numberAt(props.pointSize, 5), 1, 64), lineWidth: clamp(numberAt(props.lineWidth, 1), 1, 24) }))
watch([engine, hasColors, data, plot, () => props.mark, drawing], ([active, available, rows, positions, mark, options]) => {
  if (active && available) active.update(rows, mark, positions, { ...options, colors: palette.value })
})
watch(palette, colors => { if (colors.length) engine.value?.setColors(colors) })
</script>

<template>
  <SChartFrame v-bind="frameOptions($props)" class="sy-webgl-chart" :options="options" :hit="hit" :anchor="anchor"
    :is-empty="!data.length" :show-data="showData || available === false" @inspect="(...args) => emit('inspect', ...args)" @resize="width = $event">
    <template #plot="{ active }">
      <canvas ref="canvas" :data-webgl="available ? 'ready' : available === false ? 'unavailable' : undefined" aria-hidden="true" />
      <span v-if="available && active !== undefined" class="sy-webgl-chart__marker" aria-hidden="true"
        :style="{ left: anchor(active).x + 'px', top: anchor(active).y + 'px' }" />
    </template>
    <template v-if="$slots.tooltip" #tooltip="scope"><slot name="tooltip" v-bind="scope" :datum="data[scope.index]" /></template>
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
    <template v-if="$slots.data" #data="scope"><slot name="data" v-bind="scope" /></template>
  </SChartFrame>
  <p v-if="available === false" class="sy-webgl-chart__fallback" role="status">{{ unavailableLabel }}</p>
</template>
