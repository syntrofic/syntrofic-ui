<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ as?: string; columns?: number | 'all' | 'full'; rows?: number }>(), { as: 'div' })
const span = (value?: number) => Number.isFinite(value) && value! > 0 ? 'span ' + Math.max(1, Math.floor(value!)) : undefined
const style = computed(() => ({
  gridColumn: typeof props.columns === 'string' ? '1 / -1' : span(props.columns),
  gridRow: span(props.rows),
}))
</script>

<template>
  <component :is="as" class="sy-grid-span" :style="style"><slot /></component>
</template>
