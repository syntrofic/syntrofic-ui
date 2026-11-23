<script setup lang="ts">
import { computed, ref, toRef, useTemplateRef } from 'vue'
import { SliderRoot, SliderThumb, SliderTrack, colorToRgb, getChannelRange, useDirection, useLocale, type Color, type ColorChannel, type ColorSpace } from 'reka-ui'
import { channelLabel, channelSpace, colorInSpace, readChannel, useColorState, writeChannel, type ColorValue } from '../internal/color'
import { onFormReset } from '../internal/form-reset'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{
  channel: ColorChannel
  label?: string
  locale?: string
  defaultValue?: ColorValue
  colorSpace?: ColorSpace
  name?: string
  orientation?: 'horizontal' | 'vertical'
  dir?: 'ltr' | 'rtl'
  inverted?: boolean
  disabled?: boolean
  step?: number
  showValue?: boolean
}>(), { orientation: 'horizontal', showValue: true })
const emit = defineEmits<{ commit: [value: Color] }>()
const model = defineModel<ColorValue | null>()
const initial = model.value
const state = useColorState(model, props)
const root = useTemplateRef<HTMLDivElement>('slider')
const dragging = ref(false)
const resolvedLocale = useLocale(toRef(props, 'locale'))
const direction = useDirection(toRef(props, 'dir'))
const label = computed(() => props.label ?? channelLabel(props.channel, resolvedLocale.value))
const active = computed(() => colorInSpace(state.color.value, props.colorSpace ?? channelSpace(props.channel)))
const range = computed(() => getChannelRange(props.channel))
const value = computed(() => readChannel(active.value, props.channel))
const step = computed(() => typeof props.step === 'number' && Number.isFinite(props.step) && props.step > 0 ? props.step : range.value.step)
const display = computed(() => {
  const text = new Intl.NumberFormat(resolvedLocale.value, { maximumFractionDigits: 1 }).format(value.value)
  if (props.channel === 'hue') return text + '°'
  return ['saturation', 'lightness', 'brightness', 'alpha'].includes(props.channel) ? text + '%' : text
})
const stops = computed(() => {
  if (props.channel === 'hue') return [0, 60, 120, 180, 240, 300, 360].map(hue => `hsl(${hue} 86% 50%)`)
  const color = active.value
  const first = writeChannel(color, props.channel, range.value.min)
  const last = writeChannel(color, props.channel, range.value.max)
  return [colorToRgb(first), colorToRgb(last)]
})
const styles = computed(() => {
  const reverse = props.orientation === 'horizontal' ? (direction.value === 'rtl') !== props.inverted : props.inverted
  const rampDirection = props.orientation === 'horizontal' ? reverse ? 'left' : 'right' : reverse ? 'bottom' : 'top'
  return {
    '--sy-channel-ramp': `linear-gradient(to ${rampDirection}, ${stops.value.join(', ')})`,
    '--sy-color-thumb': colorToRgb(active.value),
  }
})

function change(values?: number[]) {
  if (values?.length) state.set(writeChannel(active.value, props.channel, values[0]))
}
onFormReset(() => root.value?.querySelector('input') ?? null, () => { model.value = initial })
</script>

<template>
  <div ref="slider" class="sy-color-slider" :data-orientation="orientation" :data-disabled="state.disabled.value || undefined" :style="styles">
    <div class="sy-measure__caption">
      <span>{{ label }}</span>
      <span v-if="showValue" class="sy-measure__value" aria-hidden="true"><SMotionText :value="display" motion="roll" /></span>
    </div>
    <SliderRoot
      class="sy-slider sy-color-slider__control"
      :model-value="[value]"
      :name="name"
      :orientation="orientation"
      :dir="direction"
      :inverted="inverted"
      :disabled="state.disabled.value"
      :min="range.min"
      :max="range.max"
      :step="step"
      :data-sliding="dragging || undefined"
      thumb-alignment="overflow"
      @update:model-value="change"
      @value-commit="emit('commit', state.color.value)"
      @pointerdown.left="dragging = !state.disabled.value"
      @pointerup="dragging = false"
      @pointercancel="dragging = false"
      @lostpointercapture="dragging = false"
    >
      <SliderTrack class="sy-slider__track sy-color-slider__ramp" :data-alpha="channel === 'alpha' || undefined" />
      <SliderThumb class="sy-slider__thumb sy-color-slider__thumb" :aria-label="label" :aria-valuetext="display" :aria-disabled="state.disabled.value || undefined" />
    </SliderRoot>
  </div>
</template>
