<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { SAppLayout, SBadge, SButton, SChatConversation, SChatMessage, SChatTool, SCodeBlock, SCommand, SMegaMenu,
  SNavbar, SProgressBar, SPromptInput, SSearchField, SSidebar, type PromptPayload } from '../src'

interface Message { id: number; author: string; text: string; role: 'user' | 'assistant'; tool?: boolean; streaming?: boolean; complete?: boolean }
const props = defineProps<{ kind: string }>()
const shell = computed(() => props.kind.startsWith('shell-'))
const messaging = computed(() => props.kind === 'messaging-shell')
const landing = computed(() => props.kind === 'ai-chat-landing')
const nav = ref('overview')
const navQuery = ref('')
const commandOpen = ref(false)
const sections = [{ id: 'overview', label: '概览' }, { id: 'files', label: '资料' }, { id: 'review', label: '评审' }]
const sectionText: Record<string, string> = { overview: '在一处查看交付资料和团队动态。', files: '浏览已归档的文件和使用说明。', review: '查看排期并跟踪待评审的任务。' }
const side = computed(() => [{ id: 'workspace', label: '工作区', items: sections.filter(item => item.label.includes(navQuery.value.trim())), collapsible: true, defaultExpanded: true },
  { id: 'recent', label: '最近访问', items: [{ id: 'release', label: '发布清单', href: '/templates/work-item-detail/' }].filter(item => item.label.includes(navQuery.value.trim())) }])
const menuGroups = [{ id: 'docs', title: '文档', links: [{ id: 'start', label: '快速接入', href: '/docs/quick-start/' }, { id: 'theme', label: '主题 Token', href: '/docs/theming/' }] },
  { id: 'layouts', title: '工作台', links: [{ id: 'del', label: '交付仪表盘', href: '/templates/dashboard/' }, { id: 'records', label: '资料目录', href: '/templates/table-page/' }] }]
const channel = ref('delivery')
const thread = ref<Message>()
const threadDrafts = ref<Record<number, string>>({})
const threadReply = computed({
  get: () => thread.value ? threadDrafts.value[thread.value.id] ?? '' : '',
  set: value => { if (thread.value) threadDrafts.value[thread.value.id] = value },
})
const replies = ref<Record<number, string[]>>({})
const asideOpen = ref(props.kind !== 'messaging-shell')
const mobileAside = ref(false)
const mobileSidebar = ref(false)
const unread = ref<Record<string, number>>({ delivery: 2, releases: 1, lin: 0 })
const channels = computed(() => [
  { id: 'channels', label: '频道', items: [{ id: 'delivery', label: '交付协作' }, { id: 'releases', label: '发布记录' }].map(item => ({ ...item,
    label: unread.value[item.id] ? `${item.label} · ${unread.value[item.id]} 条未读` : item.label })) },
  { id: 'direct', label: '直接消息', items: [{ id: 'lin', label: '林舟 · 在线' }] },
])
const conversations = ref<Record<string, Message[]>>({
  delivery: [{ id: 1, author: '林舟', text: '明天领取交付地图，请补充入口提醒。', role: 'assistant' },
    { id: 2, author: '方宁', text: '入口指引已经加入交付说明。', role: 'assistant' }],
  releases: [{ id: 3, author: '周昱', text: '组件库已生成验收构建。', role: 'assistant' }],
  lin: [{ id: 4, author: '林舟', text: '有需要评审的交付事项就发给我。', role: 'assistant' }],
})
const exchanges = ref<Message[]>(props.kind === 'ai-chat' ? [
  { id: 11, author: '你', text: '整理交付验收项目。', role: 'user' },
  { id: 12, author: '助手', text: '### 交付验收\n\n- 核对键盘操作\n- 检查 360 px 布局\n- 确认默认白底\n\n```json\n{"checks": 3}\n```',
    role: 'assistant', tool: true, complete: true },
] : [])
const messages = computed(() => messaging.value ? conversations.value[channel.value] ?? [] : exchanges.value)
const prompt = ref('')
const running = ref(false)
const artifact = ref(props.kind === 'ai-chat' ? '{ "checks": 3, "status": "ready" }' : '')
const suggestions = ['列出交付验收步骤', '整理项目主题变量', '总结组件接入流程']
let sequence = 20
let stream: ReturnType<typeof setInterval> | undefined
const response = '### 演示交付清单\n\n1. 检查白色画布和主题切换。\n2. 使用键盘完成主要操作。\n3. 在窄屏查看表单和详情。\n\n```json\n{"status": "ready", "checks": 3}\n```'
function stop(complete = false) {
  clearInterval(stream)
  stream = undefined
  running.value = false
  const last = exchanges.value.at(-1)
  if (last?.streaming) {
    last.streaming = false
    last.complete = complete
    if (complete) artifact.value = JSON.stringify({ checks: 3, status: 'ready', message: last.id }, null, 2)
  }
}
onBeforeUnmount(() => stop())
function submit(payload: PromptPayload) {
  if (!payload.text.trim()) return
  if (messaging.value) {
    const next: Message = { id: ++sequence, author: '你', text: payload.text, role: 'user' }
    conversations.value[channel.value] = [...messages.value, next]
    return
  }
  stop()
  const result: Message = { id: ++sequence, author: '助手', text: '', role: 'assistant', streaming: true, tool: true }
  exchanges.value.push({ id: ++sequence, author: '你', text: payload.text, role: 'user' }, result)
  running.value = true
  let index = 0
  stream = setInterval(() => {
    const item = exchanges.value.at(-1)
    if (!item || item.id !== result.id) { stop(); return }
    index += 12
    item.text = response.slice(0, index)
    if (index >= response.length) stop(true)
  }, 55)
}
function selectChannel(value?: string) {
  if (!value || !Object.hasOwn(conversations.value, value)) return
  channel.value = value
  unread.value[value] = 0
  thread.value = undefined
  asideOpen.value = false
  mobileAside.value = false
  mobileSidebar.value = false
}
function openThread(message: Message) { thread.value = message; asideOpen.value = true; mobileAside.value = true }
function sendReply(payload: PromptPayload) {
  if (!thread.value || !payload.text.trim()) return
  const id = thread.value.id
  replies.value[id] = [...replies.value[id] ?? [], payload.text]
}
</script>

