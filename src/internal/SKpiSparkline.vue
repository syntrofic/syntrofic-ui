<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'vue'
import SMotionText from '../components/SMotionText.vue'
import { sparkPoints, sparkSegments, type KpiDatum, type SparkPoint } from './kpi'
import { useReducedMotion } from './reduced-motion'

const props = withDefaults(defineProps<{
  data: readonly KpiDatum[]
  label: string
  locale?: string | string[]
  formatOptions?: Intl.NumberFormatOptions
  missingLabel?: string
  connectNulls?: boolean
  inspect?: boolean
  fade?: number
}>(), { locale: 'en', missingLabel: 'No data', inspect: true, fade: 0 })
defineSlots<{ tooltip(props: { point: SparkPoint; text: string }): unknown }>()

const plot = useTemplateRef<HTMLDivElement>('plot')
const reducedMotion = useReducedMotion(plot)
const points = computed(() => sparkPoints(props.data))
const painted = shallowRef(points.value)
const lastSample = computed(() => points.value.reduce((index, point) => point.value === null ? index : point.index, -1))
const interactive = computed(() => props.inspect && lastSample.value >= 0)
const active = ref<number>()
const focused = ref(false)
const activePoint = computed(() => interactive.value && active.value !== undefined ? points.value[active.value] : undefined)
const activeMark = computed(() => activePoint.value && painted.value[activePoint.value.index])
const defaultIndex = computed(() => Math.max(0, activePoint.value?.index ?? lastSample.value))
const formatter = computed(() => new Intl.NumberFormat(props.locale, props.formatOptions))
const segments = computed(() => sparkSegments(painted.value, props.connectNulls))
const path = computed(() => segments.value.filter(part => part.length > 1).map(part =>
  part.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(' ')).join(' '))
const singletons = computed(() => segments.value.filter(part => part.length === 1).map(part => part[0]))
const shape = computed(() => `${props.connectNulls}-${painted.value.map(point => point.value === null ? '0' : '1').join('')}`)
const fadeWidth = computed(() => Number.isFinite(props.fade) ? `${Math.min(45, Math.max(0, props.fade))}%` : '0%')
let frame: number | undefined
let animationView: Window | null = null

function text(point: SparkPoint) {
  const label = point.label ?? formatter.value.format(point.index + 1)
  const value = point.value === null ? props.missingLabel : formatter.value.format(point.value)
  return `${label} · ${value}`
}

function mark(point: SparkPoint) {
  return { '--sy-spark-x': `${point.x}%`, '--sy-spark-y': `${point.y}%` }
}

function selectAt(event: PointerEvent) {
  if (!interactive.value || !plot.value) return
  if (event.pointerType === 'touch' && event.type !== 'pointerup') return
  const rect = plot.value.getBoundingClientRect()
  if (!rect.width) return
  const position = (event.clientX - rect.left) / rect.width
  const logical = plot.value.ownerDocument.defaultView?.getComputedStyle(plot.value).direction === 'rtl' ? 1 - position : position
  const fraction = Math.max(0, Math.min(1, (logical - .04) / .92))
  if (event.pointerType === 'touch') plot.value.focus({ preventScroll: true })
  active.value = Math.round(fraction * (points.value.length - 1))
}

function keydown(event: KeyboardEvent) {
  if (!interactive.value || !plot.value) return
  const rtl = plot.value.ownerDocument.defaultView?.getComputedStyle(plot.value).direction === 'rtl'
  const last = points.value.length - 1
  const index = defaultIndex.value
  if (event.key === 'ArrowRight') active.value = Math.max(0, Math.min(last, index + (rtl ? -1 : 1)))
  else if (event.key === 'ArrowLeft') active.value = Math.max(0, Math.min(last, index + (rtl ? 1 : -1)))
  else if (event.key === 'ArrowUp') active.value = Math.min(last, index + 1)
  else if (event.key === 'ArrowDown') active.value = Math.max(0, index - 1)
  else if (event.key === 'Home') active.value = 0
  else if (event.key === 'End') active.value = last
  else if (event.key === 'Escape' && activePoint.value) {
    active.value = undefined
    event.stopPropagation()
  } else return
  event.preventDefault()
}

