export const workAreas = [
  ['up-next', '接下来'], ['inbox', '邮件'], ['calendar', '日历'], ['support', '客服'],
  ['tasks', '任务'], ['notes', '笔记'], ['crm', '客户'],
] as const
export type WorkArea = typeof workAreas[number][0]
export type WorkKind = Exclude<WorkArea, 'up-next'>
export type WorkItem = {
  id: string
  kind: WorkKind
  title: string
  source: string
  text: string
  state: string
  date?: string
  owner?: string
  account?: string
  labels?: string[]
  vip?: boolean
  unread?: boolean
  company?: string
  snoozedUntil?: number
  reminderAt?: string
}
type Delivery = Pick<WorkItem,'id'|'account'|'title'|'text'> & {
  contact: string
  scheduledAt: number
  transition: 'scheduled'|'sent'|'cancelled'|'failed'
}
type WorkChange = { id: string; entity: string; action: string; at: number; before?: WorkItem }
export type WorkspaceData = {
  items: WorkItem[]
  outbox: Delivery[]
  journal: WorkChange[]
  settings: { theme: 'light'|'dark'; signature: string; trackingConsent: boolean; notifications: boolean; available: string; subscriptions: string[] }
}

export function demoProductivity(when = new Date()): WorkspaceData {
  const day = when.toISOString().slice(0,10)
  return {
    items: [
      { id:'m1',kind:'inbox',title:'品牌资源库 · 二轮校对',source:'林舟 <lin@example.test>',text:'周二前确认授权说明，版式样张已上传。',state:'待回复',account:'设计组',labels:['交付'],vip:true,unread:true,company:'澄岸设计' },
      { id:'m2',kind:'inbox',title:'本次登录验证码',source:'access@example.test',text:'你的临时验证码为 482191。',state:'资料',account:'运营组',labels:['验证'],unread:true },
      { id:'c1',kind:'calendar',title:'品牌资源库复盘',source:'项目日历',text:'参会人包括林舟和交付组。核对授权与版式。',state:'已安排',date:day+'T14:30',company:'澄岸设计' },
      { id:'s1',kind:'support',title:'共享预览权限到期',source:'工单 #248',text:'外部评审打开共享预览时提示访问过期。',owner:'待指派',state:'待处理' },
      { id:'t1',kind:'tasks',title:'更新交付检查清单',source:'设计组',text:'补充暗色主题与手机端的验收步骤。',state:'待办',date:day+'T17:00' },
      { id:'n1',kind:'notes',title:'品牌资源库 · 权限回顾',source:'项目笔记',text:'交付包已有版式初稿。外部共享有效期为七天。',state:'交付资料',company:'澄岸设计' },
      { id:'r1',kind:'crm',title:'澄岸设计',source:'林舟 <lin@example.test>',text:'品牌设计合作，正在整理二轮交付范围。',state:'洽谈',company:'澄岸设计' },
      { id:'r2',kind:'crm',title:'远岭投资',source:'周禾 <zhou@example.test>',text:'上周沟通了品牌订阅与企业渠道。',state:'新线索',company:'远岭投资',labels:['投资机构'] },
    ],
    outbox: [],
    journal: [],
    settings: { theme:'light',signature:'交付组',trackingConsent:false,notifications:false,available:'工作日 14:00–17:00',subscriptions:['版本更新'] },
  }
}

export function workspaceSearch(data: WorkspaceData, text: string, kind?: WorkKind) {
  const query = text.trim().toLocaleLowerCase()
  return data.items.filter(item => (!kind || item.kind === kind) &&
    [item.title,item.text,item.source,item.company,item.owner,item.labels?.join(' ')].some(field => field?.toLocaleLowerCase().includes(query)))
}
export function meetingContext(data: WorkspaceData, meeting: WorkItem) {
  const topic = meeting.title.split(/[ ·复盘]/u).find(part => part.length > 1)
  return data.items.filter(item => ['inbox','notes','crm'].includes(item.kind) &&
    (meeting.company && meeting.company === item.company || topic && item.title.includes(topic)))
}
export function mailSummary(item: WorkItem) {
  return item.text.trim().split(/(?<=[。！？.!?])\s*/u).slice(0,2).join('').slice(0,240)
}
export function mailDraft(item: WorkItem, signature: string) {
  const contact = item.source.split(' <')[0]
  return [contact+'，你好！', '已收到「'+item.title+'」。我会核对相关材料并回复进展。', signature].filter(Boolean).join('\n\n')
}
export function extractLead(mail: WorkItem) {
  const address = mail.source.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0]
  if (!address) return undefined
  const company = mail.company || address.split('@')[1]
  return {kind:'crm' as const, title:company, source:mail.source, company, text:mail.title, state:'新线索'}
}

export function createProductivity(initial: WorkspaceData, save: (data: WorkspaceData) => void,
  { now = Date.now, identify = () => crypto.randomUUID() } = {}) {
  let data = structuredClone(initial)
  function apply(next: WorkspaceData) {
    data = next
    save(structuredClone(data))
  }
  function change(entity: string, action: string, before?: WorkItem): WorkChange[] {
    return [...data.journal, {id:identify(), entity, action, at:now(), before}].slice(-100)
  }
  function add(input: Omit<WorkItem,'id'>) {
    const item = { ...input,id:identify() }
    apply({ ...data,items:[item,...data.items],journal:change(item.id,'新增') })
    return item
  }
  function update(id: string, patch: Partial<Omit<WorkItem,'id'|'kind'>>, action: string) {
    const previous = data.items.find(item => item.id === id)
    if (!previous) return
    apply({ ...data,items:data.items.map(item=>item.id===id?{...item,...patch}:item),journal:change(id,action,previous) })
  }
  function undo(id: string) {
    const previous = [...data.journal].reverse().find(event=>event.entity===id&&event.before)
    if (!previous?.before) return
    const restored = previous.before
    apply({...data,items:data.items.map(item=>item.id===id?restored:item),
      journal:change(id,'撤销').filter(event=>event.id!==previous.id)})
  }
  function queue(input: Pick<Delivery,'contact'|'title'|'text'|'account'>, time = now() + 10000) {
    if (!input.contact.trim() || !input.title.trim() || !input.text.trim() || !Number.isFinite(time) || time < now()) {
      throw new Error('请填写收件人、标题、正文及未来发送时间')
    }
    const delivery: Delivery = {...input,id:identify(),scheduledAt:time,transition:'scheduled'}
    apply({...data,outbox:[...data.outbox,delivery],journal:change(delivery.id,'进入发送队列')})
    return delivery
  }
  function finish(id: string, transition: 'sent'|'failed'|'cancelled') {
    if (!data.outbox.some(item=>item.id===id&&item.transition==='scheduled')) return
    const action = {sent:'已发送到本地示例',failed:'发送失败',cancelled:'撤销发送'}[transition]
    apply({...data,outbox:data.outbox.map(item=>item.id===id?{...item,transition}:item),journal:change(id,action)})
  }
  function tick() {
    for (const item of data.outbox) {
      if (item.transition==='scheduled' && item.scheduledAt<=now()) finish(item.id,'sent')
    }
  }
  function settings(patch: Partial<WorkspaceData['settings']>) { apply({...data,settings:{...data.settings,...patch}}) }
  return { add,update,undo,queue,cancel:(id:string)=>finish(id,'cancelled'),tick,settings }
}
