<script setup lang="ts">
import { type GridLayout, type TouchGestureEventData } from '@nativescript/core'
import { cancelAnimationFrame, requestAnimationFrame } from '@nativescript/core/animation-frame'
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { lockGestureScroll } from '../scroll-gesture'
import { nativeNumberFormat } from '../text-platform'
import {
  sliderDomain, sliderGap, sliderIndexAt, sliderPositions, sliderRatios, sliderThumbAt, sliderThumbBounds, sliderValueAt,
  type NativeSliderMark, type NativeSliderValue,
} from '../slider-state'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativeSliderAdjuster from './SNativeSliderAdjuster.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  label: string
  description?: string
  min?: number
  max?: number
  step?: number
  orientation?: 'horizontal' | 'vertical'
  inverted?: boolean
  trackLength?: number
  disabled?: boolean
  marks?: readonly NativeSliderMark[]
  showSteps?: boolean
  showValue?: boolean
  locale?: string
  formatOptions?: Intl.NumberFormatOptions
  thumbLabels?: readonly string[]
  minStepsBetweenThumbs?: number
}>(), { min: 0, max: 100, step: 1, orientation: 'horizontal', trackLength: 160, showValue: true, minStepsBetweenThumbs: 0 })

const value = defineModel<NativeSliderValue>()
const emit = defineEmits<{ change: [value: NativeSliderValue]; commit: [value: NativeSliderValue] }>()
const { theme, direction, reducedMotion } = useNativeUI()
const host = useTemplateRef<{ nativeView: GridLayout }>('host')
const domain = computed(() => sliderDomain(props.min, props.max, props.step))
const positions = computed(() => sliderPositions(domain.value, value.value, props.minStepsBetweenThumbs))
const ratios = computed(() => sliderRatios(domain.value, positions.value))
const display = computed(() => positions.value.map(index => sliderValueAt(domain.value, index)))
const vertical = computed(() => props.orientation === 'vertical')
const reverse = computed(() => vertical.value ? !props.inverted : (direction.value === 'rtl') !== props.inverted)
const blocked = computed(() => props.disabled || !domain.value.last)
const gap = computed(() => sliderGap(domain.value, positions.value.length, props.minStepsBetweenThumbs))
const bounds = computed(() => positions.value.map((_, index) => sliderThumbBounds(positions.value, index, domain.value.last, gap.value)))
const formatter = computed(() => nativeNumberFormat(props.locale, props.formatOptions))
const outputSize = computed(() => {
  const { min, max, step } = domain.value
  const samples = [min, max, min + step, max - step].filter(point => point >= min && point <= max)
  return Math.max(...samples.map(point => Array.from(formatter.value.format(point)).length))
})
const markPositions = computed(() => (props.marks ?? []).filter(mark =>
  Number.isFinite(mark.value) && mark.value >= domain.value.min && mark.value <= domain.value.max,
).map(mark => ({ ...mark, ratio: domain.value.span ? (mark.value - domain.value.min) / domain.value.span : 0 })))
const stepPositions = computed(() => props.showSteps && domain.value.last <= 40
  ? sliderRatios(domain.value, Array.from({ length: domain.value.last + 1 }, (_, index) => index)) : [])
const trackHeight = computed(() => vertical.value ? Math.max(88, Number.isFinite(props.trackLength) ? props.trackLength : 160)
  : markPositions.value.length ? 64 : 44)
const targetSize = 44
const center = targetSize / 2
const knob = 18
const rail = 6
const length = ref(0)
const drawing = shallowRef(ratios.value)
const focused = ref<number>()
const pressed = ref<number>()
const mounted = ref(false)
let frame: number | undefined
let releaseScroll: (() => void) | undefined
let gesture: { from: number; offset: number; index?: number; changed?: NativeSliderValue } | undefined

const travel = computed(() => Math.max(0, length.value - targetSize))
const pixels = computed(() => drawing.value.map(point))
const fill = computed(() => {
  const a = pixels.value.length === 1 ? point(0) : pixels.value[0]
  const b = pixels.value[pixels.value.length - 1]
  return { start: Math.min(a, b), length: Math.abs(a - b) }
})

function point(ratio: number) {
  return center + (reverse.value ? 1 - ratio : ratio) * travel.value
}

function measure() {
  const size = host.value?.nativeView.getActualSize()
  length.value = (vertical.value ? size?.height : size?.width) ?? 0
}

