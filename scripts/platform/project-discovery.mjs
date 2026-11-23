import { readFile, realpath } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const packageId = /^(?:@[a-z\d][a-z\d.-]*\/)?[a-z\d][a-z\d._-]*$/i
export async function readJSON(path) {
  try { return JSON.parse(await readFile(path, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
}

export async function projectAt(directory) {
  const start = await realpath(directory)
  for (let current = start; ; current = dirname(current)) {
    const manifest = await readJSON(join(current, 'package.json'))
    if (manifest) return { directory: current, manifest }
    if (dirname(current) === current) return { directory: start, manifest: {} }
  }
}

export async function readProjectSettings(directory) {
  const settings = await readJSON(join(directory, 'syntrofic.config.json'))
  if (settings === undefined) return {}
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Invalid syntrofic.config.json')
  if (settings.integrations !== undefined && (!Array.isArray(settings.integrations)
    || settings.integrations.some(name => typeof name !== 'string' || !packageId.test(name)))) {
    throw new Error('syntrofic.config.json integrations must list package names')
  }
  if (settings.debug !== undefined && (typeof settings.debug !== 'string' || !settings.debug.endsWith('.ndjson'))) {
    throw new Error('syntrofic.config.json debug must name an .ndjson command log')
  }
  return settings
}

export async function projectPackages(project, settings) {
  const config = settings ?? await readProjectSettings(project.directory)
  return {
    ...Object.fromEntries((config.integrations ?? []).map(name => [name, '*'])),
    ...project.manifest.optionalDependencies, ...project.manifest.devDependencies, ...project.manifest.dependencies,
  }
}

export async function installedAt(directory, name) {
  if (!packageId.test(name)) throw new Error('Invalid package name: ' + name)
  for (let current = directory; ; current = dirname(current)) {
    const path = join(current, 'node_modules', name)
    const meta = await readJSON(join(path, 'package.json'))
    if (meta) return { path, meta }
    if (dirname(current) === current) return undefined
  }
}
