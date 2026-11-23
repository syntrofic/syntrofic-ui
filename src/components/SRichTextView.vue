<script lang="ts">
import type { VNodeChild } from 'vue'
import type { RichTextDocument } from '../internal/rich-text-commands'

export type RichTextNodeRenderer = (node: RichTextDocument, children: readonly VNodeChild[]) => VNodeChild
</script>

<script setup lang="ts">
import { computed, defineAsyncComponent, h, watch } from 'vue'
import { contentUrl } from '../internal/content-url'

const SCodeBlock = defineAsyncComponent(() => import('./SCodeBlock.vue'))

const props = defineProps<{
  value: RichTextDocument | string
  label?: string
  errorFallback?: string
  nodes?: Readonly<Record<string, RichTextNodeRenderer>>
}>()
const emit = defineEmits<{ parseError: [error: Error] }>()
const tags: Readonly<Record<string, string>> = {
  paragraph: 'p', blockquote: 'blockquote', bulletList: 'ul', orderedList: 'ol', listItem: 'li', horizontalRule: 'hr',
  hardBreak: 'br', table: 'table', tableRow: 'tr', tableCell: 'td', tableHeader: 'th',
}
const marks: Readonly<Record<string, string>> = { bold: 'strong', italic: 'em', strike: 's', underline: 'u', code: 'code', subscript: 'sub', superscript: 'sup', highlight: 'mark' }

function text(node: RichTextDocument): VNodeChild {
  if (typeof node.text !== 'string') throw new Error('Invalid rich-text text node')
  let child: VNodeChild = node.text
  for (const mark of node.marks ?? []) {
    if (mark.type === 'link') {
      const href = contentUrl(mark.attrs?.href)
      if (href) child = h('a', { href, target: mark.attrs?.target === '_blank' ? '_blank' : undefined, rel: 'noopener noreferrer' }, [child])
    } else if (Object.hasOwn(marks, mark.type)) child = h(marks[mark.type], [child])
  }
  return child
}
function number(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : undefined
}
function render(node: RichTextDocument): VNodeChild {
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') throw new Error('Invalid rich-text node')
  if (node.type === 'text') return text(node)
  const children = (node.content ?? []).map(render)
  if (node.type === 'doc') return children
  const custom = props.nodes && Object.hasOwn(props.nodes, node.type) ? props.nodes[node.type] : undefined
  if (custom) return custom(node, children)
  if (node.type === 'heading') return h(`h${number(node.attrs?.level, 1, 6) ?? 2}`, children)
  if (node.type === 'codeBlock') {
    const language = typeof node.attrs?.language === 'string' ? node.attrs.language : undefined
    return h(SCodeBlock, { code: (node.content ?? []).map(item => item.type === 'hardBreak' ? '\n' : item.text ?? '').join(''), language })
  }
  if (node.type === 'image') {
    const src = contentUrl(node.attrs?.src, true)
    const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''
    return src ? h('img', { src, alt, loading: 'lazy', decoding: 'async' }) : alt
  }
  if (!Object.hasOwn(tags, node.type)) throw new Error(`Unsupported rich-text node: ${node.type}`)
  if (node.type === 'table') return h('div', { class: 'sy-markdown__table', tabindex: 0 }, [h('table', [h('tbody', children)])])
  if (node.type === 'tableCell' || node.type === 'tableHeader') return h(tags[node.type], {
    colspan: number(node.attrs?.colspan, 1, 100), rowspan: number(node.attrs?.rowspan, 1, 100),
  }, children)
  if (node.type === 'orderedList') return h('ol', { start: number(node.attrs?.start, -100000, 100000) }, children)
  return h(tags[node.type], children)
}

const parsed = computed(() => {
  try {
    const document: RichTextDocument = typeof props.value === 'string' ? JSON.parse(props.value) : props.value
    if (document?.type !== 'doc') throw new Error('Expected a rich-text document')
    return { fragment: render(document) }
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }
})
watch(parsed, result => { if (result.error) emit('parseError', result.error) }, { immediate: true })
const Content = () => parsed.value.fragment
</script>

<template>
  <div v-if="!parsed.error" class="sy-rich-text-view sy-prose" :aria-label="label" :role="label ? 'region' : undefined"><Content /></div>
  <slot v-else name="error" :error="parsed.error"><p v-if="errorFallback">{{ errorFallback }}</p></slot>
</template>
