<script setup lang="ts">
import STooltip from './STooltip.vue'

withDefaults(defineProps<{
  label?: string
  tooltip?: string
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  pulse?: boolean
}>(), { tone: 'neutral' })
</script>

<template>
  <STooltip v-if="tooltip" :text="tooltip">
    <template #trigger>
      <span class="sy-status-dot" :data-tone="tone" :data-pulse="pulse || undefined" tabindex="0"
        role="img" :aria-label="label || tooltip"><slot /></span>
    </template>
  </STooltip>
  <span v-else class="sy-status-dot" :data-tone="tone" :data-pulse="pulse || undefined"
    :role="label ? 'img' : undefined" :aria-label="label" :aria-hidden="label ? undefined : true"><slot /></span>
</template>
