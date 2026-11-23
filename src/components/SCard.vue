<script lang="ts">
import type { LayoutDimensions, LayoutSize } from '../internal/layout-spacing'
import type { ButtonElevation } from '../types'

export type CardVariant = 'default' | 'transparent' | 'muted' | 'blue' | 'cyan' | 'gray' | 'green'
  | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow'
export interface CardAppearance extends LayoutDimensions {
  padding?: LayoutSize
  variant?: CardVariant
  elevation?: ButtonElevation
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { layoutDimensions, layoutPadding } from '../internal/layout-spacing'

const props = withDefaults(defineProps<CardAppearance>(), { variant: 'default', elevation: 'none' })
const style = computed(() => ({
  ...layoutDimensions(props),
  '--sy-card-padding': props.padding === undefined ? undefined : layoutPadding(props).paddingInlineStart,
}))
</script>

<template>
  <div class="sy-card" :data-variant="variant" :data-elevation="elevation" :style="style">
    <div v-if="$slots.header" class="sy-card__header"><slot name="header" /></div>
    <div v-if="$slots.default" class="sy-card__body"><slot /></div>
    <div v-if="$slots.footer" class="sy-card__footer"><slot name="footer" /></div>
  </div>
</template>
