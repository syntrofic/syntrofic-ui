<script setup lang="ts">
import { computed } from 'vue'
import type { ChatToolCall, ChatToolCallStatus } from '../chat/types'
import SChatToolCallSummary from '../internal/SChatToolCallSummary.vue'
import SDisclosure from './SDisclosure.vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{
  calls: readonly ChatToolCall[]
  label?: string
  defaultOpen?: boolean
  disabled?: boolean
  stateLabels?: Partial<Record<ChatToolCallStatus, string>>
  formatCount?: (count: number) => string
}>(), { label: 'Tool calls' })
const defaults = { pending: 'Pending', running: 'Running', complete: 'Completed', error: 'Failed' }
const labels = computed(() => ({ ...defaults, ...props.stateLabels }))
const open = defineModel<boolean | undefined>('open', { default: undefined })
defineSlots<{
  detail?(props: { call: ChatToolCall; index: number }): unknown
  title?(props: { count: number }): unknown
}>()
</script>

<template>
  <SDisclosure v-model:open="open" class="sy-chat-call-group" :default-open="defaultOpen" :disabled="disabled" keep-mounted>
    <template #title>
      <slot name="title" :count="calls.length">
        <span class="sy-chat-call-group__title">
          <SIcon name="wrench" size="sm" />
          <span>{{ label }}</span>
          <SMotionText class="sy-chat-call-group__count" :value="formatCount?.(calls.length) ?? String(calls.length)" motion="roll" />
        </span>
      </slot>
    </template>
    <ul class="sy-chat-call-group__rows" role="list" :aria-label="label" :inert="!(open ?? defaultOpen) || undefined">
      <li v-for="(call, index) in calls" :key="call.id" class="sy-chat-call" :data-call="call.id">
        <SDisclosure v-if="call.detail && $slots.detail" class="sy-chat-call__disclosure" :disabled="disabled">
          <template #title><SChatToolCallSummary :call="call" :state-labels="labels" /></template>
          <div class="sy-chat-call__detail">
            <slot name="detail" :call="call" :index="index" />
          </div>
        </SDisclosure>
        <SChatToolCallSummary v-else :call="call" :state-labels="labels" />
        <p v-if="call.errorMessage && call.status === 'error'" class="sy-chat-call__error">
          <SMotionText :value="call.errorMessage" wrap />
        </p>
      </li>
    </ul>
  </SDisclosure>
</template>
