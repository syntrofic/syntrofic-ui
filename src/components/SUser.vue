<script setup lang="ts">
import SAvatar from './SAvatar.vue'
defineProps<{ name: string; description?: string; src?: string; size?: 'sm' | 'md' | 'lg' }>()
</script>
<template>
  <span class="sy-user">
    <SAvatar :src="src" :name="name" alt="" :size="size" />
    <span class="sy-user__text"><strong>{{ name }}</strong><small v-if="description">{{ description }}</small></span>
  </span>
</template>
