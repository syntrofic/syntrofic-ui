<script setup lang="ts">
import { computed } from 'vue'
import type { PromptRunStatus } from '../chat/types'
import SButton from './SButton.vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'
import SSpinner from './SSpinner.vue'

const props = withDefaults(defineProps<{
  status?: PromptRunStatus
  disabled?: boolean
  canSend?: boolean
  size?: 'sm' | 'md' | 'lg'
  appearance?: 'icon' | 'text'
  sendLabel?: string
  stopLabel?: string
  resendLabel?: string
}>(), { status: 'ready', canSend: true, size: 'md', appearance: 'icon', sendLabel: 'Send', stopLabel: 'Stop', resendLabel: 'Resend' })
const emit = defineEmits<{ send: []; stop: [] }>()
const running = computed(() => props.status === 'submitted' || props.status === 'streaming')
const label = computed(() => running.value ? props.stopLabel : props.status === 'error' ? props.resendLabel : props.sendLabel)

function activate() {
  if (props.disabled) return
  if (running.value) emit('stop')
  else if (props.canSend) emit('send')
}
</script>

<template>
  <SButton class="sy-chat-send-button sy-prompt-input__send" type="button" :size="size" :disabled="disabled" :aria-label="label"
    :aria-disabled="!running && !canSend || undefined" :aria-busy="status === 'submitted' || undefined"
    :data-spinning="status === 'submitted' || undefined"
    :icon-only="appearance === 'icon'" @click="activate">
    <span v-if="appearance === 'text'" class="sy-prompt-input__send-motion" aria-hidden="true">
      <span class="sy-prompt-input__spinner">
        <Transition name="sy-chat-loader-motion">
          <SSpinner v-if="status === 'submitted'" size="sm" decorative />
        </Transition>
      </span>
      <span class="sy-prompt-input__send-label">
        <span class="sy-prompt-input__measure">{{ sendLabel }}</span>
        <span class="sy-prompt-input__measure">{{ stopLabel }}</span>
        <span class="sy-prompt-input__measure">{{ resendLabel }}</span>
        <SMotionText :value="label" />
      </span>
    </span>
    <span v-else class="sy-chat-send-button__icons" aria-hidden="true">
      <Transition name="sy-chat-control">
        <span :key="status === 'submitted' ? 'sending' : running ? 'stop' : 'send'">
          <SSpinner v-if="status === 'submitted'" size="sm" decorative />
          <slot v-else-if="running" name="stopIcon"><SIcon name="stop" size="sm" /></slot>
          <slot v-else name="sendIcon"><SIcon name="arrowUp" size="sm" /></slot>
        </span>
      </Transition>
    </span>
  </SButton>
</template>
