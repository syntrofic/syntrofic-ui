import { execFile } from 'node:child_process'
import { lstat, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { checkSwizzlePath, originalSource, resolvedSwizzleSource, sameSource, storeSource } from './swizzle.mjs'
import { applyChanges } from './upgrade.mjs'

const run = promisify(execFile)
const excluded = new Set(['node_modules', '.git', '.hg', '.sl', '.nuxt', '.yarn', '.cache', 'dist'])
const portable = path => path.split(sep).join('/')
const own = (record, key) => record && Object.hasOwn(record, key) ? record[key] : undefined

async function receipts(directory) {
  const result = []
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name)
    if (item.isDirectory() && !excluded.has(item.name) && !item.name.startsWith('.')) result.push(...await receipts(path))
    else if (item.isFile() && /^syntrofic-swizzle-[\w.-]+\.json$/.test(item.name)) result.push(path)
  }
  return result.sort()
}

async function directoryOfProject(start) {
  for (let directory = start; ; directory = dirname(directory)) {
    try {
      if ((await lstat(join(directory, 'package.json'))).isFile()) return directory
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (dirname(directory) === directory) return start
  }
}

async function merge(local, base, next) {
  const tmp = await mkdtemp(join(tmpdir(), 'syntrofic-swizzle-'))
  try {
    const files = ['local', 'base', 'upstream'].map(file => join(tmp, file))
    await Promise.all(files.map((file, index) => writeFile(file, [local, base, next][index])))
    try {
      const { stdout } = await run('git', ['merge-file', '--stdout', ...files], { maxBuffer: 8 * 1024 * 1024 })
      return { text: stdout, status: 'merged' }
    } catch (error) {
      if (error.code === 'ENOENT') return { status: 'merge-unavailable' }
      if (typeof error.code === 'number' && error.code > 0 && error.code < 128) return { status: 'conflict' }
      throw error
    }
  } finally { await rm(tmp, { recursive: true, force: true }) }
}

function validateReceipt(receipt) {
  return receipt && typeof receipt.component === 'string' && Array.isArray(receipt.files)
    && receipt.files.every(file => typeof file === 'string')
    && (receipt.bases === undefined || receipt.bases && typeof receipt.bases === 'object' && !Array.isArray(receipt.bases))
}

async function planReceipt(project, path) {
  const receiptText = await readFile(path, 'utf8')
  const receipt = JSON.parse(receiptText)
  if (!validateReceipt(receipt)) throw new Error('Invalid component copy receipt')
  const ownership = dirname(path)
  const nameOf = target => portable(relative(project, target))
  const { id, version, copied, report } = await resolvedSwizzleSource(project, receipt.id ?? receipt.component, receipt.package ?? '@syntrofic/ui')
  const changes = []
  const files = []
  const bases = {}
  for (const [file, next] of copied) {
    const destination = resolve(ownership, file)
    await checkSwizzlePath(ownership, destination)
    const name = nameOf(destination)
    let local
    try { local = await readFile(destination, Buffer.isBuffer(next) ? undefined : 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
    const baseline = own(receipt.bases, file)
    const base = originalSource(baseline)
    const previous = receipt.files.includes(file)
    let result
    if (sameSource(local, next)) result = { status: 'current' }
    else if (local === undefined) result = previous ? { status: 'missing-file' } : { text: next, status: 'added' }
    else if (sameSource(next, base)) result = { status: 'local-edits' }
    else if (sameSource(local, base)) result = { text: next, status: 'updated' }
    else if (typeof base === 'string' && typeof next === 'string') result = await merge(local, base, next)
    else if (Buffer.isBuffer(base)) result = { status: 'conflict' }
    else result = { status: 'missing-baseline' }
    if (result.text !== undefined && !sameSource(result.text, local)) changes.push({ path: destination, name, text: local, updated: result.text })
    if (['current', 'local-edits', 'merged', 'updated', 'added'].includes(result.status)) bases[file] = storeSource(next)
    else if (baseline !== undefined) bases[file] = baseline
    files.push({ file: name, status: result.status })
  }
  const removed = receipt.files.filter(file => !copied.has(file))
  for (const file of removed) {
    const destination = resolve(ownership, file)
    await checkSwizzlePath(ownership, destination)
    const previous = own(receipt.bases, file)
    if (previous !== undefined) bases[file] = previous
    files.push({ file: nameOf(destination), status: 'removed-upstream' })
  }
  const valid = files.every(file => ['current', 'local-edits', 'merged', 'updated', 'added'].includes(file.status))
  const nextReceipt = JSON.stringify({ ...report, id, version: valid ? version : receipt.version, files: [...copied.keys(), ...removed], bases }, null, 2) + '\n'
  if (nextReceipt !== receiptText) changes.push({ path, name: nameOf(path), text: receiptText, updated: nextReceipt })
  return { receipt: nameOf(path), files, valid, changes }
}

export async function upgradeSwizzle(directory, options) {
  const project = await directoryOfProject(await realpath(directory))
  const dryRun = !options.apply || Boolean(options['dry-run'])
  const upgrades = []
  const changes = new Map()
  const conflicting = new Set()
  for (const path of await receipts(project)) {
    try {
      const { changes: updates, ...entry } = await planReceipt(project, path)
      upgrades.push(entry)
      for (const update of updates) {
        const previous = changes.get(update.path)
        if (previous && !sameSource(previous.updated, update.updated)) conflicting.add(update.name)
        else changes.set(update.path, update)
      }
    } catch (error) {
      upgrades.push({ receipt: portable(relative(project, path)), files: [], valid: false, error: error.message })
    }
  }
  const valid = !conflicting.size && upgrades.every(entry => entry.valid)
  if (!dryRun && !conflicting.size && changes.size) await applyChanges(project, [...changes.values()])
  return { dryRun, valid, written: !dryRun && !conflicting.size && changes.size > 0, conflicting: [...conflicting], upgrades }
}
