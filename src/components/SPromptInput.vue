<script setup lang="ts">
import { createAnimator, prefersReducedMotion } from '../internal/motion'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef, watch } from 'vue'
import SPromptTokenEditor from '../chat/SPromptTokenEditor.vue'
import { normalizePromptSegments, promptText, type PromptSegment, type PromptTokenSuggestion } from '../chat/prompt-tokens'
import type { ChatAttachmentInfo, ChatAttachmentKind, PromptFeedback, PromptLayout, PromptPayload, PromptRunStatus, QueuedPrompt } from '../chat/types'
import { addAcceptedFiles, fileKey, filesFromTransfer, type FileRejection } from '../internal/file-acceptance'
import SButton from './SButton.vue'
import SChatAttachment from './SChatAttachment.vue'
import SChatSendButton from './SChatSendButton.vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'
import SPromptQueue from './SPromptQueue.vue'

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  layout?: PromptLayout
  variant?: 'primary' | 'secondary' | 'flat'
  size?: 'sm' | 'md' | 'lg'
  status?: PromptRunStatus
  disabled?: boolean
  readonly?: boolean
  lockDuringRun?: boolean
  allowQueue?: boolean
  allowAttachments?: boolean
  showAttachments?: boolean
  getInputSegments?: () => readonly PromptSegment[] | undefined
  clearOnSubmit?: boolean
  submitOn?: 'enter' | 'modifier-enter' | 'manual'
  rows?: number
  maxHeight?: number | string
  autoGrow?: boolean
  accept?: string
  maxFiles?: number
  maxFileSize?: number
  locale?: string
  attachmentTypeLabels?: Partial<Record<ChatAttachmentKind, string>>
  tokenMode?: boolean
  tokenTriggers?: readonly string[]
  tokenOptions?: readonly PromptTokenSuggestion[]
  tokenAllowsSpaces?: boolean
  tokenPopupSide?: 'top' | 'bottom'
  tokenPopupAlign?: 'start' | 'center' | 'end'
  tokenOptionsLabel?: string
  error?: string
  feedback?: PromptFeedback
  feedbackPosition?: 'top' | 'bottom'
  labels?: Partial<Record<'attach' | 'attachments' | 'remove' | 'send' | 'stop' | 'resend' | 'queue' | 'queueItem' |
    'edit' | 'up' | 'down' | 'drag' | 'submitted' | 'streaming', string>>
  formatFileRejections?: (entries: readonly FileRejection[]) => string
  formatQueueAttachments?: (count: number) => string
}>(), {
  label: 'Message', layout: 'stacked', variant: 'primary', size: 'md', status: 'ready', lockDuringRun: true,
  allowAttachments: true, showAttachments: true, feedbackPosition: 'bottom', clearOnSubmit: true,
  submitOn: 'enter', rows: 1, maxHeight: 240, autoGrow: true, locale: 'en',
})
const value = defineModel<string>({ default: '' })
const tokens = defineModel<PromptSegment[]>('tokens', { default: () => [] })
const files = defineModel<File[]>('files', { default: () => [] })
const queue = defineModel<QueuedPrompt[]>('queue', { default: () => [] })
const emit = defineEmits<{
  submit: [payload: PromptPayload]
  stop: []
  enqueue: [item: QueuedPrompt]
  editQueued: [item: QueuedPrompt]
  removeQueued: [item: QueuedPrompt]
  filesAdded: [files: File[]]
  filesRejected: [entries: FileRejection[]]
  fileRemoved: [file: File]
}>()
defineSlots<{
  toolbarStart(props: { attach: () => void; disabled: boolean }): unknown
  toolbarEnd(props: { send: () => void; stop: () => void; enqueue: () => void; running: boolean; canSubmit: boolean }): unknown
  attachment(props: { attachment: ChatAttachmentInfo; remove: () => void }): unknown
  queue(props: { items: readonly QueuedPrompt[]; edit: (item: QueuedPrompt) => void }): unknown
  tokenOption(props: { suggestion: PromptTokenSuggestion; active: boolean }): unknown
  footer(props: { status: PromptRunStatus }): unknown
  drawer?(props: { files: readonly File[]; running: boolean; remove: (file: File) => void; disabled: boolean }): unknown
  headerActions?(props: { attach: () => void; disabled: boolean }): unknown
  headerContext?(props: { running: boolean }): unknown
  sendActions?(props: { disabled: boolean; running: boolean }): unknown
  input?(props: { value: string; update: (value: string) => void; send: () => void; label: string; placeholder?: string;
    disabled: boolean; readonly: boolean; invalid: boolean; describedBy?: string }): unknown
}>()

