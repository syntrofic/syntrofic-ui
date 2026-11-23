<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { measurementBounds } from '../internal/measurement'
import { onFormReset } from '../internal/form-reset'
import { prefersReducedMotion, themeTempo } from '../internal/motion'
import { decayRestDistance, solveSpring, springFromResponse } from '../internal/motion-physics'
import { useControlStatus, type FieldStatus } from '../internal/status-icon'
import SFieldStatus from './SFieldStatus.vue'
import SMotionText from './SMotionText.vue'

export interface SliderMark {
  value: number
  label?: string
}

const props = withDefaults(defineProps<{
  label?: string
  name?: string
  formatOptions?: Intl.NumberFormatOptions
  formatValue?: (value: number) => string
  locale?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
  dir?: 'ltr' | 'rtl'
  inverted?: boolean
  minStepsBetweenThumbs?: number
  marks?: readonly SliderMark[]
  showSteps?: boolean
  showValue?: boolean
  thumbLabels?: readonly string[]
  coast?: boolean
  status?: FieldStatus
}>(), { step: 1, orientation: 'horizontal', dir: 'ltr', showValue: true })
const emit = defineEmits<{ commit: [value: number | number[]] }>()
const model = defineModel<number | number[]>()
const initial = Array.isArray(model.value) ? [...model.value] : model.value
const root = useTemplateRef<HTMLDivElement>('field')
const labelId = `sy-slider-${useId()}`
const { id: statusId, status, statusIcon, variant, attrs: thumbStatus } = useControlStatus(() => props.status, () => ({}))
const bounds = computed(() => measurementBounds(props.min, props.max))
const stepSize = computed(() => Number.isFinite(props.step) && props.step > 0 ? props.step : 1)
const sliding = ref(false)
const pressed = ref<number>()
const releaseSpring = springFromResponse({ response: .4, dampingRatio: 1 })
let pointer: { id: number; initial: number; position: number; time: number; velocity: number } | undefined
let release: { velocity: number; node: HTMLElement } | undefined
let stop: (() => void) | undefined
let expected: number | undefined
const formatter = computed(() => new Intl.NumberFormat(props.locale ?? 'en', props.formatOptions))
const values = computed(() => {
  const { lower, upper } = bounds.value
  const source = Array.isArray(model.value) && model.value.length ? model.value : [model.value ?? lower]
  return source.map(value => typeof value === 'number' && Number.isFinite(value) ? Math.min(upper, Math.max(lower, value)) : lower).sort((a, b) => a - b)
})
function format(value: number) { return props.formatValue?.(value) ?? formatter.value.format(value) }
const display = computed(() => values.value.map(format).join(' – '))
const visibleMarks = computed(() => (props.marks ?? []).filter(mark => (
  Number.isFinite(mark.value) && mark.value >= bounds.value.lower && mark.value <= bounds.value.upper
)))
const steps = computed(() => {
  const { lower, upper } = bounds.value
  const count = Math.floor((upper - lower) / stepSize.value + 1e-8) + 1
  return props.showSteps && count <= 1000
    ? Array.from({ length: count }, (_, index) => Number((lower + index * stepSize.value).toPrecision(14)))
    : []
})

function point(value: number) {
  const ratio = (value - bounds.value.lower) / (bounds.value.upper - bounds.value.lower)
  const reversed = props.orientation === 'vertical' ? !props.inverted : (props.dir === 'rtl') !== props.inverted
  return `${(reversed ? 1 - ratio : ratio) * 100}%`
}

function isFilled(value: number) {
  const start = values.value.length === 1 ? bounds.value.lower : values.value[0]
  return value >= start && value <= values.value[values.value.length - 1]
}

function unwrap(value: number[]) {
  return Array.isArray(model.value) ? value : value[0]
}

