<script setup lang="ts">
import { computed, defineAsyncComponent, ref, useId, useTemplateRef, type ComponentPublicInstance } from 'vue'
import SChartFrame from './SChartFrame.vue'
import { calculateSeries, categoryPosition, chartArea, chartCategories, chartXProjection, formatCategoryTime, renderCartesian, renderChartReferences, valuePosition } from './cartesian'
import { mixRows, useChartMotion } from './motion'
import type { CartesianChartProps, CartesianChartSlots, ChartAxis, ChartHit, ChartIndicator, ChartMark, ChartPlotContext, ChartSelection } from './types'
import { clamp, frameOptions, numberAt, stepValues } from './values'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<CartesianChartProps & { mode: ChartMark | 'mixed' }>(), {
  height: 232, grid: true, axes: true, orientation: 'vertical', animate: true, inspect: true, showLegend: true, showData: true,
})
defineSlots<CartesianChartSlots>()
const emit = defineEmits<{ inspect: [selection?: ChartSelection, index?: number] }>()
const host = useTemplateRef<HTMLDivElement>('host')
const width = ref(640)
const height = computed(() => clamp(numberAt(props.height, 232), 72, 960))
const id = `sy-plot-${useId()}`
const categories = computed(() => chartCategories(props.data, props.xScale, props.xDomain))
const snapshot = computed(() => categories.value.rows.map(row => ({ ...row, values: { ...row.values } })))
const painted = useChartMotion<readonly CartesianChartProps['data'][number][]>(snapshot, () => props.animate, host, mixRows)
const measured = computed(() => calculateSeries(snapshot.value, props.series, props.mode, props))
const drawing = computed(() => {
  const current = snapshot.value
  const previous = painted.value
  const matching = current.length === previous.length && current.every((row, index) => (row.id ?? row.label) === (previous[index].id ?? previous[index].label))
  return calculateSeries(matching ? previous : current, props.series, props.mode, { domain: measured.value.domains.left, rightDomain: measured.value.domains.right })
})
const axes = computed(() => props.axes && !props.sparkline)
const horizontal = computed(() => props.orientation === 'horizontal')
const reverse = computed(() => props.direction === 'rtl')
const right = computed(() => measured.value.hasRightAxis)
const area = computed(() => chartArea(width.value, height.value, { axes: axes.value, right: right.value, horizontal: horizontal.value, reverse: reverse.value, margin: props.margin }))
const x = computed(() => chartXProjection(categories.value, measured.value, area.value))
const geometry = computed(() => renderCartesian(drawing.value, area.value, snapshot.value.length, x.value?.positions))
const SChartWebGLDots = defineAsyncComponent(() => import('./SChartWebGLDots.vue'))
const webgl = computed(() => geometry.value.filter(entry => entry.series.mark === 'dot' && numberAt(entry.series.radius, 2.5) > 0
  && (entry.series.renderer === 'webgl' || entry.series.renderer === 'webgl-interactive')))