const id = `sy-prompt-${useId()}`
const picker = useTemplateRef<HTMLInputElement>('picker')
const textarea = useTemplateRef<HTMLTextAreaElement>('textarea')
const tokenEditor = useTemplateRef<InstanceType<typeof SPromptTokenEditor>>('tokenEditor')
const shell = useTemplateRef<HTMLDivElement>('shell')
const mirror = useTemplateRef<HTMLDivElement>('mirror')
const toolbarStart = useTemplateRef<HTMLDivElement>('toolbarStart')
const toolbarEnd = useTemplateRef<HTMLDivElement>('toolbarEnd')
const clearAfter = ref(false)
const wraps = ref(false)
const composing = ref(false)
const dropDepth = ref(0)
const fileError = ref('')
const body = computed(() => props.tokenMode ? promptText(tokens.value) : value.value)
const running = computed(() => props.status === 'submitted' || props.status === 'streaming')
const locked = computed(() => props.disabled || props.readonly || (running.value && props.lockDuringRun && !props.allowQueue))
const sendable = computed(() => !props.disabled && !props.readonly && Boolean(body.value.trim() || files.value.length))
const canQueue = computed(() => running.value && props.allowQueue && sendable.value)
const hasInlineAttachments = computed(() => props.showAttachments && files.value.length > 0)
const actualLayout = computed(() => props.layout === 'compact' && (wraps.value || hasInlineAttachments.value) ? 'stacked' : props.layout)
const labels = computed(() => ({
  attach: 'Attach', attachments: 'Attachments', remove: 'Remove', send: 'Send', stop: 'Stop', resend: 'Resend',
  queue: 'Queued prompts', queueItem: 'Queue prompt', edit: 'Edit', up: 'Move up', down: 'Move down', drag: 'Drag to reorder',
  submitted: 'Sending', streaming: 'Generating', ...props.labels,
}))
const describedBy = computed(() => [
  props.error || fileError.value ? `${id}-error` : undefined,
  props.feedback?.message ? `${id}-feedback-${props.feedbackPosition}` : undefined,
].filter(Boolean).join(' ') || undefined)
const invalid = computed(() => Boolean(props.error) || props.feedback?.type === 'error')
const maxHeight = computed(() => typeof props.maxHeight === 'number'
  ? `${Number.isFinite(props.maxHeight) ? Math.max(36, props.maxHeight) : 240}px` : props.maxHeight)
let nextQueueId = 0
let observer: ResizeObserver | undefined
let frame: number | undefined

function focus() {
  if (tokenEditor.value) tokenEditor.value.focus()
  else (textarea.value ?? shell.value?.querySelector<HTMLElement>('.sy-prompt-input__editor [contenteditable="true"], .sy-prompt-input__editor textarea'))?.focus({ preventScroll: true })
}

function snapshot(): PromptPayload {
  const segments = props.tokenMode ? tokens.value : props.getInputSegments?.()
  return {
    text: body.value,
    segments: segments ? normalizePromptSegments(segments) : undefined,
    files: [...files.value],
  }
}

function setDraft(draft: PromptPayload) {
  if (props.tokenMode) tokens.value = draft.segments ? normalizePromptSegments(draft.segments)
    : draft.text ? [{ type: 'text', text: draft.text }] : []
  else value.value = draft.text
  files.value = [...draft.files]
  fileError.value = ''
}

function clear() { setDraft({ text: '', files: [] }) }

function guard() {
  if (clearAfter.value) return false
  clearAfter.value = true
  void nextTick(() => { clearAfter.value = false })
  return true
}

function send() {
  if (running.value || !sendable.value || !guard()) return
  const payload = snapshot()
  if (props.clearOnSubmit) clear()
  emit('submit', payload)
}

function stop() {
  if (!props.disabled && running.value && guard()) emit('stop')
}

function enqueue() {
  if (!canQueue.value || !guard()) return
  let key = `${id}-queued-${++nextQueueId}`
  while (queue.value.some(item => item.id === key)) key = `${id}-queued-${++nextQueueId}`
  const item = { id: key, ...snapshot() }
  queue.value = [...queue.value, item]
  clear()
  emit('enqueue', item)
}

