<script setup lang="ts">
import { ContextMenuItem } from 'reka-ui'
import { useId } from 'vue'
import SMenuItemContent from '../internal/SMenuItemContent.vue'

defineProps<{
  disabled?: boolean; textValue?: string; tone?: 'neutral' | 'danger'; asChild?: boolean
  label?: string; description?: string; icon?: string
}>()
const emit = defineEmits<{ select: [event: Event] }>()
const details = 'sy-context-item-' + useId()
</script>

<template>
  <ContextMenuItem class="sy-menu__item" :disabled="disabled" :text-value="textValue ?? label" :data-tone="tone" :as-child="asChild"
    :aria-label="label" :aria-describedby="description && !$slots.default && !asChild ? details : undefined" @select="emit('select', $event)">
    <slot>
      <SMenuItemContent v-if="!asChild && (label || description || icon)" :label="label" :description="description" :icon="icon" :description-id="details">
        <slot name="end" />
      </SMenuItemContent>
    </slot>
  </ContextMenuItem>
</template>
