<script setup lang="ts">
withDefaults(defineProps<{ as?: string; revealOnFocus?: boolean }>(), { as: 'span' })
</script>

<template>
  <component :is="as" :class="revealOnFocus ? 'sy-focus-reveal' : 'sy-visually-hidden'"><slot /></component>
</template>
