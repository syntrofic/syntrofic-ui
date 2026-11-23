<script setup lang="ts">
defineProps<{ announce?: boolean }>()
</script>

<template>
  <p class="sy-field__error" :role="announce ? 'alert' : undefined"><slot /></p>
</template>
