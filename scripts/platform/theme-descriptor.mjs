import { lstat, readFile, realpath } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { projectAt } from './project-discovery.mjs'
import { emitFiles } from './scaffold.mjs'

const inside = (root, path) => {
  const local = relative(root, path)
  return !isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep)
}
const extensions = new Set(['.json', '.ts', '.mts', '.mjs', '.js'])
const themeBuilder = Symbol('defineBrandTheme')
export function isThemeSource(file) { return Boolean(file && extensions.has(extname(file))) }

async function literal(node, lookup) {
  if (['TSAsExpression', 'TSSatisfiesExpression', 'TSTypeAssertion'].includes(node?.type)) return literal(node.expression, lookup)
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node?.type)) return node.value
  if (node?.type === 'NullLiteral') return null
  if (node?.type === 'Identifier') return lookup(node.name)
  if (node?.type === 'CallExpression' && node.callee.type === 'Identifier' && node.arguments.length === 1
    && await lookup(node.callee.name) === themeBuilder) {
    const { defineBrandTheme } = await import('@syntrofic/ui')
    return defineBrandTheme(await literal(node.arguments[0], lookup))
  }
  if (node?.type === 'ArrayExpression') return Promise.all(node.elements.map(element => literal(element, lookup)))
  if (node?.type === 'ObjectExpression') {
    const entries = await Promise.all(node.properties.map(async property => {
      if (property.type === 'SpreadElement') {
        const value = await literal(property.argument, lookup)
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Spread a static object in a theme descriptor')
        return Object.entries(value)
      }
      if (property.type !== 'ObjectProperty' || property.computed || !['Identifier', 'StringLiteral', 'NumericLiteral'].includes(property.key.type)) {
        throw new Error('Theme descriptors must export static data')
      }
      return [[property.key.name ?? property.key.value, await literal(property.value, lookup)]]
    }))
    return Object.fromEntries(entries.flat())
  }
  if (node?.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'NumericLiteral') return -node.argument.value
  throw new Error('Theme descriptors must export static data')
}

function declarations(program) {
  const local = new Map()
  const imports = new Map()
  const exported = new Map()
  for (const node of program.body) {
    if (node.type === 'ImportDeclaration' && node.importKind !== 'type') {
      for (const specifier of node.specifiers) {
        if (specifier.importKind === 'type' || specifier.type === 'ImportNamespaceSpecifier') continue
        imports.set(specifier.local.name, { source: node.source.value, name: specifier.imported?.name ?? specifier.imported?.value ?? 'default' })
      }
    }
    if (node.type === 'ExportDefaultDeclaration') exported.set('default', node.declaration)
    const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node
    if (declaration?.type === 'VariableDeclaration' && declaration.kind === 'const') {
      for (const variable of declaration.declarations) {
        if (variable.id.type !== 'Identifier') continue
        local.set(variable.id.name, variable.init)
        if (node.type === 'ExportNamedDeclaration') exported.set(variable.id.name, variable.init)
      }
    }
    if (node.type === 'ExportNamedDeclaration' && !node.source && node.exportKind !== 'type') {
      for (const specifier of node.specifiers) if (specifier.exportKind !== 'type') {
        exported.set(specifier.exported.name ?? specifier.exported.value, specifier.local)
      }
    }
  }
  return { local, imports, exported }
}

function mergeDescriptor(base, patch) {
  if (!base || !patch || typeof base !== 'object' || typeof patch !== 'object' || Array.isArray(base) || Array.isArray(patch)) return patch
  return Object.fromEntries([...new Set([...Object.keys(base), ...Object.keys(patch)])].map(key => [
    key, Object.hasOwn(patch, key) ? mergeDescriptor(base[key], patch[key]) : base[key],
  ]))
}

