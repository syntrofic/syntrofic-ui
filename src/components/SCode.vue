<script setup lang="ts">
defineProps<{ tone?: 'neutral' | 'accent' | 'danger' }>()
</script>
<template><code class="sy-inline-code" :data-tone="tone"><slot /></code></template>
