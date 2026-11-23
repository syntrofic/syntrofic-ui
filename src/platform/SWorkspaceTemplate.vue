<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import SAgentUI from '../agent-ui/SAgentUI.vue'
import type { AgentDocument } from '../agent-ui/schema'
import SButton from '../components/SButton.vue'
import SInput from '../components/SInput.vue'
import SProgressBar from '../components/SProgressBar.vue'
import SSelect from '../components/SSelect.vue'
import SSwitch from '../components/SSwitch.vue'
import STextArea from '../components/STextArea.vue'

export type WorkspaceTemplateKind = 'dashboard' | 'mail' | 'chat' | 'crm' | 'finances'
const props = defineProps<{ kind: WorkspaceTemplateKind }>()
const names = {
  dashboard: ['概览', '订单', '跟踪', '设置', '帮助'], mail: ['收件箱', '已发送', '草稿', '撰写'],
  chat: ['会话', '资料库', '探索'], crm: ['商机', '账户健康', '公司资料'], finances: ['组合', '支出', '交易'],
}
const active = ref(0)
const heading = computed(() => ({ dashboard:'交付工作台', mail:'工作邮箱', chat:'资料助手', crm:'客户工作台', finances:'模拟资产总览' }[props.kind]))
const search = ref('')
const detail = ref<string>()
const checked = ref(false)
const notice = ref('')
const filter = ref('all')
const months = [{ label: '全部', value: 'all' }, { label: '10月', value: '10月' }, { label: '11月', value: '11月' }]
const orders = [
  { id:'1016', label:'品牌规范', value:490, detail:'已交付', values:{ 金额:490, 状态:'已交付', 月份:'11月' } },
  { id:'1017', label:'版式样张', value:320, detail:'运输中', values:{ 金额:320, 状态:'运输中', 月份:'11月' } },
  { id:'1018', label:'资料授权', value:140, detail:'等待处理', values:{ 金额:140, 状态:'等待处理', 月份:'10月' } },
]
const rows = computed(() => orders.filter(order => (!search.value || order.label.includes(search.value))
  && (filter.value === 'all' || String(order.values.月份) === filter.value)))
const docs = computed<AgentDocument>(() => ({
  version: 1, nodes: props.kind === 'finances' ? [
    { id:'finance-kpi', kind:'metric-grid', title:'组合指标', values:[{id:'net',label:'组合金额',value:950},{id:'delta',label:'当月收入',value:810}] },
    { id:'finance-pie', kind:'donut-chart', title:'支出分布', values:rows.value },
  ] : [
    { id:'dash-kpi', kind:'kpi-grid', title:'订单指标', values:[
      { id:'delivered', label:'已交付', value: rows.value.filter(order => order.detail === '已交付').length,
        series: rows.value.map((_, index) => rows.value.slice(0, index + 1).filter(order => order.detail === '已交付').length) },
      { id:'total', label:'合计订单', value: rows.value.length, series: rows.value.map((_, index) => index + 1) },
    ] },
    { id:'dash-amount', kind:'bar-chart', title:'订单金额', values:rows.value },
    { id:'dash-table', kind:'data-table', title:'订单', values:rows.value },
  ],
}))
const mail = ref([
  { id:1, folder:0, subject:'周五交付说明', body:'请确认样张与字体授权。' },
  { id:2, folder:0, subject:'资料确认', body:'品牌规范已发送给设计组。' },
])
const subject = ref('')
const body = ref('')
const openedMail = ref<number>()
const currentMail = computed(() => mail.value.find(item => item.id === openedMail.value))
function writeMail(folder: number) {
  if (!subject.value.trim()) return
  mail.value.push({ id:Math.max(0,...mail.value.map(item=>item.id))+1, folder, subject:subject.value, body:body.value })
  subject.value = body.value = ''
  active.value = folder
  notice.value = folder === 1 ? '模拟邮件已发送' : '草稿已保存'
}
const chats = ref([
  { title:'交付清单', messages:[{ role:'助手', text:'需要核对哪个批次？' }] },
  { title:'复核记录', messages:[{ role:'助手', text:'可查看本周复核资料。' }] },
])
const conversation = ref(0)
const prompt = ref('')
let stream: ReturnType<typeof setInterval> | undefined
function stop() { clearInterval(stream); stream = undefined }
function send() {
  const question = prompt.value.trim()
  if (!question) return
  stop()
  const messages = chats.value[conversation.value].messages
  messages.push({ role:'你', text:question }, { role:'助手', text:'' })
  const output = '示例资料显示，品牌规范已复核，版式样张等待校对。'
  const reply = messages.at(-1)!
  let count = 0
  prompt.value = ''
  stream = setInterval(() => {
    reply.text = output.slice(0, ++count)
    if (count >= output.length) stop()
  }, 28)
}
onBeforeUnmount(stop)
const deals = ref([{ id:'studio', name:'青屿工作室', stage:0, health:82 },{ id:'north',name:'远岸设计',stage:1,health:68 }])
const stages = ['接洽', '评估', '成交']
const selectedDeal = computed(() => deals.value.find(item=>item.id===detail.value))
function navigate(tab: number) { active.value = tab; detail.value = undefined; openedMail.value = undefined; notice.value = ''; search.value = ''; filter.value = 'all' }
</script>

