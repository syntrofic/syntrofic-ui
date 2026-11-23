import { readFile, realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { installedAt, packageId, projectAt, projectPackages } from './project-discovery.mjs'

const themePattern = /^[a-z0-9][a-z0-9-]{0,63}$/

async function themeSources(directory, name) {
  const installed = await installedAt(directory, name)
  if (!installed) return []
  const root = await realpath(installed.path)
  let descriptor
  try { descriptor = JSON.parse(await readFile(resolve(root, 'syntrofic.integration.json'), 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return []; throw error }
  if (descriptor.version !== 1 || !Array.isArray(descriptor.contributions)) return []
  return Promise.all(descriptor.contributions.filter(entry => entry?.kind === 'theme' && typeof entry.file === 'string' && entry.file.endsWith('.json'))
    .map(async entry => {
      const path = await realpath(resolve(root, entry.file))
      const local = relative(root, path)
      if (!local || local === '..' || isAbsolute(local) || local.startsWith('..' + sep)) throw new Error('Theme source is outside its package')
      const theme = JSON.parse(await readFile(path, 'utf8'))
      if (theme?.version !== 1 || !themePattern.test(theme.id) || typeof theme.name !== 'string') throw new Error('Invalid theme in ' + name)
      return { id: theme.id, name: theme.name, version: installed.meta.version, source: 'package', owner: name, theme }
    }))
}

export async function installedThemes(directory, owner) {
  const project = await projectAt(directory)
  const dependencies = await projectPackages(project)
  const candidates = owner ? [owner] : Object.keys(dependencies).filter(name => packageId.test(name))
  return (await Promise.all(candidates.map(name => themeSources(project.directory, name)))).flat()
}
