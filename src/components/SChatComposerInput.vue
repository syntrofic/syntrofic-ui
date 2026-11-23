<script lang="ts">
import type { PromptTokenSegment, PromptTokenSuggestion } from '../chat/prompt-tokens'

export interface ChatComposerTrigger {
  character: string
  search(query: string, signal: AbortSignal): readonly PromptTokenSuggestion[] | Promise<readonly PromptTokenSuggestion[]>
  select?(suggestion: PromptTokenSuggestion): PromptTokenSegment | undefined
  emptyText?: string
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import SPromptTokenEditor from '../chat/SPromptTokenEditor.vue'
import { promptEditorSelection, setPromptEditorCaret } from '../chat/prompt-editor'
import { normalizePromptSegments, promptText, segmentText, type PromptSegment, type PromptTriggerRange } from '../chat/prompt-tokens'
import { pastedToken, type ChatPasteAsToken } from '../chat/paste-token'
import { filesFromTransfer, type FileRejection } from '../internal/file-acceptance'

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  maxRows?: number
  triggers?: readonly ChatComposerTrigger[]
  knownTokens?: readonly PromptTokenSegment[]
  debounceMs?: number
  loadingText?: string
  searchErrorText?: string
  history?: boolean
  disabled?: boolean
  readonly?: boolean
  invalid?: boolean
  describedBy?: string
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
  pasteAsToken?: boolean | ChatPasteAsToken | ((text: string) => PromptTokenSegment | undefined)
  pasteTokenThreshold?: number
  pastedTextLabel?: string
  handlePaste?: (text: string, event: ClipboardEvent) => boolean | void
}>(), { label: 'Message input', placeholder: 'Type a message…', maxRows: 8, triggers: () => [], knownTokens: () => [],
  debounceMs: 150, history: true, enterKeyHint: 'send', pasteAsToken: true, pasteTokenThreshold: 200, pastedTextLabel: 'Pasted text',
  searchErrorText: 'Could not load suggestions.' })
const emit = defineEmits<{
  submit: [value: string, segments: readonly PromptSegment[]]
  files: [files: File[]]
  filesRejected: [rejected: FileRejection[]]
  keydown: [event: KeyboardEvent]
  searchError: [error: unknown]
}>()
const model = defineModel<string>({ default: '' })
const editor = useTemplateRef<InstanceType<typeof SPromptTokenEditor>>('editor')
const interimText = ref('')
const id = `sy-composer-${useId()}`
let sequence = 0
const known = new Map<string, PromptTokenSegment>()
const stored = shallowRef(decode(model.value))
const segments = computed({ get: () => stored.value, set: write })
const range = shallowRef<PromptTriggerRange>()
const options = shallowRef<readonly PromptTokenSuggestion[]>([])
const loading = shallowRef(false)
const error = shallowRef(false)
const characters = computed(() => props.triggers.map(trigger => trigger.character))
const trigger = computed(() => props.triggers.find(item => item.character === range.value?.trigger))
const rows = computed(() => Math.max(1, Math.min(24, Math.floor(Number.isFinite(props.maxRows) ? props.maxRows : 8))))
const submissions: PromptSegment[][] = []
let historyIndex: number | undefined
let beforeHistory: PromptSegment[] = []

function decode(value: string) {
  const candidates = [...new Map([...props.knownTokens.map(token => [token.value, token] as const), ...known]).values()]
    .filter(token => token.value).sort((a, b) => b.value.length - a.value.length)
  const result: PromptSegment[] = []
  let from = 0
  while (from < value.length) {
    let at = value.length
    let selected: PromptTokenSegment | undefined
    for (const candidate of candidates) {
      const index = value.indexOf(candidate.value, from)
      if (index >= 0 && index < at) { at = index; selected = candidate }
    }
    if (at > from) result.push({ type: 'text', text: value.slice(from, at) })
    if (!selected) break
    result.push({ ...selected })
    from = at + selected.value.length
  }
  return result
}

