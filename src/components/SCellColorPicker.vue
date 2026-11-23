<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import type { ColorFormat, ColorSpace } from 'reka-ui'
import { formatColor, readColor, type ColorValue } from '../internal/color'
import { onFormReset } from '../internal/form-reset'
import SButton from './SButton.vue'
import SColorPicker from './SColorPicker.vue'
import SColorSwatch from './SColorSwatch.vue'
import SMotionText from './SMotionText.vue'
import SPopover from './SPopover.vue'
import type { ColorSwatchOption } from './SColorSwatchPicker.vue'

const props = withDefaults(defineProps<{
  label: string
  name?: string
  form?: string
  disabled?: boolean
  colors?: readonly (ColorValue | ColorSwatchOption)[]
  format?: ColorFormat
  colorSpace?: ColorSpace
  showAlpha?: boolean
  locale?: string
  areaLabel?: string
  sliderLabel?: string
  fieldLabel?: string
  alphaLabel?: string
  paletteLabel?: string
  emptyLabel?: string
  cancelLabel?: string
  applyLabel?: string
  variant?: 'default' | 'secondary'
}>(), { variant: 'default', format: 'hex', emptyLabel: 'Unspecified', cancelLabel: 'Cancel', applyLabel: 'Apply', showAlpha: true })
const emit = defineEmits<{ commit: [value: ColorValue | null] }>()
const value = defineModel<ColorValue | null>()
const open = defineModel<boolean>('open', { default: false })
const id = useId()
const panel = useTemplateRef<HTMLDivElement>('panel')
const native = useTemplateRef<HTMLInputElement>('native')
const draft = ref<ColorValue | null>(value.value ?? null)
const initial = value.value
const swatch = computed(() => value.value == null ? undefined : readColor(value.value))
const serialized = computed(() => swatch.value ? formatColor(swatch.value) : '')
let start = ''

watch(open, showing => {
  if (showing && !props.disabled) {
    draft.value = value.value ?? null
    start = serialized.value
  }
}, { immediate: true, flush: 'sync' })
watch(() => props.disabled, disabled => {
  if (disabled) open.value = false
})
onFormReset(() => native.value, () => {
  open.value = false
  value.value = initial
})

function applyFromKeyboard(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229 || !(event.target as HTMLElement).matches('input[type=text]')) return
  const valid = !event.defaultPrevented
  event.preventDefault()
  event.stopPropagation()
  if (valid) apply()
}

function apply() {
  if (props.disabled) return
  const invalid = panel.value?.querySelector<HTMLInputElement>('input:invalid')
  if (invalid) {
    invalid.reportValidity()
    return
  }
  const next = draft.value == null ? undefined : readColor(draft.value)
  if ((next ? formatColor(next) : '') !== start) {
    value.value = draft.value
    emit('commit', draft.value)
  }
  open.value = false
}
</script>

<template>
  <div class="sy-settings-cell sy-cell-color" :data-variant="variant">
    <SPopover :open="open && !disabled" align="end" @update:open="open = Boolean($event)">
      <template #trigger>
        <button type="button" class="sy-cell-color__trigger" :disabled="disabled" :aria-labelledby="id" :aria-describedby="id + '-value'">
          <span :id="id" class="sy-settings-cell__label">{{ label }}</span>
          <span class="sy-cell-color__value">
            <SMotionText :id="id + '-value'" :value="swatch ? formatColor(swatch, format) : emptyLabel" />
            <SColorSwatch :color="swatch ?? null" size="xs" aria-hidden="true" />
          </span>
        </button>
      </template>
      <div ref="panel" class="sy-cell-color__panel" @keydown.enter="applyFromKeyboard">
        <SColorPicker v-model="draft" inline :label="label" :colors="colors" :format="format" :color-space="colorSpace"
          :show-alpha="showAlpha" :locale="locale" :area-label="areaLabel" :slider-label="sliderLabel" :field-label="fieldLabel"
          :alpha-label="alphaLabel" :palette-label="paletteLabel" />
        <div class="sy-cell-color__actions">
          <SButton size="sm" variant="secondary" @click="open = false">{{ cancelLabel }}</SButton>
          <SButton size="sm" @click="apply">{{ applyLabel }}</SButton>
        </div>
      </div>
    </SPopover>
    <input v-if="name" ref="native" type="hidden" :name="name" :form="form" :disabled="disabled" :value="serialized">
  </div>
</template>
