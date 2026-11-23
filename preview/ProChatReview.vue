<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import {
  SButton, SChainOfThought, SChatAttachmentGroup, SChatConversation, SChatListView, SChatLoader, SChatMessage, SChatSystemMessage, SChatVirtualizer, SInput, SMotionText, SSwitch,
  type ChatActivityStep, type ChatAttachmentInfo, type ChatAttachmentKind, type ChatMessageRole, type ChatMessageStatus, type ChatThread, type TableKey,
} from '../src'
import chartPreview from './assets/delivery-area.png'
import ConversationLayoutScenariosReview from './ConversationLayoutScenariosReview.vue'
import ChatMessageScenariosReview from './ChatMessageScenariosReview.vue'

defineProps<{ id: string }>()
const locale = 'zh-CN'
const roles = { user: '你', assistant: '助手', system: '会话记录' }
const longConversation = ref(false)
const archive = ref(Array.from({ length: 1200 }, (_, index) => ({ id: index + 1, text: `交付记录 ${index + 1}` })))
const history = useTemplateRef<{ anchorToKey: (key: number) => boolean; scrollToEnd: () => void }>('history')
let archived = false
function prependArchive() {
  if (archived) return
  archive.value = [...Array.from({ length: 100 }, (_, index) => ({ id: index - 100, text: `较早记录 ${index + 1}` })), ...archive.value]
  archived = true
}
function appendArchive() {
  const id = (archive.value.at(-1)?.id ?? 0) + 1
  archive.value = [...archive.value, { id, text: `交付记录 ${id}` }]
}
const typeLabels: Record<ChatAttachmentKind, string> = {
  image: '图片', video: '视频', audio: '音频', document: '文档', spreadsheet: '表格', archive: '压缩包', code: '代码', other: '文件',
}
const pending = ref(false)
const elapsed = ref(8)
const traceOpen = ref(false)
let traceTimer: ReturnType<typeof setInterval> | undefined
function runTrace(active?: boolean) {
  pending.value = Boolean(active)
  clearInterval(traceTimer)
  if (active) traceTimer = setInterval(() => { elapsed.value++ }, 1000)
}
const steps = computed<ChatActivityStep[]>(() => [
  { id: 'range', title: '确认交付范围', description: '从本次发布的资源清单中取样。', status: 'success', time: '16:20', datetime: '2026-11-20T16:20:00+08:00' },
  { id: 'proof', title: '核对文件版本', description: '逐一比对规范、源文件和案例。', status: 'success', time: '16:24', datetime: '2026-11-20T16:24:00+08:00' },
  { id: 'output', title: '整理交付记录', description: pending.value ? '确认交付摘要中的数量。' : '已经整理为三类，等候发布。',
    status: pending.value ? 'current' : 'success', statusLabel: pending.value ? '正在整理' : undefined },
])

const files = ref<ChatAttachmentInfo[]>([
  { id: 'chart', name: '每日交付量.png', kind: 'image', size: 25185, src: chartPreview, alt: '本周交付量面积图' },
  { id: 'list', name: '组件清单.csv', size: 14178, status: 'uploading', progress: 62 },
  { id: 'archive', name: '归档说明.pdf', size: 583410, status: 'error', error: '上传超时' },
])
const input = useTemplateRef<HTMLInputElement>('fileInput')
let fileId = 0
const uploads = new Map<TableKey, ReturnType<typeof setTimeout>>()
function remove(file: ChatAttachmentInfo) {
  clearTimeout(uploads.get(file.id))
  uploads.delete(file.id)
  files.value = files.value.filter(item => item.id !== file.id)
}
function retryFile(file: ChatAttachmentInfo) {
  if (uploads.has(file.id)) return
  files.value = files.value.map(item => item.id === file.id ? { ...item, status: 'uploading', progress: 23, error: undefined } : item)
  uploads.set(file.id, setTimeout(() => {
    uploads.delete(file.id)
    files.value = files.value.map(item => item.id === file.id ? { ...item, status: 'ready', progress: 100 } : item)
  }, 980))
}
function importFiles(event: Event) {
  const element = event.currentTarget as HTMLInputElement
  for (const file of Array.from(element.files ?? [])) files.value.push({ id: `local-${++fileId}`, name: file.name, file })
  element.value = ''
}

