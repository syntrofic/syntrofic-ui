<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, ref, watch } from 'vue'
import { renderCode, renderCodeLines } from '../internal/code-highlight'
import { writeClipboard } from '../internal/clipboard'
import { syntaxStyle, type SyntaxThemeDefinition } from '../internal/syntax-theme'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{
  code: string
  language?: string
  label?: string
  copyLabel?: string
  copiedLabel?: string
  failureLabel?: string
  scrollLabel?: string
  copyable?: boolean
  wrap?: boolean
  lineNumbers?: boolean
  highlightLines?: readonly number[]
  maxHeight?: number | string
  showLanguageLabel?: boolean
  syntaxTheme?: SyntaxThemeDefinition
}>(), {
  copyable: true, showLanguageLabel: true, copyLabel: 'Copy', copiedLabel: 'Copied', failureLabel: 'Could not copy', scrollLabel: 'Code',
})
defineSlots<{
  label(props: { language: string | undefined }): unknown
  actions(props: { copy: () => Promise<void>; state: 'ready' | 'copied' | 'failed' }): unknown
}>()
const emit = defineEmits<{ copy: [text: string]; copyError: [error: unknown] }>()
const state = ref<'ready' | 'copied' | 'failed'>('ready')
let timer: ReturnType<typeof setTimeout> | undefined
let attempt = 0
const text = computed(() => state.value === 'copied' ? props.copiedLabel : state.value === 'failed' ? props.failureLabel : props.copyLabel)
const highlighted = computed(() => renderCode(props.code, props.language))
const lineMarkup = computed(() => renderCodeLines(props.code, props.language))
const marked = computed(() => new Set(props.highlightLines))
const palette = computed(() => props.syntaxTheme && syntaxStyle(props.syntaxTheme.tokens))
const maxHeight = computed(() => typeof props.maxHeight === 'number' ? Math.max(0, props.maxHeight) + 'px' : props.maxHeight)
const Code = defineComponent({
  setup: () => () => props.highlightLines === undefined ? h('code', highlighted.value)
    : h('code', { class: 'sy-code-block__lines' }, lineMarkup.value.flatMap((line, index) => [
      ...(index ? ['\n'] : []),
      h('span', { key: index, class: 'sy-code-block__line', 'data-line': index + 1,
        'data-highlighted': marked.value.has(index + 1) || undefined }, line),
    ])),
})
const lineCount = computed(() => props.code.split('\n').length)
function reset() {
  attempt++
  clearTimeout(timer)
  state.value = 'ready'
}
watch(() => props.code, reset)
onBeforeUnmount(reset)

async function copy() {
  const request = ++attempt
  const source = props.code
  clearTimeout(timer)
  try {
    await writeClipboard(source, document)
    if (request !== attempt) return
    state.value = 'copied'
    emit('copy', source)
  } catch (error) {
    if (request !== attempt) return
    state.value = 'failed'
    emit('copyError', error)
  }
  timer = setTimeout(() => { state.value = 'ready' }, 1750)
}
</script>

<template>
  <figure class="sy-code-block" :data-wrap="wrap || undefined" :data-syntax-theme="syntaxTheme?.name" :style="palette">
    <figcaption v-if="label || showLanguageLabel && language || copyable || $slots.label || $slots.actions" class="sy-code-block__header"
      :data-copy-only="copyable && !label && !(showLanguageLabel && language) && !$slots.label && !$slots.actions || undefined">
      <div class="sy-code-block__header-track">
        <div class="sy-code-block__header-row">
          <span><slot name="label" :language="language">{{ label ?? (showLanguageLabel ? language ?? scrollLabel : '') }}</slot></span>
          <slot name="actions" :copy="copy" :state="state">
            <SButton v-if="copyable" size="sm" variant="ghost" :aria-label="text" class="sy-code-block__copy" @click="copy">
              <span class="sy-code-block__copy-text">
                <span aria-hidden="true">{{ copyLabel }}</span><span aria-hidden="true">{{ copiedLabel }}</span><span aria-hidden="true">{{ failureLabel }}</span>
                <SMotionText :value="text" />
              </span>
            </SButton>
          </slot>
          <span class="sy-visually-hidden" role="status">{{ state === 'ready' ? '' : text }}</span>
        </div>
      </div>
    </figcaption>
    <div class="sy-code-block__scroll" tabindex="0" role="region" :aria-label="scrollLabel" :style="{ maxBlockSize: maxHeight }">
      <div v-if="lineNumbers && !wrap" class="sy-code-block__gutter" aria-hidden="true">
        <span v-for="line in lineCount" :key="line" :data-highlighted="marked.has(line) || undefined">{{ line }}</span>
      </div>
      <pre><Code /></pre>
    </div>
  </figure>
</template>
