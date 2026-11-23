<script setup lang="ts">
import { DropdownMenuItem } from 'reka-ui'
import { useId } from 'vue'
import SMenuItemContent from '../internal/SMenuItemContent.vue'

defineProps<{
  disabled?: boolean; textValue?: string; tone?: 'neutral' | 'danger'; asChild?: boolean
  label?: string; description?: string; icon?: string
}>()
const emit = defineEmits<{ select: [event: Event] }>()
const details = 'sy-menu-item-' + useId()
</script>

<template>
  <DropdownMenuItem
    class="sy-menu__item"
    :data-tone="tone"
    :disabled="disabled"
    :text-value="textValue ?? label"
    :aria-label="label"
    :aria-describedby="description && !$slots.default && !asChild ? details : undefined"
    :as-child="asChild"
    @select="emit('select', $event)"
  >
    <slot>
      <SMenuItemContent v-if="!asChild && (label || description || icon)" :label="label" :description="description" :icon="icon" :description-id="details">
        <slot name="end" />
      </SMenuItemContent>
    </slot>
  </DropdownMenuItem>
</template>
