<script setup lang="ts">
import { computed } from 'vue'
import { colorToRgb } from 'reka-ui'
import { formatColor, readColor, type ColorValue } from '../internal/color'

const props = withDefaults(defineProps<{
  color?: ColorValue | null
  label?: string
  shape?: 'circle' | 'square'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  emptyLabel?: string
}>(), { shape: 'square', size: 'md', emptyLabel: 'No color' })
const value = computed(() => readColor(props.color))
const label = computed(() => props.label ?? (value.value ? formatColor(value.value) : props.emptyLabel))
</script>

<template>
  <span
    class="sy-color-swatch"
    role="img"
    :aria-label="label"
    :data-shape="shape"
    :data-size="size"
    :data-empty="!value || undefined"
    :data-transparent="(value?.alpha ?? 0) < 1 || undefined"
    :style="{ '--sy-swatch-color': value ? colorToRgb(value) : 'transparent' }"
  ><span aria-hidden="true"><slot :color="value" /></span></span>
</template>
