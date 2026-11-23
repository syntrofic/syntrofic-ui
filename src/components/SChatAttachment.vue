<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import type { ChatAttachmentInfo, ChatAttachmentKind } from '../chat/types'
import { formatChatAttachmentSize, inferChatAttachmentKind } from '../chat/attachment'
import { contentUrl } from '../internal/content-url'
import { labelDirection } from '../internal/label-direction'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'
import SProgressBar from './SProgressBar.vue'

const props = withDefaults(defineProps<{
  attachment: ChatAttachmentInfo
  locale?: string
  removable?: boolean
  retryable?: boolean
  mediaControls?: boolean
  preview?: boolean
  showProgress?: boolean
  showStatus?: boolean
  removeLabel?: string
  retryLabel?: string
  uploadingLabel?: string
  errorLabel?: string
  missingPreviewLabel?: string
  typeLabels?: Partial<Record<ChatAttachmentKind, string>>
}>(), {
  preview: true, showProgress: true, showStatus: true, locale: 'en', removeLabel: 'Remove', retryLabel: 'Retry',
  uploadingLabel: 'Uploading', errorLabel: 'Upload failed', missingPreviewLabel: 'Preview unavailable',
})
const emit = defineEmits<{
  remove: [attachment: ChatAttachmentInfo]
  retry: [attachment: ChatAttachmentInfo]
  previewError: [attachment: ChatAttachmentInfo]
}>()
defineSlots<{
  preview(props: { attachment: ChatAttachmentInfo; src?: string; kind: ChatAttachmentKind }): unknown
  status(props: { attachment: ChatAttachmentInfo; label: string; progress?: number }): unknown
  actions(props: { attachment: ChatAttachmentInfo; remove: () => void; retry: () => void }): unknown
}>()
const root = useTemplateRef<HTMLElement>('root')
const local = shallowRef<string>()
const failed = ref(false)
const kind = computed(() => props.attachment.kind ?? inferChatAttachmentKind(props.attachment.mimeType || props.attachment.file?.type, props.attachment.name))
const size = computed(() => formatChatAttachmentSize(props.attachment.size ?? props.attachment.file?.size, props.locale))
const status = computed(() => props.attachment.status ?? 'ready')
const progress = computed(() => {
  const value = props.attachment.progress
  return value !== undefined && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : undefined
})
const statusText = computed(() => status.value === 'uploading' ? props.uploadingLabel : status.value === 'error' ? props.attachment.error ?? props.errorLabel : '')
const percent = computed(() => new Intl.NumberFormat(props.locale, { style: 'percent', maximumFractionDigits: 0 }))
const readable = computed(() => status.value === 'uploading' && progress.value !== undefined
  ? `${statusText.value} ${percent.value.format(progress.value / 100)}` : statusText.value)
const safe = computed(() => contentUrl(props.attachment.src, true))
const source = computed(() => safe.value ?? local.value)
const media = computed(() => kind.value === 'audio' || kind.value === 'video' || kind.value === 'image')
const id = `sy-chat-attachment-${useId()}`
const defaultTypes: Record<ChatAttachmentKind, string> = {
  image: 'Image', video: 'Video', audio: 'Audio', document: 'Document', spreadsheet: 'Spreadsheet', archive: 'Archive',
  code: 'Code', other: 'File',
}

function remove() { if (!props.attachment.disabled) emit('remove', props.attachment) }
function retry() { if (!props.attachment.disabled && status.value === 'error') emit('retry', props.attachment) }
function previewFailed() {
  failed.value = true
  emit('previewError', props.attachment)
}

