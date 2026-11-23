<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import { SButton, SChatComposerInput, SMotionText, type ChatComposerTrigger, type PromptSegment } from '../src'

const draft = ref('')
const result = ref('')
const editor = useTemplateRef<InstanceType<typeof SChatComposerInput>>('editor')
const shortcuts = [
  { id: 'brief', value: '/brief', label: '起草发布摘要', description: '在正文中插入摘要指令' },
  { id: 'review', value: '/review', label: '检查交付缺项', description: '在正文中插入检查指令' },
]
const contacts = [
  { id: 'owner', value: '@owner', label: '发布负责人', description: '提及发布负责人' },
  { id: 'editors', value: '@editors', label: '内容校对组', description: '提及校对成员' },
]
const triggers: ChatComposerTrigger[] = [
  { character: '/', emptyText: '未找到命令', search: query => shortcuts.filter(item => (item.value + item.label).includes(query)) },
  { character: '@', emptyText: '未找到成员', search: query => contacts.filter(item => (item.value + item.label).includes(query)) },
]
async function replaceDraft(text: string) {
  draft.value = text
  await nextTick()
  editor.value?.focus('end')
}
function submit(text: string, segments: readonly PromptSegment[]) {
  const count = segments.filter(segment => segment.type === 'token').length
  result.value = `${text.trim()} · ${count} 个结构化引用`
  draft.value = ''
}
</script>

<template>
  <section class="composer-editor-scenarios" aria-label="受控草稿与指令">
    <h3>受控草稿与指令</h3>
    <div class="review__row">
      <SButton variant="secondary" size="sm" @click="replaceDraft('请核对发布清单 ')">载入交付草稿</SButton>
      <SButton variant="ghost" size="sm" @click="replaceDraft('')">清空交付草稿</SButton>
    </div>
    <SChatComposerInput ref="editor" v-model="draft" label="受控交付草稿" placeholder="输入 @ 提及成员，输入 / 插入命令"
      :triggers="triggers" :max-rows="3" :debounce-ms="0" @submit="submit" />
    <output aria-label="结构化提交结果"><SMotionText :value="result" wrap /></output>
    <SChatComposerInput model-value="此归档草稿已锁定。" label="已锁定草稿" disabled />
  </section>
</template>

<style scoped>
.composer-editor-scenarios { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-3); min-inline-size: 0; }
.composer-editor-scenarios h3 { margin: 0; font-size: 1rem; }
.composer-editor-scenarios :deep(.sy-chat-composer-input) { background: var(--sy-surface-muted); border-radius: var(--sy-radius-sm); padding: 4px; }
.composer-editor-scenarios output { overflow-wrap: anywhere; }
</style>
