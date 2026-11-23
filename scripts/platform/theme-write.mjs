import { randomUUID } from 'node:crypto'
import { lstat, mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export async function readThemeOutput(path, encoding = 'utf8') {
  try {
    if (!(await lstat(path)).isFile()) throw Object.assign(new Error('Theme output must be a regular file: ' + path), { code: 'ERR_FILE_EXISTS' })
    return await readFile(path, encoding)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

/** Stage related files before committing, and restore the previous output if a commit fails. */
export async function writeThemeOutputs(directory, changes) {
  const inputs = changes.map(change => ({ ...change, path: resolve(directory, change.file) }))
    .sort((a, b) => a.path.localeCompare(b.path))
  const locks = []
  const staged = []
  const committed = []
  const retained = new Set()
  try {
    for (const item of inputs) {
      await mkdir(dirname(item.path), { recursive: true })
      const lock = item.path + '.syntrofic-lock'
      const handle = await open(lock, 'wx')
      locks.push({ lock, handle })
      const current = await readThemeOutput(item.path, Buffer.isBuffer(item.expected ?? item.previous) ? null : 'utf8')
      const unchanged = Buffer.isBuffer(current) && Buffer.isBuffer(item.previous) ? current.equals(item.previous) : current === item.previous
      if (!unchanged) throw new Error('Theme output changed during the build: ' + item.path)
    }
    for (const item of inputs) {
      const suffix = '-' + randomUUID()
      const pending = item.expected === undefined ? undefined : item.path + suffix + '.tmp'
      const backup = item.previous === undefined ? undefined : item.path + suffix + '.bak'
      staged.push({ ...item, pending, backup })
      if (pending) await writeFile(pending, item.expected, { flag: 'wx' })
      if (backup) await writeFile(backup, item.previous, { flag: 'wx' })
    }
    for (const item of staged) {
      if (item.pending) await rename(item.pending, item.path)
      else await rm(item.path)
      committed.push(item)
    }
  } catch (error) {
    const errors = [error]
    for (const item of committed.reverse()) {
      try {
        if (item.backup) await rename(item.backup, item.path)
        else await rm(item.path, { force: true })
      } catch (restoreError) {
        errors.push(restoreError)
        if (item.backup) retained.add(item.backup)
      }
    }
    if (errors.length > 1) throw new AggregateError(errors, 'Unable to restore every theme output. Retained backups: ' + [...retained].join(', '))
    throw error
  } finally {
    for (const { pending, backup } of staged) {
      if (pending) await rm(pending, { force: true })
      if (backup && !retained.has(backup)) await rm(backup, { force: true })
    }
    for (const { lock, handle } of locks.reverse()) {
      await handle.close()
      await rm(lock, { force: true })
    }
  }
}
