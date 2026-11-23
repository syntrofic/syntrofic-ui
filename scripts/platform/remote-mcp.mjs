import { randomUUID } from 'node:crypto'
import { serviceUrl } from './connectors.mjs'

const protocol = '2025-11-25'
const supported = new Set([protocol,'2025-06-18','2025-03-26'])
const tools = {
  list_records:{description:'Read this workspace’s records',scope:'read',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  save_record:{description:'Propose a record update for human approval',scope:'write',inputSchema:{type:'object',properties:{
    id:{type:'string'},title:{type:'string'},status:{type:'string'}},required:['id','title'],additionalProperties:false}},
  delete_record:{description:'Workspace policy denies deletion',scope:'delete',inputSchema:{type:'object'}},
}
export function createRemoteMcp(config, { approvals, http=fetch } = {}) {
  const resource = serviceUrl(config.resource)
  if (resource.pathname!=='/mcp' || resource.search) throw new Error('MCP resource must end in /mcp')
  const issuer = serviceUrl(config.issuer).href.replace(/\/$/,'')
  const ssoResource = config.ssoResource ? serviceUrl(config.ssoResource).href : undefined
  const introspection = serviceUrl(config.introspection)
  if (!config.clientId || !config.clientSecret || !config.members) throw new Error('MCP introspection settings are incomplete')
  const resourceMetadata = new URL('/.well-known/oauth-protected-resource/mcp',resource).href
  const challenge = 'Bearer resource_metadata="'+resourceMetadata+'"'
  const audit=[]
  function entry(claims,tool,state,id) {
    audit.push({workspace:claims.workspace,subject:claims.subject,tool,state,id,time:new Date().toISOString()})
    if (audit.length>1500) audit.shift()
  }
  async function authorize(request, sso = false) {
    const credential=request.headers.authorization
    if (!credential?.startsWith('Bearer ') || credential.length>10000) return null
    const form=new URLSearchParams({token:credential.slice(7),token_type_hint:'access_token'})
    const escaped=value=>new URLSearchParams({v:value}).toString().slice(2)
    const basic=Buffer.from(escaped(config.clientId)+':'+escaped(config.clientSecret)).toString('base64')
    const response=await http(introspection,{method:'POST',body:form,redirect:'error',signal:AbortSignal.timeout(5000),
      headers:{Authorization:'Basic '+basic,Accept:'application/json'}})
    if (!response.ok) return null
    const token=await response.json()
    const audience=Array.isArray(token.aud)?token.aud:[token.aud]
    if (token.active!==true||token.iss!==issuer||!audience.includes(sso?ssoResource:resource.href)||
      typeof token.sub!=='string'||typeof token.exp!=='number'||token.exp<=Date.now()/1000||
      typeof token.scope!=='string' || !token.scope.split(' ').includes(sso?'workspace.sso':'workspace.mcp') ||
      sso&&!ssoResource) return null
    const member=Object.hasOwn(config.members,token.sub)?config.members[token.sub]:undefined
    const valid=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/.test(value)
    if (!member || ![member.workspace,member.subject].every(valid) || !Array.isArray(member.scopes)) return null
    const scopes=member.scopes.filter(scope=>['read','write','audit'].includes(scope)&&token.scope.split(' ').includes('workspace.'+scope))
    return {workspace:member.workspace,subject:member.subject,scopes}
  }
  function metadata() { return {resource:resource.href,authorization_servers:[issuer],scopes_supported:['workspace.mcp','workspace.read','workspace.write','workspace.audit'],
    bearer_methods_supported:['header']} }
  async function handle(request,response,read,send) {
    if (request.headers.origin && !(config.origins??[]).includes(request.headers.origin)) return send(403,{error:'Origin is not allowed'})
    let claims
    try { claims=await authorize(request) } catch { return send(503,{error:'Identity verification unavailable'}) }
    if (!claims) {
      response.setHeader('WWW-Authenticate',challenge)
      return send(401,{error:'Valid resource access token required'})
    }
    if (request.method!=='POST') {
      response.setHeader('Allow','POST')
      return send(405,{error:'Use POST for MCP requests'})
    }
    function rpc(id,result,error) { return send(200,{jsonrpc:'2.0',id:id??null,...(error?{error}:{result})}) }
    const input=await read(request)
    const {id,method,params}=input
    if (input.jsonrpc!=='2.0' || typeof method!=='string') return rpc(id,null,{code:-32600,message:'Invalid request'})
    if (!Object.hasOwn(input,'id')) { response.writeHead(202);return response.end() }
    const header=request.headers['mcp-protocol-version']
    if (header&&!supported.has(header)) return send(400,{error:'Unsupported protocol version'})
    if (method==='initialize') return rpc(id,{protocolVersion:supported.has(params?.protocolVersion)?params.protocolVersion:protocol,
      capabilities:{tools:{}},serverInfo:{name:'syntrofic-workspace',version:'0.1.0'}})
    if (method==='ping') return rpc(id,{})
    if (method==='tools/list') return rpc(id,{tools:Object.entries(tools).filter(([,tool])=>claims.scopes.includes(tool.scope))
      .map(([name,{scope,...tool}])=>({name,...tool}))})
    if (method!=='tools/call') return rpc(id,null,{code:-32601,message:'Unknown method'})
    function result(data,isError=false) { return rpc(id,{content:[{type:'text',text:JSON.stringify(data)}],isError}) }
    const name=params?.name
    const auditTool=typeof name==='string'?name.slice(0,120):'unknown'
    const tool=Object.hasOwn(tools,name)?tools[name]:undefined
    if (!tool || !claims.scopes.includes(tool.scope)) {
      entry(claims,auditTool,'denied')
      return result({error:'Tool denied by workspace policy'},true)
    }
    try {
      const key=params?._meta?.['syntrofic/idempotency-key']??randomUUID()
      const action=await approvals.submit(claims,name,params?.arguments??{},key)
      entry(claims,name,action.status,action.id)
      return result(action,action.status==='failed')
    } catch {
      entry(claims,auditTool,'failed')
      return result({error:'Tool could not be executed'},true)
    }
  }
  return {handle,metadata,authorize,events:workspace=>audit.filter(item=>item.workspace===workspace)}
}
