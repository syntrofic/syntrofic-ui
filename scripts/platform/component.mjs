import { readFile, realpath } from 'node:fs/promises'
import { readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { component, documentEntry, records } from './catalog.mjs'
import { discover, installedAt } from './discover.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const web = '@syntrofic/ui'
const native = '@syntrofic/ui-native'
const packageOf = record => record.package ?? (record.track?.startsWith('native') ? native : web)
const tagOf = record => record.implementation?.component ?? record.id
const names = record => [record.id, record.name, tagOf(record), ...record.implementation?.related ?? []]
const same = (left, right) => left?.toLowerCase() === right?.toLowerCase()
const components = records.filter(entry => ['web', 'web-pro', 'native', 'native-pro'].includes(entry.track))

function inside(directory, path) {
  const subpath = relative(directory, path)
  return subpath && subpath !== '..' && !subpath.startsWith('..' + sep) && !isAbsolute(subpath)
}
export async function readComponentSource(directory, entry) {
  const path = entry.file ?? entry.implementation?.componentSource
    ?? (entry.implementation?.component && 'src/components/' + entry.implementation.component + '.vue')
  if (!path) return
  const owner = packageOf(entry)
  let folder = root
  let filename = resolve(folder, path)
  if (entry.package || owner === native) {
    const installed = await installedAt(directory, owner)
    if (entry.package && !installed) return
    if (installed) {
      folder = await realpath(installed.path)
      filename = resolve(folder, path.replace(/^packages\/native\//, ''))
    }
  }
  try {
    const file = await realpath(filename)
    if (!inside(folder, file)) throw new Error('Component source is outside its package')
    return { folder, file, path, source: await readFile(file, 'utf8') }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

const key = property => property?.key?.name ?? property?.key?.value
const get = (node, name) => node?.properties?.find(property => key(property) === name)?.value
export async function inspectComponentSource(file) {
  const props = []
  const slots = new Set()
  const pieces = new Set()
  if (!file?.file.endsWith('.vue')) return { props, slots: [], pieces: [] }
  const { babelParse, compileScript, parse } = await import('vue/compiler-sfc')
  const { descriptor, errors } = parse(file.source, { filename: file.file, sourceMap: false })
  if (errors.length) return { props, slots: [], pieces: [], propsUnavailable: String(errors[0]) }
  function inspect(node) {
    if (node.type === 1 && node.tag === 'slot') slots.add(node.props.find(prop => prop.type === 6 && prop.name === 'name')?.value?.content ?? 'default')
    if (node.type === 1 && /^[A-Z]/.test(node.tag)) pieces.add(node.tag)
    node.children?.forEach?.(inspect)
  }
  if (descriptor.template?.ast) inspect(descriptor.template.ast)
  const result = { props, slots: [...slots], pieces: [...pieces] }
  if (!descriptor.script && !descriptor.scriptSetup) return result
  try {
    const fs = {
      fileExists(path) {
        try { return inside(file.folder, realpathSync(path)) }
        catch { return false }
      },
      readFile(path) {
        const canonical = realpathSync(path)
        return inside(file.folder, canonical) ? readFileSync(canonical, 'utf8') : undefined
      },
    }
    const script = compileScript(descriptor, { id: 'syntrofic-doc', fs, sourceMap: false })
    const ast = babelParse(script.content, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
    const declaration = ast.program.body.find(node => node.type === 'ExportDefaultDeclaration')?.declaration
    const options = declaration?.type === 'CallExpression' ? declaration.arguments[0] : declaration
    const entries = get(options, 'props')
    if (entries?.type === 'ArrayExpression') for (const item of entries.elements) {
      if (typeof item?.value === 'string') props.push({ name: item.value })
    }
    if (entries?.type === 'ObjectExpression') for (const property of entries.properties) {
      const name = key(property)
      if (!name) continue
      const value = property.value
      const types = value?.type === 'ObjectExpression' ? get(value, 'type') : value
      const initial = get(value, 'default')
      props.push({ name, type: types?.type === 'ArrayExpression' ? types.elements.map(type => type?.name).filter(Boolean).join(' | ') : types?.name,
        required: get(value, 'required')?.value === true, ...(initial && { default: script.content.slice(initial.start, initial.end) }) })
    }
  } catch (error) {
    result.propsUnavailable = error.message.split('\n')[0]
  }
  return result
}

function selectPackage(packages, token) {
  const versionAt = token.indexOf('@', 1)
  const owner = versionAt > 0 ? token.slice(0, versionAt) : token
  const version = versionAt > 0 ? token.slice(versionAt + 1).replace(/^v/, '') : undefined
  const found = packages.filter(item => same(item.name, owner) || !owner.includes('/') && same(item.name.split('/').at(-1), owner))
  if (found.length !== 1) throw new Error('Unknown or ambiguous package: ' + owner)
  if (version && !same(found[0].version, version)) throw new Error('Package version is not installed: ' + token)
  return found[0].name
}

export async function componentReference(directory, selectors, options) {
  if (selectors.length > 100) throw new Error('Provide up to 100 component selectors')
  const output = ['props', 'source', 'showcase', 'blocks'].filter(flag => options[flag])
  if (output.length > 1) throw new Error('Choose one of --props, --source, --showcase or --blocks')
  const { packages } = await discover(directory, '', { type: 'component', installed: true })
  const library = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'))
  const integrations = packages.filter(item => item.version && item.name !== web && item.name !== native)
  const available = [
    ...[web, native].map(name => ({ name, version: packages.find(item => item.name === name)?.version ?? (name === web ? library.version : undefined) })),
    ...integrations,
  ]
  const contributed = integrations.flatMap(item => item.entries.filter(entry => entry.file).map(entry => {
    const replacement = entry.replaces && component(entry.replaces)
    return { ...entry, package: item.name, category: replacement?.category || 'Integrations' }
  }))
  const fixed = options.package && selectPackage(available, options.package)
  const categorized = [...components, ...contributed].filter(entry => !fixed || packageOf(entry) === fixed)
  const list = categorized.filter(entry => !options.category || same(entry.category, options.category))
  const matches = (entry, name) => names(entry).some(value => same(value, name))
  const replaced = entry => packageOf(entry) === web && contributed.some(item => item.replaces && matches(entry, item.replaces))
  if (options.category && !list.length) throw new Error('Unknown component category. Available: ' + [...new Set(categorized.map(entry => entry.category))].sort().join(', '))
  if (options.list || !selectors.length) {
    if (output.length) throw new Error('Pick a component for --' + output[0])
    const query = selectors.join(' ').toLowerCase()
    return list.filter(entry => (fixed || entry.package || !replaced(entry)) && [entry.id, entry.name, entry.category, entry.track]
      .some(value => value?.toLowerCase().includes(query)))
  }
  function find(selector) {
    const split = selector.lastIndexOf('/')
    const packageName = split < 0 ? fixed : selectPackage(available, selector.slice(0, split))
    if (fixed && packageName !== fixed) throw new Error('Selector conflicts with --package: ' + selector)
    const name = selector.slice(split + 1)
    const pool = list.filter(entry => !packageName || packageOf(entry) === packageName)
    const original = component(name)
    const base = original && pool.includes(original) ? original : pool.find(entry => !entry.package && matches(entry, name))
    const overrides = pool.filter(entry => entry.package && (matches(entry, name)
      || (base && packageOf(base) === web && entry.replaces && matches(base, entry.replaces))))
    if (overrides.length > 1) throw new Error('Ambiguous component: ' + name + '. Specify --package.')
    return overrides[0] ?? base
  }
  let selected = selectors.map(find)
  if (selected.some(entry => !entry) && selectors.length > 1 && selectors.every(selector => !selector.includes('/'))) {
    const expanded = find(selectors.join(' '))
    if (expanded) selected = [expanded]
  }
  if (selected.some(entry => !entry)) throw new Error('Unknown component: ' + selectors.filter((_, index) => !selected[index]).join(', '))
  const results = await Promise.all(selected.map(async entry => {
    const packageName = packageOf(entry)
    const tag = tagOf(entry)
    const file = await readComponentSource(directory, entry)
    const identity = { id: entry.id, package: packageName }
    if (options.source) {
      if (!file) throw new Error('Source is unavailable for ' + entry.id)
      return { ...identity, file: file.path, source: file.source }
    }
    const { props, pieces, slots, propsUnavailable } = await inspectComponentSource(file)
    if (options.props) return { ...identity, props, propsUnavailable }
    const blocks = { slots, related: [...new Set([...entry.implementation?.related ?? [], ...pieces])], showcase: entry.implementation?.review }
    if (options.blocks) return { ...identity, ...blocks }
    const attr = props.filter(prop => prop.required).map(prop => ' :' + prop.name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()) + '="' + prop.name + '"').join('')
    const markup = '<' + tag + attr + (slots.includes('default') ? '>内容</' + tag + '>' : ' />')
    const usage = 'import { ' + tag + ' } from ' + JSON.stringify(packageName) + '\n\n' + markup
    if (options.showcase) return { ...identity, source: usage, showcase: blocks.showcase }
    const markdown = [entry.package ? '# ' + entry.name + '\n\n' + (entry.summary ?? '') : documentEntry(entry).trim(),
      usage, ...props.map(prop => '- ' + prop.name + (prop.type ? ' · ' + prop.type : '')),
      'syntrofic component ' + tag + ' --props | --source | --showcase | --blocks'].join('\n\n')
    return { ...entry, ...identity, component: tag, props, blocks, usage, markdown, propsUnavailable }
  }))
  return results.length === 1 ? results[0] : results
}

export function formattedComponentReference(result, options) {
  if (Array.isArray(result)) {
    if (result.every(entry => entry.category && !entry.markdown)) {
      const groups = new Map()
      for (const entry of result) {
        const entries = groups.get(entry.category) ?? []
        entries.push(entry)
        groups.set(entry.category, entries)
      }
      return [...groups].sort(([a], [b]) => a.localeCompare(b))
        .map(([category, entries]) => [category, ...entries.map(entry => '  ' + entry.id + '\t' + entry.name)].join('\n')).join('\n\n')
    }
    return result.map(entry => formattedComponentReference(entry, options)).join('\n\n')
  }
  if (options.props) return [result.id, ...result.props.map(prop => [prop.name, prop.type, prop.required ? 'required' : undefined, prop.default]
    .filter(Boolean).join('\t')), result.propsUnavailable].filter(Boolean).join('\n')
  return result.source ?? result.markdown ?? JSON.stringify(result, null, 2)
}