type Message = { id: string; role: ChatMessageRole; source: string; status?: ChatMessageStatus }
const initial: Message[] = [
  { id: 'opened', role: 'system', source: '11 月 20 日 · 交付准备' },
  { id: 'scope-question', role: 'user', source: '先核对这批交付的范围。' },
  { id: 'scope-answer', role: 'assistant', source: '本次包括规范、源文件和案例。归档记录会单独列出。' },
  { id: 'colors-question', role: 'user', source: '色板用发布版吗？' },
  { id: 'colors-answer', role: 'assistant', source: '用发布版。另附深色主题的对应颜色。' },
  { id: 'readme', role: 'user', source: '请也补上组件说明。' },
  { id: 'readme-answer', role: 'assistant', source: '已经整理了用法、参数和键盘交互。' },
  { id: 'checks', role: 'user', source: '接下来查一下未校验文件。' },
  { id: 'checks-answer', role: 'assistant', source: '还有两份文件需要核对，分别是交付清单和色板来源。' },
  { id: 'wrap', role: 'system', source: '16:30 · 归档记录已更新' },
]
const messages = ref(initial)
const adding = ref(false)
const preloaded = ref(false)
let streamTimer: ReturnType<typeof setInterval> | undefined
let streamId = 0

function loadOlder() {
  if (preloaded.value) return
  preloaded.value = true
  messages.value = [
    { id: 'history-a', role: 'user', source: '今天先整理整个项目的交付记录。' },
    { id: 'history-b', role: 'assistant', source: '我会按文件类型分组，再检查可读说明。' },
    ...messages.value,
  ]
}

function appendReply() {
  if (adding.value) return
  adding.value = true
  const id = `stream-${++streamId}`
  messages.value = [...messages.value, { id, role: 'assistant', source: '我', status: 'streaming' }]
  const chunks = Array.from('已补齐交付清单，并核对了浅色和深色主题的色板。')
  let offset = 0
  streamTimer = setInterval(() => {
    let done = false
    const add = chunks.slice(offset, offset + 3).join('')
    offset += 3
    done = offset >= chunks.length
    messages.value = messages.value.map(item => item.id === id ? { ...item, source: item.source + add, status: done ? 'ready' : 'streaming' } : item)
    if (done) {
      clearInterval(streamTimer)
      adding.value = false
    }
  }, 115)
}

const threads = ref<ChatThread[]>([
  { id: 'delivery', group: '置顶', title: '发布交付', preview: '今天补齐交付清单和深色主题说明。', time: '16:30', datetime: '2026-11-20T16:30:00+08:00', unread: 2 },
  { id: 'style', group: '置顶', title: '品牌规范', preview: '新版色板发到设计区。', time: '16:12', datetime: '2026-11-20T16:12:00+08:00', unread: 0 },
  { id: 'checks', group: '最近', title: '组件复核', preview: '进度和加载状态已核对。', time: '15:40', unread: 3 },
  { id: 'handoff', group: '最近', title: '归档材料', preview: '留存上一版的说明和源文件。', time: '10:26', unread: 0 },
  { id: 'migrated', group: '最近', title: '已迁移记录', preview: '仅在归档中查看。', time: '09:15', disabled: true },
])
const selected = ref<TableKey | null>('delivery')
const query = ref('')
const visibleThreads = computed(() => threads.value.filter(item =>
  `${item.title} ${item.preview ?? ''}`.includes(query.value.trim())))
const subject = computed(() => threads.value.find(item => item.id === selected.value)?.title ?? '')
function readSelected() {
  threads.value = threads.value.map(thread => thread.id === selected.value ? { ...thread, unread: 0 } : thread)
}

const loaders = [
  { key: 'dots', caption: '生成回复', label: '正在整理本次交付' },
  { key: 'pulse', caption: '等待状态', label: '等待校验结果' },
  { key: 'spinner', caption: '读取结果', label: '正在读取资料' },
  { key: 'skeleton', caption: '消息占位', label: '正在载入消息' },
] as const
const activeLoaders = ref(true)
const response = '# 本周交付材料\n\n- 品牌色板和主题对照\n- 组件列表及使用说明\n- 发布包和归档记录\n\n文件来源保存在项目目录。'
const recovery = ref<ChatMessageStatus>('error')
const recoveredText = ref('')
let retryTimer: ReturnType<typeof setTimeout> | undefined
function retryMessage() {
  if (recovery.value !== 'error') return
  recovery.value = 'pending'
  retryTimer = setTimeout(() => {
    recoveredText.value = '已找到当前版本的归档记录。'
    recovery.value = 'ready'
  }, 1100)
}

onBeforeUnmount(() => {
  clearInterval(traceTimer)
  clearInterval(streamTimer)
  clearTimeout(retryTimer)
  for (const timer of uploads.values()) clearTimeout(timer)
})
</script>

