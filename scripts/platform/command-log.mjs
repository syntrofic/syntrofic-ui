import { appendFile, lstat, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { projectAt, readProjectSettings } from './project-discovery.mjs'

export async function logCommand(directory, event) {
  const project = await projectAt(directory)
  const { debug } = await readProjectSettings(project.directory)
  if (!debug) return
  const path = resolve(project.directory, debug)
  const parent = await realpath(dirname(path))
  for (const location of [path, parent]) {
    const name = relative(project.directory, location)
    if (isAbsolute(name) || name === '..' || name.startsWith('..' + sep)) throw new Error('Choose a command log inside the project')
  }
  try {
    if (!(await lstat(path)).isFile()) throw new Error('Choose a regular file for the command log')
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  await appendFile(path, JSON.stringify(event) + '\n')
}