const webglReady = ref(new Set<string>())
const webglDots = new Map<string, { pick: (position: ChartHit) => number | undefined }>()
function dotsRef(key: string, node: Element | ComponentPublicInstance | null) {
  if (node) webglDots.set(key, node as unknown as { pick: (position: ChartHit) => number | undefined })
  else { webglDots.delete(key); webglReady.value.delete(key) }
}
function dotsReady(key: string, ready: boolean) {
  if (ready) webglReady.value.add(key)
  else webglReady.value.delete(key)
}
const isEmpty = computed(() => !measured.value.series.some(entry => entry.cells.some(Boolean)))
const centered = computed(() => measured.value.series.some(entry => entry.series.mark === 'bar'))
function indicator(series: { mark: ChartMark; dashed?: boolean }): ChartIndicator {
  return series.mark === 'bar' ? 'square' : series.dashed ? 'dashed' : 'line'
}
const legend = computed(() => measured.value.series.map(({ series }) => ({
  key: series.key, label: series.label, color: series.color, indicator: indicator(series),
})))
const options = computed<ChartSelection[]>(() => snapshot.value.map((row, index) => ({
  key: row.id ?? String(index), label: row.label,
  items: measured.value.series.map(({ series, cells }) => ({
    key: series.key, label: series.label, value: cells[index]?.raw ?? null, color: series.color, unit: series.unit,
    format: series.format, indicator: indicator(series),
  })),
})))
const format = computed(() => new Intl.NumberFormat(props.locale, { notation: 'compact', maximumFractionDigits: 2 }))
function valueTicks(axis: ChartAxis = 'left', count = props.ticks) {
  const formatter = axis === 'left' ? props.axisFormat : props.rightAxisFormat
  const domain = measured.value.domains[axis]
  return stepValues(domain, count).map(value => ({ value, label: formatter?.(value) ?? format.value.format(value), position: valuePosition(area.value, domain, value) }))
}
const axisTicks = computed(() => (right.value ? ['left', 'right'] as const : ['left'] as const).map(axis => ({
  axis, ticks: valueTicks(axis),
})))
function continuousTicks(count = props.xTicks) {
  const scale = x.value
  if (!scale) return []
  return stepValues(scale.domain, count).map(value => ({ value,
    label: props.xFormat?.(value) ?? (scale.time ? formatCategoryTime(value, scale.domain, props.locale, props.timeZone) : format.value.format(value)),
    position: scale.project(value)!,
  }))
}
const plot = computed<ChartPlotContext>(() => ({ area: area.value, rightAxis: right.value, valueTicks,
  categories: snapshot.value.map((row, index) => ({ value: categories.value.values[index] ?? row.label, label: row.label, position: category(index) })),
  categoryTicks: x.value ? continuousTicks : undefined,
  positionX: x.value?.project ?? (value => {
    const index = snapshot.value.findIndex(row => row.id === value || row.label === value || row.x === value)
    return index < 0 ? undefined : category(index)
  }),
  positionY: (value, axis = 'left') => valuePosition(area.value, measured.value.domains[axis], value),
}))
const references = computed(() => renderChartReferences(props.references ?? [], snapshot.value, area.value, measured.value.domains, centered.value, x.value))
const categoryTicks = computed(() => {
  const max = Math.max(2, Math.floor((horizontal.value ? height.value : width.value) / (horizontal.value ? 25 : 62)))
  if (x.value) return continuousTicks(Math.min(max, props.xTicks ?? 5)).map(tick => ({ ...tick, key: tick.value }))
  const step = Math.max(1, Math.ceil(options.value.length / max))
  return options.value.flatMap((option, index) => index % step === 0 || index === options.value.length - 1 && index % step > step / 2
    ? [{ ...option, position: category(index) }] : [])
})
const zeroGrid = computed(() => {
  const domain = measured.value.domains.left
  if (domain[0] >= 0 || domain[1] <= 0) return
  return valuePosition(area.value, domain, 0)
})

function category(index: number) {
  return x.value?.position(index) ?? categoryPosition(area.value, index, options.value.length, centered.value)
}

function anchor(index: number) {
  return horizontal.value ? { x: (area.value.left + area.value.right) / 2, y: category(index) } : { x: category(index), y: area.value.top }
}

function hit(position: ChartHit) {
  const { left, right, top, bottom } = area.value
  const px = position.x * width.value / position.width
  const py = position.y * height.value / position.height
  if (px < left - 3 || px > right + 3 || py < top - 3 || py > bottom + 3 || !options.value.length) return
  if (webgl.value.length) {
    let interactiveLayers = 0
    for (const { series } of webgl.value.slice().reverse()) {
      if (series.renderer !== 'webgl-interactive' || !webglReady.value.has(series.key)) continue
      interactiveLayers++
      const index = webglDots.get(series.key)?.pick?.(position)
      if (index !== undefined) return index
    }
    if (interactiveLayers === geometry.value.length) return
  }
  const primary = horizontal.value ? py : px
  if (x.value) {
    const positions = x.value.positions
    let nearest = 0
    positions.forEach((value, index) => { if (Math.abs(value - primary) < Math.abs(positions[nearest] - primary)) nearest = index })
    return nearest
  }
  const start = horizontal.value ? top : reverse.value ? right : left
  const end = horizontal.value ? bottom : reverse.value ? left : right
  const ratio = clamp((primary - start) / (end - start), 0, 1)
  return centered.value ? Math.min(options.value.length - 1, Math.floor(ratio * options.value.length)) : Math.round(ratio * (options.value.length - 1))
}

