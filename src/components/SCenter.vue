<script setup lang="ts">
import { computed } from 'vue'
import { layoutDimensions, type LayoutDimensions } from '../internal/layout-spacing'

const props = withDefaults(defineProps<LayoutDimensions & {
  as?: string; mode?: 'horizontal' | 'vertical' | 'both'; inline?: boolean
}>(), { as: 'div', mode: 'both' })
const style = computed(() => layoutDimensions(props))
</script>

<template>
  <component :is="as" class="sy-center" :style="style" :data-mode="mode" :data-inline="inline || undefined"><slot /></component>
</template>
