<script setup lang="ts">
import type { AnnotationTone } from '../types'
import SIcon from './SIcon.vue'
import SInlineLabel from '../internal/SInlineLabel'

withDefaults(defineProps<{
  tone?: AnnotationTone
  label?: string
  icon?: string
  clickable?: boolean
  removable?: boolean
  selected?: boolean
  removeLabel?: string
  disabled?: boolean
}>(), { tone: 'neutral', selected: undefined })
const emit = defineEmits<{ activate: [event: MouseEvent]; remove: [event: MouseEvent] }>()
</script>

<template>
  <span class="sy-chip" :data-tone="tone" :data-selected="selected || undefined" :data-disabled="disabled || undefined"
    :data-removable="removable || undefined">
    <component :is="clickable ? 'button' : 'span'" class="sy-chip__body"
      v-bind="clickable ? { type: 'button', disabled, 'aria-pressed': selected } : {}" @click="clickable && emit('activate', $event)">
      <slot name="start"><SIcon v-if="icon" :name="icon" size="sm" /></slot>
      <SInlineLabel class="sy-chip__label" :text="label"><template v-if="$slots.default" #default><slot /></template></SInlineLabel>
      <slot name="end" />
    </component>
    <button
      v-if="removable"
      type="button"
      class="sy-chip__remove"
      :disabled="disabled"
      :aria-label="removeLabel ?? (label ? `Remove ${label}` : 'Remove tag')"
      @click.stop="emit('remove', $event)"
    ><SIcon name="close" /></button>
  </span>
</template>
