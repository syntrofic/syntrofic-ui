<script setup lang="ts">
import { ListboxGroup, ListboxGroupLabel } from 'reka-ui'
defineProps<{ label?: string }>()
</script>

<template>
  <ListboxGroup class="sy-collection__section">
    <ListboxGroupLabel v-if="label || $slots.label" class="sy-collection-header"><slot name="label">{{ label }}</slot></ListboxGroupLabel>
    <slot />
  </ListboxGroup>
</template>
