<script setup lang="ts">
import { prefersReducedMotion } from '../src/internal/reduced-motion'
import { nextTick, ref, useTemplateRef } from 'vue'
import { SAvatar, SBadge, SButton, SIcon, SItem, SMotionText, useContainerReveal } from '../src'

const people = [
  { id: 'lin', name: '林舟', detail: '负责版本签发', color: 'purple', role: '负责人' },
  { id: 'he', name: '陈禾', detail: '整理发布手册', color: 'blue', role: '新成员' },
] as const
const documents = ref([
  { id: 'brief', label: '发布简报' }, { id: 'research', label: '调研笔记' }, { id: 'mockup', label: '交互原型' },
])
const current = ref('brief')
const strip = useTemplateRef<HTMLDivElement>('strip')
const reveal = useContainerReveal()
const result = ref('')
let serial = 0

function keepDocumentPosition(element: Element) {
  if (!(element instanceof HTMLElement)) return
  element.style.left = element.offsetLeft + 'px'
  element.style.insetBlockStart = element.offsetTop + 'px'
  element.style.inlineSize = element.offsetWidth + 'px'
  element.inert = true
}

async function focusDocument(id: string) {
  await nextTick()
  const row = [...strip.value?.querySelectorAll<HTMLElement>('[data-document-id]') ?? []].find(node => node.dataset.documentId === id)
  row?.querySelector<HTMLElement>('.sy-item__control')?.focus({ preventScroll: true })
  if (row) row.scrollIntoView({ block: 'nearest', inline: 'nearest',
    behavior: prefersReducedMotion(row) ? 'instant' : 'smooth' })
}
function openDocument(id: string) { current.value = id }
function closeDocument(id: string) {
  const index = documents.value.findIndex(document => document.id === id)
  if (index === -1) return
  documents.value.splice(index, 1)
  const adjacent = documents.value[Math.min(index, documents.value.length - 1)]
  if (current.value === id) current.value = adjacent?.id ?? ''
  if (adjacent) void focusDocument(adjacent.id)
  else void nextTick(() => strip.value?.parentElement?.querySelector<HTMLElement>('[data-new-document]')?.focus())
}
function addDocument() {
  const id = 'new-' + ++serial
  documents.value.push({ id, label: '新文档 ' + serial })
  openDocument(id)
  void focusDocument(id)
}
</script>

<template>
  <section class="collection-item-scenarios" aria-label="条目媒体与状态">
    <h3>条目媒体与状态</h3>
    <SItem v-for="person in people" :key="person.id" :label="person.name" :description="person.detail" interactive
      @activate="result = '查看了' + person.name">
      <template #start><SAvatar :name="person.name" size="sm" :tooltip="false" /></template>
      <template #end><SBadge :label="person.role" :tone="person.color" /></template>
    </SItem>
    <SItem label="复核发布包" description="等待补充许可说明" highlighted>
      <template #start><SIcon name="file" size="sm" /></template>
      <template #end><SBadge label="待核对" tone="warning" /></template>
    </SItem>
    <SItem label="正式发布" description="等待签发" selected density="compact">
      <template #end><SBadge label="需处理" tone="danger" /></template>
    </SItem>
    <output aria-label="成员条目结果"><SMotionText :value="result" /></output>
  </section>

  <section class="collection-item-scenarios" aria-label="文档条目标签">
    <h3>文档条目标签</h3>
    <div class="collection-item-scenarios__toolbar">
      <div ref="strip" class="collection-item-scenarios__strip" role="group" aria-label="打开的文档">
        <TransitionGroup name="collection-document" @before-leave="keepDocumentPosition">
          <div v-for="document in documents" :key="document.id" :data-document-id="document.id">
            <SItem :label="document.label" :selected="current === document.id"
              density="compact" interactive v-bind="reveal.getContainerProps()" @activate="openDocument(document.id)">
              <template #start><SIcon name="file" size="sm" /></template>
              <template #end>
                <SButton size="sm" variant="ghost" icon-only :aria-label="'关闭 ' + document.label"
                  v-bind="reveal.getContentRevealProps({ forceVisibility: current === document.id ? 'shown' : undefined })"
                  @click="closeDocument(document.id)"><template #start><SIcon name="close" size="sm" /></template></SButton>
              </template>
            </SItem>
          </div>
        </TransitionGroup>
      </div>
      <SButton data-new-document icon-only variant="secondary" size="sm" aria-label="新建文档" @click="addDocument">
        <template #start><SIcon name="plus" size="sm" /></template>
      </SButton>
    </div>
    <output aria-label="当前文档"><SMotionText :value="documents.find(document => document.id === current)?.label ?? ''" wrap /></output>
  </section>
</template>

<style scoped>
.collection-item-scenarios { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-2); min-inline-size: 0; }
.collection-item-scenarios h3 { margin: 0; font-size: 1rem; }
.collection-item-scenarios__toolbar { display: flex; align-items: center; gap: var(--sy-space-2); min-inline-size: 0; }
.collection-item-scenarios__strip { position: relative; display: flex; align-items: center; gap: 1px; min-inline-size: 0; overflow: auto; padding: 3px; scrollbar-width: thin; }
.collection-item-scenarios__strip > div { flex: 0 0 auto; }
.collection-item-scenarios__strip :deep(.sy-item) { border-inline-end: 1px solid var(--sy-border); white-space: nowrap; }
.collection-item-scenarios__strip :deep(.sy-item[data-selected]) { border-color: transparent; }
.collection-document-move, .collection-document-enter-active, .collection-document-leave-active {
  transition: transform var(--sy-motion-replace) var(--sy-ease-settle), opacity var(--sy-motion-replace) var(--sy-ease-settle);
}
.collection-document-leave-active { position: absolute; pointer-events: none; }
.collection-document-enter-from, .collection-document-leave-to { opacity: 0; transform: translateX(5px); }
</style>
