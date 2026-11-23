import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const decode = value => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
const latest = () => Math.floor(Date.now() / 1000)
function validName(value) { return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/.test(value) }
function originOf(value) {
  const url = new URL(value)
  if (url.origin === 'null' || url.username || url.password || !['http:', 'https:'].includes(url.protocol)) throw new TypeError('Invalid site origin')
  return url.origin
}
function signature(key, value) { return createHmac('sha256', key).update(value).digest('base64url') }
function equal(left, right) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}
export function workspaceIdentity(secret, { now = latest } = {}) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new TypeError('Identity signing key must be at least 32 bytes')
  const disabled = new Set()
  function sign(identity, ttl = 900) {
    const { subject, workspace, agent, site, scopes } = identity
    if (![subject, workspace, agent].every(validName) || !Array.isArray(scopes) || !scopes.every(validName))
      throw new TypeError('Invalid identity')
    const time = now()
    if (!Number.isSafeInteger(ttl) || ttl < 1 || ttl > 3600) throw new RangeError('Invalid token lifetime')
    const claims = { version: 1, subject, workspace, agent, site: originOf(site), scopes: [...new Set(scopes)], id: randomUUID(), issued: time, expires: time + ttl }
    const value = encode(claims)
    return { token: value + '.' + signature(secret, value), claims }
  }
  function verify(token, expected) {
    if (typeof token !== 'string' || token.length > 9000) throw new Error('Unauthorized')
    const parts = token.split('.')
    if (parts.length !== 2 || !equal(signature(secret, parts[0]), parts[1])) throw new Error('Unauthorized')
    const claims = decode(parts[0])
    if (claims.version !== 1 || now() >= claims.expires || now() < claims.issued || disabled.has(claims.id))
      throw new Error('Expired or revoked identity')
    if (expected.site && originOf(expected.site) !== claims.site) throw new Error('Token site mismatch')
    if (expected.agent && expected.agent !== claims.agent) throw new Error('Token agent mismatch')
    if (expected.workspace && expected.workspace !== claims.workspace) throw new Error('Token workspace mismatch')
    if (expected.scope && !claims.scopes.includes(expected.scope)) throw new Error('Missing token scope')
    return claims
  }
  return { sign, verify, revoke: id => disabled.add(id) }
}

export function workspaceApprovals(definitions, { now = latest } = {}) {
  const rules = new Map(definitions.map(rule => [rule.name, rule]))
  const requests = new Map()
  const audit = []
  function item(request) {
    const { result, ...data } = request
    return { ...data, ...(request.status === 'completed' && { result }) }
  }
  function event(request) {
    audit.push({ id: request.id, workspace: request.workspace, subject: request.subject, tool: request.tool,
      status: request.status, time: now() })
  }
  async function execute(request, rule) {
    request.status = 'running'
    event(request)
    try {
      request.result = await rule.run(request.input, { workspace: request.workspace, subject: request.subject, auditId: request.id })
      request.status = 'completed'
    } catch {
      request.status = 'failed'
    }
    event(request)
    return item(request)
  }
  function auth(claims, scope) {
    if (!claims.scopes.includes(scope)) throw new Error('Permission denied')
  }
  async function submit(claims, tool, input, key) {
    const definition = rules.get(tool)
    if (!definition || definition.policy === 'deny') throw new Error('Unknown or unavailable action')
    auth(claims, definition.scope)
    if (!validName(key)) throw new TypeError('Idempotency key is required')
    if (!definition.validate(input)) throw new TypeError('Invalid action input')
    const id = [claims.workspace, claims.subject, tool, key].join('/')
    const known = requests.get(id)
    if (known) return item(known)
    const request = { id, tool, workspace: claims.workspace, subject: claims.subject, input: structuredClone(input), status: 'pending' }
    requests.set(id, request)
    event(request)
    return definition.policy === 'approve' ? item(request) : execute(request, definition)
  }
  async function decide(claims, id, accepted) {
    auth(claims, 'approve')
    const request = requests.get(id)
    if (!request || request.workspace !== claims.workspace) throw new Error('Unknown action')
    if (request.status !== 'pending') return item(request)
    if (accepted) return execute(request, rules.get(request.tool))
    request.status = 'rejected'
    event(request)
    return item(request)
  }
  return {
    submit,decide,
    pending: claims => {
      auth(claims,'approve')
      return [...requests.values()].filter(entry=>entry.workspace===claims.workspace&&entry.status==='pending').map(entry=>structuredClone(item(entry)))
    },
    events: claims => { auth(claims, 'audit'); return audit.filter(entry => entry.workspace === claims.workspace).map(entry => ({ ...entry })) },
  }
}

export function workspaceUsage(plans) {
  const accounts = new Map()
  const receipts = new Map()
  function configure(workspace, plan, period) {
    const limit = plans[plan]
    if (!Number.isSafeInteger(limit) || limit < 0 || !validName(workspace) || !validName(period)) throw new TypeError('Invalid subscription')
    const current = accounts.get(workspace)
    accounts.set(workspace, { workspace, plan, period, limit,
      used: current?.period === period ? current.used : 0, pending: current?.period === period ? current.pending : 0 })
  }
  function claim(workspace, request, units = 1) {
    const account = accounts.get(workspace)
    if (!account || !validName(request) || !Number.isSafeInteger(units) || units < 1) throw new TypeError('Invalid usage request')
    const key = [workspace, account.period, request].join('/')
    const existing = receipts.get(key)
    if (existing) return { ...existing }
    if (account.used + account.pending + units > account.limit) throw new Error('Workspace quota exceeded')
    account.pending += units
    const receipt = { key, workspace, period: account.period, units, state: 'pending' }
    receipts.set(key, receipt)
    return { ...receipt }
  }
  function settle(key, outcome) {
    const receipt = receipts.get(key)
    if (!receipt) throw new Error('Unknown reservation')
    if (receipt.state !== 'pending') return { ...receipt }
    if (!['completed', 'cancelled', 'failed'].includes(outcome)) throw new TypeError('Invalid outcome')
    receipt.state = outcome
    const account = accounts.get(receipt.workspace)
    if (account?.period === receipt.period) {
      account.pending -= receipt.units
      if (outcome === 'completed') account.used += receipt.units
    }
    return { ...receipt }
  }
  return { configure, claim, settle, status: workspace => ({ ...accounts.get(workspace) }),
    history: workspace => [...receipts.values()].filter(receipt => receipt.workspace === workspace).map(receipt => ({ ...receipt })) }
}
