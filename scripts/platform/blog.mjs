import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const publishedFeed = 'https://ui.syntrofic.com/blog/feed.json'
const bundledFeed = new URL('../../catalog/blog.json', import.meta.url)

function parseFeed(text) {
  const data = JSON.parse(text)
  if (!Array.isArray(data) || !data.every(note => typeof note?.id === 'string' && note.id
    && typeof note.title === 'string' && typeof note.body === 'string') || new Set(data.map(note => note.id)).size !== data.length) {
    throw new Error('Invalid release feed')
  }
  return data
}

async function remoteFeed(source) {
  const url = new URL(source)
  if (url.username || url.password || url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) {
    throw new Error('Choose an HTTPS release feed or a local preview URL')
  }
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(3500), redirect: 'error' })
  if (!response.ok) throw new Error('The release feed returned HTTP ' + response.status)
  return parseFeed(await response.text())
}

export async function blogCommand(directory, id, source) {
  let data
  if (source) {
    data = /:\/\//.test(source) ? await remoteFeed(source) : parseFeed(await readFile(resolve(directory, source), 'utf8'))
  } else {
    try { data = await remoteFeed(publishedFeed) }
    catch { data = parseFeed(await readFile(bundledFeed, 'utf8')) }
  }
  if (!id) return data.map(({ id, title, date, description }) => ({ id, title, date, description }))
  const post = data.find(note => note.id === id)
  if (!post) throw new Error('Unknown release note: ' + id)
  return post
}
