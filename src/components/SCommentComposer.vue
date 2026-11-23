<script lang="ts">
import type { CommentAnchor } from '../internal/comment-data'
export type { CommentAnchor } from '../internal/comment-data'
export interface CommentImage { src: string; alt?: string }
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useTemplateRef } from 'vue'
import type { PromptSegment, PromptTokenSuggestion } from '../chat/prompt-tokens'
import { contentUrl } from '../internal/content-url'
import type { EmojiCategory, EmojiLocale } from '../internal/emoji-data'
import SBanner from './SBanner.vue'
import SButton from './SButton.vue'
import SChatComposerInput, { type ChatComposerTrigger } from './SChatComposerInput.vue'
import SCloseButton from './SCloseButton.vue'
import SEmojiPicker from './SEmojiPicker.vue'

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  submitLabel?: string
  retryLabel?: string
  retryable?: boolean
  anchor?: CommentAnchor
  anchorDismissible?: boolean
  dismissAnchorLabel?: string
  highlightColor?: string
  error?: string
  disabled?: boolean
  submitting?: boolean
  triggers?: readonly ChatComposerTrigger[]
  agentCommands?: readonly PromptTokenSuggestion[]
  emojiPicker?: boolean
  emojiCategories?: readonly EmojiCategory[]
  emojiLabel?: string
  locale?: EmojiLocale
  attachLabel?: string
  uploadErrorText?: string
  uploadImages?: (files: readonly File[], signal: AbortSignal) => readonly CommentImage[] | Promise<readonly CommentImage[]>
}>(), { placeholder: 'Write a comment…', submitLabel: 'Post', retryLabel: 'Retry', dismissAnchorLabel: 'Remove quote',
  attachLabel: 'Attach images', uploadErrorText: 'Could not attach the images.' })
const value = defineModel<string>({ default: '' })
const emit = defineEmits<{ submit: [value: string, segments: readonly PromptSegment[]]; retry: []; anchorDismiss: []; uploadError: [reason: unknown] }>()
const editor = useTemplateRef<InstanceType<typeof SChatComposerInput>>('editor')
const file = useTemplateRef<HTMLInputElement>('file')
const uploading = ref(false)
const failed = ref(false)
const busy = computed(() => props.submitting || uploading.value)
const locked = computed(() => props.disabled || busy.value)
const triggers = computed<readonly ChatComposerTrigger[]>(() => {
  const configured = props.triggers ?? []
  if (!props.agentCommands?.length || configured.some(trigger => trigger.character === '/')) return configured
  return [...configured, { character: '/', search: query => {
    const term = query.trim().toLocaleLowerCase()
    return props.agentCommands?.filter(item => [item.label, item.value, ...(item.keywords ?? [])].some(word => word.toLocaleLowerCase().includes(term))) ?? []
  } }]
})
let inFlight: AbortController | undefined
const lastFiles = shallowRef<readonly File[]>([])
onBeforeUnmount(() => inFlight?.abort())

function submit(draft = editor.value?.getValue() ?? value.value, segments: readonly PromptSegment[] = editor.value?.getSegments() ?? []) {
  if (draft.trim() && !locked.value) emit('submit', draft, segments)
}
async function insert(text: string) {
  if (!text) return
  await nextTick()
  editor.value?.insertText(text)
  editor.value?.focus()
}
function imageText(image: CommentImage) {
  const url = contentUrl(image.src, true)
  if (!url) return ''
  const alt = (image.alt ?? '').replace(/[\\[\]]/g, '\\$&').replaceAll('\n', ' ')
  return `![${alt}](<${url.replaceAll('<', '%3C').replaceAll('>', '%3E')}>)`
}
async function upload(files: readonly File[]) {
  if (!props.uploadImages || locked.value || !files.length) return
  lastFiles.value = files.filter(image => image.type.startsWith('image/'))
  if (!lastFiles.value.length) { failed.value = true; return }
  const controller = new AbortController()
  inFlight = controller
  uploading.value = true
  failed.value = false
  let images: readonly CommentImage[]
  try { images = await props.uploadImages(lastFiles.value, controller.signal) }
  catch (reason) {
    if (!controller.signal.aborted) { failed.value = true; emit('uploadError', reason) }
    return
  } finally {
    if (!controller.signal.aborted) uploading.value = false
    if (inFlight === controller) inFlight = undefined
  }
  if (controller.signal.aborted) return
  const markdown = images.map(imageText).filter(Boolean).join('\n')
  if (markdown) await insert((value.value && !value.value.endsWith('\n') ? '\n' : '') + markdown)
}
function fileChanged(event: Event) {
  const field = event.target as HTMLInputElement
  const selected = Array.from(field.files ?? [])
  field.value = ''
  void upload(selected)
}
defineExpose({ focus: () => editor.value?.focus() })
</script>

<template>
  <form class="sy-comment-composer" :aria-busy="busy || undefined" @submit.prevent="submit()">
    <SBanner v-if="error || failed" :title="error || uploadErrorText" tone="danger" announcement="assertive">
      <template v-if="retryable || failed && lastFiles.length" #actions>
        <SButton size="sm" variant="secondary" :disabled="locked" @click="error ? emit('retry') : upload(lastFiles)">{{ retryLabel }}</SButton>
      </template>
    </SBanner>
    <blockquote v-if="anchor" class="sy-comment-composer__quote" :style="{ '--sy-comment-highlight': highlightColor }">
      <div><strong v-if="anchor.label">{{ anchor.label }}</strong><p>{{ anchor.text }}</p></div>
      <SCloseButton v-if="anchorDismissible" :label="dismissAnchorLabel" :disabled="locked" @click="emit('anchorDismiss')" />
    </blockquote>
    <SChatComposerInput ref="editor" v-model="value" :label="label ?? placeholder" :placeholder="placeholder" :triggers="triggers" :max-rows="6"
      :readonly="busy" :disabled="disabled" :history="false" @submit="submit" @files="upload" />
    <div class="sy-comment-composer__footer">
      <div class="sy-comment-composer__controls">
        <template v-if="uploadImages">
          <input ref="file" type="file" accept="image/*" multiple hidden @change="fileChanged">
          <SButton size="sm" variant="secondary" :disabled="locked" @click="file?.click()">{{ attachLabel }}</SButton>
        </template>
        <SEmojiPicker v-if="emojiPicker" size="sm" :label="emojiLabel" :locale="locale" :categories="emojiCategories" :disabled="locked" @select="insert($event.glyph)" />
        <slot name="controls" :disabled="locked" />
      </div>
    <SButton size="sm" type="submit" :disabled="disabled || !value.trim()" :loading="busy">{{ submitLabel }}</SButton>
    </div>
  </form>
</template>