function axisPosition(axis: ChartAxis) {
  const start = axis === 'left' !== reverse.value
  return { x: start ? area.value.left - 6 : area.value.right + 6, align: start ? 'end' as const : 'start' as const }
}

function compact(label: string, length: number) {
  const characters = Array.from(label)
  return characters.length > length ? characters.slice(0, length - 1).join('') + '…' : label
}
</script>

<template>
  <div ref="host" class="sy-chart-host">
    <SChartFrame v-bind="{ ...frameOptions(props), ...$attrs }" :options="options" :legend="legend" :is-empty="isEmpty && !$slots.underlay && !$slots.default" :hit="hit" :anchor="anchor"
      :orientation="orientation" :show-legend="showLegend && !sparkline" :show-data="showData && !sparkline"
      @resize="width = $event" @inspect="(...args) => emit('inspect', ...args)">
      <template #plot="{ active }">
        <svg v-if="!isEmpty || x || $slots.underlay || $slots.default" class="sy-chart__svg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient v-for="(entry, index) in geometry" :id="`${id}-fill-${index}`" :key="entry.series.key" x1="0%" y1="0%" :x2="horizontal ? '100%' : '0%'" :y2="horizontal ? '0%' : '100%'">
              <stop offset="0%" :stop-color="entry.series.color" stop-opacity=".46" />
              <stop offset="100%" :stop-color="entry.series.color" stop-opacity=".12" />
            </linearGradient>
          </defs>
          <slot v-if="grid && !sparkline" name="grid" :plot="plot">
            <g class="sy-chart__grid">
              <template v-for="tick in axisTicks[0].ticks" :key="tick.value">
                <line v-if="horizontal" :x1="tick.position" :x2="tick.position" :y1="area.top" :y2="area.bottom" />
                <line v-else :x1="area.left" :x2="area.right" :y1="tick.position" :y2="tick.position" />
              </template>
            </g>
          </slot>
          <line v-if="zeroGrid !== undefined && horizontal" class="sy-chart__zero" :x1="zeroGrid" :x2="zeroGrid" :y1="area.top" :y2="area.bottom" />
          <line v-if="zeroGrid !== undefined && !horizontal" class="sy-chart__zero" :x1="area.left" :x2="area.right" :y1="zeroGrid" :y2="zeroGrid" />
          <g class="sy-chart__reference-bands" pointer-events="none">
            <rect v-for="marker in references.filter(item => item.rect)" :key="marker.index" v-bind="marker.rect"
              :fill="marker.color ?? 'var(--sy-accent)'" :fill-opacity="marker.opacity" />
          </g>
          <slot name="underlay" :plot="plot" :active="active" />
          <g class="sy-chart__series">
            <path v-for="entry in geometry.filter(item => item.area)" :key="entry.series.key" :d="entry.area" class="sy-chart__area"
              :data-series="entry.series.key" :fill="entry.series.gradient ? `url(#${id}-fill-${geometry.indexOf(entry)})` : entry.series.color"
              :fill-opacity="entry.series.gradient ? 1 : entry.fillOpacity" />
            <g v-for="entry in geometry" :key="entry.series.key" :data-series="entry.series.key" :data-mark="entry.series.mark">
              <rect v-for="bar in entry.bars" :key="bar.index" v-bind="{ x: bar.x, y: bar.y, width: bar.width, height: bar.height }"
                :rx="Math.min(bar.radius, bar.width / 2, bar.height / 2)" :fill="entry.series.color"
                :fill-opacity="active === undefined || active === bar.index ? .9 : .57" class="sy-chart__bar" :data-index="bar.index" />
              <Transition name="sy-chart-shape" :css="animate">
                <path v-if="entry.line" :key="String(Boolean(entry.series.connectNulls))" :d="entry.line"
                  :stroke="entry.series.color" :stroke-dasharray="entry.series.dashed ? '5 4' : undefined"
                  class="sy-chart__line" vector-effect="non-scaling-stroke" />
              </Transition>
              <circle v-for="{ point, index, dot, radius } in entry.points" v-show="dot && !webglReady.has(entry.series.key) || index === active" :key="index"
                :cx="point.x" :cy="point.y" :r="index === active ? radius + 1.5 : radius" :fill="entry.series.color" class="sy-chart__point" />
            </g>
            <g v-for="entry in geometry.filter(item => item.whiskers.length)" :key="entry.series.key" :data-whiskers="entry.series.key"
              fill="none" :stroke="entry.series.color" :stroke-width="entry.strokeWidth">
              <path v-for="whisker in entry.whiskers" :key="whisker.index" :d="whisker.path" :data-index="whisker.index" vector-effect="non-scaling-stroke" />
            </g>
          </g>
          <g v-for="marker in references" :key="marker.index" class="sy-chart__reference" pointer-events="none">
            <line v-if="!marker.rect" v-bind="marker.line" :style="{ stroke: marker.color, strokeWidth: marker.strokeWidth, strokeDasharray: marker.dash }" />
            <text v-if="marker.label" :x="marker.text.x" :y="marker.text.y" :text-anchor="marker.text.anchor"
              :style="{ fill: marker.color }">{{ compact(marker.label, Math.max(1, Math.floor((area.right - area.left) / 12))) }}</text>
          </g>
          <slot v-if="axes" name="axes" :plot="plot">
          <g class="sy-chart__ticks">
            <g v-for="{ axis, ticks } in axisTicks" :key="axis" :data-axis="axis">
              <text v-for="tick in ticks" :key="tick.value" :x="horizontal ? tick.position : axisPosition(axis).x"
                :y="horizontal ? area.bottom + (axis === 'right' ? 34 : 16) : tick.position + 4"
                :text-anchor="horizontal ? 'middle' : axisPosition(axis).align">{{ compact(tick.label, 12) }}</text>
            </g>
            <text v-for="tick in categoryTicks" :key="tick.key" :x="horizontal ? axisPosition('left').x : tick.position"
              :y="horizontal ? tick.position + 4 : area.bottom + 17"
              :text-anchor="horizontal ? axisPosition('left').align : tick.position > width - 31 ? 'end' : tick.position < 31 ? 'start' : 'middle'">
              {{ compact(tick.label, horizontal ? 7 : 9) }}
            </text>
          </g>
          </slot>
          <g class="sy-chart__crosshair" :data-active="active !== undefined || undefined"
            :style="{ transform: horizontal ? `translateY(${active === undefined ? area.top : category(active)}px)` : `translateX(${active === undefined ? area.left : category(active)}px)` }">
            <line v-if="horizontal" :x1="area.left" :x2="area.right" y1="0" y2="0" />
            <line v-else x1="0" x2="0" :y1="area.top" :y2="area.bottom" />
          </g>
          <slot name="interactions" :plot="plot" :active="active" />
          <slot :plot="plot" :active="active" />
        </svg>
        <SChartWebGLDots v-for="entry in webgl" :key="entry.series.key" :ref="node => dotsRef(entry.series.key, node)"
          :entry="entry" :area="area" :width="width" :height="height" @ready="dotsReady(entry.series.key, $event)" />
      </template>
      <template v-if="$slots.legend" #legend="scope"><slot name="legend" v-bind="scope" /></template>
      <template v-if="$slots.tooltip" #tooltip="scope"><slot name="tooltip" v-bind="scope" /></template>
      <template v-if="$slots.empty" #empty><slot name="empty" /></template>
      <template v-if="$slots.data" #data="scope"><slot name="data" v-bind="scope" /></template>
    </SChartFrame>
  </div>
</template>
