import { createHash,randomBytes } from 'node:crypto'

const google = 'https://www.googleapis.com/auth/'
export const providerProfiles = {
  gmail: {label:'Gmail / Workspace',type:'oauth',url:'https://gmail.googleapis.com/gmail/v1/users/me/messages',scope:google+'gmail.readonly',items:'messages',page:'pageToken',next:'nextPageToken'},
  calendar: {label:'Google Calendar',type:'oauth',url:'https://www.googleapis.com/calendar/v3/calendars/primary/events',scope:google+'calendar.readonly',items:'items',page:'pageToken',next:'nextPageToken',cursor:'syncToken',checkpoint:'nextSyncToken'},
  contacts: {label:'Google Contacts',type:'oauth',url:'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,organizations,metadata&requestSyncToken=true',scope:google+'contacts.readonly',items:'connections',page:'pageToken',next:'nextPageToken',cursor:'syncToken',checkpoint:'nextSyncToken'},
  plain: {label:'Plain',type:'key',url:'https://core-api.uk.plain.com/graphql/v1',items:'data.threads.edges',next:'data.threads.pageInfo.endCursor',
    query:'query WorkspaceThreads($after:String) { threads(first:25, after:$after) { edges { node { id title status } } pageInfo { endCursor hasNextPage } } }',hasPage:'data.threads.pageInfo.hasNextPage'},
  granola: {label:'Granola',type:'key',url:'https://public-api.granola.ai/v1/notes',items:'notes',page:'cursor',next:'cursor',hasPage:'hasMore'},
  cal: {label:'Cal.com',type:'key',url:'https://api.cal.com/v2/bookings',items:'data',page:'cursor',next:'pagination.nextCursor',
    hasPage:'pagination.hasMore',headers:{'cal-api-version':'2026-05-01'}},
}
const googleOAuth = { authorization:'https://accounts.google.com/o/oauth2/v2/auth', token:'https://oauth2.googleapis.com/token',
  revoke:'https://oauth2.googleapis.com/revoke', parameters:{access_type:'offline',prompt:'consent'} }
