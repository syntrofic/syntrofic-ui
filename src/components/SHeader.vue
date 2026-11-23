<script setup lang="ts">
withDefaults(defineProps<{ as?: 'div' | 'p' | 'header' | 'h2' | 'h3' | 'h4' }>(), { as: 'div' })
</script>

<template>
  <component :is="as" class="sy-collection-header"><slot /></component>
</template>
