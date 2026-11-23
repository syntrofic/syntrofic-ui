import { randomUUID } from 'node:crypto'

const address = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/
const dateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/
const validDate = value => typeof value==='string' && dateTime.test(value) && Number.isFinite(Date.parse(value))
const safeId = /^[A-Za-z0-9_@.-]{1,150}$/

export function createOutbound(connectors, { now=Date.now }={}) {
  const queue=new Map()
  const audit=[]
  const sending=new Set()
  function event(record,status) {
    record.status=status
    audit.push({id:record.id,workspace:record.workspace,subject:record.subject,type:record.type,status,time:now()})
    if (audit.length>2000) audit.shift()
  }
  const owner = (record,claims) => record.workspace===claims.workspace && record.subject===claims.subject
  function persist(record) {
    if (queue.size>=2000) {
      const finished=[...queue].find(([,value])=>['sent','failed','cancelled'].includes(value.status))
      if (!finished) throw new Error('Too many pending deliveries')
      queue.delete(finished[0])
    }
    queue.set(record.id,record)
    event(record,'scheduled')
    return publicRecord(record)
  }
  function publicRecord(record) {
    const {workspace,subject,input,...details}=record
    return details
  }
  const validateMail = input => input && typeof input.to==='string' && address.test(input.to) && input.to.length<255 &&
    typeof input.subject==='string' && input.subject.trim().length>0 && input.subject.length<=120 && !/[\r\n\x00]/.test(input.subject) &&
    typeof input.text==='string' && input.text.trim().length>0 && input.text.length<=16000 &&
    (!Object.hasOwn(input,'scheduledAt') || Number.isSafeInteger(input.scheduledAt) && input.scheduledAt<=now()+30*86400000)
  const validateEvent = input => input && typeof input.id==='string' && safeId.test(input.id) &&
    validDate(input.start) && validDate(input.end) && Date.parse(input.end)>Date.parse(input.start) &&
    (!Object.hasOwn(input,'calendar') || typeof input.calendar==='string' && safeId.test(input.calendar)) &&
    typeof input.etag==='string' && /^"[^"\r\n]{1,100}"$/.test(input.etag)
  const tools=[
    {name:'schedule_mail',scope:'write',policy:'approve',validate:validateMail,
      run(input,{workspace,subject}) {
        if (!connectors.canWrite({workspace,subject},'gmail')) throw new Error('Mail account is unavailable')
        return persist({id:randomUUID(),workspace,subject,type:'mail',due:Math.max(input.scheduledAt??0,now()+10000),input})
      }},
    {name:'reschedule_event',scope:'write',policy:'approve',validate:validateEvent,
      async run(input,{workspace,subject}) {
        const record={id:randomUUID(),workspace,subject,type:'calendar'}
        event(record,'running')
        try {
          const change=await connectors.write({workspace,subject},'calendar',input)
          event(record,'sent')
          return {id:record.id,eventId:change.id,start:change.start,end:change.end}
        } catch (error) {event(record,'failed');throw error}
      }},
  ]
  async function processMail(record) {
    const account=record.workspace+'/'+record.subject
    if (sending.has(account)) return
    sending.add(account)
    event(record,'running')
    try {
      await connectors.write(record,'gmail',record.input)
      event(record,'sent')
    } catch {event(record,'failed')}
    finally {delete record.input;sending.delete(account)}
  }
  function start() {
    const timer=setInterval(()=>{
      for (const record of queue.values()) {
        if (record.status==='scheduled' && record.due<=now()) void processMail(record)
      }
    },500)
    timer.unref()
    return ()=>clearInterval(timer)
  }
  function cancel(claims,id) {
    const record=queue.get(id)
    if (!record || !owner(record,claims) || record.status!=='scheduled') throw new Error('Delivery cannot be cancelled')
    event(record,'cancelled')
    delete record.input
    return publicRecord(record)
  }
  return {tools,start,cancel,deliveries:claims=>[...queue.values()].filter(record=>owner(record,claims)).map(publicRecord),
    events:claims=>audit.filter(record=>record.workspace===claims.workspace)}
}
