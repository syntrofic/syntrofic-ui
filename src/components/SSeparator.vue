<script setup lang="ts">
withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  tone?: 'subtle' | 'strong'
  label?: string
  fullBleed?: boolean
}>(), {
  orientation: 'horizontal',
  tone: 'subtle',
})
</script>

<template>
  <div
    class="sy-separator"
    :data-orientation="orientation"
    :data-tone="tone"
    :data-labelled="Boolean(label || $slots.default) || undefined"
    :data-full-bleed="fullBleed && orientation === 'horizontal' || undefined"
    :role="decorative ? undefined : 'separator'"
    :aria-orientation="decorative ? undefined : orientation"
    :aria-label="decorative ? undefined : label"
    :aria-hidden="decorative || undefined"
  ><span v-if="label || $slots.default" class="sy-separator__label"><slot>{{ label }}</slot></span></div>
</template>
