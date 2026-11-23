<script setup lang="ts">
import ReviewExample from '../preview/ReviewExample.vue'
import '../preview/review.css'

defineProps<{ id: string }>()
</script>

<template>
  <ReviewExample :id="id" />
</template>
