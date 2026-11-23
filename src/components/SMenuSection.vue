<script setup lang="ts">
import { DropdownMenuGroup, DropdownMenuLabel } from 'reka-ui'

defineProps<{ label?: string }>()
</script>

<template>
  <DropdownMenuGroup class="sy-menu__section" :aria-label="label">
    <DropdownMenuLabel v-if="label || $slots.label" class="sy-collection-header"><slot name="label">{{ label }}</slot></DropdownMenuLabel>
    <slot />
  </DropdownMenuGroup>
</template>
