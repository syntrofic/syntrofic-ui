<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SChatToolCalls, SCodeBlock, SDiffViewer, type ChatToolCall, type ChatToolCallStatus } from '../src'

const labels = { pending: '等待运行', running: '运行中', complete: '已完成', error: '执行失败' }
const stages: ChatToolCallStatus[] = ['pending', 'running', 'complete', 'error']
const step = ref(0)
const open = ref(true)
const calls = computed<ChatToolCall[]>(() => [
  { id: 'build', name: '构建文档', target: 'pnpm build:site', status: stages[step.value],
    duration: step.value >= 2 ? '1.8 s' : undefined, errorMessage: '草稿缺少发布标题，补齐后可重试。' },
  { id: 'types', name: '类型检查', target: 'pnpm typecheck', status: 'running', node: '准备区' },
  { id: 'edit', name: '日期格式更新', target: 'docs/release-date.ts', status: 'complete', node: '发布工作区',
    duration: '92 ms', additions: 4, deletions: 1, detail: true },
  { id: 'lint', name: '检查文档', target: '发布说明', status: 'error', duration: '420 ms', errorMessage: '有 1 条发布时间尚未填写。' },
  { id: 'tests', name: '检查发布记录', target: 'pnpm check:catalog', status: 'complete', duration: '650 ms', detail: true },
])
const before = 'export const formatDay = date => date.toLocaleDateString()'
const after = [
  'export const formatDay = (date: Date) => new Intl.DateTimeFormat("zh-CN", {',
  '  timeZone: "Asia/Shanghai",',
  '  dateStyle: "medium",',
  '}).format(date)',
].join('\n')
const report = '检查结果\n通过 3 项\n文件名一致\n版本号一致\n归档路径可访问'
const collapsed = [{ id: 'open', name: '读取项目目录', target: 'docs/', duration: '44 ms', node: '本地工作区' }]
</script>

<template>
  <section class="chat-call-scenarios" aria-label="工具记录与结果详情">
    <h3>工具记录与结果详情</h3>
    <div class="review__row">
      <SButton variant="secondary" size="sm" @click="step = (step + 1) % stages.length">推进构建状态</SButton>
    </div>
    <SChatToolCalls v-model:open="open" label="本次工具调用" :calls="calls" :state-labels="labels" :format-count="count => `${count} 项`">
      <template #detail="{ call }">
        <SDiffViewer v-if="call.id === 'edit'" label="日期格式改动" :before="before" :after="after" language="typescript"
          max-height="16rem" wrapped :collapsible="false" />
        <SCodeBlock v-else label="发布检查输出" :code="report" max-height="14rem" wrap copy-label="复制检查输出" />
      </template>
    </SChatToolCalls>
    <SChatToolCalls label="之前的工具调用" :calls="collapsed" :state-labels="labels" :format-count="count => `${count} 项`" />
  </section>
</template>

<style scoped>
.chat-call-scenarios { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-3); min-inline-size: 0; }
.chat-call-scenarios h3 { margin: 0; font-size: 1rem; }
</style>
