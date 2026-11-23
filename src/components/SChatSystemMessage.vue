<script setup lang="ts">
import { useId } from 'vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'

withDefaults(defineProps<{ text?: string; label?: string; icon?: string; announce?: boolean; variant?: 'default' | 'divider' }>(), { variant: 'default' })
const contentId = `sy-chat-system-${useId()}`
</script>

<template>
  <div class="sy-chat-system-message" :data-variant="variant" data-chat-anchor>
    <span v-if="variant === 'divider'" role="separator" :aria-label="label ?? ($slots.default ? undefined : text)"
      :aria-labelledby="label || !$slots.default && text ? undefined : contentId"
      class="sy-chat-system-message__separator" />
    <span v-if="variant === 'default' && ($slots.icon || icon)" class="sy-chat-system-message__icon" aria-hidden="true">
      <slot name="icon"><Transition name="sy-chat-control"><SIcon :key="icon" :name="icon" size="sm" /></Transition></slot>
    </span>
    <span :id="contentId" class="sy-chat-system-message__text" :aria-hidden="variant === 'divider' || undefined"
      :aria-live="variant === 'default' && announce && $slots.default ? 'polite' : undefined">
      <slot><SMotionText :value="text ?? ''" :announce="variant === 'default' && announce" wrap /></slot>
    </span>
  </div>
</template>
