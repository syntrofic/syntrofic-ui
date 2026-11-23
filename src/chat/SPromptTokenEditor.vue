<script setup lang="ts">
import { useLayerCollisionPadding } from '../internal/layer-context'
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'
import { usePortalTheme } from '../internal/portal-theme'
import SThemePortalScope from '../internal/SThemePortalScope.vue'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef, watch } from 'vue'
import { useKeyboardReveal } from '../internal/keyboard-reveal'
import { dialogContainer } from '../internal/dialog-container'
import { promptCaretRect, promptEditorSelection, readPromptEditor, setPromptEditorCaret, writePromptEditor } from './prompt-editor'
import { filterPromptSuggestions, findPromptTrigger, normalizePromptSegments, promptText, replacePromptRange, samePromptSegments, type PromptSegment, type PromptTokenSuggestion, type PromptTriggerRange } from './prompt-tokens'

const props = withDefaults(defineProps<{
  label: string
  placeholder?: string
  readonly?: boolean
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  triggers?: readonly string[]
  allowsSpaces?: boolean
  suggestions?: readonly PromptTokenSuggestion[]
  suggestionsLabel?: string
  popupSide?: 'top' | 'bottom'
  popupAlign?: 'start' | 'center' | 'end'
  filterSuggestions?: boolean
  loading?: boolean
  loadingText?: string
  emptyText?: string
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
  resolveSuggestion?: (suggestion: PromptTokenSuggestion) => Extract<PromptSegment, { type: 'token' }> | undefined
}>(), {
  triggers: () => ['@', '/'], suggestions: () => [], suggestionsLabel: 'Suggestions', popupSide: 'bottom', popupAlign: 'start',
  filterSuggestions: true, loadingText: 'Loading suggestions…',
})

const model = defineModel<PromptSegment[]>({ default: () => [] })
const emit = defineEmits<{ key: [event: KeyboardEvent]; paste: [event: ClipboardEvent]; layout: []; search: [range?: PromptTriggerRange] }>()
defineSlots<{ option(props: { suggestion: PromptTokenSuggestion; active: boolean }): unknown }>()

const editor = useTemplateRef<HTMLDivElement>('editor')
useKeyboardReveal(editor)
const id = useId()
const menuId = `sy-prompt-tokens-${id}`
const dialog = inject(dialogContainer, null)
const theme = ref<HTMLElement>()
const portal = computed(() => dialog?.value ?? theme.value)
const portalTheme = usePortalTheme(() => portal.value ?? 'body', editor)
const ready = ref(false)
const focused = ref(false)
const composing = ref(false)
const range = ref<PromptTriggerRange>()
const bounds = ref<DOMRect>()
const active = ref<string>()
const dismissed = ref<string>()
const text = computed(() => promptText(model.value))
const rangeKey = computed(() => range.value ? JSON.stringify([range.value.trigger, range.value.from]) : undefined)
const options = computed(() => range.value
  ? props.filterSuggestions ? filterPromptSuggestions(props.suggestions, range.value) : props.suggestions : [])
const enabled = computed(() => options.value.filter(item => !item.disabled))
const visible = computed(() => focused.value && !props.disabled && !props.readonly && !composing.value && Boolean(bounds.value)
  && Boolean(range.value) && (options.value.length > 0 || props.loading || Boolean(props.emptyText)) && dismissed.value !== rangeKey.value)
const optionId = (index: number) => `${menuId}-${index}`
const activeId = computed(() => {
  const index = options.value.findIndex(item => item.id === active.value)
  return visible.value && index >= 0 ? optionId(index) : undefined
})
const anchor = computed(() => {
  const rect = bounds.value
  return rect ? { getBoundingClientRect: () => rect, contextElement: editor.value ?? undefined } : undefined
})
const initial = text.value

watch(rangeKey, next => { if (next !== dismissed.value) dismissed.value = undefined }, { flush: 'sync' })
watch(() => range.value ? JSON.stringify([range.value.trigger, range.value.query, range.value.from, range.value.to]) : undefined,
  () => emit('search', range.value))
