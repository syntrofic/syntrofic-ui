<script setup lang="ts">
import { provide, useTemplateRef } from 'vue'
import type { ColorFormat, ColorSpace } from 'reka-ui'
import { colorContext, formatColor, useColorState, type ColorValue } from '../internal/color'
import { onFormReset } from '../internal/form-reset'
import SColorPickerPanel from '../internal/SColorPickerPanel.vue'
import SButton from './SButton.vue'
import SColorSwatch from './SColorSwatch.vue'
import SPopover from './SPopover.vue'
import type { ColorSwatchOption } from './SColorSwatchPicker.vue'

const props = withDefaults(defineProps<{
  label?: string
  triggerLabel?: string
  doneLabel?: string
  name?: string
  locale?: string
  format?: ColorFormat
  colorSpace?: ColorSpace
  defaultValue?: ColorValue
  colors?: readonly (ColorValue | ColorSwatchOption)[]
  areaLabel?: string
  sliderLabel?: string
  fieldLabel?: string
  alphaLabel?: string
  paletteLabel?: string
  inline?: boolean
  showAlpha?: boolean
  disabled?: boolean
}>(), { label: 'Choose color', doneLabel: 'Done', showAlpha: true, colorSpace: 'hsb' })
const model = defineModel<ColorValue | null>()
const open = defineModel<boolean>('open')
const initial = model.value
const state = useColorState(model, props, true)
provide(colorContext, state)
const native = useTemplateRef<HTMLInputElement>('native')
onFormReset(() => native.value, () => { model.value = initial })
</script>

<template>
  <div class="sy-color-picker">
    <div v-if="inline" class="sy-color-picker__panel" role="group" :aria-label="label">
      <slot :color="state.color.value" :set-color="state.set">
        <SColorPickerPanel
          :locale="locale" :format="format" :color-space="colorSpace" :show-alpha="showAlpha" :colors="colors"
          :area-label="areaLabel" :slider-label="sliderLabel" :field-label="fieldLabel" :alpha-label="alphaLabel" :palette-label="paletteLabel"
        />
      </slot>
    </div>
    <SPopover v-else v-model:open="open">
      <template #trigger>
        <slot name="trigger" :color="state.color.value" :disabled="disabled">
          <SButton variant="secondary" :aria-label="triggerLabel ?? label" :disabled="disabled">
            <template #start><SColorSwatch :color="state.empty.value ? null : state.color.value" size="xs" aria-hidden="true" /></template>
            {{ label }}
          </SButton>
        </slot>
      </template>
      <template #default="{ close }">
        <div class="sy-color-picker__panel">
          <slot :color="state.color.value" :set-color="state.set" :close="close">
            <SColorPickerPanel
              :locale="locale" :format="format" :color-space="colorSpace" :show-alpha="showAlpha" :colors="colors"
              :area-label="areaLabel" :slider-label="sliderLabel" :field-label="fieldLabel" :alpha-label="alphaLabel" :palette-label="paletteLabel"
            />
          </slot>
          <slot name="footer" :close="close"><SButton size="sm" class="sy-color-picker__done" @click="close">{{ doneLabel }}</SButton></slot>
        </div>
      </template>
    </SPopover>
    <input v-if="name" ref="native" type="hidden" :name="name" :disabled="disabled" :value="state.empty.value ? '' : formatColor(state.color.value)" />
  </div>
</template>