<template>
  <section class="sy-workspace-template">
    <h2>{{ heading }}</h2>
    <nav class="sy-agent-actions" :aria-label="heading">
      <SButton v-for="(name, index) in names[kind]" :key="name" size="sm" :variant="active === index ? 'primary' : 'secondary'"
        :aria-current="active === index ? 'page' : undefined" @click="navigate(index)">{{ name }}</SButton>
    </nav>
    <template v-if="kind === 'dashboard' || kind === 'finances'">
      <template v-if="kind === 'dashboard' && active > 2">
        <SSwitch v-if="active === 3" v-model="checked">跟踪通知</SSwitch>
        <p v-else>按订单编号查看跟踪记录，修改前可核对当前状态。</p>
      </template>
      <template v-else>
        <template v-if="active === 0">
          <div v-if="kind === 'dashboard'" class="sy-agent-actions">
            <SInput v-model="search" label="搜索订单" />
            <SSelect v-model="filter" label="月份" :options="months" />
          </div>
          <SAgentUI :document="docs" />
        </template>
        <div v-else class="sy-agent-card">
          <SInput v-model="search" label="搜索记录" />
          <SSelect v-if="kind === 'finances'" v-model="filter" label="月份" :options="months" />
          <SButton v-for="order in rows" :key="order.id" size="sm" variant="ghost" @click="detail = order.id">{{ order.label }} · ¥{{ order.value }}</SButton>
          <p v-if="!rows.length">暂无匹配记录</p>
          <p v-if="detail">编号 {{ detail }} · {{ rows.find(order => order.id === detail)?.detail }}</p>
        </div>
      </template>
    </template>
    <template v-else-if="kind === 'mail'">
      <form v-if="active === 3" class="sy-agent-fields" @submit.prevent="writeMail(1)">
        <SInput v-model="subject" label="主题" required />
        <STextArea v-model="body" label="正文" :rows="4" />
        <div class="sy-agent-actions"><SButton type="submit" size="sm">模拟发送</SButton>
          <SButton variant="secondary" size="sm" :disabled="!subject.trim()" @click="writeMail(2)">保存草稿</SButton></div>
      </form>
      <div v-else class="sy-agent-card">
        <SButton v-for="thread in mail.filter(item=>item.folder===active)" :key="thread.id" size="sm" variant="ghost"
          @click="openedMail=thread.id">{{ thread.subject }}</SButton>
        <p v-if="!mail.some(item=>item.folder===active)">暂无邮件</p>
        <article v-if="currentMail"><h3>{{ currentMail.subject }}</h3><p>{{ currentMail.body }}</p></article>
      </div>
    </template>
    <template v-else-if="kind === 'chat'">
      <template v-if="active === 0">
        <div class="sy-agent-actions"><SButton v-for="(thread,index) in chats" :key="thread.title" size="sm" variant="secondary"
          :aria-pressed="index===conversation" @click="conversation=index">{{ thread.title }}</SButton></div>
        <div v-for="(message,index) in chats[conversation].messages" :key="index" class="sy-agent-card"><strong>{{ message.role }}</strong><p>{{ message.text }}</p></div>
        <form class="sy-agent-actions" @submit.prevent="send"><SInput v-model="prompt" label="输入问题" required /><SButton size="sm" type="submit">发送</SButton><SButton variant="ghost" size="sm" @click="stop">停止</SButton></form>
      </template>
      <div v-else class="sy-agent-card">
        <p>{{ active === 1 ? '资料库 · 品牌规范、复核记录、授权说明' : '探索 · 对照版本、总结审阅意见' }}</p>
        <SButton size="sm" variant="secondary" @click="active=0; prompt='整理复核记录'">用作提问</SButton>
      </div>
    </template>
    <template v-else>
      <SInput v-model="search" label="筛选公司" />
      <div v-for="deal in deals.filter(item=>!search || item.name.includes(search))" :key="deal.id" class="sy-agent-card">
        <strong>{{ deal.name }}</strong>
        <p v-if="active===0">阶段 {{ stages[deal.stage] }}</p>
        <SProgressBar v-if="active === 1" :label="deal.name" :value="deal.health" />
        <div class="sy-agent-actions">
          <SButton size="sm" variant="ghost" @click="detail=deal.id; active=2">公司详情</SButton>
          <SButton v-if="active === 0" size="sm" variant="secondary" :disabled="deal.stage>=2" @click="deal.stage++">推进阶段</SButton>
        </div>
      </div>
      <p v-if="active===2 && selectedDeal" role="status">{{ selectedDeal.name }} · {{ stages[selectedDeal.stage] }} · 账户健康 {{ selectedDeal.health }}</p>
    </template>
    <p v-if="notice" role="status">{{ notice }}</p>
  </section>
</template>
