<script setup lang="ts">
import SChatAttachment from './SChatAttachment.vue'
import type { ChatAttachmentInfo, ChatAttachmentKind } from '../chat/types'
withDefaults(defineProps<{
  items: readonly ChatAttachmentInfo[]
  label?: string
  removable?: boolean
  retryable?: boolean
  locale?: string
  mediaControls?: boolean
  removeLabel?: string
  retryLabel?: string
  uploadingLabel?: string
  errorLabel?: string
  missingPreviewLabel?: string
  typeLabels?: Partial<Record<ChatAttachmentKind, string>>
}>(), { label: 'Attachments' })
const emit = defineEmits<{ remove: [attachment: ChatAttachmentInfo]; retry: [attachment: ChatAttachmentInfo] }>()
defineSlots<{ default(props: { item: ChatAttachmentInfo; index: number }): unknown }>()
</script>

<template>
  <TransitionGroup tag="ul" name="sy-chat-attachment" class="sy-chat-attachments" role="list" :aria-label="label">
    <li v-for="(item, index) in items" :key="item.id">
      <slot :item="item" :index="index">
        <SChatAttachment :attachment="item" :locale="locale" :removable="removable" :retryable="retryable"
          :media-controls="mediaControls" :remove-label="removeLabel" :retry-label="retryLabel" :uploading-label="uploadingLabel"
          :error-label="errorLabel" :missing-preview-label="missingPreviewLabel" :type-labels="typeLabels"
          @remove="emit('remove', $event)" @retry="emit('retry', $event)" />
      </slot>
    </li>
  </TransitionGroup>
</template>