function stopAnimation() {
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = undefined
}

watch([ratios, reducedMotion, mounted], ([next]) => {
  stopAnimation()
  const previous = drawing.value
  if (gesture || !mounted.value || reducedMotion.value || previous.length !== next.length) {
    drawing.value = next
    return
  }
  if (next.every((position, index) => position === previous[index])) return
  const duration = Math.max(1, theme.value.motion.duration)
  let start: number | undefined
  function animate(time: number) {
    start ??= time
    const ratio = Math.min(1, (time - start) / duration)
    const progress = 1 - (1 - ratio) ** 3
    drawing.value = next.map((position, index) => previous[index] + (position - previous[index]) * progress)
    frame = ratio < 1 ? requestAnimationFrame(animate) : undefined
  }
  frame = requestAnimationFrame(animate)
})

function setPosition(index: number, tick: number) {
  const bound = bounds.value[index]
  if (blocked.value || !bound) return
  const next = Math.max(bound.min, Math.min(bound.max, tick))
  if (positions.value[index] === next) return
  const result = display.value.slice()
  result[index] = sliderValueAt(domain.value, next)
  const updated = Array.isArray(value.value) ? result : result[0]
  value.value = updated
  emit('change', updated)
  return updated
}

function adjust(index: number, tick: number) {
  const updated = setPosition(index, tick)
  if (updated !== undefined) emit('commit', updated)
}


function finish() {
  const updated = gesture?.changed
  gesture = undefined
  pressed.value = undefined
  releaseScroll?.()
  releaseScroll = undefined
  if (updated !== undefined) emit('commit', updated)
}

function touch(event: TouchGestureEventData) {
  if (event.action === 'cancel' || event.getPointerCount() > 1) return finish()
  const coordinate = vertical.value ? event.getY() : event.getX()
  if (blocked.value || !travel.value || !Number.isFinite(coordinate)) return
  if (event.action === 'down') {
    if (gesture) return
    const closest = sliderThumbAt(pixels.value, coordinate)
    const difference = coordinate - pixels.value[closest]
    const overlap = pixels.value.filter(pixel => Math.abs(pixel - pixels.value[closest]) < 0.5).length > 1
    const captured = Math.abs(difference) <= knob / 2
    gesture = { from: coordinate, offset: captured ? difference : 0, index: overlap && captured ? undefined : closest }
    pressed.value = gesture.index
    releaseScroll = lockGestureScroll(event)
    return
  }
  if (!gesture) return
  if (event.action !== 'move' && event.action !== 'up') return
  const delta = coordinate - gesture.from
  if (gesture.index === undefined && Math.abs(delta) >= 1) {
    const movement = reverse.value ? -delta : delta
    const current = ratios.value.map(ratio => ratio * travel.value + center)
    const start = reverse.value ? length.value - gesture.from : gesture.from
    gesture.index = sliderThumbAt(current, start + movement, movement)
    pressed.value = gesture.index
  }
  if (gesture.index !== undefined) {
    const physical = (coordinate - gesture.offset - center) / travel.value
    const ratio = Math.max(0, Math.min(1, reverse.value ? 1 - physical : physical))
    const tick = sliderIndexAt(domain.value, domain.value.min + ratio * domain.value.span)
    const updated = setPosition(gesture.index, tick)
    if (updated !== undefined) gesture.changed = updated
  }
  if (event.action === 'up') finish()
}

function focus(index: number, active: boolean) {
  if (active) focused.value = index
  else if (focused.value === index) focused.value = undefined
}

function unload() {
  mounted.value = false
  finish()
  stopAnimation()
}

watch([blocked, vertical, reverse], finish)
onBeforeUnmount(unload)
</script>

