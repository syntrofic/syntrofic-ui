<script setup lang="ts">
import SIcon from './SIcon.vue'

defineProps<{ icon?: string; label?: string }>()
</script>

<template>
  <span class="sy-nav-icon" :role="label ? 'img' : undefined" :aria-label="label" :aria-hidden="label ? undefined : true">
    <slot><SIcon :name="icon" /></slot>
  </span>
</template>
