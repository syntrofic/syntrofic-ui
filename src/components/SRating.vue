<script setup lang="ts">
import SIcon from './SIcon.vue'
import { computed, ref, useTemplateRef } from 'vue'
import { onFormReset } from '../internal/form-reset'

const props = withDefaults(defineProps<{
  label?: string
  count?: number
  step?: number
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  readonly?: boolean
  clearable?: boolean
  name?: string
  form?: string
  formatValue?: (value: number, max: number) => string
}>(), { label: 'Rating', count: 5, step: 1, size: 'md' })
defineSlots<{
  glyph(props: { index: number; filled: boolean }): unknown
}>()
const value = defineModel<number>({ default: 0 })
const control = useTemplateRef<HTMLInputElement>('control')
const preview = ref<number>()
const maximum = computed(() => Number.isFinite(props.count) ? Math.max(1, Math.floor(props.count)) : 5)
const increment = computed(() => Number.isFinite(props.step) && props.step > 0 && props.step <= maximum.value ? props.step : 1)
const current = computed(() => Number.isFinite(value.value) ? Math.min(maximum.value, Math.max(0, value.value)) : 0)
const displayed = computed(() => props.readonly || props.disabled ? current.value : preview.value ?? current.value)
const accessibleValue = computed(() => props.formatValue?.(current.value, maximum.value) ?? `${current.value} / ${maximum.value}`)
const initial = value.value
onFormReset(() => control.value, () => {
  if (control.value) {
    preview.value = undefined
    control.value.value = String(initial)
    value.value = initial
  }
})

function updateFromInput(event: Event) {
  preview.value = undefined
  value.value = (event.target as HTMLInputElement).valueAsNumber
}

function pointerValue(event: MouseEvent, index: number) {
  const cell = event.currentTarget as HTMLElement
  const position = cell.getBoundingClientRect()
  const logical = getComputedStyle(cell).direction === 'rtl' ? position.right - event.clientX : event.clientX - position.left
  const proportion = Math.max(.000001, Math.min(1, logical / position.width))
  const rounded = Math.ceil((index - 1 + proportion) / increment.value - 1e-10) * increment.value
  return Math.min(maximum.value, Number(rounded.toPrecision(12)))
}

function showPreview(event: PointerEvent, index: number) {
  if (!props.disabled && !props.readonly && event.pointerType !== 'touch') preview.value = pointerValue(event, index)
}

function choose(event: MouseEvent, index: number) {
  if (props.disabled || props.readonly) return
  const next = pointerValue(event, index)
  value.value = props.clearable && current.value === next ? 0 : next
  preview.value = undefined
  control.value?.focus({ preventScroll: true })
}

function clear(event: KeyboardEvent) {
  if (!props.clearable || !['Delete', 'Backspace'].includes(event.key)) return
  event.preventDefault()
  value.value = 0
  preview.value = undefined
}
</script>

<template>
  <span class="sy-rating" :data-size="size" :data-interactive="!readonly && !disabled || undefined" :data-disabled="disabled || undefined">
    <input v-if="!readonly" ref="control" class="sy-visually-hidden sy-rating__input" type="range"
      :name="name" :form="form" :aria-label="label" :aria-valuetext="accessibleValue" :value="current"
      :max="maximum" :step="increment" :disabled="disabled" min="0" @input="updateFromInput" @keydown="clear">
    <template v-else>
      <input v-if="name" type="hidden" :name="name" :form="form" :value="current" :disabled="disabled">
      <span class="sy-visually-hidden">{{ label }}：{{ accessibleValue }}</span>
    </template>
    <span class="sy-rating__row" :data-preview="preview !== undefined || undefined" aria-hidden="true" @pointerleave="preview = undefined">
      <span v-for="index in maximum" :key="index" class="sy-rating__cell"
        :style="{ '--sy-rating-fill': Math.max(0, Math.min(1, displayed - index + 1)) * 100 + '%' }"
        @pointermove="showPreview($event, index)" @click="choose($event, index)">
        <span class="sy-rating__glyph"><slot name="glyph" :index="index" :filled="false"><SIcon name="star-outline" /></slot></span>
        <span class="sy-rating__glyph sy-rating__glyph--fill"><slot name="glyph" :index="index" :filled="true"><SIcon name="star" /></slot></span>
      </span>
    </span>
  </span>
</template>
