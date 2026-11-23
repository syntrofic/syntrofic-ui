<script lang="ts">
export type ChatDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error'
</script>

<script setup lang="ts">
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'

defineProps<{
  timestamp?: string | number
  datetime?: string
  status?: ChatDeliveryStatus
  statusLabels?: Partial<Record<ChatDeliveryStatus, string>>
  sender?: 'assistant' | 'user'
}>()
const labels: Record<ChatDeliveryStatus, string> = { sending: 'Sending', sent: 'Sent', delivered: 'Delivered', read: 'Read', error: 'Failed to send' }
const icons: Record<ChatDeliveryStatus, string> = { sending: 'clock', sent: 'check', delivered: 'checkDouble', read: 'checkDouble', error: 'error' }
</script>

<template>
  <div v-if="timestamp !== undefined && timestamp !== '' || datetime || status || $slots.timestamp || $slots.footer" class="sy-chat-metadata" :data-sender="sender">
    <span v-if="timestamp !== undefined && timestamp !== '' || datetime || $slots.timestamp" class="sy-chat-metadata__item">
      <slot name="timestamp"><time :datetime="datetime"><SMotionText :value="String(timestamp ?? datetime ?? '')" motion="roll" /></time></slot>
    </span>
    <span v-if="$slots.footer" class="sy-chat-metadata__item"><slot name="footer" /></span>
    <span v-if="status" class="sy-chat-metadata__item" :data-status="status">
      <span class="sy-chat-metadata__icon" aria-hidden="true">
        <Transition name="sy-chat-control"><SIcon :key="icons[status]" :name="icons[status]" size=".9em" /></Transition>
      </span>
      <SMotionText :value="statusLabels?.[status] ?? labels[status]" />
    </span>
  </div>
</template>
