<script setup lang="ts">
import SIcon from './SIcon.vue'
import SButton from './SButton.vue'
withDefaults(defineProps<{ label?: string }>(), { label: 'Close' })
</script>

<template>
  <SButton class="sy-close-button" variant="ghost" size="sm" :aria-label="label">
    <SIcon class="sy-close-button__icon" name="close" />
  </SButton>
</template>
