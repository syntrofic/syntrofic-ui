<script setup lang="ts">
import SButton from './SButton.vue'
withDefaults(defineProps<{ label?: string }>(), { label: 'Close' })
</script>

<template>
  <SButton class="sy-close-button" variant="ghost" size="sm" :aria-label="label">
    <span class="sy-close-button__icon" aria-hidden="true">×</span>
  </SButton>
</template>