function editQueued(item: QueuedPrompt) {
  if (locked.value) return
  const current = snapshot()
  const hasDraft = Boolean(current.text || current.files.length)
  queue.value = hasDraft ? queue.value.map(queued => queued.id === item.id ? { id: item.id, ...current } : queued)
    : queue.value.filter(queued => queued.id !== item.id)
  setDraft(item)
  emit('editQueued', item)
  void nextTick(focus)
}

function keydown(event: KeyboardEvent) {
  if (composing.value || event.isComposing || event.keyCode === 229 || event.key !== 'Enter' || event.shiftKey
    || event.altKey || props.submitOn === 'manual') return
  const modifier = event.ctrlKey || event.metaKey
  if (modifier !== (props.submitOn === 'modifier-enter')) return
  event.preventDefault()
  if (event.repeat) return
  if (running.value) enqueue()
  else send()
}

function openPicker() {
  if (props.allowAttachments && !locked.value) picker.value?.click()
}

function added(incoming: readonly File[], invalid: FileRejection[] = []) {
  if (!props.allowAttachments || locked.value) return
  const next = addAcceptedFiles(incoming, files.value, { accept: props.accept, maxFiles: props.maxFiles, maxSize: props.maxFileSize })
  if (next.added.length) {
    files.value = next.files
    emit('filesAdded', next.added)
  }
  const rejected = [...invalid, ...next.rejected]
  const reasons = { type: 'unsupported type', size: 'file too large', limit: 'file limit reached', directory: 'folders are unsupported' }
  fileError.value = rejected.length ? props.formatFileRejections?.(rejected)
    ?? rejected.map(item => `${item.name} · ${reasons[item.reason]}`).join(' / ') : ''
  if (rejected.length) emit('filesRejected', rejected)
}

function picked(event: Event) {
  const input = event.target as HTMLInputElement
  added(Array.from(input.files ?? []))
  input.value = ''
}

function paste(event: ClipboardEvent) {
  const transfer = event.clipboardData
  if (!transfer?.files.length) return
  event.preventDefault()
  const payload = filesFromTransfer(transfer)
  added(payload.files, payload.rejected)
}

function dragContainsFiles(event: DragEvent) { return event.dataTransfer?.types.includes('Files') || dropDepth.value > 0 }
function dragEnter(event: DragEvent) {
  if (!dragContainsFiles(event)) return
  event.preventDefault()
  dropDepth.value++
}
function dragOver(event: DragEvent) {
  if (!dragContainsFiles(event)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = locked.value || !props.allowAttachments ? 'none' : 'copy'
}
function dragLeave(event: DragEvent) {
  if (dragContainsFiles(event)) dropDepth.value = Math.max(0, dropDepth.value - 1)
}
function drop(event: DragEvent) {
  if (!dragContainsFiles(event)) return
  event.preventDefault()
  dropDepth.value = 0
  if (!event.dataTransfer) return
  const payload = filesFromTransfer(event.dataTransfer)
  added(payload.files, payload.rejected)
}

function remove(file: File) {
  if (locked.value) return
  files.value = files.value.filter(item => fileKey(item) !== fileKey(file))
  fileError.value = ''
  emit('fileRemoved', file)
  void nextTick(focus)
}

const attachments = computed(() => files.value.map(file => ({
  file,
  attachment: { id: fileKey(file), name: file.name, file, disabled: locked.value } satisfies ChatAttachmentInfo,
})))

function fit() {
  const field = textarea.value ?? tokenEditor.value?.editor
  const node = shell.value
  const ruler = mirror.value
  const win = node?.ownerDocument.defaultView
  if (!field || !node || !ruler || !win || !node.clientWidth) return
  const style = win.getComputedStyle(node)
  if (props.layout === 'compact' && !hasInlineAttachments.value) {
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
    const gap = parseFloat(style.columnGap) || 0
    const start = toolbarStart.value?.offsetWidth ?? 0
    const end = toolbarEnd.value?.offsetWidth ?? 0
    const width = node.clientWidth - padding - start - end - gap * 2
    if (props.tokenMode) ruler.replaceChildren(...Array.from(field.childNodes, child => child.cloneNode(true)))
    else ruler.textContent = body.value || (props.placeholder ?? '')
    ruler.style.inlineSize = `${Math.max(1, width)}px`
    const line = parseFloat(win.getComputedStyle(ruler).lineHeight)
    wraps.value = ruler.scrollHeight > line + 1
  } else wraps.value = false

  if (textarea.value) {
    const input = textarea.value
    input.style.removeProperty('block-size')
    if (!props.autoGrow) return
    const block = input.offsetHeight
    input.style.blockSize = '0px'
    input.style.blockSize = `${Math.max(block, input.scrollHeight)}px`
  }
}

function scheduleFit() {
  const win = shell.value?.ownerDocument.defaultView
  if (!win || frame !== undefined) return
  frame = win.requestAnimationFrame(() => {
    frame = undefined
    fit()
  })
}

watch([body, hasInlineAttachments, () => props.layout, () => props.rows, () => props.autoGrow, () => props.size, () => props.tokenMode], scheduleFit, { flush: 'post' })
watch(actualLayout, async () => {
  scheduleFit()
  const controls = [toolbarStart.value, toolbarEnd.value].filter((node): node is HTMLDivElement => Boolean(node))
  const container = shell.value
  if (!container?.ownerDocument.defaultView || prefersReducedMotion(container)) return
  const prior = controls.map(node => node.getBoundingClientRect())
  await nextTick()
  for (const [index, node] of controls.entries()) {
    for (const animation of node.getAnimations()) animation.cancel()
    const current = node.getBoundingClientRect()
    const x = prior[index].left - current.left
    const y = prior[index].top - current.top
    if (Math.abs(x) + Math.abs(y) > 1) createAnimator(node).animate('prompt-layout', [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'none' }], {
      duration: 245, easing: 'cubic-bezier(.2,.76,.28,1)',
    })
  }
})

