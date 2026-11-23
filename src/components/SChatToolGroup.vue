<script setup lang="ts">
import SDisclosure from './SDisclosure.vue'
import SChatTool from './SChatTool.vue'
import type { ChatToolInfo, ChatToolState } from '../chat/types'

defineProps<{
  tools: readonly ChatToolInfo[]
  title?: string
  defaultOpen?: boolean
  disabled?: boolean
  stateLabels?: Partial<Record<ChatToolState, string>>
  inputLabel?: string
  outputLabel?: string
  approveLabel?: string
  rejectLabel?: string
}>()
const open = defineModel<boolean | undefined>('open', { default: undefined })
const emit = defineEmits<{ approve: [tool: ChatToolInfo]; reject: [tool: ChatToolInfo] }>()
defineSlots<{
  title(props: { count: number }): unknown
  default(props: { tools: readonly ChatToolInfo[] }): unknown
  tool(props: { tool: ChatToolInfo; index: number }): unknown
}>()
</script>

<template>
  <SDisclosure v-model:open="open" :title="title ?? 'Tool activity'" class="sy-chat-tool-group" :disabled="disabled" :default-open="defaultOpen">
    <template v-if="$slots.title" #title><slot name="title" :count="tools.length" /></template>
    <slot :tools="tools">
      <div class="sy-chat-tool-group__items">
        <template v-for="(tool, index) in tools" :key="tool.id ?? index">
          <slot name="tool" :tool="tool" :index="index">
            <SChatTool :tool="tool" :disabled="disabled" :state-labels="stateLabels" :input-label="inputLabel"
              :output-label="outputLabel" :approve-label="approveLabel" :reject-label="rejectLabel"
              @approve="emit('approve', $event)" @reject="emit('reject', $event)" />
          </slot>
        </template>
      </div>
    </slot>
  </SDisclosure>
</template>
