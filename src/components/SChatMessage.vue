<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import SChatText from '../chat/SChatText.vue'
import type { ChatAttachmentInfo, ChatMessageRole, ChatMessageStatus, ChatTextToken } from '../chat/types'
import { contentUrl } from '../internal/content-url'
import type { EmojiCategory } from '../internal/emoji-data'
import type { MarkdownDisplayOptions } from '../internal/markdown-content'
import SAvatar from './SAvatar.vue'
import SButton from './SButton.vue'
import SChatAttachmentGroup from './SChatAttachmentGroup.vue'
import SChatLoader from './SChatLoader.vue'
import SChatMessageMetadata, { type ChatDeliveryStatus } from './SChatMessageMetadata.vue'
import SChatReactionBar, { type ChatReaction } from './SChatReactionBar.vue'
import SChatTokenizedText from './SChatTokenizedText.vue'
import SMotionText from './SMotionText.vue'
import SStreamMarkdown from './SStreamMarkdown.vue'

const props = withDefaults(defineProps<{
  messageRole?: ChatMessageRole
  source?: string
  format?: 'text' | 'markdown'
  status?: ChatMessageStatus
  author?: string
  avatarSrc?: string
  avatarInitials?: string
  showAvatar?: boolean
  time?: string
  datetime?: string
  delivery?: ChatDeliveryStatus
  deliveryLabels?: Partial<Record<ChatDeliveryStatus, string>>
  reactions?: readonly ChatReaction[]
  reactionLabel?: string
  reactionCategories?: readonly EmojiCategory[]
  addReactionLabel?: string
  addReaction?: boolean
  tokens?: readonly ChatTextToken[]
  bubble?: boolean
  animatedText?: boolean
  locale?: string
  pendingLabel?: string
  errorText?: string
  retryable?: boolean
  retryLabel?: string
  attachmentLabel?: string
  attachments?: readonly ChatAttachmentInfo[]
  markdown?: MarkdownDisplayOptions
  roleLabels?: Partial<Record<ChatMessageRole, string>>
}>(), {
  messageRole: 'assistant', source: '', format: 'text', status: 'ready', animatedText: true, pendingLabel: 'Preparing response',
  bubble: undefined, retryLabel: 'Retry', attachmentLabel: 'Attachments', attachments: () => [], errorText: 'Unable to complete this message',
})
const emit = defineEmits<{ retry: []; toggleReaction: [emoji: string, selected: boolean]; addReaction: [emoji: string] }>()
defineSlots<{
  avatar(props: { author: string; role: ChatMessageRole }): unknown
  header(props: { author: string; role: ChatMessageRole; status: ChatMessageStatus }): unknown
  default(props: { source: string; streaming: boolean }): unknown
  bubbles?(): unknown
  pending(): unknown
  attachments(props: { items: readonly ChatAttachmentInfo[] }): unknown
  error(props: { text: string; retry: () => void }): unknown
  actions(props: { role: ChatMessageRole; status: ChatMessageStatus }): unknown
  reactions(props: { reactions: readonly ChatReaction[] }): unknown
  footer(): unknown
}>()
const root = useTemplateRef<HTMLElement>('root')
const labels = { assistant: 'Assistant', user: 'You', system: 'System' }
const speaker = computed(() => props.author ?? props.roleLabels?.[props.messageRole] ?? labels[props.messageRole])
const busy = computed(() => props.status === 'pending' || props.status === 'streaming')
const hasBubble = computed(() => props.bubble ?? props.messageRole === 'user')
const avatar = computed(() => contentUrl(props.avatarSrc, true))
function retry() { if (props.status === 'error') emit('retry') }
watch(() => props.status, (next, previous) => {
  const node = root.value
  if (previous !== 'error' || next === 'error' || !node?.querySelector('.sy-chat-message__error')?.contains(node.ownerDocument.activeElement)) return
  void nextTick(() => node.focus({ preventScroll: true }))
})
</script>

