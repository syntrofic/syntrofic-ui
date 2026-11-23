import { createHmac, timingSafeEqual } from 'node:crypto'
export function signWorkspaceEvent(secret, body, time) {
  if (typeof secret!=='string' || secret.length<32 || !Number.isSafeInteger(time)) throw new TypeError('Invalid webhook key or time')
  return createHmac('sha256',secret).update(String(time)).update('.').update(body).digest('hex')
}
export function verifyWorkspaceEvent(secret, body, time, signature, now=Math.floor(Date.now()/1000), tolerance=300) {
  if (!Number.isSafeInteger(time) || Math.abs(now-time)>tolerance || typeof signature!=='string' || !/^[0-9a-f]{64}$/i.test(signature)) return false
  const expected=Buffer.from(signWorkspaceEvent(secret,body,time),'hex')
  return timingSafeEqual(expected,Buffer.from(signature,'hex'))
}
export function createWorkspaceRelay({ endpoint, secret, now=()=>Math.floor(Date.now()/1000), send=fetch }) {
  const url=new URL(endpoint)
  if (!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)) || url.username || url.password)
    throw new Error('Invalid webhook endpoint')
  const events=new Map()
  async function dispatch(event) {
    if (!event || typeof event.id!=='string'||typeof event.type!=='string') throw new Error('Event ID and type are required')
    if (events.has(event.id)) return events.get(event.id)
    const task=(async()=>{
      const body=JSON.stringify(event)
      for(let attempt=1;attempt<=3;attempt++) {
        const time=now()
        try {
          const response=await send(url,{method:'POST',headers:{'Content-Type':'application/json','X-Syntrofic-Time':String(time),
            'X-Syntrofic-Signature':signWorkspaceEvent(secret,body,time),'X-Syntrofic-Event':event.id},
            body,redirect:'error',signal:AbortSignal.timeout(3500)})
          if (response.ok) return {id:event.id,status:'delivered',attempt}
          if (response.status<500&&response.status!==429) break
        } catch { /* Retry transient delivery failures. */ }
      }
      return {id:event.id,status:'failed'}
    })()
    events.set(event.id,task)
    return task
  }
  return { dispatch }
}