function write(next: readonly PromptSegment[]) {
  stored.value = normalizePromptSegments(next)
  for (const token of stored.value) if (token.type === 'token') known.set(token.value, token)
  const text = promptText(stored.value)
  if (text !== model.value) model.value = text
}
watch(model, next => {
  if (next !== promptText(stored.value)) stored.value = decode(next)
})
watch([range, trigger], ([match, source], _, cleanup) => {
  options.value = []
  error.value = false
  loading.value = Boolean(match && source)
  if (!match || !source) return
  const controller = new AbortController()
  const timeout = setTimeout(async () => {
    try {
      const results = await source.search(match.query, controller.signal)
      if (!controller.signal.aborted) options.value = results
    } catch (reason) {
      if (!controller.signal.aborted) { error.value = true; emit('searchError', reason) }
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  }, Math.max(0, Number.isFinite(props.debounceMs) ? props.debounceMs : 150))
  cleanup(() => { clearTimeout(timeout); controller.abort() })
})

function choose(option: PromptTokenSuggestion) {
  return trigger.value?.select ? trigger.value.select(option) : { type: 'token' as const, id: option.id, value: option.value, label: option.label }
}

function insertText(text: string) { return editor.value?.insertSegments([{ type: 'text', text }]) ?? false }
function insertToken(token: PromptTokenSegment) { return editor.value?.insertSegments([token]) ?? false }
function expandToken(tokenId: string) {
  let offset = 0
  for (const token of stored.value) {
    const end = offset + segmentText(token).length
    if (token.type === 'token' && token.id === tokenId) {
      editor.value?.insertSegments([{ type: 'text', text: token.expandedText ?? token.value }], offset, end)
      return
    }
    offset = end
  }
}

function paste(event: ClipboardEvent) {
  if (props.disabled || props.readonly) { event.preventDefault(); return }
  const selected = event.clipboardData && filesFromTransfer(event.clipboardData)
  if (selected && (selected.files.length || selected.rejected.length)) {
    event.preventDefault()
    if (selected.files.length) emit('files', selected.files)
    if (selected.rejected.length) emit('filesRejected', selected.rejected)
    return
  }
  const text = event.clipboardData?.getData('text/plain')
  if (!text) return
  if (props.handlePaste?.(text, event)) { event.preventDefault(); return }
  if (event.defaultPrevented || !props.pasteAsToken) return
  if (typeof props.pasteAsToken === 'object') {
    if (props.pasteAsToken.onPaste(event, text)) event.preventDefault()
    return
  }
  if (text.length <= props.pasteTokenThreshold) return
  const token = typeof props.pasteAsToken === 'function' ? props.pasteAsToken(text) : pastedToken(text, id, ++sequence, props.pastedTextLabel)
  if (token && insertToken(token)) event.preventDefault()
}

function transfer(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return
  event.preventDefault()
  if (event.type === 'drop' && !props.disabled && !props.readonly) {
    const { files, rejected } = filesFromTransfer(event.dataTransfer)
    if (files.length) emit('files', files)
    if (rejected.length) emit('filesRejected', rejected)
  }
}

function keyboard(event: KeyboardEvent) {
  emit('keydown', event)
  if (event.defaultPrevented || props.disabled || props.readonly || event.isComposing || event.keyCode === 229) return
  if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault()
    const value = promptText(stored.value)
    if (!value.trim()) return
    if (props.history) {
      submissions.push(normalizePromptSegments(stored.value))
      if (submissions.length > 50) submissions.shift()
    }
    historyIndex = undefined
    emit('submit', value, normalizePromptSegments(stored.value))
    return
  }
  if (!props.history || !submissions.length || !['ArrowUp', 'ArrowDown'].includes(event.key) || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return
  const node = editor.value?.editor
  const selection = node && promptEditorSelection(node)
  if (!selection || selection.start !== selection.end) return
  const up = event.key === 'ArrowUp'
  if (up ? historyIndex === undefined && selection.start > 0 : historyIndex === undefined) return
  event.preventDefault()
  if (historyIndex === undefined) beforeHistory = normalizePromptSegments(stored.value)
  const index = Math.max(0, (historyIndex ?? submissions.length) + (up ? -1 : 1))
  historyIndex = index < submissions.length ? index : undefined
  write(historyIndex === undefined ? beforeHistory : submissions[historyIndex])
  void nextTick(() => { if (node?.isConnected) setPromptEditorCaret(node, promptText(stored.value).length) })
}

function focus(position?: 'start' | 'end') {
  editor.value?.focus()
  const node = editor.value?.editor
  if (node && position) setPromptEditorCaret(node, position === 'end' ? promptText(stored.value).length : 0)
}

defineExpose({ focus, getValue: () => promptText(stored.value), getSegments: () => normalizePromptSegments(stored.value),
  insertText, insertToken, expandToken, setInterimText: (text: string) => { interimText.value = text } })
</script>

<template>
  <div class="sy-chat-composer-input" :style="{ '--sy-composer-input-rows': rows }" @dragover="transfer" @drop="transfer">
    <SPromptTokenEditor ref="editor" v-model="segments" :label="label" :placeholder="placeholder" :triggers="characters"
      :suggestions="options" :filter-suggestions="false" :loading="loading" :loading-text="loadingText"
      :empty-text="error ? searchErrorText : trigger?.emptyText" :enter-key-hint="enterKeyHint" :resolve-suggestion="choose"
      :disabled="disabled" :readonly="readonly" :invalid="invalid" :described-by="describedBy"
      @search="range = $event" @key="keyboard" @paste="paste">
      <template v-if="$slots.option" #option="scope"><slot name="option" v-bind="scope" /></template>
    </SPromptTokenEditor>
    <div v-if="interimText" class="sy-chat-composer-input__interim" aria-live="off">{{ interimText }}</div>
  </div>
</template>
