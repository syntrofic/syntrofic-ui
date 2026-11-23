<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, ref } from 'vue'
import SButton from '../components/SButton.vue'
import SInput from '../components/SInput.vue'
import STextArea from '../components/STextArea.vue'
import SMotionText from '../components/SMotionText.vue'
import { createProductivity,demoProductivity,extractLead,mailDraft,mailSummary,meetingContext,workAreas,workspaceSearch } from './productivity'
import type { WorkArea, WorkItem, WorkspaceData } from './productivity'

const props = withDefaults(defineProps<{ area?:WorkArea; advanced?:boolean; storeKey?:string }>(), {area:'up-next',storeKey:'syntrofic-productivity-v1'})
function restore() {
  try {
    const stored = JSON.parse(localStorage.getItem(props.storeKey) ?? 'null') as WorkspaceData|null
    if (stored && Array.isArray(stored.items) && Array.isArray(stored.outbox) && Array.isArray(stored.journal) && stored.settings) return stored
  } catch { /* Use example state when storage is unavailable. */ }
  return demoProductivity()
}
const data = shallowRef(restore())
const workspace = createProductivity(data.value, value => {
  data.value=value
  try { localStorage.setItem(props.storeKey,JSON.stringify(value)) } catch { /* Keep state in this session. */ }
})
const active = ref<WorkArea>(props.area)
const selected = ref('')
const query = ref('')
const account = ref('')
const shortcut = ref(false)
const settings = ref(false)
const label = ref('')
const reply = ref('')
const recipient = ref('')
const subject = ref('')
const sendAt = ref('')
const dateProposal = ref('')
const status = ref('')
const clock = ref(Date.now())
const composing = ref(false)
const commandInput = ref<HTMLInputElement>()
const current = computed(()=>data.value.items.find(item=>item.id===selected.value))
const accounts = computed(()=>[...new Set(data.value.items.flatMap(item=>item.account?[item.account]:[]))])
const visible = computed(()=>workspaceSearch(data.value,query.value,query.value||active.value==='up-next'?undefined:active.value).filter(item=>
  (!account.value || item.account===account.value) && (!item.snoozedUntil || item.snoozedUntil<=clock.value) &&
  (active.value!=='up-next' || query.value || ['待回复','已安排','待处理','待办'].includes(item.state))))
