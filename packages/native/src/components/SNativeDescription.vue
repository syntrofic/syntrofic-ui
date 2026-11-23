<script setup lang="ts">
import SNativeText from './SNativeText.vue'

defineProps<{ text: string }>()
</script>

<template>
  <SNativeText :text="text" tone="muted" />
</template>
