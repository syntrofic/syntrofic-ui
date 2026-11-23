<script setup lang="ts">
import SIcon from './SIcon.vue'
withDefaults(defineProps<{
  label?: string
  selectable?: boolean
  selected?: boolean
  removable?: boolean
  removeLabel?: string
  disabled?: boolean
}>(), { selectable: false })
const emit = defineEmits<{ toggle: []; remove: [] }>()
</script>

<template>
  <span class="sy-tag" :data-selected="selected || undefined">
    <button
      v-if="selectable"
      type="button"
      class="sy-tag__toggle"
      :aria-pressed="Boolean(selected)"
      :disabled="disabled"
      @click="emit('toggle')"
    ><slot>{{ label }}</slot></button>
    <span v-else class="sy-tag__label"><slot>{{ label }}</slot></span>
    <button
      v-if="removable"
      type="button"
      class="sy-tag__remove"
      :aria-label="removeLabel ?? (label ? `Remove ${label}` : 'Remove tag')"
      :disabled="disabled"
      @click="emit('remove')"
    ><SIcon name="close" /></button>
  </span>
</template>