const coordinate = (event: PointerEvent) => props.orientation === 'vertical' ? event.clientY : event.clientX
function down(event: PointerEvent) {
  if (stop) finish(true)
  sliding.value = !props.disabled
  if (props.disabled) return
  const thumb = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-thumb-index]') : undefined
  pressed.value = thumb ? Number(thumb.dataset.thumbIndex) : undefined
  release = undefined
  if (props.coast && thumb && !Array.isArray(model.value) && event.isPrimary) {
    const at = coordinate(event)
    pointer = { id: event.pointerId, initial: at, position: at, time: event.timeStamp, velocity: 0 }
  }
}
function move(event: PointerEvent) {
  if (!pointer || pointer.id !== event.pointerId) return
  const next = coordinate(event)
  const elapsed = Math.max(1, event.timeStamp - pointer.time)
  const distance = next - pointer.position
  if (distance) {
    pointer.velocity = distance / elapsed
    pointer.position = next
    pointer.time = event.timeStamp
  }
}
function up(event: PointerEvent) {
  const drag = pointer
  pointer = undefined
  pressed.value = undefined
  sliding.value = Boolean(stop)
  if (!drag || event.type !== 'pointerup' || drag.id !== event.pointerId || Math.abs(drag.position - drag.initial) < 8
    || event.timeStamp - drag.time > 95 || props.disabled) return
  const node = event.currentTarget as HTMLElement
  if (prefersReducedMotion(node)) return
  const rect = node.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return
  const span = props.orientation === 'vertical' ? rect.height : rect.width
  const reverse = props.orientation === 'vertical' ? !props.inverted : (props.dir === 'rtl') !== props.inverted
  const velocity = drag.velocity * (reverse ? -1 : 1) * (bounds.value.upper - bounds.value.lower) * 1000 / Math.max(1, span)
  if (Number.isFinite(velocity)) {
    const request = { velocity, node }
    release = request
    node.ownerDocument.defaultView?.setTimeout(() => { if (release === request) release = undefined }, 0)
  }
}
function finish(commit = false) {
  stop?.()
  stop = undefined
  expected = undefined
  sliding.value = false
  if (commit && typeof model.value === 'number') emit('commit', model.value)
}
function quantize(value: number) {
  const { lower, upper } = bounds.value
  const stepped = lower + Math.round((value - lower) / stepSize.value) * stepSize.value
  return Number(Math.max(lower, Math.min(upper, stepped)).toPrecision(14))
}
function commit(next: number[]) {
  const value = unwrap(next)
  const cleared = release
  release = undefined
  const view = cleared?.node.ownerDocument.defaultView
  if (typeof value !== 'number' || !cleared || !view) { emit('commit', value); return }
  const target = quantize(value + decayRestDistance(cleared.velocity, .996) * .4)
  if (target === value) { emit('commit', value); return }
  const velocity = Math.sign(target - value) * Math.min(Math.abs(cleared.velocity), Math.abs(target - value) * 15)
  const curve = solveSpring({ from: value, to: target, velocity, spring: releaseSpring })
  const duration = Math.min(.9, curve.settleTime(stepSize.value / 5))
  const tempo = themeTempo(cleared.node)
  const started = view.performance.now()
  let frame = view.requestAnimationFrame(tick)
  stop = () => view.cancelAnimationFrame(frame)
  sliding.value = true
  expected = value
  function tick(time: number) {
    const elapsed = (time - started) / (1000 * tempo)
    const complete = elapsed >= duration
    expected = complete ? target : quantize(curve.value(elapsed))
    if (model.value !== expected) model.value = expected
    if (complete) { finish(); emit('commit', target) }
    else frame = view!.requestAnimationFrame(tick)
  }
}
watch(model, value => { if (stop && value !== expected) finish() })
watch(() => props.disabled, disabled => { if (disabled) finish() })
onBeforeUnmount(() => finish())
onFormReset(() => root.value?.querySelector('input') ?? null, () => { finish(); model.value = initial })
</script>

<template>
  <div ref="field" class="sy-slider-field" :data-orientation="orientation" :data-disabled="disabled || undefined" :data-status="status?.type">
    <div v-if="label || $slots.label || showValue || statusIcon" class="sy-measure__caption">
      <span :id="labelId"><slot name="label">{{ label }}</slot></span>
      <component v-if="statusIcon" :is="statusIcon" />
      <span v-if="showValue" class="sy-measure__value" aria-hidden="true">
        <slot name="value" :text="display" :values="values"><SMotionText :value="display" motion="roll" /></slot>
      </span>
    </div>
    <div class="sy-slider-field__rail">
      <SliderRoot
        class="sy-slider"
        :model-value="values"
        :name="name"
        :min="bounds.lower"
        :max="bounds.upper"
        :step="stepSize"
        :min-steps-between-thumbs="minStepsBetweenThumbs"
        :disabled="disabled"
        :orientation="orientation"
        :dir="dir"
        :inverted="inverted"
        :data-sliding="sliding || undefined"
        thumb-alignment="overflow"
        @pointerdown.left.capture="down"
        @pointermove.capture="move"
        @pointerup.capture="up"
        @pointercancel.capture="up"
        @lostpointercapture="up"
        @update:model-value="$event && (model = unwrap($event))"
        @value-commit="commit"
      >
        <SliderTrack class="sy-slider__track">
          <SliderRange class="sy-slider__fill" />
          <span
            v-for="value in steps"
            :key="value"
            class="sy-slider__step"
            :data-filled="isFilled(value) || undefined"
            :style="{ '--sy-slider-point': point(value) }"
            aria-hidden="true"
          />
        </SliderTrack>
        <SliderThumb
          v-for="(value, index) in values"
          :key="index"
          class="sy-slider__thumb"
          :data-thumb-index="index"
          :data-pointer-pressed="pressed === index || undefined"
          :aria-label="thumbLabels?.[index]"
          :aria-labelledby="!thumbLabels?.[index] && (label || $slots.label) ? labelId : undefined"
          :aria-valuetext="format(value)"
          :aria-disabled="disabled || undefined"
          v-bind="thumbStatus()"
        />
      </SliderRoot>
      <span v-if="visibleMarks.length" class="sy-slider__marks" aria-hidden="true">
        <span
          v-for="(mark, index) in visibleMarks"
          :key="index"
          class="sy-slider__mark"
          :style="{ '--sy-slider-point': point(mark.value) }"
          :data-filled="isFilled(mark.value) || undefined"
        >{{ mark.label ?? format(mark.value) }}</span>
      </span>
    </div>
    <Transition name="sy-standard-expand">
      <div v-if="status?.message && variant !== 'tooltip'" class="sy-slider-field__status" :inert="!status?.message">
        <div><SFieldStatus v-bind="status" :id="statusId" /></div>
      </div>
    </Transition>
  </div>
</template>
