<script setup lang="ts">
import { computed, ref } from 'nativescript-vue'
import { calculateSeries, categoryPosition, chartArea, chartCategories, chartXProjection, formatCategoryTime, renderCartesian, renderChartReferences, valuePosition } from '../chart-model/cartesian'
import type { CartesianChartProps, ChartFrameSlots, ChartMark, ChartSelection } from '../chart-model/types'
import { clamp, stepValues } from '../chart-model/values'
import { chartEscape, chartInk, chartLine, chartText } from '../chart-plot'
import { useNativeUI } from '../context'
import { nativeFeedbackFormatter } from '../feedback'
import SNativeChartFrame from './SNativeChartFrame.vue'

const props = withDefaults(defineProps<CartesianChartProps & { mode: ChartMark | 'mixed' }>(), { height: 182, grid: true, axes: true, showLegend: true, showData: true, inspect: true })
defineSlots<ChartFrameSlots>()
const emit = defineEmits<{ inspect: [selection: ChartSelection | undefined, index?: number] }>()
const { direction, theme } = useNativeUI()
const width = ref(340)
const active = ref<number>()
const height = computed(() => clamp(props.height, 72, 800))
const axes = computed(() => props.axes && !props.sparkline)
const categories = computed(() => chartCategories(props.data, props.xScale, props.xDomain))
const rows = computed(() => categories.value.rows)
const model = computed(() => calculateSeries(rows.value, props.series.map((series, i) => ({ ...series, color: chartInk(series.color, i) })), props.mode, props))
const hasBars = computed(() => model.value.series.some(entry => entry.series.mark === 'bar'))
const area = computed(() => chartArea(width.value, height.value, {
  axes: axes.value, right: model.value.hasRightAxis, horizontal: props.orientation === 'horizontal', reverse: (props.direction ?? direction.value) === 'rtl',
  margin: props.margin,
}))
const x = computed(() => chartXProjection(categories.value, model.value, area.value))
const geometry = computed(() => renderCartesian(model.value, area.value, rows.value.length, x.value?.positions))
const isEmpty = computed(() => !model.value.series.some(series => series.cells.some(Boolean)))
const legend = computed(() => model.value.series.map(({ series }) => ({ key: series.key, label: series.label, color: series.color })))
const options = computed<ChartSelection[]>(() => rows.value.map((row, index) => ({
  key: row.id ?? String(index), label: row.label,
  items: model.value.series.map(({ series, cells }) => ({ ...series, value: cells[index]?.raw ?? null })),
})))
const formatter = computed(() => nativeFeedbackFormatter(props.locale, { notation: 'compact', maximumFractionDigits: 1 }))
function category(index: number) { return x.value?.position(index) ?? categoryPosition(area.value, index, options.value.length, hasBars.value) }
function hit(x: number, y: number) {
  const { left, right, top, bottom, horizontal } = area.value
  if (x < left - 4 || x > right + 4 || y < top - 4 || y > bottom + 4 || !options.value.length) return
  let match = 0
  options.value.forEach((_, i) => { if (Math.abs(category(i) - (horizontal ? y : x)) < Math.abs(category(match) - (horizontal ? y : x))) match = i })
  return match
}
const drawing = computed(() => {
  if (isEmpty.value && !x.value) return ''
  const { left, right, top, bottom, horizontal, reverse } = area.value
  const colors = theme.value.colors
  const svg: string[] = []
  const references = renderChartReferences(props.references ?? [], rows.value, area.value, model.value.domains, hasBars.value, x.value)
  const tickAxes = model.value.hasRightAxis ? ['left', 'right'] as const : ['left'] as const
  for (const axis of tickAxes) for (const value of stepValues(model.value.domains[axis], props.ticks ?? 4)) {
    const place = valuePosition(area.value, model.value.domains[axis], value)
    const label = (axis === 'left' ? props.axisFormat : props.rightAxisFormat)?.(value) ?? formatter.value.format(value)
    if (props.grid && axis === 'left') svg.push(horizontal ? chartLine(place, top, place, bottom, colors.border) : chartLine(left, place, right, place, colors.border))
    if (axes.value) {
      const start = (axis === 'left') !== reverse
      svg.push(horizontal ? chartText(label, place, bottom + (axis === 'left' ? 12 : 25), colors.textMuted)
        : chartText(label, start ? left - 5 : right + 5, place, colors.textMuted, start ? 'end' : 'start'))
    }
  }
  for (const mark of references) {
    if (!mark.rect) continue
    const { x, y, width, height } = mark.rect
    const fill = mark.color ? chartInk(mark.color, mark.index) : colors.accent
    svg.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" fill-opacity="${mark.opacity}"/>`)
  }
  if (axes.value) {
    const slots = Math.max(2, Math.floor((horizontal ? height.value : width.value) / 52))
    const scale = x.value
    const ticks = scale ? stepValues(scale.domain, Math.min(slots, props.xTicks ?? 5)).map(value => ({ position: scale.project(value)!,
      label: props.xFormat?.(value) ?? (scale.time ? formatCategoryTime(value, scale.domain, props.locale, props.timeZone) : formatter.value.format(value)),
    })) : options.value.flatMap((entry, i) => i % Math.max(1, Math.ceil(options.value.length / slots)) === 0
      ? [{ label: entry.label, position: category(i) }] : [])
    for (const tick of ticks) {
      const words = Array.from(tick.label)
      const label = words.length > 8 ? words.slice(0, 7).join('') + '…' : tick.label
      svg.push(horizontal ? chartText(label, left - 5, tick.position, colors.textMuted, 'end') : chartText(label, tick.position, bottom + 13, colors.textMuted))
    }
  }
  for (const entry of geometry.value) {
    const ink = entry.series.color
    if (entry.area) svg.push(`<path d="${entry.area}" fill="${ink}" fill-opacity="${entry.series.mark === 'area' && entry.series.opacity === undefined ? .28 : entry.fillOpacity}"/>`)
    if (entry.line) svg.push(`<path d="${entry.line}" fill="none" stroke="${ink}" stroke-width="2" stroke-linejoin="round"${entry.series.dashed ? ' stroke-dasharray="4 3"' : ''}/>`)
    for (const bar of entry.bars) svg.push(`<rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="${bar.radius}" fill="${ink}"/>`)
    for (const dot of entry.points) if (dot.dot || dot.index === active.value) svg.push(`<circle cx="${dot.point.x}" cy="${dot.point.y}" r="${entry.series.mark === 'dot' ? dot.radius : 3}" fill="${ink}"/>`)
  }
  for (const mark of references) {
    const ink = mark.color ? chartInk(mark.color, mark.index) : colors.borderStrong
    const { x1, y1, x2, y2 } = mark.line
    if (!mark.rect) svg.push(`<line x1="${x1}" x2="${x2}" y1="${y1}" y2="${y2}" stroke="${ink}" stroke-width="${mark.strokeWidth}" stroke-dasharray="${chartEscape(mark.dash ?? '4 4')}"/>`)
    if (mark.label) {
      const max = Math.max(1, Math.floor((right - left) / 12))
      const characters = Array.from(mark.label)
      svg.push(chartText(characters.length > max ? characters.slice(0, max - 1).join('') + '…' : mark.label,
        mark.text.x, mark.text.y, mark.color ? ink : colors.textMuted, mark.text.anchor))
    }
  }
  for (const entry of geometry.value) {
    for (const whisker of entry.whiskers) svg.push(`<path d="${whisker.path}" fill="none" stroke="${entry.series.color}" stroke-width="${entry.strokeWidth}"/>`)
  }
  if (active.value !== undefined && options.value[active.value]) {
    const place = category(active.value)
    svg.push(horizontal ? chartLine(left, place, right, place, colors.borderStrong, true) : chartLine(place, top, place, bottom, colors.borderStrong, true))
  }
  return svg.join('')
})
</script>

<template>
  <SNativeChartFrame v-model:active="active" :label="label" :description="description" :height="height" :width="width" :drawing="drawing" :is-empty="isEmpty"
    :legend="legend" :options="options" :showLegend="showLegend && !sparkline" :showData="showData && !sparkline"
    :emptyText="emptyText" :missingText="missingText" :dataLabel="dataLabel" :locale="locale" :inspect="inspect" :hit="hit"
    @measure="width = $event" @inspect="(entry, index) => emit('inspect', entry, index)">
    <template v-if="$slots.legend" #legend="state"><slot name="legend" v-bind="state" /></template>
    <template v-if="$slots.tooltip" #tooltip="state"><slot name="tooltip" v-bind="state" /></template>
    <template v-if="$slots.data" #data="state"><slot name="data" v-bind="state" /></template>
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
  </SNativeChartFrame>
</template>
