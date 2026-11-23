import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { readFile, realpath } from 'node:fs/promises'
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const iconId = value => String(value ?? '').replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase()

function component(node) {
  if (!node) return false
  if (['TSAsExpression', 'TSSatisfiesExpression'].includes(node.type)) return component(node.expression)
  if (['FunctionDeclaration', 'ClassDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'].includes(node.type)) return true
  if (node.type === 'ObjectExpression') return node.properties.some(property => ['render', 'setup', 'template'].includes(property.key?.name))
  if (node.type === 'CallExpression') return /(?:component|icon)$/i.test(node.callee.name ?? node.callee.property?.name ?? '')
  return false
}

function exportedDeclarations(program, adapter) {
  const known = new Map()
  const imported = new Map()
  for (const item of program.body) {
    const declaration = item.type === 'ExportNamedDeclaration' ? item.declaration : item
    if (!declaration) continue
    if (declaration.id?.name && component(declaration)) known.set(declaration.id.name, true)
    if (declaration.type === 'VariableDeclaration') {
      for (const node of declaration.declarations) if (node.id.type === 'Identifier') known.set(node.id.name, component(node.init))
    }
    if (item.type === 'ImportDeclaration' && item.importKind !== 'type') {
      for (const specifier of item.specifiers) {
        if (specifier.importKind === 'type' || specifier.type === 'ImportNamespaceSpecifier') continue
        imported.set(specifier.local.name, { source: item.source.value,
          name: specifier.imported?.name ?? specifier.imported?.value ?? 'default' })
      }
    }
  }
  const named = new Map()
  const star = []
  for (const item of program.body) {
    if (item.type === 'ExportDefaultDeclaration') {
      const declaration = item.declaration
      if (component(declaration) || known.get(declaration?.name) || adapter) named.set('default', true)
      else if (imported.has(declaration?.name)) named.set('default', imported.get(declaration.name))
      continue
    }
    if (item.type === 'ExportAllDeclaration' && item.exportKind !== 'type') star.push(item.source.value)
    if (item.type !== 'ExportNamedDeclaration' || item.exportKind === 'type') continue
    if (item.declaration?.id?.name && component(item.declaration)) named.set(item.declaration.id.name, true)
    if (item.declaration?.type === 'VariableDeclaration') {
      for (const variable of item.declaration.declarations) {
        if (variable.id.type === 'Identifier' && (known.get(variable.id.name) || adapter)) named.set(variable.id.name, true)
      }
    }
    for (const specifier of item.specifiers) {
      const name = specifier.exported?.name ?? specifier.exported?.value
      if (!name || specifier.exportKind === 'type' || specifier.type !== 'ExportSpecifier') continue
      const local = specifier.local.name ?? specifier.local.value
      if (adapter || !item.source && known.get(local)) named.set(name, true)
      else if (item.source) named.set(name, { source: item.source.value, name: local })
      else if (imported.has(local)) named.set(name, imported.get(local))
    }
  }
  return { named, star }
}

const isSpecifier = value => /^(?:[a-z@][\w./@-]*|\.\/[\w./-]+)$/i.test(value ?? '')
const inside = (root, file) => {
  const local = relative(root, file)
  return Boolean(local && !isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep))
}

function resolveEntry(directory, specifier) {
  if (specifier.startsWith('./')) return createRequire(resolve(directory, 'package.json')).resolve(specifier)
  try {
    const result = execFileSync(process.execPath, ['--input-type=module', '--eval', 'process.stdout.write(import.meta.resolve(process.argv[1]))', '--', specifier],
      { cwd: directory, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' }, stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 })
    return fileURLToPath(result)
  } catch {
    throw new Error('Cannot resolve icon module: ' + specifier)
  }
}

export async function libraryIcons(directory, specifier, adapter) {
  if (!isSpecifier(specifier)) throw new Error('Specify a package export or local icon module with --from')
  const source = await realpath(resolveEntry(directory, specifier))
  const root = specifier.startsWith('./') ? await realpath(directory) : undefined
  if (root && !inside(root, source)) throw new Error('Choose a module inside the project')
  if (adapter) {
    const [module, name, extra] = adapter.split('#')
    if (!isSpecifier(module) || name !== undefined && !/^[A-Za-z_$][\w$]*$/.test(name) || extra !== undefined) throw new Error('Use --adapter <module>#<export>')
    if (module.startsWith('./') && !inside(await realpath(directory), await realpath(resolveEntry(directory, module)))) {
      throw new Error('Choose an adapter inside the project')
    }
  }
  const { babelParse } = await import('vue/compiler-sfc')
  const cache = new Map()
  async function read(file, ancestors = new Set()) {
    if (ancestors.has(file)) return new Set()
    if (cache.has(file)) return cache.get(file)
    if (extname(file) === '.vue') return new Set(['default'])
    if (!/\.[cm]?[jt]sx?$/.test(file)) return new Set()
    const content = await readFile(file, 'utf8')
    const { program } = babelParse(content, { sourceType: 'unambiguous', plugins: ['typescript', 'jsx'] })
    const { named, star } = exportedDeclarations(program, adapter)
    const lineage = new Set([...ancestors, file])
    async function reexports(target) {
      if (!target.startsWith('.')) return new Set()
      const child = await realpath(resolveEntry(dirname(file), target.startsWith('./') ? target : './' + target))
      if (root && !inside(root, child)) throw new Error('Choose icon modules inside the project')
      return read(child, lineage)
    }
    const found = new Set()
    for (const [name, entry] of named) if (entry === true || (await reexports(entry.source)).has(entry.name)) found.add(name)
    for (const source of star) for (const name of await reexports(source)) if (name !== 'default') found.add(name)
    cache.set(file, found)
    return found
  }
  return [...await read(source)]
}

export function iconModule(icons, specifier = value => value) {
  const bindings = new Map()
  function value(entry) {
    if (!entry?.module) return JSON.stringify(entry ?? null)
    const key = [entry.module, entry.exportName, entry.adapter].join('\u0000')
    let binding = bindings.get(key)
    if (!binding) {
      const source = 'icon' + bindings.size
      const alias = entry.adapter ? source + 'Adapter' : undefined
      const exportName = /^[A-Za-z_$][\w$]*$/.test(entry.exportName) ? entry.exportName : JSON.stringify(entry.exportName)
      const lines = ['import { ' + exportName + ' as ' + source + ' } from ' + JSON.stringify(specifier(entry.module))]
      if (alias) {
        const [module, name = 'default'] = entry.adapter.split('#')
        lines.push('import { ' + name + ' as ' + alias + ' } from ' + JSON.stringify(specifier(module)))
      }
      bindings.set(key, binding = { lines, value: '{ component: ' + (alias ? alias + '(' + source + ')' : source) + ' }' })
    }
    return binding.value
  }
  const entries = Object.entries(icons).map(([name, entry]) => {
    if (!entry?.variants || !Object.values(entry.variants).some(variant => variant?.module) && !entry.module) {
      return '  ' + JSON.stringify(name) + ': ' + value(entry)
    }
    const variants = Object.entries(entry.variants).map(([id, alternate]) => JSON.stringify(id) + ': ' + value(alternate))
    const base = value(Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'variants')))
    return '  ' + JSON.stringify(name) + ': ({ variant }) => ({ ' + variants.join(', ') + ' })[variant] ?? ' + base
  })
  return [...[...bindings.values()].flatMap(item => item.lines), 'export default {\n' + entries.join(',\n') + '\n}\n'].join('\n')
}
