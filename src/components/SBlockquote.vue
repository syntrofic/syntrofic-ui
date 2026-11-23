<script setup lang="ts">
defineProps<{ attribution?: string; cite?: string }>()
</script>

<template>
  <figure class="sy-blockquote">
    <blockquote :cite="cite"><slot /></blockquote>
    <figcaption v-if="attribution || $slots.attribution"><cite><slot name="attribution">{{ attribution }}</slot></cite></figcaption>
  </figure>
</template>
