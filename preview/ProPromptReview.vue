<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { SButton, SChatMessage, SMotionText, SPromptInput, SPromptSuggestion, SSegment, SSurface, SSwitch, STextShimmer } from '../src'
import ComposerScenariosReview from './ComposerScenariosReview.vue'
import type { DropZoneRejection, PromptLayout, PromptPayload, PromptRunStatus, PromptSegment, PromptSuggestionInfo, PromptTokenSuggestion, QueuedPrompt } from '../src'

defineProps<{ id: string }>()
const layouts = [
  { value: 'compact', label: '紧凑' }, { value: 'stacked', label: '上下' }, { value: 'inline', label: '同排' },
]
const layout = ref<string | null>('compact')
const inputLayout = computed(() => (layout.value ?? 'compact') as PromptLayout)
const tokenMode = ref(false)
const queueMode = ref(false)
const altSubmit = ref(false)
const text = ref('')
const segments = ref<PromptSegment[]>([])
const files = ref<File[]>([])
const queue = ref<QueuedPrompt[]>([])
const status = ref<PromptRunStatus>('ready')
const failure = ref<string>()
const lastSent = ref<PromptPayload>()
const note = ref('')
const sequence = ref(18)
const activeShimmer = ref(true)
let stream: ReturnType<typeof setTimeout> | undefined

const labels = {
  attach: '附件', attachments: '已选附件', remove: '移除', send: '发送', stop: '停止', resend: '重发', queue: '待发送',
  queueItem: '加入队列', edit: '编辑', up: '上移', down: '下移', drag: '拖动排序', submitted: '正在发送', streaming: '正在生成',
}
const typeErrors: Record<DropZoneRejection['reason'], string> = { directory: '请选择文件', limit: '超过附件数量限制', size: '文件太大', type: '不支持此格式' }
const errors = (entries: readonly DropZoneRejection[]) => entries.map(file => `${file.name} · ${typeErrors[file.reason]}`).join(' / ')
const options: PromptTokenSuggestion[] = [
  { id: 'archive', trigger: '@', value: '@归档组', label: '归档组', description: '整理和保存发布材料' },
  { id: 'review', trigger: '@', value: '@校对组', label: '校对组', description: '检查文件名称与数量' },
  { id: 'report', trigger: '/', value: '/核对交付', label: '核对交付', description: '按当前批次列出缺项' },
  { id: 'draft', trigger: '/', value: '/生成说明', label: '生成说明', description: '生成交付说明的草稿' },
]
const suggestions: PromptSuggestionInfo[] = [
  { id: 'summary', title: '整理交付清单', prompt: '整理本周交付清单，并注明仍缺的材料。', description: '按项目、材料和归档状态分组。', tags: ['本周交付'] },
  { id: 'changes', title: '对照两个版本', prompt: '对照两个版本的文件，列出新增、修改和移除项。', description: '把需要重新核对的条目列在前面。', tags: ['版本复核'] },
  { id: 'published', title: '查看发布记录', prompt: '列出最近三次发布记录。', description: '连接发布记录后可用。', disabled: true },
]
const suggestionMode = ref(false)
const suggestionText = ref('')
const suggestionResult = ref('')
const responseRoles = { assistant: '助手', user: '你', system: '系统' }

function send(payload: PromptPayload) {
  clearTimeout(stream)
  failure.value = undefined
  lastSent.value = payload
  note.value = '已发送请求'
  status.value = 'submitted'
  stream = setTimeout(() => { status.value = 'streaming' }, 1050)
}

function stop() {
  clearTimeout(stream)
  status.value = 'ready'
  note.value = '已停止生成'
}

function fail() {
  clearTimeout(stream)
  status.value = 'error'
  failure.value = '连接中断，可以重发这条请求。'
  if (lastSent.value) {
    text.value = lastSent.value.text
    segments.value = lastSent.value.segments ? [...lastSent.value.segments] : [{ type: 'text', text: lastSent.value.text }]
    files.value = [...lastSent.value.files]
  }
}

onBeforeUnmount(() => clearTimeout(stream))
</script>

<template>
  <section v-if="id === 'WP.prompt-input'" class="review-chat-review review-prompt-input">
    <div class="review-prompt-controls">
      <SSegment v-model="layout" label="输入框排布" :items="layouts" size="sm" />
      <SSwitch v-model="tokenMode">行内提及</SSwitch>
      <SSwitch v-model="queueMode">允许排队</SSwitch>
      <SSwitch v-model="altSubmit">组合键发送</SSwitch>
    </div>
    <SPromptInput v-model="text" v-model:tokens="segments" v-model:files="files" v-model:queue="queue"
      label="写一条请求" placeholder="输入要核对的材料" :layout="inputLayout" :status="status" :labels="labels" locale="zh-CN"
      :token-mode="tokenMode" :token-options="options" token-options-label="可插入的提及和命令" :allow-queue="queueMode"
      :submit-on="altSubmit ? 'modifier-enter' : 'enter'" :error="failure" accept=".pdf,.txt,image/png" :max-files="3"
      :attachment-type-labels="{ document: '文档', image: '图片', other: '文件' }"
      :max-file-size="2_000_000" :format-file-rejections="errors" :format-queue-attachments="count => `${count} 个附件`"
      @submit="send" @stop="stop">
      <template #footer>
        <div class="review-prompt-result">
          <output aria-label="请求状态"><SMotionText :value="note" /></output>
          <SButton variant="ghost" size="sm" @click="fail">模拟连接失败</SButton>
        </div>
      </template>
    </SPromptInput>
    <SChatMessage v-if="lastSent" message-role="user" :role-labels="responseRoles"
      :source="lastSent.text || `${lastSent.files.length} 个附件`" data-review-prompt-sent />
    <ComposerScenariosReview kind="prompt" />
  </section>

  <section v-else-if="id === 'WP.prompt-suggestion'" class="review-chat-review review-prompt-suggestions">
    <SSwitch v-model="suggestionMode">显示详细卡片</SSwitch>
    <SPromptSuggestion title="交付复核" :items="suggestions" :variant="suggestionMode ? 'cards' : 'compact'"
      @select="item => { suggestionText = item.prompt ?? item.title; suggestionResult = '' }" />
    <SPromptInput v-model="suggestionText" label="编辑建议" placeholder="选择一条建议，或输入自己的请求" layout="compact"
      :allow-attachments="false" :labels="labels" @submit="payload => suggestionResult = payload.text" />
    <output v-if="suggestionResult" aria-label="已发送建议"><SMotionText :value="suggestionResult" /></output>
  </section>

  <section v-else class="review-chat-review review-prompt-shimmer">
    <div class="review-prompt-controls">
      <SSwitch v-model="activeShimmer">显示文字流光</SSwitch>
      <SButton variant="secondary" size="sm" @click="sequence++">下一份文件</SButton>
    </div>
    <SSurface tone="muted" class="review-prompt-shimmer__sample">
      <STextShimmer :text="`正在核对第 ${sequence} 份文件`" :active="activeShimmer" announce />
      <STextShimmer text="汇总交付说明" :active="activeShimmer" class="review-prompt-shimmer__secondary" :spread="20" :duration="2600" />
    </SSurface>
  </section>
</template>
