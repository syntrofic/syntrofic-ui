<script setup lang="ts">
import SIcon from '../components/SIcon.vue'

defineProps<{ label?: string; description?: string; icon?: string; descriptionId: string }>()
</script>

<template>
  <SIcon v-if="icon" :name="icon" size="sm" />
  <span class="sy-menu__copy">
    <span v-if="label">{{ label }}</span>
    <small v-if="description" :id="descriptionId">{{ description }}</small>
  </span>
  <slot />
</template>
