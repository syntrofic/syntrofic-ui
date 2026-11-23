<script setup lang="ts">
import SSlider from './SSlider.vue'
import SMotionText from './SMotionText.vue'

withDefaults(defineProps<{
  label: string
  name?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  locale?: string
  formatOptions?: Intl.NumberFormatOptions
  dir?: 'ltr' | 'rtl'
  variant?: 'default' | 'secondary'
}>(), { variant: 'default' })
defineSlots<{ value(props: { value: number; text: string }): unknown }>()
const emit = defineEmits<{ commit: [value: number] }>()
const model = defineModel<number>()
</script>

<template>
  <SSlider class="sy-settings-cell sy-cell-slider" :data-variant="variant" :model-value="model" :label="label"
    :name="name" :min="min" :max="max" :step="step" :disabled="disabled" :dir="dir"
    :locale="locale" :format-options="formatOptions"
    @update:model-value="model = Array.isArray($event) ? $event[0] : $event"
    @commit="emit('commit', Array.isArray($event) ? $event[0] : $event)">
    <template #value="{ text, values }">
      <slot name="value" :text="text" :value="values[0]"><SMotionText :value="text" motion="roll" /></slot>
    </template>
  </SSlider>
</template>
