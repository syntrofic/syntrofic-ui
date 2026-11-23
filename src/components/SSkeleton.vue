<script setup lang="ts">
import { computed } from 'vue'
import { layoutSize, type LayoutSize } from '../internal/layout-spacing'

const props = withDefaults(defineProps<{
  loading?: boolean
  shape?: 'line' | 'block' | 'circle'
  width?: LayoutSize
  height?: LayoutSize
  radius?: 'none' | 'rounded' | 0 | 1 | 2 | 3 | 4
  index?: number
  animated?: boolean
}>(), { loading: true, shape: 'block', index: 0, animated: true })
const radii = { none: '0px', rounded: '999px', 0: '0px', 1: 'calc(var(--sy-radius-sm) * .5)',
  2: 'var(--sy-radius-sm)', 3: 'var(--sy-radius-md)', 4: 'var(--sy-radius-lg)' }
const style = computed(() => ({
  '--sy-skeleton-width': layoutSize(props.width),
  '--sy-skeleton-height': layoutSize(props.height),
  '--sy-skeleton-radius': props.radius === undefined ? undefined : radii[props.radius],
  '--sy-skeleton-index': Number.isFinite(props.index) ? Math.min(20, Math.max(0, Math.floor(props.index))) : 0,
}))
</script>

<template>
  <div
    class="sy-skeleton"
    :data-loading="loading || undefined"
    :data-shape="shape"
    :data-animated="animated || undefined"
    :aria-busy="loading || undefined"
    :style="style"
  >
    <div v-if="$slots.default" class="sy-skeleton__content" :inert="loading || undefined"><slot /></div>
    <span class="sy-skeleton__cover" aria-hidden="true"></span>
  </div>
</template>
