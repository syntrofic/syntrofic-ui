<script setup lang="ts">
import { computed } from 'vue'
import type { ChatToolCall, ChatToolCallStatus } from '../chat/types'
import SIcon from '../components/SIcon.vue'
import SMotionText from '../components/SMotionText.vue'

const props = defineProps<{ call: ChatToolCall; stateLabels: Record<ChatToolCallStatus, string> }>()
const status = computed(() => props.call.status ?? 'complete')
const icons = { pending: 'clock', running: 'more', complete: 'check', error: 'error' }
</script>

<template>
  <span class="sy-chat-call__summary" :data-status="status">
    <span class="sy-chat-call__icon" aria-hidden="true">
      <Transition name="sy-chat-control">
        <span v-if="status === 'running'" key="running" class="sy-chat-loader__dots"><i /><i /><i /></span>
        <SIcon v-else :key="status" :name="icons[status]" size="sm" />
      </Transition>
    </span>
    <span class="sy-chat-call__target">
      <strong>{{ call.name }}</strong>
      <span v-if="call.target" class="sy-chat-call__target-text">{{ call.target }}</span>
    </span>
    <span class="sy-chat-call__context">
      <span v-if="call.node" class="sy-chat-call__node">{{ call.node }}</span>
      <span class="sy-chat-call__stats">
        <SMotionText v-if="call.additions !== undefined" class="sy-chat-call__stat" data-stat="add"
          :value="'+' + call.additions" motion="roll" />
        <SMotionText v-if="call.deletions !== undefined" class="sy-chat-call__stat" data-stat="remove"
          :value="'−' + call.deletions" motion="roll" />
      </span>
      <SMotionText v-if="call.duration" :value="call.duration" motion="roll" />
      <span class="sy-chat-call__status">
        <span v-for="(label, key) in stateLabels" :key="key" class="sy-chat-call__measure" aria-hidden="true">{{ label }}</span>
        <SMotionText :value="stateLabels[status]" />
      </span>
    </span>
  </span>
</template>
