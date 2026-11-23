import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createConnectors, serviceUrl } from './connectors.mjs'
import { createModelGateway } from './model-gateway.mjs'
import { createOutbound } from './outbound.mjs'
import { createRemoteMcp } from './remote-mcp.mjs'
import { createWorkspaceRelay } from './webhooks.mjs'
import { workspaceApprovals, workspaceIdentity, workspaceUsage } from './workspace-security.mjs'

const key = process.env.SYNTROFIC_IDENTITY_KEY
const owner = process.env.SYNTROFIC_WORKSPACE_ADMIN_KEY
if (!key || !owner || owner.length < 32 || key === owner) throw new Error('Configure separate identity and workspace administration keys')
const identity = workspaceIdentity(key)
const accounts = workspaceUsage({ free: 20, plus: 100, pro: 500, team: 2000 })
const snapshots = new Map()
const records = new Map()
const agents = new Map()
const modelRuns = new Map()
const configPath = process.env.SYNTROFIC_WORKSPACE_CONFIG
const settings = configPath ? JSON.parse(await readFile(configPath,'utf8')) : {}
const connectors = createConnectors(settings.connectors)
const outbound = createOutbound(connectors)
const inference = createModelGateway(settings.models)
const releases = (settings.releases ?? []).map(release => ({version:release.version,platform:release.platform,
  changes:release.changes,url:serviceUrl(release.url).href}))