watch([enabled, rangeKey], ([items, key], previous) => {
  if (key !== previous?.[1] || !items.some(item => item.id === active.value)) active.value = items[0]?.id
})

function scheduleSelection() {
  const node = editor.value
  if (!node || !focused.value || composing.value) return
  const selection = promptEditorSelection(node)
  const collapsed = selection?.start === selection?.end && selection !== undefined
  range.value = collapsed ? findPromptTrigger(readPromptEditor(node), selection.end, props.triggers, props.allowsSpaces) : undefined
  bounds.value = collapsed ? promptCaretRect(node) : undefined
}
watch([() => props.triggers, () => props.allowsSpaces], scheduleSelection, { flush: 'post' })

function update(value: readonly PromptSegment[]) {
  const parts = normalizePromptSegments(value)
  if (!samePromptSegments(model.value, parts)) model.value = parts
  scheduleSelection()
  emit('layout')
}

function input() {
  const node = editor.value
  if (!node || composing.value) return
  update(readPromptEditor(node))
}

function apply(segments: readonly PromptSegment[], from?: number, to?: number) {
  const node = editor.value
  if (!node || props.disabled || props.readonly || composing.value) return false
  const selection = promptEditorSelection(node)
  const start = from ?? selection?.start ?? text.value.length
  const end = to ?? selection?.end ?? start
  const edited = replacePromptRange(model.value, start, end, segments)
  writePromptEditor(node, edited.parts)
  setPromptEditorCaret(node, edited.caret)
  update(edited.parts)
  return true
}

function pick(suggestion: PromptTokenSuggestion) {
  const match = range.value
  if (!match || !visible.value || suggestion.disabled) return
  const following = text.value[match.to]
  const gap = !following || !/[\s\p{Pe}\p{Po}]/u.test(following) ? ' ' : ''
  const token = props.resolveSuggestion ? props.resolveSuggestion(suggestion) :
    { type: 'token' as const, id: suggestion.id, label: suggestion.label, value: suggestion.value }
  if (!token) return
  apply([
    token,
    { type: 'text', text: gap },
  ], match.from, match.to)
}

function keydown(event: KeyboardEvent) {
  if (composing.value || event.isComposing || event.keyCode === 229) return
  if (visible.value && event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    dismissed.value = rangeKey.value
    return
  }
  if (visible.value && enabled.value.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault()
    const index = enabled.value.findIndex(item => item.id === active.value)
    const offset = event.key === 'ArrowDown' ? 1 : -1
    active.value = enabled.value[(index + offset + enabled.value.length) % enabled.value.length].id
    void nextTick(() => {
      if (activeId.value) editor.value?.ownerDocument.getElementById(activeId.value)?.scrollIntoView({ block: 'nearest' })
    })
    return
  }
  if (visible.value && event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
    const option = enabled.value.find(item => item.id === active.value)
    if (option) {
      event.preventDefault()
      pick(option)
      return
    }
    if (props.loading || props.emptyText) { event.preventDefault(); return }
  }
  emit('key', event)
  if (event.key === 'Enter' && !event.defaultPrevented && !props.readonly && !props.disabled) {
    event.preventDefault()
    apply([{ type: 'text', text: '\n' }])
  }
}

function paste(event: ClipboardEvent) {
  emit('paste', event)
  if (event.defaultPrevented || !event.clipboardData) return
  event.preventDefault()
  const value = event.clipboardData.getData('text/plain')
  if (value) apply([{ type: 'text', text: value }])
}

function drop(event: DragEvent) {
  if (event.dataTransfer?.types.includes('Files')) return
  event.preventDefault()
  const value = event.dataTransfer?.getData('text/plain')
  if (value) apply([{ type: 'text', text: value }])
}

function blur() {
  focused.value = false
  range.value = undefined
  bounds.value = undefined
}

