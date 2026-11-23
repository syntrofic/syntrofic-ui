<script lang="ts">
export interface CodeEditorToken { text: string; className?: string }
export type CodeEditorTokenizer = (code: string, language: string) => readonly (readonly CodeEditorToken[])[]
</script>

<script setup lang="ts">
import { computed, defineComponent, h, useId, useTemplateRef, watchPostEffect } from 'vue'
import { renderCode } from '../internal/code-highlight'
import { onFormReset } from '../internal/form-reset'
import { layoutSize, type LayoutSize } from '../internal/layout-spacing'
import SLabel from './SLabel.vue'

const props = withDefaults(defineProps<{
  label: string
  language?: string
  name?: string
  form?: string
  rows?: number
  tabSize?: number
  readonly?: boolean
  disabled?: boolean
  indentWithTab?: boolean
  lineNumbers?: boolean
  placeholder?: string
  maxHeight?: LayoutSize
  size?: 'sm' | 'md'
  tokenizer?: CodeEditorTokenizer
}>(), { rows: 9, tabSize: 2, size: 'md' })
const model = defineModel<string>({ default: '' })
const initial = model.value
const uid = useId()
const input = useTemplateRef<HTMLTextAreaElement>('input')
const preview = useTemplateRef<HTMLPreElement>('preview')
const gutter = useTemplateRef<HTMLPreElement>('gutter')
const indentation = computed(() => Math.min(8, Math.max(1, Math.trunc(props.tabSize) || 2)))
const lines = computed(() => props.lineNumbers ? model.value.split('\n').length : 0)
const nums = computed(() => Array.from({ length: lines.value }, (_, index) => index + 1).join('\n') + '\n')
const editorStyle = computed(() => ({
  '--sy-editor-tab-size': indentation.value,
  '--sy-editor-gutter-width': (String(lines.value).length + 3) + 'ch',
  '--sy-editor-max-height': layoutSize(props.maxHeight),
}))
const highlighted = computed(() => {
  const text = model.value
  const tokenizer = props.tokenizer
  if (!tokenizer) return renderCode(text + '\n', props.language)
  try {
    const tokens = tokenizer(text, props.language ?? 'plaintext')
    if (tokens.map(line => line.map(token => token.text).join('')).join('\n') === text) {
      return tokens.flatMap(line => [...line.map(token => token.className ? h('span', { class: token.className }, token.text) : token.text), '\n'])
    }
  } catch {
    // Keep the text visible when a custom tokenizer cannot parse it.
  }
  return renderCode(text + '\n', props.language)
})
const Code = defineComponent({ setup: () => () => h('code', highlighted.value) })
onFormReset(() => input.value, () => { model.value = initial })

function sync() {
  if (!input.value || !preview.value) return
  preview.value.scrollTop = input.value.scrollTop
  preview.value.scrollLeft = input.value.scrollLeft
  if (gutter.value) gutter.value.scrollTop = input.value.scrollTop
}
watchPostEffect(() => { void model.value; void gutter.value; sync() })

function edit(event: KeyboardEvent) {
  const node = input.value
  if (!node || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || props.readonly || props.disabled) return
  const start = node.selectionStart
  const end = node.selectionEnd
  if (event.key === 'Tab' && props.indentWithTab && !event.shiftKey) {
    event.preventDefault()
    node.setRangeText(' '.repeat(indentation.value), start, end, 'end')
  } else if (event.key === 'Enter') {
    const line = model.value.slice(0, start).split('\n').at(-1) ?? ''
    const spaces = /^\s*/.exec(line)?.[0] ?? ''
    if (!spaces) return
    event.preventDefault()
    node.setRangeText('\n' + spaces, start, end, 'end')
  } else return
  model.value = node.value
}
</script>

<template>
  <div class="sy-code-editor sy-code-block" :data-size="size" :style="editorStyle">
    <SLabel :for="uid" class="sy-code-block__header"><span>{{ label }}</span><span v-if="language" aria-hidden="true">{{ language }}</span></SLabel>
    <div class="sy-code-editor__body" dir="ltr">
      <pre v-if="lineNumbers" ref="gutter" class="sy-code-editor__gutter" aria-hidden="true">{{ nums }}</pre>
      <pre ref="preview" class="sy-code-editor__preview" aria-hidden="true"><Code /></pre>
      <textarea :id="uid" ref="input" v-model="model" :defaultValue.prop="initial" :name="name" :form="form"
        :rows="rows" :disabled="disabled" :readonly="readonly" :placeholder="placeholder" wrap="off" dir="ltr" spellcheck="false"
        autocapitalize="off" autocomplete="off" @scroll.passive="sync" @keydown="edit" />
    </div>
  </div>
</template>