<template>
  <section v-if="id === 'WP.chain-of-thought'" class="review-chat-review review-chat-trace">
    <SSwitch :model-value="pending" @update:model-value="runTrace">模拟整理中</SSwitch>
    <SChainOfThought v-model:open="traceOpen" title="交付整理进度" :pending="pending" pending-label="正在整理"
      :elapsed="elapsed" :locale="locale" duration-unit="秒" :steps="steps" steps-label="交付整理步骤" />
  </section>

  <section v-else-if="id === 'WP.chat-attachment'" class="review-chat-review review-chat-files">
    <div class="review-chat-toolbar">
      <SButton variant="secondary" size="sm" @click="input?.click()">添加附件</SButton>
      <input ref="fileInput" type="file" multiple hidden aria-label="选择附件" @change="importFiles">
    </div>
    <SChatAttachmentGroup :items="files" label="待交付附件" removable retryable :locale="locale"
      remove-label="移除" retry-label="重试" uploading-label="正在上传" error-label="上传失败" missing-preview-label="暂无预览"
      :type-labels="typeLabels" @remove="remove" @retry="retryFile" />
  </section>

  <section v-else-if="id === 'WP.chat-conversation'" class="review-chat-review review-chat-feed">
    <div class="review-chat-toolbar">
      <SButton variant="secondary" size="sm" :disabled="preloaded" @click="loadOlder">载入较早消息</SButton>
      <SButton variant="secondary" size="sm" :loading="adding" @click="appendReply">追加回复</SButton>
    </div>
    <SChatConversation height="21rem" label="交付讨论" jump-label="回到最新消息" new-messages-label="有新消息" :threshold="14" compact-jump>
      <SChatMessage v-for="message in messages" :key="message.id" :data-review-message="message.id"
        :message-role="message.role" :source="message.source" :status="message.status" :role-labels="roles" :locale="locale" />
    </SChatConversation>
    <SButton variant="ghost" size="sm" @click="longConversation = !longConversation">{{ longConversation ? '收起长会话' : '查看长会话' }}</SButton>
    <template v-if="longConversation">
      <div class="review-chat-toolbar">
        <SButton variant="secondary" size="sm" @click="prependArchive">载入归档历史</SButton>
        <SButton variant="secondary" size="sm" @click="appendArchive">添加归档记录</SButton>
        <SButton variant="ghost" size="sm" @click="history?.anchorToKey(640)">定位第 640 条</SButton>
        <SButton variant="ghost" size="sm" @click="history?.scrollToEnd()">查看最新记录</SButton>
      </div>
      <SChatVirtualizer ref="history" :data="archive" :get-row-key="item => item.id" label="长会话记录" :height="300" :estimated-item-size="42">
        <template #default="{ item }"><SChatMessage :source="item.text" :animated-text="false" /></template>
      </SChatVirtualizer>
    </template>
    <ConversationLayoutScenariosReview />
    <ChatMessageScenariosReview kind="transcript" />
  </section>

  <section v-else-if="id === 'WP.chat-list-view'" class="review-chat-review review-chat-threads">
    <SInput v-model="query" label="搜索会话" placeholder="输入会话名" />
    <SChatListView v-model:selected="selected" :items="visibleThreads" label="会话历史" empty-text="没有匹配的会话"
      :locale="locale" :unread-label="count => `${count} 条未读`" />
    <div class="review-chat-toolbar review-chat-threads__footer">
      <output aria-label="当前会话"><SMotionText :value="subject" /></output>
      <SButton variant="secondary" size="sm" @click="readSelected">清除未读</SButton>
    </div>
  </section>

  <section v-else-if="id === 'WP.chat-loader'" class="review-chat-review review-chat-loaders">
    <SSwitch v-model="activeLoaders">显示加载状态</SSwitch>
    <div class="review-chat-loaders__grid">
      <section v-for="example in loaders" :key="example.key" class="review-chat-loader" :data-mode="example.key" :aria-label="example.caption">
        <h3>{{ example.caption }}</h3>
        <SChatLoader :active="activeLoaders" :variant="example.key" :label="example.label" :show-label="example.key !== 'skeleton'" />
      </section>
    </div>
  </section>

  <section v-else class="review-chat-review review-chat-messages">
    <SChatSystemMessage variant="divider" text="11 月 20 日" />
    <SChatMessage message-role="user" :role-labels="roles" source="@交付助手 帮我列一下这周需要交付的材料。" time="16:20" datetime="2026-11-20T16:20:00+08:00"
      :tokens="[{ id: 'assistant', value: '@交付助手', label: '交付助手' }]" delivery="read" :delivery-labels="{ read: '已读' }" />
    <SChatMessage :role-labels="roles" :source="response" format="markdown" time="16:21" datetime="2026-11-20T16:21:00+08:00" />
    <SChatMessage :role-labels="roles" author="归档查询" :status="recovery" :source="recoveredText" class="review-chat-messages__retry"
      pending-label="正在读取归档" error-text="归档记录读取超时" retry-label="重试" retryable @retry="retryMessage" />
    <ChatMessageScenariosReview kind="messages" />
  </section>
</template>
