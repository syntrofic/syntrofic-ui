<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'
import { writeClipboard } from '../internal/clipboard'
import type { ChatCopyStatus, ChatMessageAction, ChatMessageFeedback } from '../chat/types'

const props = withDefaults(defineProps<{
  text?: string
  label?: string
  actions?: readonly ChatMessageAction[]
  labels?: Partial<Record<ChatMessageAction | 'copied' | 'copy-error', string>>
  disabled?: boolean
  disabledActions?: readonly ChatMessageAction[]
}>(), { label: 'Message actions', actions: () => ['copy', 'like', 'dislike', 'retry'], disabledActions: () => [] })
const feedback = defineModel<ChatMessageFeedback>('feedback', { default: null })
const emit = defineEmits<{
  copy: [text: string]
  copyError: [error: unknown]
  retry: []
  share: []
  feedbackChange: [value: ChatMessageFeedback]
}>()
defineSlots<{
  default(props: { copy: () => Promise<void>; copyStatus: ChatCopyStatus; feedback: ChatMessageFeedback }): unknown
  action(props: { action: ChatMessageAction; label: string; status: ChatCopyStatus; activate: () => void; disabled: boolean; pressed: boolean | undefined }): unknown
  end(): unknown
}>()
const defaults = { copy: 'Copy', copied: 'Copied', 'copy-error': 'Copy failed', like: 'Helpful', dislike: 'Unhelpful', retry: 'Retry', share: 'Share' }
const root = ref<HTMLDivElement>()
const copyStatus = ref<ChatCopyStatus>('idle')
const labels = computed(() => ({ ...defaults, ...props.labels }))
let revision = 0
let timer: ReturnType<typeof setTimeout> | undefined

function reset() {
  revision++
  clearTimeout(timer)
  copyStatus.value = 'idle'
}
watch(() => props.text, reset, { flush: 'sync' })
onBeforeUnmount(reset)

function disabled(action: ChatMessageAction) {
  return props.disabled || props.disabledActions.includes(action) || (action === 'copy' && props.text === undefined)
}

async function copy() {
  const document = root.value?.ownerDocument
  const text = props.text
  if (!document || text === undefined || disabled('copy')) return
  const request = ++revision
  clearTimeout(timer)
  try {
    await writeClipboard(text, document)
    if (request !== revision) return
    copyStatus.value = 'copied'
    emit('copy', text)
  } catch (error) {
    if (request !== revision) return
    copyStatus.value = 'error'
    emit('copyError', error)
  }
  if (request === revision) timer = setTimeout(reset, 1800)
}

function activate(action: ChatMessageAction) {
  if (disabled(action)) return
  if (action === 'copy') void copy()
  else if (action === 'retry') emit('retry')
  else if (action === 'share') emit('share')
  else {
    const next = feedback.value === action ? null : action
    feedback.value = next
    emit('feedbackChange', next)
  }
}

const copyText = computed(() => copyStatus.value === 'copied' ? labels.value.copied
  : copyStatus.value === 'error' ? labels.value['copy-error'] : labels.value.copy)
const pressed = (action: ChatMessageAction) => action === 'like' || action === 'dislike' ? feedback.value === action : undefined
</script>

<template>
  <div ref="root" class="sy-chat-message-actions" role="group" :aria-label="label">
    <slot :copy="copy" :copy-status="copyStatus" :feedback="feedback">
      <template v-for="action in actions" :key="action">
        <slot name="action" :action="action" :label="labels[action]" :status="copyStatus" :activate="() => activate(action)"
          :disabled="Boolean(disabled(action))" :pressed="pressed(action)">
          <SButton size="sm" variant="ghost" :disabled="disabled(action)" :aria-pressed="pressed(action)"
            :aria-label="labels[action]" @click="activate(action)">
            <span v-if="action === 'copy'" class="sy-chat-actions__copy" aria-hidden="true">
              <span class="sy-chat-actions__measure">{{ labels.copy }}</span>
              <span class="sy-chat-actions__measure">{{ labels.copied }}</span>
              <span class="sy-chat-actions__measure">{{ labels['copy-error'] }}</span>
              <SMotionText :value="copyText" />
            </span>
            <template v-else>{{ labels[action] }}</template>
          </SButton>
        </slot>
      </template>
    </slot>
    <slot name="end" />
    <span class="sy-visually-hidden" role="status">{{ copyStatus === 'idle' ? '' : copyText }}</span>
  </div>
</template>
