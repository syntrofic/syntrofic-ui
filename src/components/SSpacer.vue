<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ size?: number; direction?: 'vertical' | 'horizontal' }>(), { size: 12, direction: 'vertical' })
const size = computed(() => Math.max(0, Number.isFinite(props.size) ? props.size : 0) + 'px')
</script>
<template>
  <span class="sy-spacer" aria-hidden="true" :data-direction="direction"
    :style="direction === 'vertical' ? { blockSize: size } : { inlineSize: size }" />
</template>
