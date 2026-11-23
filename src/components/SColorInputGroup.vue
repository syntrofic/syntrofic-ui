<script setup lang="ts">
import SInputGroup from './SInputGroup.vue'

defineProps<{ invalid?: boolean; disabled?: boolean }>()
</script>

<template>
  <SInputGroup class="sy-color-input-group" :data-invalid="invalid || undefined" :data-disabled="disabled || undefined">
    <template v-if="$slots.start" #start><slot name="start" /></template>
    <slot />
    <template v-if="$slots.end" #end><slot name="end" /></template>
  </SInputGroup>
</template>
