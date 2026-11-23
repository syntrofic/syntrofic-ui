<script setup lang="ts">
import SIcon from './SIcon.vue'
import { computed } from 'vue'
import { ToastAction, ToastClose, ToastDescription, ToastRoot, ToastTitle } from 'reka-ui'
import type { ToastActionOptions, ToastObject } from 'reka-ui'
import SButton from './SButton.vue'
import SSpinner from './SSpinner.vue'
import SMotionText from './SMotionText.vue'
import { toastContent, type ToastContent } from '../internal/toast-context'

const props = withDefaults(defineProps<{
  toast?: ToastObject
  title?: string
  description?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'loading'
  duration?: number
  dismissLabel?: string
  dismissible?: boolean
  action?: ToastActionOptions
  priority?: 'foreground' | 'background'
}>(), { dismissLabel: 'Dismiss notification', dismissible: true })

const open = defineModel<boolean>('open', { default: true })
const tone = computed(() => {
  if (props.tone) return props.tone
  const status = props.toast?.status
  if (status === 'error' || status === 'danger') return 'danger'
  return status === 'success' || status === 'warning' || status === 'loading' ? status : 'neutral'
})
const title = computed(() => props.title ?? props.toast?.title ?? '')
const description = computed(() => props.description ?? props.toast?.description)
const content = computed<ToastContent | undefined>(() => props.toast?.data?.[toastContent])
const Custom = () => content.value?.custom?.()
const Body = () => content.value?.body
const End = () => content.value?.endContent
function markManual() { content.value?.markManual() }
const type = computed(() => props.priority ?? (tone.value === 'danger' || tone.value === 'warning' ? 'foreground' : 'background'))
</script>

<template>
  <ToastRoot
    v-slot="timing"
    v-model:open="open"
    :toast="toast"
    :duration="tone === 'loading' ? 0 : duration"
    :type="type"
    class="sy-toast"
    :data-tone="tone"
    @swipe-end="markManual"
    @escape-key-down="markManual"
  >
    <Custom v-if="content?.custom" />
    <template v-else>
    <div class="sy-toast__copy">
      <ToastTitle v-if="title || content" class="sy-toast__title">
        <Body v-if="content && !title" /><SMotionText v-else :value="title" />
      </ToastTitle>
      <ToastDescription v-if="description" class="sy-toast__description">
        <SMotionText :value="description" />
      </ToastDescription>
      <ToastDescription v-else-if="content && title && content.body !== title" class="sy-toast__description"><Body /></ToastDescription>
      <slot :remaining="timing.remaining" :duration="timing.duration" />
    </div>
    <div class="sy-toast__loading" :data-visible="tone === 'loading' || undefined" aria-hidden="true">
      <SSpinner size="sm" decorative />
    </div>
    <ToastAction v-if="toast?.actionProps || action" as-child :alt-text="action?.altText" :close-on-click="action?.closeOnClick">
      <SButton size="sm" variant="ghost" @click.capture="markManual" @click="action?.onClick?.($event)">{{ action?.label ?? toast?.actionProps?.label }}</SButton>
    </ToastAction>
    <End v-if="content?.endContent !== undefined" />
    <ToastClose v-if="dismissible" as-child>
      <SButton size="sm" variant="ghost" class="sy-toast__close" :aria-label="dismissLabel" @click.capture="markManual">
        <SIcon class="sy-toast__close-icon" name="close" />
      </SButton>
    </ToastClose>
    </template>
  </ToastRoot>
</template>
