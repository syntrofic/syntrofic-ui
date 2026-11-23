import { access, lstat, readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { component, matchRecords } from './catalog.mjs'
import { emitFiles } from './scaffold.mjs'

const project = fileURLToPath(new URL('../../', import.meta.url))
const source = resolve(project, 'src')
const imports = /(?:\bfrom\s+|\bimport\s*(?:\(\s*)?)["']([^"'\s]+)["']/g
const packageName = '@syntrofic/ui'

async function modulePath(path) {
  for (const candidate of [path, path + '.ts', path + '.vue', path + '.css', resolve(path, 'index.ts')]) {
    try {
      const info = await readFile(candidate, 'utf8')
      return { candidate, info }
    } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'EISDIR' && error.code !== 'ENOTDIR') throw error }
  }
  throw new Error('Cannot resolve copied source: ' + relative(project, path))
}

function webEntries() {
  return matchRecords().filter(item => item.track?.startsWith('web') && item.implementation?.component)
}

export async function swizzleSource(name) {
  const entry = component(name) ?? webEntries().find(item => item.implementation.component.toLowerCase() === name.toLowerCase())
  if (!entry?.track?.startsWith('web') || !entry.implementation?.component) throw new Error('Cannot find a Vue component: ' + name)
  const main = entry.implementation.componentSource ?? `src/components/${entry.implementation.component}.vue`
  const manifest = JSON.parse(await readFile(resolve(project, 'package.json'), 'utf8'))
  const external = new Set()
  const copied = new Map()
  async function visit(path) {
    const { candidate, info } = await modulePath(path)
    const inside = relative(source, candidate)
    if (!inside || isAbsolute(inside) || inside === '..' || inside.startsWith('../') || inside.startsWith('..\\')) throw new Error('Source is outside src: ' + candidate)
    const destination = 'src/' + inside.replaceAll('\\', '/')
    if (copied.has(destination)) return
    copied.set(destination, info)
    for (const [, specifier] of info.matchAll(imports)) {
      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        const file = specifier.split(/[?#]/, 1)[0]
        await visit(resolve(dirname(candidate), file))
      }
      else if (!specifier.startsWith('/') && !specifier.includes(':')) {
        external.add(specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/'))
      }
    }
  }
  await access(source)
  await visit(resolve(project, main))
  const dependencies = Object.fromEntries([...external].sort().map(name => [name, manifest.dependencies?.[name] ?? manifest.peerDependencies?.[name] ?? '*']))
  return { id: entry.id, version: manifest.version, copied, report: {
    component: entry.implementation.component, entry: main, files: [...copied.keys()], dependencies, style: packageName + '/style.css',
  } }
}

async function installedComponents(directory) {
  const { discover } = await import('./discover.mjs')
  const { packages } = await discover(directory, '', { type: 'component', installed: true })
  return packages.filter(item => item.name !== packageName && item.version).flatMap(item =>
    item.entries.filter(entry => entry.file?.endsWith('.vue')).map(entry => ({ ...entry, package: item.name, version: item.version })))
}

export const sameSource = (a, b) => Buffer.isBuffer(a) && Buffer.isBuffer(b) ? a.equals(b) : a === b
export const storeSource = value => Buffer.isBuffer(value) ? { encoding: 'base64', data: value.toString('base64') } : value
export const originalSource = value => value?.encoding === 'base64' && typeof value.data === 'string' ? Buffer.from(value.data, 'base64') : value

export async function resolvedSwizzleSource(directory, name, owner, entries) {
  if (owner === packageName) return swizzleSource(name)
  const original = component(name)
  const candidates = (entries ?? await installedComponents(directory)).filter(entry => (!owner || entry.package === owner)
    && (entry.id.toLowerCase() === name.toLowerCase() || entry.name?.toLowerCase() === name.toLowerCase()
      || original && entry.replaces && component(entry.replaces)?.id === original.id))
  if (candidates.length > 1) throw new Error('Choose the source package with --package: ' + name)
  const entry = candidates[0]
  if (!entry) {
    if (owner) throw new Error('No matching component in ' + owner + ': ' + name)
    return swizzleSource(name)
  }
  const { contributionFiles } = await import('./contribution-source.mjs')
  const { filename, files, dependencies } = await contributionFiles(directory, entry)
  return { id: entry.id, version: entry.version, copied: new Map(Object.entries(files)), report: {
    component: entry.id, package: entry.package, entry: filename, files: Object.keys(files), dependencies, style: packageName + '/style.css',
  } }
}

export async function checkSwizzlePath(directory, path) {
  const name = relative(directory, path)
  if (!name || isAbsolute(name) || name === '..' || name.startsWith('..' + sep)) throw new Error('Choose an output path inside the copy folder')
  for (let folder = path; folder !== dirname(folder); folder = dirname(folder)) {
    try {
      if ((await lstat(folder)).isSymbolicLink()) throw new Error('Component copies cannot write through a symbolic link: ' + folder)
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (folder === directory) break
  }
}

export async function swizzle(projectDirectory, directory, name, options) {
  const contributions = options.package === packageName ? [] : await installedComponents(projectDirectory)
  if (!name || options.list) {
    if (options.package && options.package !== packageName) return contributions.filter(item => item.package === options.package)
      .map(entry => ({ id: entry.id, component: entry.id, package: entry.package }))
    return [...new Map(webEntries().filter(entry => entry.implementation.componentSource?.endsWith('.vue') ?? entry.implementation.component.startsWith('S'))
      .map(entry => {
        const replacements = contributions.filter(item => item.replaces && component(item.replaces)?.id === entry.id)
          .map(item => item.package + '/' + item.id)
        return [entry.implementation.component, { id: entry.id, component: entry.implementation.component, ...(replacements.length && { replacements }) }]
      })).values()]
      .sort((first, second) => first.component.localeCompare(second.component))
  }
  const { id, version, copied, report } = await resolvedSwizzleSource(projectDirectory, name, options.package, contributions)
  const identifier = report.package ? report.package.replace(/^@/, '').replace('/', '--') + '-' + id : id
  const receiptName = `syntrofic-swizzle-${identifier}.json`
  const files = Object.fromEntries(copied)
  const receipt = { ...report, id, version, bases: Object.fromEntries(Object.entries(files).map(([file, value]) => [file, storeSource(value)])) }
  if (!options['dry-run']) {
    const pending = {}
    for (const [name, content] of Object.entries({ ...files, [receiptName]: JSON.stringify(receipt, null, 2) + '\n' })) {
      const destination = resolve(directory, name)
      await checkSwizzlePath(directory, destination)
      let previous
      try { previous = await readFile(destination, Buffer.isBuffer(content) ? undefined : 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
      if (sameSource(previous, content)) continue
      if (previous !== undefined && !options.overwrite) throw new Error('File already exists: ' + destination)
      pending[name] = content
    }
    await emitFiles(directory, pending, options.overwrite)
  }
  return report
}
