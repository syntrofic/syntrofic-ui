import { randomBytes } from 'node:crypto'

const products = { web: ['web'], mobile: ['native'], bundle: ['web','native'] }
const roles = new Set(['owner','billing','developer','member'])
const valid = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(value)

export function createLicensing({ now = Date.now } = {}) {
  const workspaces = new Map()
  const invites = new Map()
  function workspace(id) {
    const entry = workspaces.get(id)
    if (!entry) throw new Error('Unknown workspace')
    return entry
  }
  function bootstrap(id, owner) {
    if (!valid(id) || !valid(owner) || workspaces.has(id)) throw new Error('Invalid workspace')
    workspaces.set(id,{ members:new Map([[owner,'owner']]), current:undefined, history:[], usage:0, held:new Set() })
  }
  function billing(entry, actor) {
    if (!['owner','billing'].includes(entry.members.get(actor))) throw new Error('Billing permission required')
  }
  function setPlan(id, actor, input) {
    const entry = workspace(id)
    billing(entry, actor)
    if (!Object.hasOwn(products,input.product) || !Number.isSafeInteger(input.seats) || input.seats < entry.members.size ||
      !Number.isSafeInteger(input.downloads) || input.downloads < 0 || !Number.isSafeInteger(input.aiUnits) || input.aiUnits < 0 ||
      !Number.isFinite(input.validUntil) || input.validUntil < now()) throw new Error('Invalid plan')
    const sameWindow = entry.current && entry.current.validUntil === input.validUntil
    if (entry.current && !sameWindow) entry.history.push(entry.current)
    entry.current = { product: input.product, starts: sameWindow ? entry.current.starts : now(), validUntil:input.validUntil,
      seats:input.seats, downloads:input.downloads, aiUnits:input.aiUnits }
    if (!sameWindow) entry.usage=0
    return status(id)
  }
  function invite(id, actor, role) {
    const entry=workspace(id)
    if (entry.members.get(actor)!=='owner' || !roles.has(role) || role==='owner' || !entry.current) throw new Error('Invitation unavailable')
    const token=randomBytes(24).toString('base64url')
    invites.set(token,{ workspace:id, role, expires:now()+3600000 })
    return token
  }
  function accept(token, subject) {
    const invitation=invites.get(token)
    if (!invitation || invitation.expires<=now() || !valid(subject)) throw new Error('Invitation invalid or expired')
    const entry=workspace(invitation.workspace)
    if (!entry.current || entry.current.validUntil <= now() || entry.members.size >= entry.current.seats || entry.members.has(subject))
      throw new Error('No seat available')
    entry.members.set(subject,invitation.role)
    invites.delete(token)
    return invitation.workspace
  }
  function remove(id, actor, subject) {
    const entry=workspace(id)
    if (entry.members.get(actor)!=='owner' || entry.members.get(subject)==='owner') throw new Error('Seat removal denied')
    entry.members.delete(subject)
  }
  function cancel(id,actor) {
    const entry=workspace(id)
    billing(entry,actor)
    if (entry.current) entry.current.validUntil=Math.min(entry.current.validUntil,now())
  }
  function authorize(id, subject, channel, release, consume = false) {
    const entry=workspace(id)
    const role=entry.members.get(subject)
    if (!role || channel==='ci' && !['owner','developer'].includes(role)) throw new Error('Installation permission required')
    const key=release.id+'@'+release.version
    if (entry.held.has(key)) return true
    const current=entry.current
    if (!current || now()>current.validUntil || !products[current.product].includes(release.platform) || release.published>current.validUntil)
      throw new Error('Release is outside the entitlement window')
    if (entry.usage>=current.downloads) throw new Error('Download quota exceeded')
    if (consume) { entry.usage++; entry.held.add(key) }
    return true
  }
  function status(id) {
    const entry=workspace(id)
    return { plan:entry.current ? { ...entry.current } : null, downloads:entry.usage,
      members:[...entry.members].map(([id,role])=>({id,role})), retained:[...entry.held] }
  }
  function canRead(id, subject, channel, platform) {
    const entry = workspace(id)
    const role = entry.members.get(subject)
    if (!role || channel === 'ci' && !['owner','developer'].includes(role)) return false
    return Boolean(entry.current && now() < entry.current.validUntil && products[entry.current.product].includes(platform))
  }
  return { bootstrap,setPlan,invite,accept,remove,cancel,authorize,canRead,status }
}
