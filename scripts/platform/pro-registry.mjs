import { createHash, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { readFile, realpath, stat } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { matchRecords } from './catalog.mjs'
import { createLicensing } from './licensing.mjs'

const manifestPath = process.env.SYNTROFIC_PRO_MANIFEST
const settingsPath = process.env.SYNTROFIC_PRO_ACCESS
if (!manifestPath || !settingsPath) throw new Error('Configure the Pro manifest and access file')
const root = await realpath(dirname(manifestPath))
const manifest = JSON.parse(await readFile(manifestPath,'utf8'))
const settings = JSON.parse(await readFile(settingsPath,'utf8'))
const licensing = createLicensing()
for (const entry of settings.workspaces) {
  licensing.bootstrap(entry.id,entry.owner)
  licensing.setPlan(entry.id,entry.owner,entry.plan)
}
for (const credential of settings.credentials) {
  if (!['personal','ci'].includes(credential.channel) || typeof credential.token!=='string' || credential.token.length < 32)
    throw new Error('Invalid registry credential')
}
function equal(left,right) {
  const a=Buffer.from(left), b=Buffer.from(right)
  return a.length===b.length && timingSafeEqual(a,b)
}
function authenticate(request, allowed) {
  if (!request.headers.authorization?.startsWith('Bearer ')) throw new Error('Missing token')
  const token = request.headers.authorization.slice(7)
  const credential = settings.credentials.find(value => equal(value.token,token))
  if (!credential || allowed && !allowed.includes(credential.channel)) throw new Error('Invalid registry token')
  return { subject:credential.subject, workspace:credential.workspace, channel:credential.channel }
}
async function fileFor(entry) {
  const path = await realpath(resolve(root, entry.file))
  const inside = relative(root,path)
  if (!inside || inside.startsWith('..') || resolve(root,inside)!==path || !(await stat(path)).isFile()) throw new Error('Missing archive')
  const bytes = await readFile(path)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256!==entry.sha256) throw new Error('Archive validation failed')
  return bytes
}
const clientOrigin=process.env.SYNTROFIC_PRO_CLIENT_ORIGIN
async function payload(request) {
  let text=''
  for await (const chunk of request) {
    text+=chunk
    if (text.length>12000) throw new Error('Payload exceeds limits')
  }
  return JSON.parse(text)
}
const port = Number(process.env.SYNTROFIC_PRO_PORT ?? 4483)
createServer(async (request,response) => {
  function json(status,data) {
    if (clientOrigin && request.headers.origin===clientOrigin) response.setHeader('Access-Control-Allow-Origin',clientOrigin)
    response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})
    response.end(JSON.stringify(data))
  }
  try {
    const url = new URL(request.url,'http://127.0.0.1')
    if (request.method==='OPTIONS' && clientOrigin && request.headers.origin===clientOrigin) {
      response.writeHead(204,{'Access-Control-Allow-Origin':clientOrigin,'Access-Control-Allow-Headers':'Authorization, Content-Type',
        'Access-Control-Allow-Methods':'GET, POST, OPTIONS',Vary:'Origin'})
      return response.end()
    }
    const claims = authenticate(request)
    if (request.method==='POST') {
      if (claims.channel!=='personal') return json(403,{error:'Billing access denied'})
      const input=await payload(request)
      if (url.pathname==='/license/plan') return json(200,licensing.setPlan(claims.workspace,claims.subject,input))
      if (url.pathname==='/license/invite') return json(201,{ invitation:licensing.invite(claims.workspace,claims.subject,input.role) })
      if (url.pathname==='/license/join') return json(200,{ workspace:licensing.accept(input.invitation,claims.subject) })
      if (url.pathname==='/license/remove') { licensing.remove(claims.workspace,claims.subject,input.subject); return json(200,{removed:true}) }
      if (url.pathname==='/license/cancel') { licensing.cancel(claims.workspace,claims.subject); return json(200,{cancelled:true}) }
      return json(404,{error:'Unknown route'})
    }
    if (request.method!=='GET') return json(405,{error:'Method not allowed'})
    if (url.pathname==='/docs') {
      const records=matchRecords(url.searchParams.get('q')??'').filter(entry=>['web-pro','native-pro'].includes(entry.track))
      return json(200,records.filter(entry=>licensing.canRead(claims.workspace,claims.subject,claims.channel,
        entry.track==='web-pro'?'web':'native')))
    }
    if (url.pathname==='/license') {
      const current=licensing.status(claims.workspace)
      if (!current.members.some(member=>member.id===claims.subject)) return json(403,{error:'Workspace membership required'})
      return json(200,current)
    }
    const [id,version,kind] = url.pathname.slice(1).split('/').map(decodeURIComponent)
    const entry = manifest.releases.find(record => record.id===id && record.version===version)
    if (!entry) return json(404,{error:'Unknown release'})
    licensing.authorize(claims.workspace,claims.subject,claims.channel,entry)
    if (!kind) return json(200,{id,version,sha256:entry.sha256,archive:'/'+encodeURIComponent(id)+'/'+encodeURIComponent(version)+'/archive'})
    if (kind!=='archive') return json(404,{error:'Unknown route'})
    const bytes=await fileFor(entry)
    licensing.authorize(claims.workspace,claims.subject,claims.channel,entry,true)
    response.writeHead(200,{'Content-Type':'application/gzip','Content-Length':bytes.length,'Cache-Control':'no-store'})
    response.end(bytes)
  } catch { if (!response.writableEnded) json(403,{error:'Release access denied'}) }
}).listen(port,'127.0.0.1',()=>console.error('Syntrofic Pro at http://127.0.0.1:'+port))