function synchronize() {
  const node = editor.value
  if (!ready.value || !node || composing.value || samePromptSegments(readPromptEditor(node), model.value)) return
  const old = focused.value ? promptEditorSelection(node)?.end : undefined
  writePromptEditor(node, model.value)
  if (old !== undefined) setPromptEditorCaret(node, Math.min(old, text.value.length))
  scheduleSelection()
  emit('layout')
}

watch(model, synchronize, { flush: 'post', deep: true })
onMounted(async () => {
  const node = editor.value
  if (!node) return
  theme.value = node.closest<HTMLElement>('[data-sy-theme]') ?? undefined
  ready.value = true
  await nextTick()
  if (!node.isConnected) return
  writePromptEditor(node, model.value)
  node.ownerDocument.addEventListener('selectionchange', scheduleSelection)
  node.ownerDocument.defaultView?.addEventListener('scroll', scheduleSelection, { capture: true, passive: true })
  emit('layout')
})
onBeforeUnmount(() => {
  const node = editor.value
  node?.ownerDocument.removeEventListener('selectionchange', scheduleSelection)
  node?.ownerDocument.defaultView?.removeEventListener('scroll', scheduleSelection, true)
})
defineExpose({ editor, focus: () => editor.value?.focus(), insertSegments: apply })
const collisionPadding = useLayerCollisionPadding(9)
</script>

<template>
  <PopoverRoot :open="visible" :modal="false" @update:open="value => { if (!value) dismissed = rangeKey }">
    <PopoverAnchor as-child :reference="anchor">
      <div ref="editor" class="sy-prompt-input__field sy-prompt-input__token-field"
        :contenteditable="!readonly && !disabled" :tabindex="disabled ? -1 : 0"
        role="combobox" :aria-label="label" :aria-placeholder="placeholder" :aria-expanded="visible"
        :aria-controls="visible ? menuId : undefined" :aria-activedescendant="activeId" aria-autocomplete="list"
        :aria-readonly="readonly || undefined" :aria-disabled="disabled || undefined"
        :aria-invalid="invalid || undefined" :aria-describedby="describedBy"
        :enterkeyhint="enterKeyHint"
        :data-placeholder="placeholder" :data-empty="(!text && !composing) || undefined" spellcheck="false"
        @input="input" @focus="focused = true; scheduleSelection()" @blur="blur" @keydown="keydown" @keyup="scheduleSelection"
        @paste="paste" @drop="drop" @scroll.passive="scheduleSelection"
        @compositionstart="composing = true" @compositionend="composing = false; input()"><span v-if="!ready && initial">{{ initial }}</span></div>
    </PopoverAnchor>
    <PopoverPortal :to="portal">
      <SThemePortalScope :theme="portalTheme">
        <PopoverContent as-child :side="popupSide" :align="popupAlign" :side-offset="6" :collision-padding="collisionPadding"
          update-position-strategy="always" @open-auto-focus.prevent @close-auto-focus.prevent
          @escape-key-down.prevent="dismissed = rangeKey">
          <div :id="menuId" class="sy-prompt-input__suggestions"
            role="listbox" :aria-label="suggestionsLabel" :aria-labelledby="undefined" :aria-busy="loading || undefined">
            <div v-if="loading || !options.length" class="sy-prompt-input__suggestion-status" role="status">{{ loading ? loadingText : emptyText }}</div>
            <div v-for="(option, index) in options" :id="optionId(index)" :key="option.id" role="option"
              :aria-selected="option.id === active" :aria-disabled="option.disabled || undefined"
              @pointerdown.prevent @pointermove="!option.disabled && (active = option.id)" @click="pick(option)">
              <slot name="option" :suggestion="option" :active="option.id === active">
                <span>{{ option.label }}</span><small v-if="option.description">{{ option.description }}</small>
              </slot>
            </div>
          </div>
        </PopoverContent>
      </SThemePortalScope>
    </PopoverPortal>
  </PopoverRoot>
</template>
