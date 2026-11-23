import { createServer } from 'node:http'
import { component, docsBundle, matchRecords } from './catalog.mjs'

const port = Number(process.env.SYNTROFIC_DOCS_PORT ?? 4480)
const docs = docsBundle()
const server = createServer((request, response) => {
  function send(status, value, media = 'application/json') {
    response.writeHead(status, { 'Content-Type': media + '; charset=utf-8', 'X-Content-Type-Options': 'nosniff' })
    response.end(media === 'application/json' ? JSON.stringify(value) : value)
  }
  if (request.method !== 'GET') return send(405, { error: 'Method not allowed' })
  try {
    const url = new URL(request.url, 'http://127.0.0.1')
    if (url.pathname === '/catalog') return send(200, matchRecords(url.searchParams.get('q') ?? ''))
    if (url.pathname.startsWith('/components/')) {
      const result = component(decodeURIComponent(url.pathname.slice('/components/'.length)))
      return result ? send(200, result) : send(404, { error: 'Unknown component' })
    }
    const file = url.pathname.slice(1)
    if (Object.hasOwn(docs, file)) return send(200, file.endsWith('.json') ? JSON.parse(docs[file]) : docs[file], file.endsWith('.json') ? 'application/json' : 'text/plain')
    return send(404, { error: 'Unknown route' })
  } catch { return send(400, { error: 'Malformed URL' }) }
})
server.listen(port, '127.0.0.1', () => console.error('Syntrofic docs on http://127.0.0.1:' + port))
