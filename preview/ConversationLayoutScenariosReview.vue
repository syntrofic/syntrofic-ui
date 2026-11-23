<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import {
  SButton, SChatConversation, SChatMessage, SChatScrollButton, SChatSystemMessage, SMotionText, SPromptInput, SSegment, SSwitch,
  type ChatMessageRole, type ChatMessageStatus, type PromptPayload,
} from '../src'

type Entry = { id: string; role: ChatMessageRole; text: string; status?: ChatMessageStatus; markdown?: boolean; time?: string }
const roles = { user: '你', assistant: '交接助手', system: '交接记录' }
const messages = ref<Entry[]>([
  { id: 'question-a', role: 'user', text: '请核对本周交付的资料。', time: '14:03' },
  { id: 'reply-a', role: 'assistant', text: '已汇总 3 类资料。\n\n- 发布说明\n- 组件使用说明\n- 品牌源文件', markdown: true, time: '14:04' },
  { id: 'question-b', role: 'user', text: '@归档组 也请列出需要补签的文件。', time: '14:07' },
  { id: 'reply-b', role: 'assistant', text: '还有两项需要补签，分别是签发回执和归档清单。', time: '14:09' },
  { id: 'question-c', role: 'user', text: '备用素材放在哪里？', time: '14:11' },
  { id: 'reply-c', role: 'assistant', text: '备用素材单独放在归档目录。源文件仍保存在交付区。', time: '14:12' },
])
const mention = [{ id: 'archive-team', type: 'token' as const, value: '@归档组', label: '归档组' }]
const densityOptions = [
  { value: 'compact', label: '紧凑间距' }, { value: 'balanced', label: '标准间距' }, { value: 'spacious', label: '宽松间距' },
]
const density = ref<string | null>('balanced')
const spacing = computed(() => (density.value ?? 'balanced') as 'compact' | 'balanced' | 'spacious')
const running = ref(false)
let nextId = 0
let timer: ReturnType<typeof setTimeout> | undefined

function addNote() {
  messages.value.push({ id: 'inbox-' + ++nextId, role: 'assistant', text: '有一份新的交付补充记录可以查看。', time: '14:20' })
}
function send(payload: PromptPayload) {
  messages.value.push({ id: 'out-' + ++nextId, role: 'user', text: payload.text, time: '14:22' })
  const responseId = 'in-' + nextId
  messages.value.push({ id: responseId, role: 'assistant', text: '', status: 'pending' })
  running.value = true
  timer = setTimeout(() => {
    messages.value = messages.value.map(entry => entry.id === responseId
      ? { ...entry, text: '已登记这条交接要求。\n\n归档完成后会更新交接记录。', status: 'ready', time: '14:23', markdown: true }
      : entry)
    running.value = false
  }, 800)
}
function stop() {
  clearTimeout(timer)
  running.value = false
  messages.value = messages.value.filter(entry => entry.status !== 'pending')
}
onBeforeUnmount(() => clearTimeout(timer))

const away = ref(false)
const switchRow = useTemplateRef<HTMLDivElement>('switchRow')
const buttonLabel = ref<string | null>('icon')
const buttonLabels = [
  { value: 'icon', label: '仅图标' }, { value: 'new', label: '新消息' }, { value: 'unread', label: '未读数量' },
]
const displayed = computed(() => buttonLabel.value === 'unread' ? '3 条未读回复' : buttonLabel.value === 'new' ? '有新交接消息' : undefined)
function jump() {
  away.value = false
  switchRow.value?.querySelector<HTMLElement>('[role="switch"]')?.focus({ preventScroll: true })
}
</script>

<template>
  <section class="conversation-layout-scenarios" aria-label="带编辑器的交接对话">
    <h3>交接对话面板</h3>
    <div class="review__row">
      <SSegment v-model="density" label="交接消息间距" :items="densityOptions" size="sm" />
      <SButton size="sm" variant="secondary" @click="addNote">追加未读交接</SButton>
    </div>
    <SChatConversation layout="panel" height="28rem" content-width="33rem" label="交接面板消息" compact-jump :density="spacing">
      <template #header><strong>发布交接</strong></template>
      <SChatSystemMessage variant="divider" text="今日交接" />
      <TransitionGroup name="sy-chat-control">
        <SChatMessage v-for="entry in messages" :key="entry.id" :message-role="entry.role" :source="entry.text"
          :tokens="entry.role === 'user' ? mention : undefined" :status="entry.status" :format="entry.markdown ? 'markdown' : 'text'"
          :time="entry.time" :delivery="entry.role === 'user' ? 'read' : undefined" :delivery-labels="{ read: '已读' }"
          :show-avatar="entry.role === 'assistant'" pending-label="正在记录交接要求" :role-labels="roles" />
      </TransitionGroup>
      <template #jump="{ scrollToEnd, controls, hasNewMessages }">
        <SChatScrollButton :label="hasNewMessages ? '查看未读交接' : undefined" accessible-label="回到交接末尾"
          :controls="controls" @click="scrollToEnd" />
      </template>
      <template #composer>
        <SPromptInput label="输入交接回复" layout="compact" :allow-attachments="false" :status="running ? 'submitted' : 'ready'"
          :labels="{ send: '发送交接回复', submitted: '正在记录交接要求', stop: '停止记录交接要求' }" @submit="send" @stop="stop" />
      </template>
    </SChatConversation>
  </section>

  <section class="conversation-layout-scenarios" aria-label="滚动按钮标签与状态">
    <h3>回到最新消息</h3>
    <div ref="switchRow" class="review__row">
      <SSwitch v-model="away">模拟向上浏览</SSwitch>
      <SSegment v-model="buttonLabel" label="回末尾按钮文案" :items="buttonLabels" size="sm" />
    </div>
    <div class="conversation-layout-scenarios__jump">
      <SChatScrollButton :visible="away" :label="displayed" :accessible-label="displayed ?? '跳到最新交接'" @click="jump" />
    </div>
    <output aria-label="滚动位置"><SMotionText :value="away ? '正在查看较早消息' : '位于消息末尾'" /></output>
  </section>
</template>

<style scoped>
.conversation-layout-scenarios { display: grid; gap: var(--sy-space-2); min-inline-size: 0; }
.conversation-layout-scenarios h3 { margin: 0; font-size: 1rem; }
.conversation-layout-scenarios__jump { display: flex; align-items: center; min-block-size: 34px; }
</style>
