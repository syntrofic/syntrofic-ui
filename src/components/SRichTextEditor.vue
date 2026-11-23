<script setup lang="ts">
import { computed, markRaw, ref, useId, useTemplateRef, watch } from 'vue'
import { Extension, type Editor, type Extensions } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { BubbleMenu, FloatingMenu } from '@tiptap/vue-3/menus'
import { Plugin } from '@tiptap/pm/state'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { contentUrl } from '../internal/content-url'
import { blockStyles, editorCommands, marks, richTextMessages,
  type RichTextAction, type RichTextDetails, type RichTextDocument, type RichTextMessages, type RichTextSuggestion } from '../internal/rich-text-commands'
import { useRichTextSuggestions } from '../internal/rich-text-suggestions'
import { createRichTextAutoLink, type RichTextAutoLinkOptions } from '../internal/rich-text-auto-link'
import { onFormReset } from '../internal/form-reset'
import SButton from './SButton.vue'
import SNumberValue from './SNumberValue.vue'
import SRichTextEditorToolbar from './SRichTextEditorToolbar.vue'

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  name?: string
  form?: string
  maxLength?: number
  showCount?: boolean
  showWordCount?: boolean
  disabled?: boolean
  readonly?: boolean
  bubble?: boolean
  floating?: boolean
  suggestions?: readonly RichTextSuggestion[] | false
  messages?: Partial<RichTextMessages>
  extensions?: Extensions
  autoLink?: RichTextAutoLinkOptions | false
  locale?: string
  defaultValue?: RichTextDocument
  variant?: 'primary' | 'secondary'
}>(), { label: 'Rich text', placeholder: 'Start writing…', showCount: true, bubble: true, suggestions: undefined, variant: 'primary' })
const emit = defineEmits<{ change: [value: RichTextDocument, details: RichTextDetails]; contentError: [error: Error] }>()
defineSlots<{
  toolbar(props: { editor: Editor | undefined; run: (action: RichTextAction) => void }): unknown
  bubble(props: { editor: Editor; run: (action: RichTextAction) => void }): unknown
  floating(props: { editor: Editor; run: (action: RichTextAction) => void }): unknown
  footer(props: { characters: number; words: number; overLimit: boolean }): unknown
}>()
const value = defineModel<RichTextDocument>()
const empty: RichTextDocument = { type: 'doc', content: [{ type: 'paragraph' }] }
const initial = value.value ?? props.defaultValue ?? empty
const uid = useId()
const suggestionId = `sy-editor-${uid}-suggestions`
const native = useTemplateRef<HTMLInputElement>('native')
const documentRegion = useTemplateRef<HTMLDivElement>('documentRegion')
const toolbar = useTemplateRef<InstanceType<typeof SRichTextEditorToolbar>>('toolbar')
const messages = computed(() => ({ ...richTextMessages, ...props.messages }))
const canEdit = computed(() => !props.disabled && !props.readonly)
const step = ref(0)
const normalizedLimit = computed(() => typeof props.maxLength === 'number' && Number.isFinite(props.maxLength) ? Math.max(0, Math.floor(props.maxLength)) : undefined)

