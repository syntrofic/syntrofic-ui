import readline from 'node:readline'
import { component, docsBundle, documentEntry, matchRecords } from './catalog.mjs'
import { cliMcpCommands } from './mcp-command-tools.mjs'

const catalogTools = [
  { name: 'search_components', description: 'Search the versioned Syntrofic UI catalog', inputSchema: {
    type: 'object', properties: { query: { type: 'string' }, track: { type: 'string' } }, additionalProperties: false,
  } },
  { name: 'get_component', description: 'Get documentation for a component or feature', inputSchema: {
    type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false,
  } },
  { name: 'get_documentation', description: 'Read a generated documentation file', inputSchema: {
    type: 'object', properties: { file: { enum: Object.keys(docsBundle()) } }, required: ['file'], additionalProperties: false,
  } },
]
const workspaceAddress = process.env.SYNTROFIC_WORKSPACE_ADDRESS
const workspaceToken = process.env.SYNTROFIC_WORKSPACE_TOKEN
const workspaceTools = workspaceAddress && workspaceToken ? [
  { name: 'list_workspace_snapshots', description: 'List snapshots available to the configured workspace identity', inputSchema: { type: 'object', additionalProperties: false } },
  { name: 'get_workspace_snapshot', description: 'Read a snapshot manifest or selected file in the configured workspace', inputSchema: {
    type: 'object', properties: { id: { type: 'string' }, file: { type: 'string' } }, required: ['id'], additionalProperties: false,
  } },
] : []
async function workspace(path) {
  if (!workspaceAddress || !workspaceToken) return contents('Workspace is not configured', true)
  try {
    const base = new URL(workspaceAddress)
    if (!(base.protocol === 'https:' || base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname))) return contents('Invalid workspace endpoint', true)
    const response = await fetch(new URL(path, base), { headers: { authorization: 'Bearer ' + workspaceToken }, redirect: 'error', signal: AbortSignal.timeout(5000) })
    return contents(await response.text(), !response.ok)
  } catch { return contents('Workspace request failed', true) }
}
const versions = ['2025-11-25', '2025-06-18', '2025-03-26']
const write = response => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...response }) + '\n')
function contents(text, isError = false) { return { content: [{ type: 'text', text }], ...(isError && { isError: true }) } }
async function call(params) {
  const input = params?.arguments ?? {}
  switch (params?.name) {
    case 'search_components':
      return contents(JSON.stringify(matchRecords(typeof input.query === 'string' ? input.query : '')
        .filter(item => !input.track || item.track === input.track).slice(0, 100)))
    case 'get_component': {
      const entry = typeof input.id === 'string' && component(input.id)
      return entry ? contents(documentEntry(entry)) : contents('Unknown component', true)
    }
    case 'list_workspace_snapshots': return workspace('/snapshots')
    case 'get_workspace_snapshot':
      return typeof input.id === 'string' ? workspace('/snapshots/' + encodeURIComponent(input.id) +
        (typeof input.file === 'string' ? '?file=' + encodeURIComponent(input.file) : '')) : contents('Snapshot ID required', true)
    case 'get_documentation': {
      const files = docsBundle()
      return typeof input.file === 'string' && Object.hasOwn(files, input.file) ? contents(files[input.file]) : contents('Unknown file', true)
    }
    default: return undefined
  }
}
export async function serveMcp(directory, docsOnly = false) {
  const commands = await cliMcpCommands(directory, docsOnly)
  const tools = [...catalogTools, ...commands.tools, ...(docsOnly ? [] : workspaceTools)]
  const names = new Set(tools.map(tool => tool.name))
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
  for await (const line of input) {
    let request
    try { request = JSON.parse(line) }
    catch { write({ id: null, error: { code: -32700, message: 'Parse error' } }); continue }
    if (request?.jsonrpc !== '2.0' || typeof request.method !== 'string') {
      write({ id: request?.id ?? null, error: { code: -32600, message: 'Invalid request' } })
      continue
    }
    if (request.id === undefined) continue
    let result
    if (request.method === 'initialize') result = {
      protocolVersion: versions.includes(request.params?.protocolVersion) ? request.params.protocolVersion : versions[0],
      capabilities: { tools: {} }, serverInfo: { name: 'syntrofic-docs', version: '0.1.0' },
    }
    if (request.method === 'ping') result = {}
    if (request.method === 'tools/list') result = { tools }
    if (request.method === 'tools/call' && names.has(request.params?.name)) {
      const invoked = await commands.invoke(request.params.name, request.params.arguments ?? {})
      result = invoked ? contents(invoked.text, invoked.error) : await call(request.params)
    }
    if (result === undefined) write({ id: request.id, error: { code: -32601, message: 'Method or tool not found' } })
    else write({ id: request.id, result })
  }
}
