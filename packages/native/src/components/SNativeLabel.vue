<script setup lang="ts">
import SNativeText from './SNativeText.vue'

withDefaults(defineProps<{ text: string; required?: boolean; requiredLabel?: string }>(), { requiredLabel: 'required' })
const emit = defineEmits<{ tap: [] }>()
</script>

<template>
  <SNativeText
    :text="required ? `${text} *` : text"
    :accessibilityLabel="required ? `${text}, ${requiredLabel}` : text"
    emphasized
    @tap="emit('tap')"
  />
</template>
