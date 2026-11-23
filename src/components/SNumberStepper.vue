<script setup lang="ts">
import { computed, ref } from 'vue'
import SNumberField from './SNumberField.vue'
import SMotionText from './SMotionText.vue'
import type { TextControlProps } from '../internal/field'
import type { ButtonSize } from '../types'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & {
  name?: string
  min?: number
  max?: number
  step?: number
  startingValue?: number
  stepSnapping?: boolean
  allowInvalid?: boolean
  readonly?: boolean
  locale?: string
  formatOptions?: Intl.NumberFormatOptions
  allowWheel?: boolean
  decreaseLabel?: string
  increaseLabel?: string
  size?: ButtonSize
  reserve?: number
  reversed?: boolean
  emptyText?: string
}>(), { size: 'md', reserve: 6, stepSnapping: true, emptyText: '–' })
defineSlots<{
  value(props: { value: number | undefined; text: string }): unknown
  decrement(): unknown
  increment(): unknown
}>()
const value = defineModel<number>()
const reserve = computed(() => Number.isFinite(props.reserve) ? Math.max(1, props.reserve) : 6)
const editing = ref(false)

function stepOnPress(event: PointerEvent) {
  if ((event.target as Element | null)?.closest('.sy-field-action')) editing.value = false
}

function stepOnKey(event: KeyboardEvent) {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) editing.value = false
}
</script>

<template>
  <div class="sy-number-stepper" :data-size="size" :data-reversed="reversed || undefined" :data-editing="editing || undefined"
    :style="{ '--sy-stepper-digits': reserve + 'ch' }" @pointerdown.capture="stepOnPress">
    <SNumberField v-model="value" v-bind="$attrs" :id="id" :name="name" :label="label" :description="description" :error="error"
      :disabled="disabled" :required="required" :readonly="readonly" :min="min" :max="max" :step="step"
      :starting-value="startingValue" :step-snapping="stepSnapping" :allow-invalid="allowInvalid"
      :locale="locale" :format-options="formatOptions" :allow-wheel="allowWheel" :focus-on-change="false"
      :decrease-label="decreaseLabel" :increase-label="increaseLabel"
      @beforeinput="editing = true" @pointerdown="editing = true" @keydown="stepOnKey" @blur="editing = false">
      <template #decrement><slot name="decrement">−</slot></template>
      <template #increment><slot name="increment">+</slot></template>
      <template #display="{ text }">
        <slot name="value" :value="value" :text="text"><SMotionText :value="text || emptyText" motion="roll" /></slot>
      </template>
    </SNumberField>
  </div>
</template>