const segmenters = computed(() => ({
  words: new Intl.Segmenter(props.locale, { granularity: 'word' }),
  characters: new Intl.Segmenter(props.locale, { granularity: 'grapheme' }),
}))
const charactersOf = (text: string) => Array.from(segmenters.value.characters.segment(text)).length
const wordsOf = (text: string) => Array.from(segmenters.value.words.segment(text)).filter(part => part.isWordLike).length
const suggestions = useRichTextSuggestions(suggestionId,
  () => props.suggestions || blockStyles.filter(item => item !== 'paragraph').map(id => ({
    id, label: messages.value[id], run: (editor: Editor) => { editorCommands[id](editor.chain()).run() },
  })),
  () => canEdit.value && props.suggestions !== false,
)
const { host, visible, active, items, choose, cleanup } = suggestions
const sizeLimit = Extension.create({
  name: 'syntroficTextLimit',
  addProseMirrorPlugins() {
    return [new Plugin({
      filterTransaction(transaction, state) {
        const limit = normalizedLimit.value
        if (limit === undefined || !transaction.docChanged || transaction.getMeta('syntrofic-replace')) return true
        const count = charactersOf(transaction.doc.textContent)
        return count <= limit || count < charactersOf(state.doc.textContent)
      },
    })]
  },
})
let serialized = JSON.stringify(initial)
const serializedValue = ref(serialized)
const editor = useEditor({
  content: initial,
  editable: canEdit.value,
  enableContentCheck: true,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, defaultProtocol: 'https', autolink: false, shouldAutoLink: () => false,
        linkOnPaste: props.autoLink !== false, isAllowedUri: url => contentUrl(url) !== undefined },
    }),
    Placeholder.configure({ placeholder: () => props.placeholder }),
    sizeLimit, suggestions.extension, createRichTextAutoLink(() => props.autoLink ?? {}), ...(props.extensions ?? []).map(item => markRaw(item)),
  ],
  editorProps: {
    attributes: { class: 'sy-rich-text__editable sy-prose', role: 'textbox', 'aria-multiline': 'true' },
  },
  onTransaction: () => { step.value++ },
  onContentError: ({ error }) => emit('contentError', error),
  onUpdate: ({ editor }) => {
    const document = editor.getJSON()
    serialized = JSON.stringify(document)
    serializedValue.value = serialized
    const text = editor.getText()
    value.value = document
    emit('change', document, { html: editor.getHTML(), text, empty: editor.isEmpty, characters: charactersOf(editor.state.doc.textContent), words: wordsOf(text) })
  },
})

function replace(document: RichTextDocument) {
  const json = JSON.stringify(document)
  if (json === serialized) return
  if (!editor.value) return
  try {
    editor.value.chain().setMeta('syntrofic-replace', true).setMeta('addToHistory', false)
      .setContent(document, { emitUpdate: false, errorOnInvalidContent: true }).run()
    serialized = JSON.stringify(editor.value.getJSON())
    serializedValue.value = serialized
  } catch (error) {
    emit('contentError', error instanceof Error ? error : new Error(String(error)))
  }
}
watch(() => [editor.value, value.value] as const, ([instance, document], [previous]) => {
  if (!instance) return
  if (instance !== previous) serializedValue.value = JSON.stringify(instance.getJSON())
  replace(document ?? props.defaultValue ?? empty)
})
onFormReset(() => native.value, () => {
  replace(initial)
  value.value = initial
  toolbar.value?.closeLink()
})
watch([editor, canEdit, () => props.disabled], ([instance, editable, disabled]) => {
  if (!instance) return
  instance.setEditable(editable, false)
  const dom = instance.view.dom
  dom.setAttribute('aria-labelledby', `${uid}-label`)
  dom.setAttribute('aria-readonly', String(!editable))
  dom.setAttribute('aria-disabled', String(Boolean(disabled)))
  dom.setAttribute('tabindex', disabled ? '-1' : '0')
}, { flush: 'post', immediate: true })

const count = computed(() => { void step.value; return charactersOf(editor.value?.state.doc.textContent ?? plainText(initial)) })
const wordCount = computed(() => { void step.value; return wordsOf(editor.value?.getText() ?? plainText(initial)) })
const overLimit = computed(() => normalizedLimit.value !== undefined && count.value > normalizedLimit.value)
watch([editor, overLimit, () => props.showCount], ([instance, invalid, countShown]) => {
  if (!instance) return
  instance.view.dom.setAttribute('aria-invalid', String(invalid))
  if (countShown) instance.view.dom.setAttribute('aria-describedby', `${uid}-count`)
  else instance.view.dom.removeAttribute('aria-describedby')
}, { flush: 'post', immediate: true })

function plainText(document: RichTextDocument): string {
  return document.text ?? document.content?.map(plainText).join(document.type === 'doc' ? '\n' : '') ?? ''
}

