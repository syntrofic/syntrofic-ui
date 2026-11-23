<script setup lang="ts">
import { computed } from 'vue'
import { layoutDimensions, layoutSize, type LayoutDimensions, type LayoutSize } from '../internal/layout-spacing'

const props = withDefaults(defineProps<LayoutDimensions & {
  as?: string
  columns?: number | string
  minColumnWidth?: LayoutSize
  gap?: LayoutSize
  rowGap?: LayoutSize
  columnGap?: LayoutSize
  rowHeight?: number
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'stretch'
}>(), { as: 'div' })
const columns = computed(() => {
  const minimum = layoutSize(props.minColumnWidth)
  if (minimum) return 'repeat(auto-fit, minmax(min(100%, ' + minimum + '), 1fr))'
  if (typeof props.columns === 'string') return props.columns
  const count = Number.isFinite(props.columns) ? Math.max(1, Math.floor(props.columns!)) : 1
  return 'repeat(' + count + ', minmax(0, 1fr))'
})
const style = computed(() => ({
  ...layoutDimensions(props), '--sy-grid-columns': columns.value,
  rowGap: layoutSize(props.rowGap ?? props.gap), columnGap: layoutSize(props.columnGap ?? props.gap),
  gridAutoRows: layoutSize(props.rowHeight), alignItems: props.align, justifyItems: props.justify,
}))
</script>

<template>
  <component :is="as" class="sy-grid" :style="style"><slot /></component>
</template>
