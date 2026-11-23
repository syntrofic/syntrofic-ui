<script setup lang="ts">
import SMotionText from './SMotionText.vue'

withDefaults(defineProps<{
  variant?: 'filled' | 'ghost'
  group?: 'first' | 'middle' | 'last'
  name?: string
  width?: number | string
}>(), { variant: 'filled' })
</script>

<template>
  <div class="sy-chat-message-bubble" :data-variant="variant" :data-group="group"
    :style="{ inlineSize: typeof width === 'number' ? Math.max(0, width) + 'px' : width }">
    <div v-if="name || $slots.name" class="sy-chat-message-bubble__name">
      <slot name="name"><SMotionText :value="name ?? ''" wrap /></slot>
    </div>
    <div class="sy-chat-message-bubble__body"><slot /></div>
    <div v-if="$slots.metadata" class="sy-chat-message-bubble__metadata"><slot name="metadata" /></div>
  </div>
</template>
