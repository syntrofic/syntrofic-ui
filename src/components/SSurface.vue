<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'div' | 'section' | 'article' | 'aside' | 'main'
  tone?: 'neutral' | 'muted' | 'sage' | 'blue'
  bordered?: boolean
}>(), { as: 'div', tone: 'neutral' })
</script>

<template>
  <component :is="as" class="sy-surface" :data-tone="tone" :data-bordered="bordered || undefined"><slot /></component>
</template>
