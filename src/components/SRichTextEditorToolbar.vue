<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import type { Editor } from '@tiptap/core'
import { ToolbarButton, ToolbarRoot } from 'reka-ui'
import { contentUrl } from '../internal/content-url'
import { actions, blockStyles, currentBlock, editorCommands, marks, richTextMessages, type RichTextAction, type RichTextMessages } from '../internal/rich-text-commands'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'
import SPopover from './SPopover.vue'

const props = withDefaults(defineProps<{
  editor?: Editor
  disabled?: boolean
  label?: string
  headingLevels?: readonly ('h1' | 'h2' | 'h3')[]
  size?: 'sm' | 'md' | 'lg'
  hasLink?: boolean
  hasNewTabLinks?: boolean
  promptForUrl?: (selectedText: string) => string | null | undefined
  messages?: Partial<RichTextMessages>
  embedded?: boolean
}>(), { headingLevels: () => ['h1', 'h2', 'h3'], size: 'sm', hasLink: true, hasNewTabLinks: true })
const messages = computed(() => ({ ...richTextMessages, ...props.messages }))
const steps = ref(0)
const uid = useId()
const linkOpen = ref(false)
const linkText = ref('')
const invalidLink = ref(false)
const options = computed(() => ['paragraph', ...props.headingLevels, ...blockStyles.slice(4)] as const)
const block = computed(() => { void steps.value; return currentBlock(props.editor) })
const linked = computed(() => { void steps.value; return Boolean(props.editor?.isActive('link')) })

watch(() => props.editor, (editor, _, cleanup) => {
  if (!editor) return
  const refresh = () => { steps.value++ }
  editor.on('transaction', refresh)
  cleanup(() => { editor.off('transaction', refresh) })
}, { immediate: true })
watch(() => props.disabled, disabled => { if (disabled) linkOpen.value = false })
defineExpose({ closeLink: () => { linkOpen.value = false } })

function permitted(action: RichTextAction) {
  void steps.value
  return Boolean(!props.disabled && props.editor && editorCommands[action](props.editor.can().chain()).run())
}
function active(action: typeof marks[number]) {
  void steps.value
  return Boolean(props.editor?.isActive(action))
}
function run(action: RichTextAction) {
  if (!props.editor || props.disabled) return
  editorCommands[action](props.editor.chain()).run()
  props.editor.view.focus()
}
function updateLink(open: boolean | undefined) {
  const editor = props.editor
  if (open && editor) {
    if (!linked.value && props.promptForUrl) {
      const { from, to } = editor.state.selection
      const url = props.promptForUrl(editor.state.doc.textBetween(from, to))
      if (url) applyLink(url)
      return
    }
    linkText.value = String(editor.getAttributes('link').href ?? '')
    invalidLink.value = false
  }
  linkOpen.value = Boolean(open)
}
function applyLink(source: string) {
  const editor = props.editor
  if (!editor || props.disabled) return
  const input = source.trim()
  const href = contentUrl(/^[\w.-]+\.[a-z]{2,}(?:[/?#]|$)/i.test(input) ? 'https://' + input : input)
  if (!href) {
    invalidLink.value = true
    return
  }
  const attrs = { href, target: props.hasNewTabLinks ? '_blank' : null, rel: 'noopener noreferrer' }
  if (editor.state.selection.empty && !linked.value) {
    editor.chain().insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs }] }).run()
  } else editor.chain().extendMarkRange('link').setLink(attrs).run()
  linkOpen.value = false
}
function linkKey(event: KeyboardEvent) {
  if (event.isComposing) return
  event.preventDefault()
  event.stopPropagation()
  applyLink(linkText.value)
}
function unlink() {
  if (props.disabled || !props.editor) return
  props.editor.chain().extendMarkRange('link').unsetLink().run()
  linkOpen.value = false
}
</script>

<template>
  <div class="sy-rich-text__toolbar" :data-embedded="embedded || undefined" :data-size="size">
    <select class="sy-field__control sy-rich-text__block" :aria-label="messages.blockStyle" :value="block" :disabled="disabled || !editor"
      @change="run(($event.target as HTMLSelectElement).value as RichTextAction)">
      <option v-for="option in options" :key="option" :value="option">{{ messages[option] }}</option>
    </select>
    <ToolbarRoot class="sy-rich-text__tools" :aria-label="label ?? messages.toolbar">
      <ToolbarButton v-for="item in marks" :key="item" as-child :disabled="!permitted(item)">
        <SButton :size="size" variant="ghost" :aria-pressed="active(item)" :disabled="!permitted(item)"
          @mousedown.prevent @click="run(item)">{{ messages[item] }}</SButton>
      </ToolbarButton>
      <SPopover v-if="hasLink" :open="linkOpen" @update:open="updateLink">
        <template #trigger>
          <ToolbarButton as-child :disabled="disabled || !editor">
            <SButton :size="size" variant="ghost" :disabled="disabled || !editor" :aria-pressed="linked" @mousedown.prevent>{{ messages.link }}</SButton>
          </ToolbarButton>
        </template>
        <div class="sy-rich-text__link">
          <div class="sy-rich-text__link-fields">
            <label :for="uid + '-url'" class="sy-field__label">{{ messages.url }}</label>
            <input :id="uid + '-url'" v-model="linkText" class="sy-field__control" :aria-invalid="invalidLink || undefined"
              :aria-describedby="invalidLink ? uid + '-url-error' : undefined" inputmode="url" @input="invalidLink = false" @keydown.enter="linkKey">
            <span :id="uid + '-url-error'" class="sy-rich-text__link-error"><SMotionText :value="invalidLink ? messages.invalidUrl : ''" announce /></span>
            <div class="sy-rich-text__tools">
              <SButton :size="size" @click="applyLink(linkText)">{{ messages.apply }}</SButton>
              <SButton :size="size" variant="secondary" :disabled="!linked" @click="unlink">{{ messages.unlink }}</SButton>
            </div>
          </div>
        </div>
      </SPopover>
      <ToolbarButton v-for="item in actions" :key="item" as-child :disabled="!permitted(item)">
        <SButton :size="size" variant="ghost" :disabled="!permitted(item)" @mousedown.prevent @click="run(item)">{{ messages[item] }}</SButton>
      </ToolbarButton>
      <slot name="end" :editor="editor" />
    </ToolbarRoot>
  </div>
</template>