function focus() {
  focused.value = true
  if (interactive.value) active.value ??= defaultIndex.value
}

function blur() {
  focused.value = false
  active.value = undefined
}

function cancelMotion() {
  if (frame !== undefined) animationView?.cancelAnimationFrame(frame)
  frame = undefined
}

watch(points, next => {
  cancelMotion()
  const previous = painted.value
  animationView = plot.value?.ownerDocument.defaultView ?? null
  if (active.value !== undefined) active.value = next.length ? Math.min(active.value, next.length - 1) : undefined
  if (!animationView || previous.length !== next.length ||
    next.some((point, at) => (point.value === null) !== (previous[at].value === null)) ||
    reducedMotion.value ||
    next.every((point, at) => point.y === previous[at].y)) {
    painted.value = next
    return
  }
  const view = animationView
  const start = view.performance.now()
  function animate(time: number) {
    const linear = Math.min(1, Math.max(0, (time - start) / 245))
    const position = 1 - (1 - linear) ** 3
    painted.value = linear === 1 ? next : next.map((point, at) => ({
      ...point, y: previous[at].y + (point.y - previous[at].y) * position,
    }))
    frame = linear < 1 ? view.requestAnimationFrame(animate) : undefined
  }
  frame = view.requestAnimationFrame(animate)
})

watch(reducedMotion, reduced => {
  if (!reduced) return
  cancelMotion()
  painted.value = points.value
})
onBeforeUnmount(cancelMotion)
</script>

<template>
  <div class="sy-kpi-sparkline" :data-inspect="interactive || undefined" :style="{ '--sy-spark-fade': fadeWidth }">
    <div ref="plot" class="sy-kpi-sparkline__plot" :data-empty="lastSample < 0 || undefined"
      :role="interactive ? 'slider' : 'img'" :tabindex="interactive ? 0 : undefined"
      :aria-label="lastSample < 0 ? `${label} · ${missingLabel}` : label"
      :aria-valuemin="interactive ? 1 : undefined" :aria-valuemax="interactive ? points.length : undefined"
      :aria-valuenow="interactive ? defaultIndex + 1 : undefined"
      :aria-valuetext="interactive && points[defaultIndex] ? text(points[defaultIndex]) : undefined"
      @pointermove="selectAt" @pointerup="selectAt"
      @pointerleave="!focused && (active = undefined)" @focus="focus" @blur="blur" @keydown="keydown">
      <div class="sy-kpi-sparkline__art" aria-hidden="true">
        <Transition name="sy-spark-shape">
          <div :key="shape" class="sy-kpi-sparkline__series">
            <svg v-if="path" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
              <path :d="path" vector-effect="non-scaling-stroke" />
            </svg>
            <span v-for="point in singletons" :key="point.index" class="sy-kpi-sparkline__dot" :style="mark(point)" />
          </div>
        </Transition>
      </div>
      <span v-if="lastSample < 0" class="sy-kpi-sparkline__empty" aria-hidden="true">{{ missingLabel }}</span>
      <Transition name="sy-spark-mark">
        <span v-if="activeMark" class="sy-kpi-sparkline__mark" :data-gap="activeMark.value === null || undefined"
          :style="mark(activeMark)" aria-hidden="true">
          <span class="sy-kpi-sparkline__dot" />
        </span>
      </Transition>
    </div>
    <div v-if="inspect" class="sy-kpi-sparkline__readout" aria-hidden="true">
      <Transition name="sy-spark-readout">
        <span v-if="activePoint" class="sy-kpi-sparkline__text">
          <slot name="tooltip" :point="activePoint" :text="text(activePoint)"><SMotionText :value="text(activePoint)" /></slot>
        </span>
      </Transition>
    </div>
  </div>
</template>
