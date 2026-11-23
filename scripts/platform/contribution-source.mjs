import { readFile, realpath } from 'node:fs/promises'
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { installedAt } from './discover.mjs'

const readable = new Set(['.vue', '.ts', '.js', '.mjs', '.css', '.scss', '.json', '.md'])
const references = /(?:\bfrom\s+|\bimport\s*(?:\(\s*)?|\burl\(\s*|\bsrc=)["']([^"'\s]+)["']/g
const packageSpecifier = /^(?:@[a-z\d][a-z\d.-]*\/)?[a-z\d][a-z\d._-]*(?:\/[^\s]+)?$/i

function within(root, file) {
  const path = relative(root, file)
  return path && !isAbsolute(path) && path !== '..' && !path.startsWith('..' + sep) ? path.split(sep).join('/') : undefined
}

async function openSource(root, path) {
  for (const candidate of [path, ...[...readable].filter(extension => extension !== '.md').map(extension => path + extension), resolve(path, 'index.ts')]) {
    try {
      const real = await realpath(candidate)
      if (!within(root, real) || !within(root, candidate)) throw new Error('Contribution source is outside its package')
      return { path: candidate, content: await readFile(real) }
    } catch (error) {
      if (!['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code)) throw error
    }
  }
  throw new Error('Missing contribution source: ' + relative(root, path))
}

export async function contributionFiles(directory, entry) {
  const installed = await installedAt(directory, entry.package)
  if (!installed) throw new Error('Install the package first: ' + entry.package)
  const root = await realpath(installed.path)
  const prefix = 'integrations/' + entry.package.replace(/^@/, '').replace('/', '--') + '/'
  const files = new Map()
  const declared = { ...installed.meta.peerDependencies, ...installed.meta.dependencies }
  const dependencies = new Map()

  async function visit(path) {
    if (!within(root, path)) throw new Error('Contribution source is outside its package')
    const file = await openSource(root, path)
    const destination = prefix + within(root, file.path)
    if (files.has(destination)) return destination
    const content = readable.has(extname(file.path)) ? file.content.toString('utf8') : file.content
    files.set(destination, content)
    if (typeof content === 'string') {
      for (const [, specifier] of content.matchAll(references)) {
        if (specifier.startsWith('./') || specifier.startsWith('../')) {
          await visit(resolve(dirname(file.path), specifier.split(/[?#]/, 1)[0]))
        } else if (packageSpecifier.test(specifier)) {
          const name = specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/')
          if (Object.hasOwn(declared, name)) dependencies.set(name, declared[name])
        }
      }
    }
    return destination
  }

  const filename = await visit(resolve(root, entry.file))
  return { filename, files: Object.fromEntries(files), dependencies: Object.fromEntries(dependencies) }
}
