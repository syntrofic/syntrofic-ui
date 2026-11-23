import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export function projectConfig(name, empty, validate) {
  async function readSource(directory) {
    try { return await readFile(join(directory, name), 'utf8') }
    catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  function parse(source) {
    if (source === undefined) return empty()
    const state = JSON.parse(source)
    if (!validate(state)) throw new Error('Invalid project config: ' + name)
    return state
  }
  async function read(directory) { return parse(await readSource(directory)) }
  async function update(directory, dryRun, change) {
    if (dryRun) return (await change(await read(directory))).result
    await mkdir(directory, { recursive: true })
    const path = join(directory, name)
    const lock = path + '.lock'
    const handle = await open(lock, 'wx')
    const pending = path + '-' + randomUUID() + '.tmp'
    try {
      const previous = await readSource(directory)
      const { state, result, afterCommit, outputs } = await change(parse(previous))
      const expected = state === undefined ? undefined : JSON.stringify(state, null, 2) + '\n'
      if (outputs?.length) {
        const { writeThemeOutputs } = await import('./theme-write.mjs')
        await writeThemeOutputs(directory, expected === undefined ? outputs : [{ file: name, previous, expected }, ...outputs])
      } else if (expected !== undefined) {
        await writeFile(pending, expected, { flag: 'wx' })
        await rename(pending, path)
      }
      return afterCommit ? await afterCommit(result) : result
    } finally {
      await handle.close()
      await rm(pending, { force: true })
      await rm(lock, { force: true })
    }
  }
  return { read, update }
}
