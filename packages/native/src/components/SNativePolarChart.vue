<script setup lang="ts">
import { computed, ref } from 'nativescript-vue'
import { drawPie, drawRadar, drawRadial, pickArc, pickRadar } from '../chart-model/polar'
import type { ChartFrameSlots, ChartOptions, ChartSelection, PieChartProps, RadarChartProps, RadialChartProps } from '../chart-model/types'
import { clamp } from '../chart-model/values'
import { chartInk, chartText } from '../chart-plot'
import { useNativeUI } from '../context'
import SNativeChartFrame from './SNativeChartFrame.vue'
import SNativeNumberValue from './SNativeNumberValue.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<ChartOptions & {
  mode: 'pie' | 'radar' | 'radial'
  pie?: PieChartProps
  radar?: RadarChartProps
  radial?: RadialChartProps
}>(), { height: 192, showData: true, showLegend: true, inspect: true })
defineSlots<ChartFrameSlots>()
const emit = defineEmits<{ inspect: [selection: ChartSelection | undefined, index?: number] }>()
const { theme } = useNativeUI()
const width = ref(340)
const active = ref<number>()
const height = computed(() => clamp(props.height, 72, 800))
const scene = computed(() => {
  if (props.pie) {
    const pie = props.pie
    const rings = pie.rings?.length ? pie.rings : [{ id: 'main', label: pie.label, data: pie.data }]
    return drawPie(rings.map(ring => ({ ...ring, data: ring.data.map((item, i) => ({ ...item, color: chartInk(item.color, i) })) })), width.value, height.value, {
      inner: pie.innerRadius ?? 0, gap: pie.paddingAngle ?? 2, start: pie.startAngle ?? 0, labels: Boolean(pie.labels), valueLabel: pie.valueLabel, format: pie.format,
    })
  }
  if (props.radar) {
    const radar = props.radar
    return drawRadar(radar.data, width.value, height.value, { ...radar, series: radar.series.map((item, i) => ({ ...item, color: chartInk(item.color, i) })) })
  }
  const radial = props.radial!
  return drawRadial({ ...radial, data: radial.data.map((item, i) => ({ ...item, color: chartInk(item.color, i) })) }, width.value, height.value)
})
const centerLabel = computed(() => props.pie?.centerLabel ?? props.radial?.centerLabel)
const centerValue = computed(() => props.radial?.centerValue ?? (props.pie?.innerRadius && centerLabel.value ? scene.value.total : undefined))
function hit(x: number, y: number) {
  return props.mode === 'radar' ? pickRadar(scene.value, x, y) : pickArc(scene.value, x, y)
}
const drawing = computed(() => {
  if (scene.value.empty) return ''
  const { guides, marks, polygons, labels } = scene.value
  const colors = theme.value.colors
  const svg = guides.map(path => `<path d="${path}" stroke="${colors.border}" fill="none"/>`)
  polygons.forEach((shape, i) => {
    const ink = chartInk(shape.ink, i)
    if (shape.path) svg.push(`<path d="${shape.path}" stroke="${ink}" stroke-width="1.8" fill="${shape.closed ? ink : 'none'}" fill-opacity=".24"/>`)
    for (const [index, point] of shape.points.entries()) if (point && (props.radar?.dotsOnly || active.value === index)) {
      svg.push(`<circle cx="${point.x}" cy="${point.y}" r="3" fill="${ink}"/>`)
    }
  })
  marks.forEach((mark, i) => {
    const ink = chartInk(mark.ink, i)
    const stroke = mark.stroke ? `stroke="${ink}" stroke-width="${mark.stroke}" stroke-linecap="round" fill="none"` : `fill="${ink}"`
    svg.push(`<path d="${mark.path}" ${stroke} opacity="${active.value === undefined || mark.index === active.value ? 1 : .58}"/>`)
  })
  labels.forEach(label => svg.push(chartText(label.text, label.x, label.y, colors.textMuted, label.align)))
  return svg.join('')
})
</script>

<template>
  <SNativeChartFrame v-model:active="active" :label="label" :description="description" :height="height" :width="width" :drawing="drawing"
    :legend="scene.legend" :options="scene.options" :showLegend="showLegend" :showData="showData" :emptyText="emptyText" :locale="locale"
    :dataLabel="dataLabel" :missingText="missingText" :inspect="inspect" :hit="hit"
    @measure="width = $event" @inspect="(entry, index) => emit('inspect', entry, index)">
    <template v-if="centerLabel" #center>
      <StackLayout>
        <SNativeNumberValue v-if="centerValue != null" :value="centerValue" :format="pie?.format ?? radial?.format" horizontalAlignment="center" />
        <SNativeText :text="centerLabel" size="caption" tone="muted" textAlignment="center" />
      </StackLayout>
    </template>
    <template v-if="$slots.legend" #legend="state"><slot name="legend" v-bind="state" /></template>
    <template v-if="$slots.tooltip" #tooltip="state"><slot name="tooltip" v-bind="state" /></template>
    <template v-if="$slots.data" #data="state"><slot name="data" v-bind="state" /></template>
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
  </SNativeChartFrame>
</template>
