<script setup lang="ts">
import { computed, ref, toRef, useTemplateRef } from 'vue'
import { colorToRgb, getAreaBackgroundStyle, getChannelRange, useLocale, type Color, type ColorChannel, type ColorSpace } from 'reka-ui'
import { channelLabel, colorInSpace, readChannel, useColorState, writeChannel, type ColorValue } from '../internal/color'
import { onFormReset } from '../internal/form-reset'

const props = withDefaults(defineProps<{
  label?: string
  locale?: string
  defaultValue?: ColorValue
  colorSpace?: ColorSpace
  xChannel?: ColorChannel
  yChannel?: ColorChannel
  xLabel?: string
  yLabel?: string
  xName?: string
  yName?: string
  disabled?: boolean
}>(), { colorSpace: 'hsb' })
const emit = defineEmits<{ commit: [value: Color] }>()
const model = defineModel<ColorValue | null>()
const initial = model.value
const state = useColorState(model, props)
const resolvedLocale = useLocale(toRef(props, 'locale'))
const board = useTemplateRef<HTMLDivElement>('board')
const xInput = useTemplateRef<HTMLInputElement>('xInput')
const dragging = ref<number>()
const active = computed(() => colorInSpace(state.color.value, props.colorSpace))
const xChannel = computed<ColorChannel>(() => props.xChannel ?? (props.colorSpace === 'rgb' ? 'red' : 'saturation'))
const yChannel = computed<ColorChannel>(() => props.yChannel ?? (props.colorSpace === 'rgb' ? 'green' : props.colorSpace === 'hsl' ? 'lightness' : 'brightness'))
const xRange = computed(() => getChannelRange(xChannel.value))
const yRange = computed(() => getChannelRange(yChannel.value))
const xValue = computed(() => readChannel(active.value, xChannel.value))
const yValue = computed(() => readChannel(active.value, yChannel.value))
const thumb = computed(() => ({
  '--sy-color-x': `${(xValue.value - xRange.value.min) / (xRange.value.max - xRange.value.min) * 100}%`,
  '--sy-color-y': `${(1 - (yValue.value - yRange.value.min) / (yRange.value.max - yRange.value.min)) * 100}%`,
  '--sy-color-value': colorToRgb(active.value),
}))
const background = computed(() => getAreaBackgroundStyle(active.value, xChannel.value, yChannel.value, props.colorSpace))

function choose(x: number, y: number) {
  if (state.disabled.value) return
  const xColor = writeChannel(active.value, xChannel.value, x)
  state.set(writeChannel(xColor, yChannel.value, y))
}

function locate(event: PointerEvent) {
  const bounds = board.value?.getBoundingClientRect()
  if (!bounds?.width || !bounds.height) return
  const within = (ratio: number) => Math.min(1, Math.max(0, ratio))
  choose(
    xRange.value.min + within((event.clientX - bounds.left) / bounds.width) * (xRange.value.max - xRange.value.min),
    yRange.value.min + within((bounds.bottom - event.clientY) / bounds.height) * (yRange.value.max - yRange.value.min),
  )
}

function start(event: PointerEvent) {
  if (state.disabled.value || dragging.value !== undefined || !event.isPrimary || event.button !== 0) return
  dragging.value = event.pointerId
  board.value?.setPointerCapture(event.pointerId)
  xInput.value?.focus({ preventScroll: true })
  locate(event)
}

function move(event: PointerEvent) {
  if (event.pointerId === dragging.value) locate(event)
}

function end(event: PointerEvent) {
  if (event.pointerId !== dragging.value) return
  dragging.value = undefined
  if (event.type === 'pointerup') {
    locate(event)
    emit('commit', state.color.value)
  }
}

function keys(event: KeyboardEvent, axis: 'x' | 'y') {
  const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
  const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown'
  const boundary = event.key === 'Home' || event.key === 'End'
  if (state.disabled.value || !(horizontal || vertical || boundary)) return
  event.preventDefault()
  const useX = horizontal || (boundary && axis === 'x')
  const range = useX ? xRange.value : yRange.value
  const current = useX ? xValue.value : yValue.value
  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1
  const next = boundary ? event.key === 'Home' ? range.min : range.max
    : Math.max(range.min, Math.min(range.max, Math.round(current) + direction * range.step * (event.shiftKey ? 10 : 1)))
  choose(useX ? next : xValue.value, useX ? yValue.value : next)
  emit('commit', state.color.value)
}

function moveInput(event: Event, axis: 'x' | 'y') {
  const value = Number((event.target as HTMLInputElement).value)
  choose(axis === 'x' ? value : xValue.value, axis === 'y' ? value : yValue.value)
}
onFormReset(() => xInput.value, () => { model.value = initial })
</script>

<template>
  <div class="sy-color-area" :role="label ? 'group' : undefined" :aria-label="label" :data-disabled="state.disabled.value || undefined">
    <div
      ref="board"
      class="sy-color-area__board"
      :data-dragging="dragging !== undefined || undefined"
      :style="thumb"
      @pointerdown="start"
      @pointermove="move"
      @pointerup="end"
      @pointercancel="end"
      @lostpointercapture="end"
    >
      <div class="sy-color-area__spectrum" :style="background" aria-hidden="true" />
      <input
        ref="xInput"
        class="sy-visually-hidden"
        type="range"
        :aria-label="xLabel ?? channelLabel(xChannel, resolvedLocale)"
        :name="xName"
        :value="xValue"
        :min="xRange.min"
        :max="xRange.max"
        :step="xRange.step"
        :tabindex="state.disabled.value ? -1 : 0"
        :disabled="state.disabled.value"
        @keydown="keys($event, 'x')"
        @input="moveInput($event, 'x')"
        @change="emit('commit', state.color.value)"
      />
      <input
        class="sy-visually-hidden"
        type="range"
        orient="vertical"
        :aria-label="yLabel ?? channelLabel(yChannel, resolvedLocale)"
        :name="yName"
        :value="yValue"
        :min="yRange.min"
        :max="yRange.max"
        :step="yRange.step"
        :tabindex="state.disabled.value ? -1 : 0"
        :disabled="state.disabled.value"
        @keydown="keys($event, 'y')"
        @input="moveInput($event, 'y')"
        @change="emit('commit', state.color.value)"
      />
      <span class="sy-color-area__thumb" aria-hidden="true" />
    </div>
  </div>
</template>
