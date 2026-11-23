<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  shade?: 'default' | 'on-media' | 'onMedia' | 'subtle' | 'inherit'
  showLabel?: boolean
  decorative?: boolean
}>(), { label: 'Loading', size: 'md', shade: 'inherit' })
</script>

<template>
  <span class="sy-spinner" :data-size="size" :data-shade="shade === 'onMedia' ? 'on-media' : shade"
    :data-labelled="showLabel || Boolean($slots.default) || undefined"
    :role="decorative ? undefined : 'status'" :aria-label="decorative ? undefined : label" :aria-hidden="decorative || undefined">
    <span class="sy-spinner__ring" aria-hidden="true"></span>
    <span v-if="showLabel || $slots.default" class="sy-spinner__label"><slot>{{ label }}</slot></span>
    <span v-else-if="!decorative" class="sy-visually-hidden">{{ label }}</span>
  </span>
</template>