const activeItem = computed(()=>current.value && visible.value.some(item=>item.id===current.value?.id)?current.value:visible.value[0])
const related = computed(()=>activeItem.value?.kind==='calendar'?meetingContext(data.value,activeItem.value):[])
const outgoing = computed(()=>data.value.outbox.slice(-4).reverse())
const history = computed(()=>data.value.journal.filter(entry=>entry.entity===activeItem.value?.id).slice(-4).reverse())
const due = computed(()=>data.value.items.filter(item=>item.reminderAt))
const stateOptions:Record<WorkItem['kind'],string[]> = {
  inbox:['待回复','已回复','已归档'], calendar:['已安排','已结束'], support:['待处理','处理中','已关闭'],
  tasks:['待办','进行中','已完成'], notes:['交付资料','会议回顾','草稿'], crm:['新线索','洽谈','合作','已关闭'],
}
function pick(area:WorkArea) {
  active.value=area
  account.value=''
  query.value=''
  selected.value=''
  shortcut.value=false
}
function select(item:WorkItem) {
  selected.value=item.id
  dateProposal.value=''
  if (item.kind==='inbox'&&item.unread) workspace.update(item.id,{unread:false},'标记已读')
}
function compose(item?:WorkItem,draft=false) {
  recipient.value=item?.source ?? ''
  subject.value=item ? '回复：'+item.title : ''
  reply.value=item&&draft?mailDraft(item,data.value.settings.signature):''
  sendAt.value=''
  composing.value=true
}
function schedule() {
  try {
    workspace.queue({contact:recipient.value,title:subject.value,text:reply.value,account:activeItem.value?.account},
      sendAt.value?new Date(sendAt.value).getTime():undefined)
    composing.value=false
    status.value='已加入本地发送队列，可在发送前撤回'
  } catch (error) { status.value=(error as Error).message }
}
function propose(item:WorkItem) {
  const start = new Date(item.date ?? '')
  if (!Number.isFinite(start.getTime())) return
  start.setMinutes(start.getMinutes()+30)
  const local = new Date(start.getTime()-start.getTimezoneOffset()*60000)
  dateProposal.value=local.toISOString().slice(0,16)
}
function followUp(item:WorkItem) {
  workspace.add({kind:'tasks',title:'跟进 · '+item.title,source:item.source,text:item.text,state:'待办',company:item.company})
  status.value='已创建跟进任务'
}
function importLead(item:WorkItem) {
  const lead=extractLead(item)
  if (!lead) { status.value='此邮件没有可提取的联系人'; return }
  const existing=data.value.items.find(entry=>entry.kind==='crm'&&entry.company===lead.company)
  const match=existing??workspace.add(lead)
  pick('crm')
  selected.value=match.id
  status.value='已打开公司及联系人'
}
function printItems() { window.print() }
function exportItems() {
  const file=new Blob([JSON.stringify(visible.value,null,2)],{type:'application/json'})
  const url=URL.createObjectURL(file)
  const link=document.createElement('a')
  link.href=url;link.download='syntrofic-workspace.json';link.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
async function enableNotifications() {
  if (typeof Notification==='undefined') { status.value='当前浏览器不支持系统通知';return }
  const permission=await Notification.requestPermission()
  workspace.settings({notifications:permission==='granted'})
  status.value=permission==='granted'?'已允许提醒':'系统通知权限未开启'
}
function notifyDue() {
  clock.value=Date.now()
  workspace.tick()
  for (const item of due.value) {
    if (!item.reminderAt || new Date(item.reminderAt).getTime()>clock.value) continue
    workspace.update(item.id,{reminderAt:undefined},'提醒已送达')
    status.value='日历提醒 · '+item.title
    if (data.value.settings.notifications && typeof Notification!=='undefined' && Notification.permission==='granted') new Notification(item.title)
  }
}
function keydown(event:KeyboardEvent) {
  if ((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k') {
    event.preventDefault()
    shortcut.value=true
    requestAnimationFrame(()=>commandInput.value?.focus())
  }
  if (event.key==='Escape') shortcut.value=false
}
let timer: ReturnType<typeof setInterval>
onMounted(()=>{notifyDue();timer=setInterval(notifyDue,1000);window.addEventListener('keydown',keydown)})
onBeforeUnmount(()=>{clearInterval(timer);window.removeEventListener('keydown',keydown)})
const deliveryText={scheduled:'待发送',sent:'示例已发送',cancelled:'已撤回',failed:'发送失败'}
</script>

<template>
  <div class="sy-workspace" :data-workspace-theme="data.settings.theme">
    <div class="sy-workspace__top">
      <nav aria-label="工作台">
        <button v-for="[area,text] in workAreas" :key="area" type="button" :aria-current="area===active?'page':undefined" @click="pick(area)">{{ text }}</button>
      </nav>
      <SButton size="sm" variant="secondary" @click="compose()">撰写邮件</SButton>
    </div>
    <div class="sy-workspace__toolbar">
      <input ref="commandInput" v-model="query" type="search" aria-label="搜索工作台" placeholder="搜索工作台 · ⌘ K">
      <SButton size="sm" variant="ghost" @click="shortcut=!shortcut">快捷操作</SButton>
      <SButton v-if="advanced" size="sm" variant="secondary" @click="settings=!settings">偏好设置</SButton>
    </div>
    <div v-if="shortcut" class="sy-agent-actions" aria-label="命令菜单">
      <SButton v-for="[area,text] in workAreas" :key="area" size="sm" variant="ghost" @click="pick(area)">转到{{ text }}</SButton>
    </div>
    <section v-if="settings" class="sy-workspace__prefs" aria-label="偏好设置">
      <SInput label="邮件签名" :model-value="data.settings.signature" @update:model-value="workspace.settings({signature:$event})" />
      <SInput label="可预约时间" :model-value="data.settings.available" @update:model-value="workspace.settings({available:$event})" />
      <label><input type="checkbox" :checked="data.settings.trackingConsent" @change="workspace.settings({trackingConsent:($event.target as HTMLInputElement).checked})">同意显示邮件打开状态</label>
      <label><input type="checkbox" :checked="data.settings.subscriptions.includes('版本更新')" @change="workspace.settings({subscriptions:($event.target as HTMLInputElement).checked?['版本更新']:[]})">订阅版本更新</label>
      <SButton size="sm" variant="secondary" @click="workspace.settings({theme:data.settings.theme==='light'?'dark':'light'})">切换主题</SButton>
      <SButton size="sm" variant="secondary" @click="enableNotifications">允许系统提醒</SButton>
    </section>
    <div v-if="advanced&&active==='inbox'" class="sy-workspace__toolbar">
      <label>邮件账号 <select v-model="account"><option value="">全部账号</option><option v-for="name in accounts" :key="name">{{ name }}</option></select></label>
      <SButton size="sm" variant="ghost" @click="query='验证'">验证码</SButton>
      <SButton size="sm" variant="ghost" @click="query='交付'">交付</SButton>
      <SButton size="sm" variant="ghost" @click="exportItems">导出 JSON</SButton>
      <SButton size="sm" variant="ghost" @click="printItems">打印</SButton>
    </div>
    <div v-if="advanced&&active==='tasks'" class="sy-workspace__lanes" aria-label="任务看板">
      <section v-for="lane in stateOptions.tasks" :key="lane"><h3>{{ lane }}</h3><button v-for="item in visible.filter(value=>value.state===lane)" :key="item.id" @click="select(item)">{{ item.title }}</button></section>
    </div>
    <div class="sy-workspace__grid">
      <div class="sy-workspace__list" aria-label="工作条目">
        <button v-for="item in visible" :key="item.id" type="button" :aria-pressed="activeItem?.id===item.id" @click="select(item)">
          <span>{{ item.title }}</span><small>{{ item.kind===active ? item.source : workAreas.find(([id])=>id===item.kind)?.[1] }} · {{ item.state }}{{ item.vip?' · VIP':'' }}</small>
        </button>
        <p v-if="!visible.length">没有匹配条目。</p>
      </div>
      <section v-if="activeItem" class="sy-workspace__detail">
        <h2>{{ activeItem.title }}</h2>
        <p class="sy-workspace__meta">{{ activeItem.source }}<template v-if="activeItem.date"> · <time>{{ activeItem.date.replace('T',' ') }}</time></template></p>
        <p>{{ activeItem.text }}</p>
        <label v-if="activeItem.kind!=='inbox'">状态
          <select :value="activeItem.state" @change="workspace.update(activeItem.id,{state:($event.target as HTMLSelectElement).value},'修改状态')">
            <option v-if="!stateOptions[activeItem.kind].includes(activeItem.state)">{{ activeItem.state }}</option>
            <option v-for="option in stateOptions[activeItem.kind]" :key="option">{{ option }}</option>
          </select>
        </label>
        <template v-if="activeItem.kind==='inbox'">
          <div class="sy-agent-actions">
            <SButton size="sm" variant="secondary" @click="status=mailSummary(activeItem)">摘要</SButton>
            <SButton size="sm" variant="secondary" @click="compose(activeItem,true)">生成草稿</SButton>
            <SButton size="sm" variant="ghost" @click="workspace.update(activeItem.id,{snoozedUntil:Date.now()+3600000},'稍后提醒')">一小时后提醒</SButton>
            <SButton size="sm" variant="ghost" @click="followUp(activeItem)">安排跟进</SButton>
            <SButton size="sm" variant="ghost" @click="importLead(activeItem)">提取联系人</SButton>
          </div>
          <div v-if="advanced" class="sy-agent-actions">
            <SButton size="sm" variant="ghost" @click="workspace.update(activeItem.id,{vip:!activeItem.vip},'更新 VIP')">{{ activeItem.vip?'移除 VIP':'设为 VIP' }}</SButton>
            <SInput label="邮件标签" v-model="label" />
            <SButton size="sm" variant="ghost" :disabled="!label.trim()" @click="workspace.update(activeItem.id,{labels:[...new Set([...(activeItem.labels??[]),label.trim()])]},'添加标签');label=''">添加标签</SButton>
            <span>{{ activeItem.labels?.join('、') }}</span>
            <span v-if="data.settings.trackingConsent">打开状态 · {{ activeItem.unread?'未读':'已读' }}</span>
          </div>
          <p v-for="event in data.items.filter(value=>value.kind==='calendar'&&value.company&&value.company===activeItem?.company)" :key="event.id" class="sy-workspace__meta">{{ event.title }} · {{ event.date?.replace('T',' ') }}</p>
        </template>
        <template v-if="activeItem.kind==='calendar'">
          <h3>会前资料</h3>
          <ul><li v-for="item in related" :key="item.id"><strong>{{ item.title }}</strong> · {{ item.text }}</li></ul>
          <div class="sy-agent-actions">
            <SButton size="sm" variant="secondary" @click="propose(activeItem)">建议延后 30 分钟</SButton>
            <SButton size="sm" variant="ghost" @click="followUp(activeItem)">添加会后任务</SButton>
          </div>
          <div v-if="dateProposal" class="sy-agent-actions">
            <label>建议时间 <input v-model="dateProposal" type="datetime-local"></label>
            <SButton size="sm" @click="workspace.update(activeItem.id,{date:dateProposal},'已批准日程变更');dateProposal=''">批准变更</SButton>
          </div>
          <label v-if="advanced">提醒时间 <input type="datetime-local" :value="activeItem.reminderAt" @change="workspace.update(activeItem.id,{reminderAt:($event.target as HTMLInputElement).value},'设置日历提醒')"></label>
          <p v-if="advanced">可预约 · {{ data.settings.available }}</p>
        </template>
        <label v-if="activeItem.kind==='support'">指派给 <select :value="activeItem.owner" @change="workspace.update(activeItem.id,{owner:($event.target as HTMLSelectElement).value},'指派工单')"><option>待指派</option><option>林舟</option><option>周禾</option></select></label>
        <label v-if="advanced&&activeItem.kind==='notes'">笔记文件夹
          <input :value="activeItem.state" @change="workspace.update(activeItem.id,{state:($event.target as HTMLInputElement).value},'移至笔记文件夹')">
        </label>
        <template v-if="activeItem.kind==='crm'">
          <p>{{ activeItem.labels?.includes('投资机构')?'融资管线':'合作管线' }}</p>
          <SButton size="sm" variant="secondary" @click="compose(activeItem,true)">拟写跟进邮件</SButton>
        </template>
        <div v-if="history.length" class="sy-workspace__history">
          <span>{{ history[0].action }}</span><SButton size="sm" variant="ghost" :disabled="!history.some(event=>event.before)" @click="workspace.undo(activeItem.id)">撤销条目变更</SButton>
        </div>
      </section>
    </div>
    <form v-if="composing" class="sy-workspace__detail" aria-label="撰写邮件" @submit.prevent="schedule">
      <SInput label="收件人" v-model="recipient" required /><SInput label="主题" v-model="subject" required />
      <STextArea label="正文" v-model="reply" :rows="3" />
      <div class="sy-agent-actions">
        <SButton size="sm" variant="ghost" @click="reply+='\n\n收到，我会在核对后回复。'">插入常用回复</SButton>
        <label>计划发送 <input v-model="sendAt" type="datetime-local"></label>
        <SButton type="submit" size="sm">加入发送队列</SButton>
        <SButton size="sm" variant="ghost" @click="composing=false">取消</SButton>
      </div>
    </form>
    <div v-if="outgoing.length" class="sy-workspace__detail">
      <h3>发送记录</h3>
      <div v-for="item in outgoing" :key="item.id" class="sy-agent-actions">
        <span>{{ item.title }}</span><SMotionText :value="deliveryText[item.transition]" announce />
        <SButton size="sm" variant="ghost" :disabled="item.transition!=='scheduled'" @click="workspace.cancel(item.id)">撤回发送</SButton>
      </div>
    </div>
    <p class="sy-workspace__status" role="status"><SMotionText :value="status" /></p>
  </div>
</template>

<style scoped>
.sy-workspace { color-scheme:light;display:grid;container-type:inline-size;gap:var(--sy-layout-gap);padding:var(--sy-inset);border-radius:var(--sy-radius-lg) / calc(var(--sy-radius-lg) * .78);background:var(--sy-canvas);color:var(--sy-text);font-family:var(--sy-font) }
.sy-workspace[data-workspace-theme=dark] { color-scheme:dark }
.sy-workspace__top,.sy-workspace__toolbar,.sy-workspace__prefs,.sy-workspace__history,nav { display:flex;align-items:center;gap:8px;flex-wrap:wrap }
.sy-workspace__top { justify-content:space-between }
.sy-workspace__grid { display:grid;grid-template-columns:minmax(min(100%, 11rem),1fr) minmax(0,2fr);gap:var(--sy-layout-gap) }
.sy-workspace__list { display:grid;align-content:start;gap:4px;padding:6px;background:var(--sy-surface-blue);border-radius:var(--sy-radius-md) / calc(var(--sy-radius-md) * .78) }
.sy-workspace__list button,.sy-workspace__lanes button,nav button { display:grid;gap:3px;text-align:start;padding:8px 10px;border:0;border-radius:var(--sy-radius-sm) / calc(var(--sy-radius-sm) * .78);color:inherit;background:transparent;font:inherit;cursor:pointer;transition:background-color var(--sy-duration) var(--sy-ease-settle) }
nav button { border-radius:var(--sy-radius-pill) }
.sy-workspace__list button:hover { background:var(--sy-surface) }
.sy-workspace__list button[aria-pressed=true],nav button[aria-current] { background:var(--sy-accent-soft);color:var(--sy-accent-text) }
.sy-workspace__list small,.sy-workspace__meta { color:var(--sy-text-muted) }
.sy-workspace__detail,.sy-workspace__prefs,.sy-workspace__lanes section { display:grid;align-content:start;gap:8px;min-inline-size:0;background:var(--sy-surface);padding:var(--sy-inset);border-radius:var(--sy-radius-md) / calc(var(--sy-radius-md) * .78) }
.sy-workspace__prefs { background:var(--sy-surface-lavender) }
.sy-workspace__detail :is(h2,h3,p,ul),.sy-workspace__status,.sy-workspace__lanes h3 { margin:0 }
.sy-workspace__prefs { display:flex }
.sy-workspace__toolbar input,.sy-workspace select,.sy-workspace input[type=datetime-local] { max-width:100%;font:inherit;color:inherit;border:0;border-radius:var(--sy-radius-pill);background:var(--sy-control);padding:7px 11px }
.sy-workspace__lanes { display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 10rem),1fr));gap:var(--sy-layout-gap) }
.sy-workspace__status { min-height:1.45em }
@container(max-width:34rem) { .sy-workspace__grid { grid-template-columns:minmax(0,1fr) } }
@media(prefers-reduced-motion:reduce) { .sy-workspace button { transition:none } }
</style>
