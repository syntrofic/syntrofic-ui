<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SMotionText from '../components/SMotionText.vue'
import SChartFrame from './SChartFrame.vue'
import { mixRows, mixValue, useChartMotion } from './motion'
import { drawPie, drawRadar, drawRadial, pickArc, pickRadar } from './polar'
import type { ChartFrameSlots, ChartHit, ChartSelection, ChartSlice, PieChartProps, PieRing, RadarChartProps, RadialChartProps } from './types'
import { clamp, finite, frameOptions, lerp, numberAt } from './values'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ pie?: PieChartProps; radar?: RadarChartProps; radial?: RadialChartProps }>()
const slots = defineSlots<ChartFrameSlots & { center?(props: { value?: number; label?: string }): unknown }>()
const emit = defineEmits<{ inspect: [selection?: ChartSelection, index?: number] }>()
const host = useTemplateRef<HTMLDivElement>('host')
const width = ref(640)
const chart = computed(() => props.pie ?? props.radar ?? props.radial!)
const height = computed(() => clamp(numberAt(chart.value.height, 232), 72, 960))
const locale = computed(() => new Intl.NumberFormat(chart.value.locale, { maximumFractionDigits: 2 }))
type Source = { kind: 'pie'; config: PieChartProps } | { kind: 'radar'; config: RadarChartProps } | { kind: 'radial'; config: RadialChartProps }
const snapshot = computed<Source>(() => {
  if (props.pie) return { kind: 'pie' as const, config: {
    ...props.pie,
    data: props.pie.data.map(row => ({ ...row })),
    rings: props.pie.rings?.map(ring => ({ ...ring, data: ring.data.map(row => ({ ...row })) })),
  } }
  if (props.radar) return { kind: 'radar' as const, config: {
    ...props.radar, data: props.radar.data.map(row => ({ ...row, values: { ...row.values } })),
  } }
  return { kind: 'radial' as const, config: { ...props.radial!, data: props.radial!.data.map(row => ({ ...row })) } }
})

function mixSlices<T extends ChartSlice>(from: readonly T[], to: readonly T[], t: number): T[] {
  const values = new Map(from.map(slice => [slice.id, slice.value]))
  return to.map(slice => {
    const value = mixValue(values.get(slice.id) ?? null, slice.value, t)
    return { ...slice, value: typeof value === 'number' ? value : null }
  })
}
function mixRings(from: readonly PieRing[], to: readonly PieRing[], t: number) {
  const byId = new Map(from.map(ring => [ring.id, ring.data]))
  return to.map(ring => ({ ...ring, data: mixSlices(byId.get(ring.id) ?? [], ring.data, t) }))
}

function interpolate(from: Source, to: Source, ratio: number): Source {
  if (from.kind === 'pie' && to.kind === 'pie') return {
    kind: 'pie', config: { ...to.config, data: mixSlices(from.config.data, to.config.data, ratio),
      rings: mixRings(from.config.rings ?? [], to.config.rings ?? [], ratio),
      innerRadius: lerp(numberAt(from.config.innerRadius, .44), numberAt(to.config.innerRadius, .44), ratio) },
  }
  if (from.kind === 'radar' && to.kind === 'radar') return {
    kind: 'radar', config: { ...to.config, data: mixRows(from.config.data, to.config.data, ratio) },
  }
  if (from.kind === 'radial' && to.kind === 'radial') return {
    kind: 'radial', config: { ...to.config, data: mixSlices(from.config.data, to.config.data, ratio),
      startAngle: lerp(numberAt(from.config.startAngle, -135), numberAt(to.config.startAngle, -135), ratio),
      endAngle: lerp(numberAt(from.config.endAngle, 135), numberAt(to.config.endAngle, 135), ratio) },
  }
  return to
}