let stop: (() => void) | undefined
onMounted(() => {
  stop = watch([() => props.attachment.file, safe, media, () => props.preview], ([file, remote, show, preview], _, onCleanup) => {
    const api = root.value?.ownerDocument.defaultView?.URL
    local.value = undefined
    if (!file || remote || !show || !preview || !api?.createObjectURL) return
    try {
      const url = api.createObjectURL(file)
      local.value = url
      onCleanup(() => api.revokeObjectURL(url))
    } catch { previewFailed() }
  }, { immediate: true })
})
watch(source, () => { failed.value = false })
watch(status, (next, previous) => {
  const node = root.value
  if (previous !== 'error' || next === 'error' || !node?.querySelector('.sy-chat-attachment__retry')?.contains(node.ownerDocument.activeElement)) return
  void nextTick(() => (node.querySelector<HTMLElement>('[data-sy-attachment-remove]:not(:disabled)') ?? node).focus({ preventScroll: true }))
})
onBeforeUnmount(() => stop?.())
</script>

<template>
  <article ref="root" class="sy-chat-attachment" :data-status="status" :data-kind="kind"
    :aria-labelledby="id" :aria-busy="status === 'uploading' || undefined" tabindex="-1">
    <div v-if="preview && (media || $slots.preview)" class="sy-chat-attachment__preview" :data-missing="(!source || failed) || undefined">
      <slot name="preview" :attachment="attachment" :src="failed ? undefined : source" :kind="kind">
        <img v-if="source && !failed && kind === 'image'" :src="source" :alt="attachment.alt ?? attachment.name" decoding="async" @error="previewFailed">
        <video v-else-if="source && !failed && kind === 'video'" :src="source" :aria-label="attachment.name"
          :controls="mediaControls" muted playsinline preload="metadata" @error="previewFailed" />
        <audio v-else-if="source && !failed && kind === 'audio' && mediaControls" :src="source" :aria-label="attachment.name"
          controls preload="metadata" @error="previewFailed" />
        <span v-else-if="!source || failed">{{ missingPreviewLabel }}</span>
        <span v-else>{{ typeLabels?.[kind] ?? defaultTypes[kind] }}</span>
      </slot>
    </div>
    <div class="sy-chat-attachment__body">
      <div class="sy-chat-attachment__info">
        <strong :id="id" class="sy-chat-attachment__name" :dir="labelDirection(attachment.name)">{{ attachment.name }}</strong>
        <div class="sy-chat-attachment__meta">
          <span>{{ typeLabels?.[kind] ?? defaultTypes[kind] }}</span>
          <SMotionText v-if="size" :value="size" motion="roll" />
        </div>
        <div v-if="showStatus && (attachment.status !== undefined || $slots.status)" class="sy-chat-attachment__status"
          :aria-hidden="status === 'ready' || undefined">
          <slot name="status" :attachment="attachment" :label="readable" :progress="progress"><SMotionText :value="readable" motion="roll" /></slot>
        </div>
      </div>
      <div v-if="removable || retryable || $slots.actions" class="sy-chat-attachment__actions">
        <slot name="actions" :attachment="attachment" :remove="remove" :retry="retry">
          <span v-if="retryable" class="sy-chat-attachment__retry">
            <Transition name="sy-chat-control">
              <SButton v-show="status === 'error'" size="sm" variant="secondary" :disabled="attachment.disabled"
                :aria-label="`${retryLabel} ${attachment.name}`" @click="retry">{{ retryLabel }}</SButton>
            </Transition>
          </span>
          <SButton v-if="removable" size="sm" variant="ghost" :disabled="attachment.disabled"
            data-sy-attachment-remove :aria-label="`${removeLabel} ${attachment.name}`" @click="remove">{{ removeLabel }}</SButton>
        </slot>
      </div>
    </div>
    <div v-if="showProgress && attachment.status !== undefined" class="sy-chat-attachment__progress" :data-active="status === 'uploading' || undefined">
      <SProgressBar :aria-label="`${uploadingLabel} ${attachment.name}`" :aria-hidden="status !== 'uploading' || undefined"
        size="sm" :show-value="false" :value="progress" :indeterminate="progress === undefined && status === 'uploading'" />
    </div>
    <span v-if="status === 'error'" class="sy-visually-hidden" role="status">{{ statusText }}</span>
  </article>
</template>