const field = (result,path) => path?.split('.').reduce((entry,key)=>entry?.[key],result)
const proof = value => createHash('sha256').update(value).digest('base64url')
function encodedSubject(text) {
  const parts=[]
  let part=''
  for (const character of text) {
    if (Buffer.byteLength(part+character)>42) {parts.push(part);part=''}
    part+=character
  }
  if (part) parts.push(part)
  return parts.map(value=>'=?UTF-8?B?'+Buffer.from(value,'utf8').toString('base64')+'?=').join('\r\n ')
}
export function serviceUrl(value) {
  const url = new URL(value)
  if (url.username || url.password || url.hash || !(url.protocol === 'https:' ||
     url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw new Error('Service endpoint must use HTTPS')
  return url
}
class ProviderError extends Error {
  constructor(status) { super('Connector request failed ('+status+')'); this.status=status }
}

export function createConnectors(settings = {},{http = fetch,now = Date.now}={}) {
  const flows = new Map()
  const exchanges = new Map()
  const connections = new Map()
  const running = new Set()
  const events = []
  function configuration(id) {
    if (!Object.hasOwn(providerProfiles,id) || !Object.hasOwn(settings,id)) throw new Error('Unknown or unconfigured connector')
    const profile=providerProfiles[id]
    return {...(profile.type==='oauth'?googleOAuth:{}),...profile,...settings[id]}
  }
  const keyFor=(claims,id)=>claims.workspace+'/'+claims.subject+'/'+id
  function record(claims,provider,action) {
    events.push({workspace:claims.workspace,subject:claims.subject,provider,action,time:now()})
    if (events.length>1500) events.shift()
  }
  async function request(url,options={}) {
    const response = await http(serviceUrl(url),{...options,redirect:'error',signal:AbortSignal.timeout(8000)})
    if (!response.ok) throw new ProviderError(response.status)
    return response
  }
  async function tokenFor(config,parameters) {
    const form = new URLSearchParams({...parameters,client_id:config.clientId})
    if (config.clientSecret) form.set('client_secret',config.clientSecret)
    const response = await request(config.token,{method:'POST',body:form})
    const result=await response.json()
    if (typeof result.access_token!=='string' || !result.access_token || result.token_type && result.token_type.toLowerCase()!=='bearer') throw new Error('Invalid token response')
    return {token:result.access_token,refresh:result.refresh_token,expires:result.expires_in?now()+Number(result.expires_in)*1000:Infinity}
  }
  async function refresh(config,claims,id,link) {
    if (link.expires>now()+10000) return
    if (!link.refresh) throw new Error('Reconnect this account')
    const next=await tokenFor(config,{refresh_token:link.refresh,grant_type:'refresh_token'})
    Object.assign(link,next,{refresh:next.refresh??link.refresh})
    record(claims,id,'renewed')
  }
  function start(claims,id) {
    const config=configuration(id)
    if (config.type!=='oauth' || !config.clientId || !config.callback) throw new Error('OAuth client configuration required')
    const url=serviceUrl(config.authorization)
    const callback=serviceUrl(config.callback).href
    for (const [state,entry] of flows) if (entry.expires<=now()) flows.delete(state)
    if (flows.size>=2000) throw new Error('Too many pending connections')
    const state=randomBytes(32).toString('base64url')
    const verifier=randomBytes(48).toString('base64url')
    const key=keyFor(claims,id)
    exchanges.delete(key)
    for (const [previous,flow] of flows) if (keyFor(flow.claims,flow.id)===key) flows.delete(previous)
    flows.set(state,{claims,id,verifier,callback,expires:now()+600000})
    for (const [name,value] of Object.entries({...config.parameters,client_id:config.clientId,response_type:'code',scope:config.scope,
      redirect_uri:callback,state,code_challenge:proof(verifier),code_challenge_method:'S256'})) url.searchParams.set(name,value)
    record(claims,id,'authorization-started')
    return {url:url.href}
  }
  async function complete(state,code) {
    const flow=flows.get(state)
    flows.delete(state)
    if (!flow || flow.expires<=now() || !code) throw new Error('Unknown or expired authorization')
    const {id,claims}=flow
    const key=keyFor(claims,id)
    exchanges.set(key,state)
    try {
      const tokens=await tokenFor(configuration(id),{code,grant_type:'authorization_code',code_verifier:flow.verifier,redirect_uri:flow.callback})
      if (exchanges.get(key)!==state) throw new Error('Authorization superseded')
      connections.set(key,{...tokens,synced:null})
      record(claims,id,'connected')
      return {provider:id,connected:true}
    } catch (error) { record(claims,id,'authorization-failed');throw error }
    finally {if (exchanges.get(key)===state) exchanges.delete(key)}
  }
  function apiKey(claims,id,token) {
    const config=configuration(id)
    if (config.type!=='key' || typeof token!=='string' || !/^\S{12,1000}$/.test(token)) throw new Error('Valid API key required')
    connections.set(keyFor(claims,id),{token,expires:Infinity,synced:null})
    record(claims,id,'connected')
    return {provider:id,connected:true}
  }
  async function page(config,id,link) {
    const headers={Accept:'application/json',...config.headers, Authorization:'Bearer '+link.token}
    async function get(url,variables) {
      const options=config.query?{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({query:config.query,variables})}:{headers}
      const result=await (await request(url,options)).json()
      if (result.errors?.length) throw new Error('Connector returned an API error')
      return result
    }
    const delta=id==='gmail'&&link.checkpoint&&!config.testFeed
    const url=serviceUrl(delta?'https://gmail.googleapis.com/gmail/v1/users/me/history':config.url)
    if (delta) { url.searchParams.set('startHistoryId',link.checkpoint);url.searchParams.set('maxResults','25') }
    else if (config.cursor&&link.checkpoint) url.searchParams.set(config.cursor,link.checkpoint)
    if (link.page && config.page) url.searchParams.set(config.page,String(link.page))
    if (id==='gmail'&&!delta&&!config.testFeed) url.searchParams.set('maxResults','20')
    const raw=await get(url,{after:link.page??null})
    let rows=field(raw,delta?'history':config.items)??[]
    if (!Array.isArray(rows)) throw new Error('Expected a connector result list')
    let next=field(raw,config.next)
    let checkpoint=field(raw,config.checkpoint)
    if (config.hasPage&&!field(raw,config.hasPage)) next=undefined
    if (config.offset&&rows.length>=config.offset) next=(Number(link.page)||0)+config.offset
    if (id==='plain') rows=rows.map(row=>row.node)
    if (id==='gmail'&&!config.testFeed) {
      const deleted=new Set()
      const changed=new Set()
      for (const row of rows) {
        if (!delta) { changed.add(row.id);continue }
        for (const message of row.messages??[]) changed.add(message.id)
        for (const update of [...(row.messagesAdded??[]),...(row.labelsAdded??[]),...(row.labelsRemoved??[])]) {
          changed.add(update.message.id)
        }
        for (const {message} of row.messagesDeleted??[]) deleted.add(message.id)
      }
      rows=await Promise.all([...changed].filter(id=>!deleted.has(id)).map(async message=>{
        const detail=serviceUrl('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(message))
        detail.searchParams.set('format','metadata')
        detail.searchParams.append('metadataHeaders','Subject')
        detail.searchParams.append('metadataHeaders','From')
        try { return await get(detail) } catch(error) { if (error.status===404)return {id:message,deleted:true};throw error }
      }))
      rows.push(...[...deleted].map(message=>({id:message,deleted:true})))
      checkpoint=delta?raw.historyId:link.stagedCheckpoint??rows[0]?.historyId
    }
    return {rows,next,checkpoint}
  }
  async function sync(claims,id) {
    const config=configuration(id)
    const idKey=keyFor(claims,id)
    const link=connections.get(idKey)
    if (!link || running.has(idKey)) throw new Error('Connector unavailable or already syncing')
    running.add(idKey)
    try {
      await refresh(config,claims,id,link)
      let result
      let reset=false
      try { result=await page(config,id,link) }
      catch (error) {
        if (!link.checkpoint||![404,410].includes(error.status)) throw error
        link.page=link.checkpoint=link.stagedCheckpoint=undefined
        reset=true
        result=await page(config,id,link)
      }
      if (connections.get(idKey)!==link) throw new Error('Connection changed during synchronization')
      link.page=result.next
      if (result.next) link.stagedCheckpoint=result.checkpoint
      else { link.checkpoint=result.checkpoint??link.checkpoint;link.stagedCheckpoint=undefined }
      link.synced=now()
      record(claims,id,'synced')
      return {provider:id,rows:result.rows,more:Boolean(result.next),reset,synced:link.synced}
    } catch(error) { record(claims,id,'sync-failed');throw error }
    finally { running.delete(idKey) }
  }
  async function disconnect(claims,id) {
    const config=configuration(id)
    const key=keyFor(claims,id)
    const link=connections.get(key)
    connections.delete(key)
    exchanges.delete(key)
    for (const [state,flow] of flows) if (keyFor(flow.claims,flow.id)===key) flows.delete(state)
    let revoked=false
    if (link&&config.revoke) {
      try { await request(config.revoke,{method:'POST',body:new URLSearchParams({token:link.refresh??link.token})});revoked=true }
      catch { record(claims,id,'revoke-failed') }
    }
    record(claims,id,'disconnected')
    return {provider:id,connected:false,providerRevoked:revoked}
  }
  const canWrite=(claims,id)=>['gmail','calendar'].includes(id)&&settings[id]?.write===true&&connections.has(keyFor(claims,id))
  async function write(claims,id,input) {
    const key=keyFor(claims,id)
    const link=connections.get(key)
    if (!canWrite(claims,id) || running.has(key)) throw new Error('Writable account unavailable')
    const config=configuration(id)
    running.add(key)
    try {
      await refresh(config,claims,id,link)
      if (connections.get(key)!==link) throw new Error('Connection changed')
      const headers={'Content-Type':'application/json',Authorization:'Bearer '+link.token}
      let result
      if (id==='gmail') {
        const value=['To: '+input.to,'Subject: '+encodedSubject(input.subject),'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',
          Buffer.from(input.text,'utf8').toString('base64').match(/.{1,76}/g).join('\r\n')].join('\r\n')
        const url=config.writeUrl??'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
        result=await request(url,{method:'POST',headers,body:JSON.stringify({raw:Buffer.from(value).toString('base64url')})})
      } else {
        const root=serviceUrl(config.writeUrl??'https://www.googleapis.com/calendar/v3/calendars/')
        const url=new URL(encodeURIComponent(input.calendar??'primary')+'/events/'+encodeURIComponent(input.id),root)
        url.searchParams.set('sendUpdates','none')
        result=await request(url,{method:'PATCH',headers:{...headers,'If-Match':input.etag},body:JSON.stringify({
          start:{dateTime:input.start},end:{dateTime:input.end}})})
      }
      return result.json()
    } finally {running.delete(key)}
  }
  return {start,complete,apiKey,sync,disconnect,write,canWrite,list:claims=>Object.entries(providerProfiles).map(([id,profile])=>{
    const link=connections.get(keyFor(claims,id))
    return {id,label:profile.label,type:settings[id]?.type??profile.type,configured:Object.hasOwn(settings,id),
      connected:Boolean(link),synced:link?.synced??null}
  }),events:claims=>events.filter(event=>event.workspace===claims.workspace&&event.subject===claims.subject)}
}