<template>
  <StackLayout :opacity="blocked ? 0.55 : 1">
    <GridLayout :columns="direction === 'rtl' ? 'auto,*' : '*,auto'" direction="ltr">
      <StackLayout :col="direction === 'rtl' ? 1 : 0">
        <slot name="label">
          <SNativeText :text="label" emphasized :accessibilityHidden="true" />
        </slot>
      </StackLayout>
      <StackLayout v-if="showValue" :col="direction === 'rtl' ? 0 : 1" :accessibilityHidden="true">
        <slot name="value" :values="display">
          <StackLayout orientation="horizontal" direction="ltr">
            <StackLayout v-for="(number, index) in display" :key="index" orientation="horizontal">
              <SNativeText v-if="index" text="–" tone="muted" marginLeft="4" marginRight="4" />
              <GridLayout :width="Math.ceil(outputSize * 12.5)">
                <SNativeMotionText :value="formatter.format(number)" :reserve="outputSize" :size="14" horizontalAlignment="right" />
              </GridLayout>
            </StackLayout>
          </StackLayout>
        </slot>
      </StackLayout>
    </GridLayout>
    <GridLayout
      ref="host"
      :height="trackHeight"
      direction="ltr"
      @loaded="mounted = true; measure()"
      @layoutChanged="measure"
      @unloaded="unload"
    >
      <AbsoluteLayout :accessibilityHidden="true" :isUserInteractionEnabled="false">
        <ContentView
          :width="vertical ? rail : travel"
          :height="vertical ? travel : rail"
          :translateX="vertical ? center - rail / 2 : center"
          :translateY="vertical ? center : center - rail / 2"
          :borderRadius="rail / 2"
          :backgroundColor="theme.colors.surfaceMuted"
        />
        <ContentView
          :width="vertical ? rail : fill.length"
          :height="vertical ? fill.length : rail"
          :translateX="vertical ? center - rail / 2 : fill.start"
          :translateY="vertical ? fill.start : center - rail / 2"
          :borderRadius="rail / 2"
          :backgroundColor="theme.colors.accent"
        />
        <ContentView
          v-for="(ratio, index) in stepPositions"
          :key="index"
          :width="2"
          :height="2"
          :translateX="vertical ? center - 1 : point(ratio) - 1"
          :translateY="vertical ? point(ratio) - 1 : center - 1"
          :borderRadius="1"
          :backgroundColor="ratio >= (ratios.length > 1 ? ratios[0] : 0) && ratio <= ratios[ratios.length - 1] ? theme.colors.accentOn : theme.colors.textMuted"
        />
        <Label
          v-for="(mark, index) in markPositions"
          :key="index"
          :text="mark.label ?? formatter.format(mark.value)"
          :width="vertical ? undefined : 44"
          :textAlignment="vertical ? 'left' : 'center'"
          :translateX="vertical ? targetSize : point(mark.ratio) - center"
          :translateY="vertical ? point(mark.ratio) - 9 : 42"
          :color="theme.colors.textMuted"
          :fontSize="11"
        />
        <GridLayout
          v-for="(pixel, index) in pixels"
          :key="'thumb-' + index"
          :width="targetSize"
          :height="targetSize"
          :translateX="vertical ? 0 : pixel - center"
          :translateY="vertical ? pixel - center : 0"
        >
          <ContentView
            :width="knob"
            :height="knob"
            :borderRadius="knob / 2"
            :borderWidth="2"
            :borderColor="focused === index || pressed === index ? theme.colors.focus : theme.colors.accent"
            :backgroundColor="theme.colors.canvas"
            horizontalAlignment="center"
            verticalAlignment="center"
          />
        </GridLayout>
      </AbsoluteLayout>
      <AbsoluteLayout>
        <SNativeSliderAdjuster
          v-for="(position, index) in positions"
          :key="index"
          :width="targetSize"
          :height="targetSize"
          :translateX="vertical ? 0 : pixels[index] - center"
          :translateY="vertical ? pixels[index] - center : 0"
          :label="thumbLabels?.[index] ?? (positions.length > 1 ? `${label} ${index + 1}` : label)"
          :valueText="formatter.format(display[index])"
          :hint="description"
          :position="position"
          :lower="bounds[index].min"
          :upper="bounds[index].max"
          :vertical="vertical"
          :reverse="reverse"
          :disabled="blocked || bounds[index].min === bounds[index].max"
          @adjust="adjust(index, $event)"
          @focus="focus(index, $event)"
        />
      </AbsoluteLayout>
      <ContentView
        :width="vertical ? targetSize : undefined"
        :height="vertical ? undefined : targetSize"
        :horizontalAlignment="vertical ? 'left' : 'stretch'"
        :verticalAlignment="vertical ? 'stretch' : 'top'"
        :isUserInteractionEnabled="!blocked"
        :accessibilityHidden="true"
        backgroundColor="transparent"
        @touch="touch"
      />
    </GridLayout>
  </StackLayout>
</template>
