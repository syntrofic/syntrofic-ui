<script setup lang="ts">
import { computed, provide, useId } from 'vue'
import { layoutDimensions, layoutPadding, layoutPaddingContext, type LayoutDimensions, type LayoutPadding } from '../internal/layout-spacing'
import SSurface from './SSurface.vue'

const props = defineProps<LayoutDimensions & LayoutPadding & {
  title?: string
  description?: string
  tone?: 'neutral' | 'muted' | 'sage' | 'blue'
  variant?: 'section' | 'transparent' | 'muted'
  bordered?: boolean
  dividers?: readonly ('top' | 'bottom' | 'start' | 'end')[]
}>()
const id = useId()
const insets = computed(() => layoutPadding({ ...props, padding: props.padding ?? 'var(--sy-inset)' }))
const styles = computed(() => ({ ...layoutDimensions(props), ...insets.value }))
provide(layoutPaddingContext, insets)
</script>

<template>
  <SSurface as="section" :tone="tone ?? (variant === 'muted' ? 'muted' : 'neutral')" :bordered="bordered" class="sy-section"
    :data-variant="variant" :data-dividers="dividers?.join(' ')" :style="styles" :aria-labelledby="title ? id : undefined">
    <header v-if="title || description || $slots.header || $slots.actions">
      <div :id="title ? id : undefined"><slot name="header"><h2 v-if="title">{{ title }}</h2><p v-if="description">{{ description }}</p></slot></div>
      <slot name="actions" />
    </header>
    <slot />
    <footer v-if="$slots.footer"><slot name="footer" /></footer>
  </SSurface>
</template>