<template>
  <article ref="root" class="sy-chat-message" data-sy-chat-message tabindex="-1"
    :data-role="messageRole" :data-status="status" :data-bubble="hasBubble || undefined"
    :aria-label="speaker" :aria-busy="busy || undefined">
    <div v-if="showAvatar || $slots.avatar" class="sy-chat-message__avatar">
      <slot name="avatar" :author="speaker" :role="messageRole">
        <SAvatar :name="speaker" :src="avatar" :initials="avatarInitials" size="sm" :tooltip="false" />
      </slot>
    </div>
    <div class="sy-chat-message__main">
      <header v-if="author || !delivery && (time || datetime) || $slots.header" class="sy-chat-message__header">
        <slot name="header" :author="speaker" :role="messageRole" :status="status">
          <span v-if="author" class="sy-chat-message__author"><SMotionText :value="author" /></span>
          <time v-if="!delivery && (time || datetime)" :datetime="datetime"><SMotionText :value="time ?? datetime ?? ''" motion="roll" /></time>
        </slot>
      </header>
      <div v-if="$slots.bubbles" class="sy-chat-message__bubbles"><slot name="bubbles" /></div>
      <div v-else-if="source || status === 'pending' || $slots.default || $slots.pending" class="sy-chat-message__body">
        <Transition name="sy-chat-control">
          <div v-if="status === 'pending' && !source" class="sy-chat-message__pending">
            <slot name="pending"><SChatLoader :label="pendingLabel" size="sm" show-label /></slot>
          </div>
        </Transition>
        <slot v-if="source || status !== 'pending'" :source="source" :streaming="status === 'streaming'">
          <SStreamMarkdown v-if="format === 'markdown'" v-bind="markdown" :source="source" :streaming="status === 'streaming'" />
          <SChatTokenizedText v-else-if="tokens?.length" :text="source" :tokens="tokens" />
          <SChatText v-else-if="animatedText" :source="source" :streaming="status === 'streaming'" :locale="locale" />
          <div v-else class="sy-chat-message__plain">{{ source }}</div>
        </slot>
      </div>
      <div v-if="attachments.length || $slots.attachments" class="sy-chat-message__attachments">
        <slot name="attachments" :items="attachments"><SChatAttachmentGroup :items="attachments" :label="attachmentLabel" :locale="locale" /></slot>
      </div>
      <Transition name="sy-chat-control">
        <div v-if="status === 'error'" class="sy-chat-message__error">
          <slot name="error" :text="errorText" :retry="retry">
            <span role="status">{{ errorText }}</span>
            <SButton v-if="retryable" type="button" size="sm" variant="secondary" @click="retry">{{ retryLabel }}</SButton>
          </slot>
        </div>
      </Transition>
      <div v-if="$slots.actions" class="sy-chat-message__actions"><slot name="actions" :role="messageRole" :status="status" /></div>
      <slot v-if="$slots.reactions || reactions?.length || addReaction" name="reactions" :reactions="reactions ?? []">
        <SChatReactionBar :reactions="reactions ?? []" :label="reactionLabel" :addable="addReaction" :add-label="addReactionLabel"
          :categories="reactionCategories" :locale="locale?.startsWith('zh') ? 'zh' : 'en'"
          @toggle="(emoji, selected) => emit('toggleReaction', emoji, selected)" @add="emit('addReaction', $event)" />
      </slot>
      <div v-if="delivery || $slots.footer" class="sy-chat-message__footer">
        <SChatMessageMetadata v-if="delivery" :timestamp="time" :datetime="datetime" :status="delivery" :status-labels="deliveryLabels"
          :sender="messageRole === 'user' ? 'user' : 'assistant'">
          <template v-if="$slots.footer" #footer><slot name="footer" /></template>
        </SChatMessageMetadata>
        <slot v-else name="footer" />
      </div>
    </div>
  </article>
</template>
