<script setup lang="ts">
import { computed, provide } from 'vue'
import { createToastManager, ToastProvider, type GlobalToastManager } from 'reka-ui'
import SToastViewport from '../internal/SToastViewport.vue'
import { toastQueueContext } from '../internal/toast-context'
import type { LayerInset } from '../internal/layer-context'

const props = withDefaults(defineProps<{
  queue?: GlobalToastManager
  label?: string
  viewportLabel?: string
  dismissLabel?: string
  duration?: number
  maxVisible?: number
  placement?: 'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end'
  hotkey?: string[]
  expanded?: boolean
  disableSwipe?: boolean
  inset?: LayerInset
  topLayer?: boolean
}>(), {
  label: 'Notification',
  viewportLabel: 'Notifications ({hotkey})',
  maxVisible: 3,
  placement: 'bottom',
})
const limit = computed(() => props.maxVisible === 0 ? Infinity : Number.isFinite(props.maxVisible) ? Math.max(1, Math.floor(props.maxVisible)) : 3)
const localQueue = createToastManager()
const activeQueue = computed(() => props.queue ?? localQueue)
provide(toastQueueContext, activeQueue)
const swipeDirection = computed(() => props.placement.endsWith('-start') ? 'left' : props.placement.endsWith('-end') ? 'right'
  : props.placement === 'top' ? 'up' : 'down')
</script>

<template>
  <ToastProvider
    :toast-manager="activeQueue"
    :label="label"
    :duration="duration"
    :limit="limit"
    :swipe-direction="swipeDirection"
    :disable-swipe="disableSwipe"
  >
    <slot />
    <SToastViewport
      :placement="placement"
      :viewport-label="viewportLabel"
      :dismiss-label="dismissLabel"
      :max-visible="limit"
      :hotkey="hotkey"
      :expanded="expanded"
      :inset="inset"
      :top-layer="topLayer"
    />
  </ToastProvider>
</template>