const webhookEndpoint = process.env.SYNTROFIC_WORKSPACE_WEBHOOK
const webhookKey = process.env.SYNTROFIC_WORKSPACE_WEBHOOK_KEY
const relay = webhookEndpoint && webhookKey ? createWorkspaceRelay({endpoint:webhookEndpoint,secret:webhookKey}) : undefined
const customFields = new Set(['id', 'title', 'status'])
const approvals = workspaceApprovals([
  ...outbound.tools,
  { name: 'list_records', scope: 'read', policy: 'allow', validate: value => value && Object.keys(value).length === 0,
    run: (_, { workspace }) => records.get(workspace) ?? [] },
  { name: 'save_record', scope: 'write', policy: 'approve', validate: value => value && typeof value.id === 'string' &&
    typeof value.title === 'string' && value.id.length < 100 && value.title.length < 200 && Object.keys(value).every(key => customFields.has(key)),
    run: (value, { workspace }) => {
      const next = [value, ...(records.get(workspace) ?? []).filter(item => item.id !== value.id)]
      records.set(workspace, next)
      return value
    },
  },
])
const remote = settings.mcp ? createRemoteMcp(settings.mcp, {approvals}) : undefined
const scopes = new Set(['read', 'write', 'approve', 'audit', 'exports:read', 'exports:write', 'usage', 'connect', 'infer', 'team'])
const safe = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/
function admin(headers) {
  const input = Buffer.from(headers.authorization?.replace(/^Bearer /, '') ?? '')
  const secret = Buffer.from(owner)
  if (input.length !== secret.length || !timingSafeEqual(input, secret)) throw new RequestError(401, 'Not authorized')
}
function bearer(request, scope) {
  if (!request.headers.authorization?.startsWith('Bearer ')) throw new RequestError(401, 'Identity required')
  try { return identity.verify(request.headers.authorization.slice(7), { site: request.headers.origin, scope }) }
  catch { throw new RequestError(403, 'Permission denied') }
}
class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
async function body(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > 1000000) throw new RequestError(413, 'Payload too large')
    chunks.push(chunk)
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch { throw new RequestError(400, 'Expected a JSON object') }
}
function snapshot(workspace, id) {
  const result = snapshots.get(workspace)?.get(id)
  if (!result) throw new RequestError(404, 'Unknown snapshot')
  return result
}
function filename(name) {
  return typeof name === 'string' && /^[A-Za-z0-9_.\/-]{1,100}$/.test(name) &&
    !name.split('/').some(part => part === '.' || part === '..' || !part)
}
const clientOrigin = process.env.SYNTROFIC_WORKSPACE_CLIENT_ORIGIN
const port = Number(process.env.SYNTROFIC_WORKSPACE_PORT ?? 4481)
const server = createServer(async (request, response) => {
  function send(status, data) {
    if (clientOrigin && request.headers.origin === clientOrigin) response.setHeader('Access-Control-Allow-Origin', clientOrigin)
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', Vary: 'Origin' })
    response.end(JSON.stringify(data))
  }
  try {
    const url = new URL(request.url, 'http://127.0.0.1')
    if (request.method === 'OPTIONS' && clientOrigin && request.headers.origin === clientOrigin) {
      response.writeHead(204, { 'Access-Control-Allow-Origin': clientOrigin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type', Vary: 'Origin' })
      return response.end()
    }
    const post = request.method === 'POST'
    const get = request.method === 'GET'
    if (remote && url.pathname==='/mcp') return await remote.handle(request,response,body,send)
    if (remote && get && url.pathname==='/.well-known/oauth-protected-resource/mcp') return send(200,remote.metadata())
    if (remote && get && url.pathname==='/mcp/activity') return send(200,remote.events(bearer(request,'audit').workspace))
    if (remote && post && url.pathname==='/sso/exchange') {
      if (!clientOrigin || request.headers.origin!==clientOrigin) throw new RequestError(403,'Workspace site required')
      const claims=await remote.authorize(request,true)
      if (!claims) throw new RequestError(401,'Workspace membership required')
      return send(201,identity.sign({...claims,agent:'workspace',site:clientOrigin},300))
    }
    if (post && url.pathname === '/identity') {
      admin(request.headers)
      const payload = await body(request)
      if (!Array.isArray(payload.scopes) || !payload.scopes.every(scope => scopes.has(scope)))
        throw new RequestError(400, 'Unknown scope')
      return send(201, identity.sign(payload, payload.ttl))
    }
    if (post && url.pathname === '/identity/revoke') {
      admin(request.headers)
      const payload = await body(request)
      if (typeof payload.id !== 'string' || !safe.test(payload.id)) throw new RequestError(400, 'Invalid identity ID')
      identity.revoke(payload.id)
      return send(200, { revoked: true })
    }
    if (post && url.pathname === '/usage/configure') {
      admin(request.headers)
      const payload = await body(request)
      accounts.configure(payload.workspace, payload.plan, payload.period)
      return send(200, accounts.status(payload.workspace))
    }
    if (get && url.pathname === '/health') return send(200,{status:'ready'})
    if (get && url.pathname==='/connectors/callback') {
      return send(200,await connectors.complete(url.searchParams.get('state'),url.searchParams.get('code')))
    }
    if (get && url.pathname==='/connectors') return send(200,connectors.list(bearer(request,'connect')))
    if (get && url.pathname==='/connectors/activity') return send(200,connectors.events(bearer(request,'connect')))
    if (post && url.pathname.startsWith('/connectors/')) {
      const claims=bearer(request,'connect')
      const [, , provider, action]=url.pathname.split('/')
      if (action==='authorize') return send(200,connectors.start(claims,provider))
      if (action==='key') return send(200,connectors.apiKey(claims,provider,(await body(request)).key))
      if (action==='sync') return send(200,await connectors.sync(claims,provider))
      if (action==='disconnect') return send(200,await connectors.disconnect(claims,provider))
    }
    if (get && url.pathname==='/models') {
      const claims=bearer(request,'infer')
      return send(200,{models:inference.models(),subscription:accounts.status(claims.workspace),releases})
    }
    if (post && url.pathname==='/models/generate') {
      const claims=bearer(request,'infer')
      const input=await body(request)
      if (typeof input.id!=='string' || !safe.test(input.id) || !inference.models().some(model=>model.intent===input.intent))
        throw new RequestError(400,'Valid model and request ID required')
      const receipt=accounts.claim(claims.workspace,claims.subject+':'+input.id)
      const previous=modelRuns.get(receipt.key+'@'+claims.subject)
      if (previous) return send(200,previous)
      if (receipt.state!=='pending') throw new RequestError(409,'Request has already been settled')
      const runKey=receipt.key+'@'+claims.subject
      if (modelRuns.has(runKey)) throw new RequestError(409,'Request is running')
      modelRuns.set(runKey,null)
      const stop=new AbortController()
      response.once('close',()=>{if (!response.writableEnded) stop.abort()})
      try {
        const result=await inference.generate(input.intent,input.messages,stop.signal)
        accounts.settle(receipt.key,'completed')
        modelRuns.set(runKey,result)
        if (modelRuns.size>2000) {
          const finished=[...modelRuns].find(([,value])=>value!==null)
          if (finished) modelRuns.delete(finished[0])
        }
        return send(200,result)
      } catch {
        accounts.settle(receipt.key,stop.signal.aborted?'cancelled':'failed')
        modelRuns.delete(runKey)
        if (!response.destroyed) return send(502,{error:'Model request failed'})
        return
      }
    }
    if (get && url.pathname==='/team') {
      const claims=bearer(request,'team')
      const members=Object.hasOwn(settings.teams??{},claims.workspace)?settings.teams[claims.workspace]:[]
      return send(200,{members,subscription:accounts.status(claims.workspace),
        shared:(records.get(claims.workspace)??[]).filter(item=>item.status==='support')})
    }
    if (get && url.pathname === '/agents') {
      const claims=bearer(request,'read')
      return send(200,[...(agents.get(claims.workspace)?.values() ?? [])])
    }
    if (post && url.pathname === '/agents') {
      const claims=bearer(request,'write')
      const input=await body(request)
      if (typeof input.id!=='string'||!safe.test(input.id)||typeof input.name!=='string'||typeof input.model!=='string')
        throw new RequestError(400,'Invalid Agent settings')
      const agent={id:input.id,name:input.name.slice(0,120),model:input.model.slice(0,120),prompt:String(input.prompt??'').slice(0,12000)}
      if (!agents.has(claims.workspace)) agents.set(claims.workspace,new Map())
      agents.get(claims.workspace).set(agent.id,agent)
      return send(201,agent)
    }
    if (get && url.pathname === '/usage') {
      const claims = bearer(request, 'usage')
      return send(200, { status: accounts.status(claims.workspace), receipts: accounts.history(claims.workspace) })
    }
    if (post && url.pathname === '/usage/claim') {
      const claims = bearer(request, 'usage')
      const payload = await body(request)
      return send(201, accounts.claim(claims.workspace, payload.id, payload.units))
    }
    if (post && url.pathname === '/usage/settle') {
      const claims = bearer(request, 'usage')
      const payload = await body(request)
      if (typeof payload.key !== 'string' || !payload.key.startsWith(claims.workspace + '/')) throw new RequestError(403, 'Permission denied')
      return send(200, accounts.settle(payload.key, payload.outcome))
    }
    if (post && url.pathname === '/actions') {
      const claims = bearer(request, 'read')
      const payload = await body(request)
      return send(201, await approvals.submit(claims, payload.tool, payload.input, payload.key))
    }
    if (get && url.pathname==='/actions/pending') return send(200,approvals.pending(bearer(request,'approve')))
    if (get && url.pathname==='/deliveries') return send(200,outbound.deliveries(bearer(request,'write')))
    if (get && url.pathname==='/deliveries/activity') return send(200,outbound.events(bearer(request,'audit')))
    if (post && url.pathname==='/deliveries/cancel') {
      const claims=bearer(request,'write')
      const input=await body(request)
      return send(200,outbound.cancel(claims,input.id))
    }
    if (post && url.pathname === '/actions/decide') {
      const claims = bearer(request, 'approve')
      const payload = await body(request)
      if (typeof payload.accepted !== 'boolean') throw new RequestError(400, 'Specify the approval decision')
      const result=await approvals.decide(claims,payload.id,payload.accepted)
      if (relay && ['completed','failed','rejected'].includes(result.status)) {
        void relay.dispatch({id:result.id,type:'workspace.action.'+result.status,workspace:claims.workspace,time:new Date().toISOString()})
      }
      return send(200,result)
    }
    if (get && url.pathname === '/audit') return send(200, approvals.events(bearer(request, 'audit')))
    if (post && url.pathname === '/snapshots') {
      const claims = bearer(request, 'exports:write')
      const payload = await body(request)
      if (typeof payload.id !== 'string' || !safe.test(payload.id) || !payload.files || Array.isArray(payload.files) ||
        typeof payload.files !== 'object' || Object.keys(payload.files).length < 1 || Object.keys(payload.files).length > 50 ||
        !Object.entries(payload.files).every(([name, text]) => filename(name) && typeof text === 'string'))
        throw new RequestError(400, 'Invalid snapshot or file names')
      if (!snapshots.has(claims.workspace)) snapshots.set(claims.workspace, new Map())
      const entries = snapshots.get(claims.workspace)
      if (entries.has(payload.id)) throw new RequestError(409, 'Snapshot already exists')
      entries.set(payload.id, { id: payload.id, files: payload.files, createdAt: new Date().toISOString() })
      return send(201, { id: payload.id })
    }
    if (get && url.pathname === '/snapshots') {
      const claims = bearer(request, 'exports:read')
      return send(200, [...(snapshots.get(claims.workspace)?.values() ?? [])].map(entry => ({ id: entry.id, createdAt: entry.createdAt, files: Object.keys(entry.files) })))
    }
    if (get && url.pathname.startsWith('/snapshots/')) {
      const claims = bearer(request, 'exports:read')
      const entry = snapshot(claims.workspace, decodeURIComponent(url.pathname.slice(11)))
      const file = url.searchParams.get('file')
      if (file !== null) {
        if (!filename(file) || !Object.hasOwn(entry.files, file)) throw new RequestError(404, 'Unknown snapshot file')
        return send(200, { name: file, content: entry.files[file] })
      }
      return send(200, { id: entry.id, createdAt: entry.createdAt, files: Object.keys(entry.files) })
    }
    return send(404, { error: 'Not found' })
  } catch (error) {
    if (response.writableEnded) return
    const status = error instanceof RequestError ? error.status : 400
    return send(status, { error: error instanceof RequestError ? error.message : 'Request rejected' })
  }
})
server.once('close',outbound.start())
server.listen(port, '127.0.0.1', () => console.error('Syntrofic workspace API on http://127.0.0.1:' + port))
