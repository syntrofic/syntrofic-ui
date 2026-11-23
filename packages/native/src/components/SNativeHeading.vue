<script setup lang="ts">
import { computed } from 'nativescript-vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{ text: string; level?: 1 | 2 | 3 | 4; tone?: 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'danger'; wrap?: boolean }>(),
  { level: 2, wrap: true })
const size = computed(() => props.level === 1 ? 'headline' : props.level === 4 ? 'body' : 'title')
</script>

<template>
  <SNativeText :text="text" :size="size" :tone="tone" :wrap="wrap" heading />
</template>