function selected(action: typeof marks[number]) {
  void step.value
  return Boolean(editor.value?.isActive(action))
}
function run(action: RichTextAction) {
  const instance = editor.value
  if (!canEdit.value || !instance) return
  editorCommands[action](instance.chain()).run()
  instance.view.focus()
}
</script>

<template>
  <section class="sy-rich-text" :data-variant="variant" :data-disabled="disabled || undefined" :data-readonly="readonly || undefined">
    <span :id="uid + '-label'" class="sy-field__label">{{ label }}</span>
    <div class="sy-rich-text__shell">
      <div v-if="!readonly" class="sy-rich-text__toolbar">
        <slot name="toolbar" :editor="editor" :run="run">
          <SRichTextEditorToolbar ref="toolbar" :editor="editor" :disabled="!canEdit" :messages="messages" embedded />
        </slot>
      </div>
      <div ref="documentRegion" class="sy-rich-text__document">
        <EditorContent v-if="editor" :editor="editor" class="sy-rich-text__body" />
        <p v-else class="sy-rich-text__editable sy-rich-text__placeholder">{{ plainText(initial) || placeholder }}</p>
        <BubbleMenu v-if="editor && canEdit && bubble" :editor="editor" class="sy-rich-text__float" :options="{ placement: 'top', offset: 7,
          flip: { padding: 8, boundary: documentRegion ?? 'clippingAncestors' },
          shift: { padding: 8, crossAxis: true, boundary: documentRegion ?? 'clippingAncestors' } }">
          <div class="sy-rich-text__float-body" role="toolbar" :aria-label="messages.selection">
            <slot name="bubble" :editor="editor" :run="run">
              <SButton v-for="item in (['bold', 'italic', 'code'] as const)" :key="item" size="sm" variant="ghost"
                :aria-pressed="selected(item)" @mousedown.prevent @click="run(item)">{{ messages[item] }}</SButton>
            </slot>
          </div>
        </BubbleMenu>
        <FloatingMenu v-if="editor && canEdit && floating" :editor="editor" class="sy-rich-text__float" :options="{ placement: 'bottom-start', offset: 6 }">
          <div class="sy-rich-text__float-body" role="toolbar" :aria-label="messages.insert">
            <slot name="floating" :editor="editor" :run="run">
              <SButton size="sm" variant="ghost" @mousedown.prevent @click="run('h2')">{{ messages.h2 }}</SButton>
              <SButton size="sm" variant="ghost" @mousedown.prevent @click="run('bullets')">{{ messages.bullets }}</SButton>
            </slot>
          </div>
        </FloatingMenu>
        <div :id="suggestionId + '-container'" />
      </div>
      <div v-if="showCount || $slots.footer" :id="uid + '-count'" class="sy-rich-text__footer" :data-over-limit="overLimit || undefined">
        <slot name="footer" :characters="count" :words="wordCount" :over-limit="overLimit">
          <SNumberValue :value="count" :reserve="3" :locale="locale" />
          <span v-if="normalizedLimit !== undefined"> / {{ normalizedLimit }}</span>
          <span>{{ messages.characters }}</span>
          <template v-if="showWordCount"><SNumberValue :value="wordCount" :reserve="3" :locale="locale" /><span>{{ messages.words }}</span></template>
        </slot>
      </div>
      <input v-if="name" ref="native" type="hidden" :name="name" :form="form" :value="serializedValue" :disabled="disabled">
    </div>
    <Teleport v-if="host" :to="host">
      <Transition name="sy-suggestion" @after-leave="cleanup">
        <div v-if="visible" :id="suggestionId" class="sy-rich-text__suggestions" role="listbox" :aria-label="messages.suggestions">
          <div v-for="(item, index) in items" :id="suggestionId + '-' + index" :key="item.id" role="option"
            :aria-selected="active === index" @mousedown.prevent @click="choose(index)">{{ item.label }}</div>
          <div v-if="!items.length" class="sy-rich-text__no-suggestions">{{ messages.noSuggestions }}</div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
