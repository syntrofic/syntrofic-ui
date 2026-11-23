<script setup lang="ts">
import { computed, useTemplateRef, watch, type ComponentPublicInstance } from 'vue'
import SDisclosure from './SDisclosure.vue'
import SButton from './SButton.vue'
import SCodeBlock from './SCodeBlock.vue'
import SMotionText from './SMotionText.vue'
import type { ChatToolInfo, ChatToolState } from '../chat/types'
import { labelDirection } from '../internal/label-direction'

const props = defineProps<{
  tool: ChatToolInfo
  stateLabels?: Partial<Record<ChatToolState, string>>
  inputLabel?: string
  outputLabel?: string
  approveLabel?: string
  rejectLabel?: string
  approvalText?: string
  defaultOpen?: boolean
  disabled?: boolean
}>()
const open = defineModel<boolean | undefined>('open', { default: undefined })
const emit = defineEmits<{ approve: [tool: ChatToolInfo]; reject: [tool: ChatToolInfo] }>()
defineSlots<{
  title(props: { tool: ChatToolInfo; status: string; pending: boolean }): unknown
  default(props: { tool: ChatToolInfo; status: string }): unknown
  args(props: { input: unknown; text: string | undefined }): unknown
  result(props: { output: unknown; text: string | undefined }): unknown
  error(props: { error: string | undefined }): unknown
  approval(props: { approve: () => void; reject: () => void; tool: ChatToolInfo }): unknown
}>()
const disclosure = useTemplateRef<ComponentPublicInstance>('disclosure')
const approval = useTemplateRef<HTMLDivElement>('approval')
const defaults = {
  'input-streaming': 'Preparing input', 'input-available': 'Awaiting result', 'output-available': 'Completed',
  'output-error': 'Failed', 'requires-action': 'Approval needed',
}
const stateLabels = computed(() => ({ ...defaults, ...props.stateLabels }))
const status = computed(() => stateLabels.value[props.tool.state])
const pending = computed(() => props.tool.state === 'input-streaming' || props.tool.state === 'input-available')

function display(value: unknown) {
  if (value === undefined || typeof value === 'string') return value
  const ancestors: unknown[] = []
  try {
    return JSON.stringify(value, function (this: unknown, _, child: unknown) {
      if (typeof child === 'bigint') return String(child)
      if (!child || typeof child !== 'object') return child
      while (ancestors.length && ancestors.at(-1) !== this) ancestors.pop()
      if (ancestors.includes(child)) return '[Circular]'
      ancestors.push(child)
      return child
    }, 2) ?? String(value)
  } catch {
    return Object.prototype.toString.call(value)
  }
}

const input = computed(() => props.tool.argsText ?? display(props.tool.input))
const output = computed(() => display(props.tool.output))
const approve = () => !props.disabled && emit('approve', props.tool)
const reject = () => !props.disabled && emit('reject', props.tool)

watch(() => props.tool.state, (state, prior) => {
  const content = approval.value
  if (prior !== 'requires-action' || state === prior || !content?.contains(content.ownerDocument.activeElement)) return
  const root = disclosure.value?.$el as HTMLElement | undefined
  root?.querySelector<HTMLElement>('[data-sy-disclosure-trigger]')?.focus({ preventScroll: true })
})
</script>

<template>
  <SDisclosure ref="disclosure" v-model:open="open" class="sy-chat-tool" :data-tool-state="tool.state" :disabled="disabled" :default-open="defaultOpen">
    <template #title>
      <slot name="title" :tool="tool" :status="status" :pending="pending">
        <span class="sy-chat-tool__header">
          <span class="sy-chat-tool__title" :dir="labelDirection(tool.triggerPrefix ? tool.triggerPrefix + ' ' + tool.toolName : tool.toolName)">
            <span v-if="tool.triggerPrefix">{{ tool.triggerPrefix }} </span><strong>{{ tool.toolName }}</strong>
          </span>
          <span class="sy-chat-tool__state">
            <span v-for="(label, state) in stateLabels" :key="state" class="sy-chat-tool__measure" aria-hidden="true">{{ label }}</span>
            <SMotionText :value="status" />
          </span>
          <span class="sy-chat-tool__loader" aria-hidden="true">
            <Transition name="sy-chat-loader-motion">
              <span v-if="pending" class="sy-chat-loader__dots"><i /><i /><i /></span>
            </Transition>
          </span>
        </span>
      </slot>
    </template>
    <slot :tool="tool" :status="status">
      <div class="sy-chat-tool__content">
        <slot v-if="input !== undefined || $slots.args" name="args" :input="tool.input" :text="input">
          <SCodeBlock :code="input ?? ''" :language="tool.argsText === undefined && typeof tool.input !== 'string' ? 'json' : undefined"
            :label="inputLabel ?? 'Input'" :copyable="false" wrap />
        </slot>
        <slot v-if="tool.state === 'output-available'" name="result" :output="tool.output" :text="output">
          <SCodeBlock v-if="output !== undefined" :code="output" :language="typeof tool.output === 'string' ? undefined : 'json'"
            :label="outputLabel ?? 'Result'" :copyable="false" wrap />
        </slot>
        <slot v-if="tool.state === 'output-error'" name="error" :error="tool.errorText">
          <p class="sy-chat-tool__error">{{ tool.errorText ?? status }}</p>
        </slot>
        <div v-if="tool.state === 'requires-action'" ref="approval" class="sy-chat-tool__approval">
          <slot name="approval" :approve="approve" :reject="reject" :tool="tool">
            <p v-if="approvalText">{{ approvalText }}</p>
            <div class="sy-chat-tool__approval-actions">
              <SButton variant="secondary" size="sm" :disabled="disabled" @click="reject">{{ rejectLabel ?? 'Decline' }}</SButton>
              <SButton size="sm" :disabled="disabled" @click="approve">{{ approveLabel ?? 'Approve' }}</SButton>
            </div>
          </slot>
        </div>
      </div>
    </slot>
  </SDisclosure>
</template>
