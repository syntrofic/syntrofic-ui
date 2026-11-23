<script setup lang="ts">
import type { ChartIndicator } from '../charts/types'

withDefaults(defineProps<{ color?: string; variant?: ChartIndicator }>(), { variant: 'square' })
</script>

<template>
  <span v-if="variant !== 'none'" class="sy-chart__indicator" :data-indicator="variant" :style="{ '--sy-chart-ink': color }" aria-hidden="true" />
</template>
