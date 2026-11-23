<script setup lang="ts">
import { computed } from 'vue'
import { ListboxContent, ListboxItem, ListboxRoot, type AcceptableValue, type Color } from 'reka-ui'
import { formatColor, readColor, useColorState, type ColorValue } from '../internal/color'
import SColorSwatch from './SColorSwatch.vue'
import SFocusGroup from './SFocusGroup.vue'

export interface ColorSwatchOption {
  color: ColorValue
  label?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  colors: readonly (ColorValue | ColorSwatchOption)[]
  label?: string
  defaultValue?: ColorValue
  name?: string
  layout?: 'grid' | 'stack'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  shape?: 'circle' | 'square'
  dir?: 'ltr' | 'rtl'
  disabled?: boolean
}>(), { layout: 'grid', size: 'md', shape: 'circle' })
const emit = defineEmits<{ select: [value: Color] }>()
const model = defineModel<ColorValue | null>()
const state = useColorState(model, props)
const options = computed(() => {
  const seen = new Set<string>()
  return props.colors.flatMap(option => {
    const entry = typeof option === 'object' && 'color' in option ? option : { color: option }
    const color = readColor(entry.color)
    if (!color) return []
    const value = formatColor(color)
    if (seen.has(value)) return []
    seen.add(value)
    return [{ ...entry, color, value, label: entry.label ?? value }]
  })
})
const selected = computed(() => state.empty.value ? '' : formatColor(state.color.value))

function select(value: AcceptableValue | AcceptableValue[]) {
  const match = options.value.find(option => option.value === value)
  if (!match || match.disabled || state.disabled.value) return
  state.set(match.color)
  emit('select', match.color)
}
</script>

<template>
  <SFocusGroup class="sy-color-swatch-picker">
    <ListboxRoot
      :model-value="selected"
      :disabled="state.disabled.value"
      :orientation="layout === 'stack' ? 'vertical' : 'horizontal'"
      :dir="dir"
      :name="name"
      selection-behavior="replace"
      @update:model-value="select"
    >
      <ListboxContent class="sy-color-swatch-picker__items" :aria-label="label ?? 'Color palette'" :data-layout="layout">
        <ListboxItem
          v-for="option in options"
          :key="option.value"
          v-slot="{ selected: checked }"
          class="sy-color-swatch-picker__item"
          :value="option.value"
          :text-value="option.label"
          :aria-label="option.label"
          :aria-disabled="option.disabled || state.disabled.value || undefined"
          :disabled="option.disabled"
          data-sy-focus-target
        >
          <SColorSwatch :color="option.color" :shape="shape" :size="size" aria-hidden="true" />
          <span class="sy-color-swatch-picker__indicator" :data-checked="checked || undefined" aria-hidden="true">
            <slot name="indicator" :selected="checked" :color="option.color" />
          </span>
          <span v-if="layout === 'stack'" class="sy-color-swatch-picker__label">{{ option.label }}</span>
        </ListboxItem>
      </ListboxContent>
    </ListboxRoot>
  </SFocusGroup>
</template>