onMounted(() => {
  const node = shell.value
  const win = node?.ownerDocument.defaultView
  if (!node || !win) return
  const widths = new WeakMap<Element, number>()
  if (typeof win.ResizeObserver === 'function') {
    observer = new win.ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width === widths.get(entry.target)) continue
        widths.set(entry.target, entry.contentRect.width)
        scheduleFit()
      }
    })
    for (const target of [node, toolbarStart.value, toolbarEnd.value]) if (target) observer.observe(target)
  }
  void node.ownerDocument.fonts?.ready.then(scheduleFit)
  scheduleFit()
})
onBeforeUnmount(() => {
  observer?.disconnect()
  if (frame !== undefined) shell.value?.ownerDocument.defaultView?.cancelAnimationFrame(frame)
})
defineExpose({ focus, clear, send, stop, enqueue, openPicker, editQueued })
</script>

<template>
  <form class="sy-prompt-input" :aria-label="label" :aria-describedby="describedBy"
    :data-layout="actualLayout" :data-variant="variant" :data-size="size" :data-status="status"
    :data-has-header="Boolean($slots.headerActions || $slots.headerContext) || undefined"
    :style="{ '--sy-prompt-max-height': maxHeight }" @submit.prevent="send">
    <slot name="queue" :items="queue" :edit="editQueued">
      <Transition name="sy-prompt-queue">
        <SPromptQueue v-if="queue.length" v-model="queue" :label="labels.queue" :disabled="locked"
          :edit-label="labels.edit" :remove-label="labels.remove" :up-label="labels.up" :down-label="labels.down"
          :drag-label="labels.drag" :format-attachments="formatQueueAttachments"
          @edit="editQueued" @remove="emit('removeQueued', $event)" />
      </Transition>
    </slot>
    <Transition name="sy-chat-control">
      <p v-if="feedback?.message && feedbackPosition === 'top'" :id="`${id}-feedback-top`" class="sy-prompt-input__feedback"
        :data-tone="feedback.type" :role="feedback.type === 'error' ? 'alert' : 'status'">
        <SIcon :name="feedback.type" size="sm" /><SMotionText :value="feedback.message" wrap />
      </p>
    </Transition>
    <slot name="drawer" :files="files" :running="running" :remove="remove" :disabled="Boolean(locked)" />
    <div ref="shell" class="sy-prompt-input__shell" :data-dragging="dropDepth > 0 && !locked && allowAttachments || undefined"
      @dragenter="dragEnter" @dragover="dragOver" @dragleave="dragLeave" @drop="drop">
      <input v-if="allowAttachments" ref="picker" type="file" :accept="accept" :aria-label="labels.attach" :disabled="locked" multiple hidden @change="picked">
      <div v-if="$slots.headerActions || $slots.headerContext" class="sy-prompt-input__header">
        <div v-if="$slots.headerActions" class="sy-prompt-input__header-actions">
          <slot name="headerActions" :attach="openPicker" :disabled="Boolean(locked)" />
        </div>
        <div v-if="$slots.headerContext" class="sy-prompt-input__header-context">
          <slot name="headerContext" :running="running" />
        </div>
      </div>
      <div v-if="hasInlineAttachments" class="sy-prompt-input__attachments" role="list" :aria-label="labels.attachments">
        <div v-for="item in attachments" :key="item.attachment.id" class="sy-prompt-input__attachment" role="listitem">
          <slot name="attachment" :attachment="item.attachment" :remove="() => remove(item.file)">
            <SChatAttachment :attachment="item.attachment" :locale="locale" :removable="!locked" :remove-label="labels.remove"
              :type-labels="attachmentTypeLabels" @remove="remove(item.file)" />
          </slot>
        </div>
      </div>
      <div class="sy-prompt-input__editor">
        <slot name="input" :value="value" :update="(text: string) => { value = text }" :send="send" :label="label" :placeholder="placeholder"
          :disabled="Boolean(disabled)" :readonly="locked" :invalid="invalid" :described-by="describedBy">
        <SPromptTokenEditor v-if="tokenMode" ref="tokenEditor" v-model="tokens" :label="label" :placeholder="placeholder" :disabled="disabled" :readonly="locked"
          :suggestions="tokenOptions" :triggers="tokenTriggers" :allows-spaces="tokenAllowsSpaces" :suggestions-label="tokenOptionsLabel"
          :invalid="invalid" :described-by="describedBy"
          :popup-side="tokenPopupSide" :popup-align="tokenPopupAlign" @key="keydown" @paste="paste" @layout="scheduleFit">
          <template v-if="$slots.tokenOption" #option="details"><slot name="tokenOption" v-bind="details" /></template>
        </SPromptTokenEditor>
        <textarea v-else ref="textarea" v-model="value" class="sy-prompt-input__field"
          :placeholder="placeholder" :aria-label="label" :aria-invalid="invalid || undefined"
          :aria-describedby="describedBy" :rows="rows"
          :readonly="locked" :disabled="disabled" :data-autogrow="autoGrow || undefined"
          @keydown="keydown" @paste="paste" @compositionstart="composing = true" @compositionend="composing = false" />
        </slot>
      </div>
      <div ref="toolbarStart" class="sy-prompt-input__toolbar-start">
        <slot name="toolbarStart" :attach="openPicker" :disabled="Boolean(locked)">
          <SButton v-if="allowAttachments" size="sm" variant="secondary" :disabled="locked" @click="openPicker">{{ labels.attach }}</SButton>
        </slot>
      </div>
      <div ref="toolbarEnd" class="sy-prompt-input__toolbar-end">
        <div v-if="allowQueue" class="sy-prompt-input__queue-slot">
          <span class="sy-prompt-input__queue-size" aria-hidden="true">{{ labels.queueItem }}</span>
          <Transition name="sy-chat-control">
            <SButton v-show="running" size="sm" variant="secondary" :disabled="!canQueue" @click="enqueue">{{ labels.queueItem }}</SButton>
          </Transition>
        </div>
        <slot name="sendActions" :disabled="Boolean(locked)" :running="running" />
        <slot name="toolbarEnd" :send="send" :stop="stop" :enqueue="enqueue" :running="running" :can-submit="sendable">
          <SChatSendButton size="sm" appearance="text" :status="status" :disabled="disabled" :can-send="sendable"
            :send-label="labels.send" :stop-label="labels.stop" :resend-label="labels.resend" @send="send" @stop="stop" />
        </slot>
      </div>
      <div ref="mirror" class="sy-prompt-input__mirror" aria-hidden="true" inert />
    </div>
    <p v-if="error || fileError" :id="`${id}-error`" class="sy-prompt-input__error" role="alert">{{ error || fileError }}</p>
    <Transition name="sy-chat-control">
      <p v-if="feedback?.message && feedbackPosition === 'bottom'" :id="`${id}-feedback-bottom`" class="sy-prompt-input__feedback"
        :data-tone="feedback.type" :role="feedback.type === 'error' ? 'alert' : 'status'">
        <SIcon :name="feedback.type" size="sm" /><SMotionText :value="feedback.message" wrap />
      </p>
    </Transition>
    <span class="sy-visually-hidden" role="status">{{ status === 'submitted' ? labels.submitted : status === 'streaming' ? labels.streaming : '' }}</span>
    <slot name="footer" :status="status" />
  </form>
</template>