export async function readThemeDescriptor(file, { observe, inherit, root } = {}) {
  let project = root ? await realpath(root) : undefined
  const { babelParse } = await import('vue/compiler-sfc')
  const modules = new Map()
  const observed = new Set()
  function track(path) {
    if (!observed.has(path)) { observed.add(path); observe?.(path) }
  }
  async function read(path, name = 'default', lineage = new Set()) {
    track(path)
    const actual = await realpath(path)
    project ??= (await projectAt(dirname(actual))).directory
    if (!inside(project, actual)) throw new Error('Theme descriptor imports must stay inside the project')
    if (!modules.has(actual)) modules.set(actual, readFile(actual, 'utf8').then(source => {
      if (extname(actual) === '.json') return { json: JSON.parse(source) }
      return declarations(babelParse(source, { sourceType: 'module', plugins: ['typescript'] }).program)
    }))
    const values = await modules.get(actual)
    if (Object.hasOwn(values, 'json') && name === 'default') return values.json
    if (!values.exported?.has(name)) throw new Error('No static theme export ' + name + ' in ' + basename(path))
    const key = actual + '\0export:' + name
    if (lineage.has(key)) throw new Error('Circular theme descriptor import: ' + basename(path))
    const used = new Set([...lineage, key])
    function lookup(identifier, current = used) {
      const imported = values.imports.get(identifier)
      if (imported) {
        if (imported.source === '@syntrofic/ui' && imported.name === 'defineBrandTheme') return themeBuilder
        const target = resolve(dirname(actual), imported.source)
        if (!/^\.\.?\//.test(imported.source) || !isThemeSource(target) || !inside(project, target)) {
          throw new Error('Import static theme data from a relative path inside the project')
        }
        return read(target, imported.name, current)
      }
      const key = actual + '\0local:' + identifier
      if (current.has(key)) throw new Error('Circular theme descriptor value: ' + identifier)
      return literal(values.local.get(identifier), next => lookup(next, new Set([...current, key])))
    }
    return literal(values.exported.get(name), lookup)
  }
  async function theme(path, parents = new Set()) {
    track(path)
    const actual = await realpath(path)
    if (parents.has(actual)) throw new Error('Circular theme extension: ' + basename(path))
    const source = await read(path)
    if (!source || typeof source !== 'object' || Array.isArray(source) || source.extends === undefined) return source
    const { extends: parent, ...patch } = source
    if (typeof parent !== 'string' || !/^\.\.?\//.test(parent)) throw new Error('Extend a theme using a relative descriptor filename')
    const baseFile = resolve(dirname(actual), parent)
    if (!isThemeSource(baseFile) || !inside(project, baseFile)) throw new Error('Choose a base theme inside the project')
    const base = await theme(baseFile, new Set([...parents, actual]))
    if (!base?.id || !patch.id || patch.id === base.id) throw new Error('The base and derived theme need distinct IDs')
    inherit?.(actual, await realpath(baseFile))
    return mergeDescriptor(base, patch)
  }
  return theme(file)
}

async function ancestor(directory) {
  for (let folder = directory; ; folder = dirname(folder)) {
    try { return await realpath(folder) }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
}

export async function validateThemeDestination(directory, file) {
  const project = await projectAt(directory)
  if (!inside(project.directory, file) || !inside(project.directory, await ancestor(dirname(file)))) {
    throw new Error('Choose a theme path inside the project')
  }
  return project
}

export function themeTemplateSource(theme) {
  return [
    'import type { BrandTheme } from "@syntrofic/ui"',
    '',
    '// modes.* sets semantic colors. Use #ffffff for a white light canvas.',
    '// parts sets component targets. Run syntrofic theme targets to see them.',
    '// motion sets press, enter, exit and move timings and per-role springs.',
    '// syntax and media can set separate code and media styles.',
    'export default ' + JSON.stringify(theme, null, 2) + ' satisfies BrandTheme',
    '',
  ].join('\n')
}

export async function writeThemeTemplate(directory, theme, path, options) {
  const project = await projectAt(directory)
  const file = path ? resolve(directory, path) : resolve(project.directory, 'theme.template.ts')
  if (extname(file) !== '.ts' || file.endsWith('.d.ts')) throw new Error('Specify a .ts theme template file')
  await validateThemeDestination(directory, file)
  let exists
  try {
    exists = await lstat(file)
    if (!exists.isFile()) throw new Error('Theme template destination must be a regular file')
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (exists && !(options.overwrite || options.write)) throw new Error('Theme template already exists: ' + basename(file))
  if (exists && !/(?:\.theme|Theme|\.template)\.ts$/.test(basename(file))) throw new Error('Choose a theme source filename for overwrite')
  const source = themeTemplateSource(theme)
  if (!options['dry-run']) await emitFiles(dirname(file), { [basename(file)]: source }, options.overwrite || options.write)
  return { theme: theme.id, file, files: [basename(file)], written: !options['dry-run'] }
}