const painted = useChartMotion<Source>(snapshot, () => chart.value.animate !== false, host, interpolate)
function shape(source: Source) {
  const w = width.value
  const h = height.value
  if (source.kind === 'pie') {
    const settings = source.config
    return drawPie([{ id: 'main', label: '', data: settings.data }, ...(settings.rings ?? [])], w, h, {
      inner: settings.innerRadius ?? .44, gap: settings.paddingAngle ?? 2, start: settings.startAngle ?? 0, labels: Boolean(settings.labels),
      format: settings.format, valueLabel: settings.valueLabel,
    })
  }
  return source.kind === 'radar' ? drawRadar(source.config.data, w, h, source.config) : drawRadial(source.config, w, h)
}
const geometry = computed(() => shape(painted.value))
const target = computed(() => shape(snapshot.value))
const center = computed(() => {
  if (props.pie && (props.pie.innerRadius ?? .44) > 0 && (props.pie.centerLabel || slots.center)) {
    return { value: target.value.total, label: props.pie.centerLabel, format: props.pie.format }
  }
  if (props.radial && (props.radial.centerLabel || slots.center)) {
    const value = props.radial.centerValue ?? undefined
    return { value: finite(value) ? value : undefined, label: props.radial.centerLabel, format: props.radial.format }
  }
})
const centerText = computed(() => {
  const value = center.value?.value
  return value !== undefined ? center.value?.format?.(value) ?? locale.value.format(value) : ''
})

function hit(position: ChartHit) {
  const x = position.x * width.value / position.width
  const y = position.y * height.value / position.height
  return props.radar ? pickRadar(geometry.value, x, y) : pickArc(geometry.value, x, y)
}
function anchor(index: number) {
  return geometry.value.anchors[index] ?? geometry.value.center
}
</script>

<template>
  <div ref="host" class="sy-chart-host">
    <SChartFrame v-bind="{ ...frameOptions(chart), ...$attrs }" :options="target.options" :legend="target.legend"
      :is-empty="target.empty" placeholder-shape="circle" :hit="hit" :anchor="anchor" :supplement="center ? [center.label, centerText].filter(Boolean).join(' ') : undefined"
      @resize="width = $event" @inspect="(...args) => emit('inspect', ...args)">
      <template #plot="{ active }">
        <svg v-if="!target.empty" class="sy-chart__svg" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <g class="sy-chart__polar-grid">
            <path v-for="(guide, index) in geometry.guides" :key="index" :d="guide"
              :class="{ 'sy-chart__track': radial }" :style="radial ? { strokeWidth: geometry.marks[index]?.stroke } : undefined" />
          </g>
          <path v-for="mark in geometry.marks" v-show="mark.path" :key="mark.key" :d="mark.path" :data-index="mark.index"
            :fill="mark.stroke ? 'none' : mark.ink" :stroke="mark.stroke ? mark.ink : undefined" :stroke-width="mark.stroke"
            :opacity="active === undefined || active === mark.index ? 1 : .65" class="sy-chart__arc" />
          <g v-for="item in geometry.polygons" :key="item.key" :data-series="item.key">
            <Transition name="sy-chart-shape" :css="chart.animate !== false">
              <path v-if="item.path" :d="item.path" :fill="item.closed ? item.ink : 'none'" :stroke="item.ink"
                class="sy-chart__radar" vector-effect="non-scaling-stroke" />
            </Transition>
            <template v-for="(position, index) in item.points" :key="index">
              <circle v-if="position" :cx="position.x" :cy="position.y" :fill="item.ink"
                :r="index === active ? 4 : 2.5" class="sy-chart__point" />
            </template>
          </g>
          <g class="sy-chart__ticks">
            <template v-for="item in geometry.labels" :key="item.key">
              <path v-if="item.line" class="sy-chart__leader" :d="item.line" />
              <text :x="item.x" :y="item.y" :text-anchor="item.align ?? 'middle'">{{ item.text }}</text>
            </template>
          </g>
        </svg>
        <div v-if="center && !target.empty" class="sy-chart__center" aria-hidden="true">
          <slot name="center" :value="center.value" :label="center.label">
            <strong v-if="centerText"><SMotionText :value="centerText" motion="roll" /></strong>
            <span v-if="center.label">{{ center.label }}</span>
          </slot>
        </div>
      </template>
      <template v-if="$slots.legend" #legend="scope"><slot name="legend" v-bind="scope" /></template>
      <template v-if="$slots.tooltip" #tooltip="scope"><slot name="tooltip" v-bind="scope" /></template>
      <template v-if="$slots.empty" #empty><slot name="empty" /></template>
      <template v-if="$slots.data" #data="scope"><slot name="data" v-bind="scope" /></template>
    </SChartFrame>
  </div>
</template>