<template>
  <SAppLayout v-if="shell" v-model:mobile-sidebar-open="mobileSidebar" :breakpoint="630" resize-sidebar :sidebar-size="186"
    scroll-mode="content" height="25rem" sidebar-title="工作区导航" main-label="工作区内容" dismiss-label="关闭">
    <template v-if="kind !== 'shell-side-nav'" #navbar>
      <SNavbar v-model="nav" :items="kind === 'shell-top-nav' ? [] : sections" brand="交付工作区" label="顶部导航" menu-label="菜单">
        <template v-if="kind === 'shell-top-nav'" #menus>
          <li><SMegaMenu label="浏览工作区" :groups="[menuGroups[1]]" /></li>
          <li><SMegaMenu label="浏览文档" :groups="[menuGroups[0]]" /></li>
        </template>
        <template v-if="kind === 'shell-top-nav'" #mobile="{ close }">
          <li v-for="group in menuGroups" :key="group.id">
            <SButton v-for="link in group.links" :key="link.id" :href="link.href" variant="ghost" size="sm" @click="close">{{ link.label }}</SButton>
          </li>
        </template>
        <template v-else #end>
          <SButton size="sm" variant="secondary" @click="commandOpen = true">搜索工作区</SButton>
        </template>
      </SNavbar>
    </template>
    <template v-if="kind !== 'shell-top-nav'" #sidebar>
      <div class="communication-demo__pane">
        <SSearchField v-model="navQuery" label="筛选导航" />
        <SSidebar v-model="nav" :groups="side" label="工作区导航" show-toggle toggle-label="折叠导航" @activate="mobileSidebar = false" />
      </div>
    </template>
    <div class="communication-demo__pane">
      <SButton v-if="kind !== 'shell-top-nav'" size="sm" variant="ghost" @click="mobileSidebar = !mobileSidebar">打开工作区导航</SButton>
      <h2>{{ sections.find(item => item.id === nav)?.label ?? '概览' }}</h2><p>{{ sectionText[nav] ?? sectionText.overview }}</p>
      <SCommand v-if="kind === 'shell-nav'" v-model:open="commandOpen" title="搜索工作区" input-label="搜索页面" dismiss-label="关闭"
        :groups="[{ id: 'navigation', label: '工作区', items: sections }]" placeholder="输入页面名称" empty-text="没有匹配页面。"
        @select="item => { nav = String(item.id) }" />
    </div>
  </SAppLayout>

  <div v-else-if="landing && !messages.length" class="communication-demo__landing">
    <h2>准备交付前，想先核对什么？</h2>
    <SPromptInput v-model="prompt" :allow-attachments="false" label="发送给助手" placeholder="输入一个问题" :labels="{ send: '发送' }" @submit="submit" />
    <div class="communication-demo__toolbar" aria-label="提问示例" role="group">
      <SButton v-for="suggestion in suggestions" :key="suggestion" variant="secondary" size="sm" @click="prompt = suggestion">{{ suggestion }}</SButton>
    </div>
  </div>

  <SAppLayout v-else v-model:aside-open="asideOpen" v-model:mobile-aside-open="mobileAside" v-model:mobile-sidebar-open="mobileSidebar"
    :breakpoint="640" :sidebar-size="185" :aside-size="255" resize-aside scroll-mode="content" height="29rem" dismiss-label="关闭"
    sidebar-title="消息频道" :aside-title="messaging ? '消息讨论串' : '生成的资料'" main-label="对话">
    <template v-if="messaging" #sidebar>
      <SSidebar :model-value="channel" :groups="channels" label="频道与直接消息" @update:model-value="selectChannel" />
    </template>
    <div class="communication-demo__pane">
      <header class="communication-demo__toolbar">
        <SButton v-if="messaging" size="sm" variant="secondary" @click="mobileSidebar = !mobileSidebar">消息频道</SButton>
        <h2>{{ messaging ? '团队消息' : '助手对话' }}</h2>
        <SButton v-if="!messaging" size="sm" variant="secondary" @click="asideOpen = !asideOpen; mobileAside = !mobileAside">生成资料</SButton>
      </header>
      <SChatConversation label="消息记录" height="18rem" jump-label="回到最新消息" :data-messaging="messaging || undefined">
        <SChatMessage v-for="entry in messages" :key="entry.id" :source="entry.text" :author="entry.author" :message-role="entry.role"
          :format="entry.tool ? 'markdown' : 'text'" :status="entry.streaming ? 'streaming' : 'ready'">
          <template v-if="entry.tool && entry.complete" #footer>
            <SChatTool :tool="{ toolName: '读取验收清单', state: 'output-available', output: { checks: 3 } }" output-label="结果" />
          </template>
          <template v-if="messaging" #actions>
            <SButton variant="ghost" size="sm" @click="openThread(entry)">回复{{ replies[entry.id]?.length ? ` · ${replies[entry.id].length}` : '' }}</SButton>
          </template>
        </SChatMessage>
      </SChatConversation>
      <SPromptInput v-model="prompt" :allow-attachments="false" :status="running ? 'streaming' : 'ready'"
        :label="messaging ? '发送频道消息' : '发送给助手'" placeholder="输入消息" :labels="{ send: '发送', stop: '停止' }" @submit="submit" @stop="stop()" />
    </div>
    <template #aside>
      <div class="communication-demo__pane">
        <template v-if="messaging && thread">
          <h3>消息讨论串</h3><p>{{ thread.text }}</p>
          <SChatMessage v-for="(reply, index) in replies[thread.id] ?? []" :key="index" :source="reply" author="你" message-role="user" />
          <SPromptInput v-model="threadReply" :allow-attachments="false" label="回复讨论串" :labels="{ send: '发送回复' }" @submit="sendReply" />
        </template>
        <p v-else-if="messaging">选择一条消息查看回复。</p>
        <template v-else><h3>验收结果</h3>
          <SProgressBar v-if="running" label="正在生成资料" indeterminate />
          <template v-if="artifact">
            <SBadge tone="success">演示资料</SBadge>
            <SCodeBlock label="验收结果" :code="artifact" language="json" copy-label="复制" />
          </template>
        </template>
      </div>
    </template>
  </SAppLayout>
</template>

<style scoped>
.communication-demo__pane, .communication-demo__landing { display: grid; align-content: start; min-width: 0; gap: var(--sy-space-3); padding: var(--sy-space-3); }
.communication-demo__pane :is(h2, h3, p), .communication-demo__landing h2 { margin: 0; }
.communication-demo__toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: var(--sy-space-2); }
.communication-demo__pane [data-messaging] :deep(.sy-chat-message__body) { padding-inline: 0; background: transparent; }
.communication-demo__pane [data-messaging] :deep(.sy-chat-message) { padding-block: var(--sy-space-2); border-block-end: 1px solid var(--sy-border); }
.communication-demo__landing { margin-inline: auto; width: min(100%, 34rem); align-items: start; }
.communication-demo__landing h2 { text-align: center; }
</style>
