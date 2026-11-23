<script setup lang="ts">
import type { ColorFormat, ColorSpace } from 'reka-ui'
import SColorArea from '../components/SColorArea.vue'
import SColorField from '../components/SColorField.vue'
import SColorSlider from '../components/SColorSlider.vue'
import SColorSwatchPicker, { type ColorSwatchOption } from '../components/SColorSwatchPicker.vue'
import type { ColorValue } from './color'

defineProps<{
  locale?: string
  format?: ColorFormat
  colorSpace?: ColorSpace
  showAlpha?: boolean
  colors?: readonly (ColorValue | ColorSwatchOption)[]
  areaLabel?: string
  sliderLabel?: string
  fieldLabel?: string
  alphaLabel?: string
  paletteLabel?: string
}>()
</script>

<template>
  <SColorArea :label="areaLabel" :locale="locale" :color-space="colorSpace" />
  <SColorSlider :channel="colorSpace === 'rgb' ? 'blue' : 'hue'" :label="sliderLabel" :color-space="colorSpace" :locale="locale" />
  <SColorSlider v-if="showAlpha" channel="alpha" :label="alphaLabel" :color-space="colorSpace" :locale="locale" />
  <SColorField :label="fieldLabel ?? 'Color code'" :format="format" :locale="locale" required />
  <SColorSwatchPicker v-if="colors?.length" :colors="colors" :label="paletteLabel" size="sm" />
</template>
