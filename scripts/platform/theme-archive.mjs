import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { readResponseBytes } from './remote-file.mjs'

const run = promisify(execFile)
export const isThemeArchive = value => /^(?:https:\/\/)|\.(?:tgz|tar\.gz)$/i.test(value ?? '')

async function readArchive(file) {
  const limits = { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, timeout: 8000 }
  const listing = (await run('tar', ['-tzf', file], limits)).stdout.trim().split('\n').filter(Boolean)
  if (listing.some(path => path.startsWith('/') || path.includes('\\') || path.split('/').includes('..'))) throw new Error('Theme archive paths must be relative')
  const manifests = listing.filter(path => /(?:^|\/)manifest\.json$/.test(path) && !path.startsWith('__MACOSX/'))
  if (manifests.length !== 1) throw new Error('The archive must contain one theme manifest.json')
  const { stdout } = await run('tar', ['-xOzf', file, '--', manifests[0]], limits)
  return JSON.parse(stdout)
}

export async function readThemeArchive(directory, source) {
  if (!/^https:\/\//i.test(source)) return readArchive(resolve(directory, source))
  const url = new URL(source)
  if (url.username || url.password) throw new Error('Use an HTTPS theme archive URL without credentials')
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('The theme archive returned HTTP ' + response.status)
  const scratch = await mkdtemp(join(tmpdir(), 'syntrofic-theme-archive-'))
  try {
    const file = join(scratch, 'theme.tgz')
    await writeFile(file, await readResponseBytes(response, 32 * 1024 * 1024), { flag: 'wx' })
    return await readArchive(file)
  } finally { await rm(scratch, { recursive: true, force: true }) }
}
