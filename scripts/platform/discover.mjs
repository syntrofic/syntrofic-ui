import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { realpath } from 'node:fs/promises'
import { documentEntry } from './catalog.mjs'
import { rankItems, resultLimit, searchIndex, searchKinds } from './search.mjs'
import { installedAt, packageId, projectAt, projectPackages, readJSON, readProjectSettings } from './project-discovery.mjs'
export { installedAt, projectAt } from './project-discovery.mjs'

const kinds = [...searchKinds, 'codemod', 'agent-doc']
const versionId = /^v?\d+(?:\.\d+){2}(?:-[\da-z.-]+)?(?:\+[\da-z.-]+)?$/i
const official = [
  { name: '@syntrofic/ui', summary: 'Vue components, themes, templates and reference', tracks: ['web', 'web-pro'],
    kinds: ['component', 'hook', 'doc', 'template', 'theme'] },
  { name: '@syntrofic/ui-native', summary: 'NativeScript Vue components', tracks: ['native', 'native-pro'], kinds: ['component'] },
  { name: '@syntrofic/ui-styles', summary: 'Shared tokens and stylesheet integrations', tracks: [], kinds: ['theme'] },
]

function contributions(items) {
  if (!Array.isArray(items)) throw new Error('Expected an array of integration contributions')
  return items.map(item => {
    if (!item || !kinds.includes(item.kind) || typeof item.id !== 'string' || !item.id.trim() || item.id.includes('/')) {
      throw new Error('Invalid discovery contribution')
    }
    if (item.kind === 'template' && item.templateType !== undefined && !['page', 'block'].includes(item.templateType)) {
      throw new Error('Invalid template type: ' + item.id)
    }
    return { id: item.id, name: typeof item.title === 'string' ? item.title : item.id, type: item.kind,
      summary: typeof item.description === 'string' ? item.description : undefined,
      file: typeof item.file === 'string' ? item.file : undefined,
      ...(item.kind === 'template' && { templateType: item.templateType ?? 'page' }),
      ...(typeof item.replaces === 'string' && { replaces: item.replaces }) }
  })
}
function remotePackages(input) {
  if (input === undefined) return []
  if (input.version !== 1 || !Array.isArray(input.packages)) throw new Error('Invalid syntrofic.discover.json')
  return input.packages.map(item => {
    if (!packageId.test(item?.name ?? '') || item.versions !== undefined
      && (!Array.isArray(item.versions) || item.versions.some(version => typeof version !== 'string' || !versionId.test(version)))) throw new Error('Invalid discovery package')
    return { name: item.name, summary: typeof item.summary === 'string' ? item.summary : undefined,
      versions: item.versions ?? [], entries: contributions(item.contributions ?? []) }
  })
}

export async function discover(directory, query, options = {}) {
  if (options.installed && options.available) throw new Error('--installed and --available are mutually exclusive')
  if (options.type && !kinds.includes(options.type)) throw new Error('Unknown discovery type: ' + options.type)
  const limit = resultLimit(options.limit)
  const project = await projectAt(directory)
  const { manifest } = project
  const settings = await readProjectSettings(project.directory)
  const declared = await projectPackages(project, settings)
  const sources = remotePackages(await readJSON(await discoveryFile(project.directory, settings.discover)))
  const staticEntries = await searchIndex(project.directory, options.type ? searchKinds.filter(kind => kind === options.type) : searchKinds)
  const packages = new Map(official.map(item => [item.name, {
    name: item.name,
    summary: item.summary,
    entries: staticEntries.filter(entry => item.kinds.includes(entry.type)
      && (entry.type !== 'component' || item.tracks.includes(entry.track))),
  }]))
  for (const source of sources) {
    const current = packages.get(source.name)
    if (current) packages.set(source.name, { ...current, versions: source.versions, entries: [...current.entries, ...source.entries] })
    else packages.set(source.name, source)
  }
  const names = [...new Set([...packages.keys(), ...Object.keys(declared)])].filter(name => packageId.test(name))
  const loaded = await Promise.all(names.map(async name => {
    const installed = await installedAt(project.directory, name)
    const details = packages.get(name)
    if (!installed && !details) return
    const integration = installed ? await readJSON(join(installed.path, 'syntrofic.integration.json')) : undefined
    if (integration && integration.version !== 1) throw new Error('Unsupported integration manifest: ' + name)
    if (!integration && !details) return
    const candidates = [...details?.entries ?? [], ...integration ? contributions(integration.contributions) : []]
    const items = [...new Map(candidates.map(item => [`${item.type}:${item.id}`, item])).values()]
      .filter(item => !options.type || item.type === options.type)
    const version = installed?.meta.version ?? (manifest.name === name ? manifest.version : null)
    const issues = integration?.issues ?? installed?.meta.bugs?.url
    return {
      name, summary: details?.summary ?? installed?.meta.description, declared: declared[name] ?? null,
      installed: Boolean(version || Object.hasOwn(declared, name) || manifest.name === name), version,
      versions: [...new Set([version, ...details?.versions ?? []].filter(Boolean))],
      install: 'pnpm add ' + name, entries: items,
      ...(typeof issues === 'string' && { issues }),
    }
  }))
  const visible = loaded.filter(item => item && (options.installed ? item.installed : options.available ? !item.installed : true)
    && (!options.type || item.entries.length))
  const text = query.trim()
  if (!text) return { packages: visible }
  const wanted = text.toLowerCase()
  const direct = visible.find(item => item.name.toLowerCase() === wanted)
  if (direct) return { package: direct, entries: direct.entries }
  const versioned = visible.find(item => wanted.startsWith(item.name.toLowerCase() + '@'))
  if (versioned) {
    const version = text.slice(versioned.name.length + 1)
    if (!versioned.versions.includes(version) || !versionId.test(version)) throw new Error('Unknown available version: ' + text)
    return { package: { ...versioned, version, install: 'pnpm add ' + versioned.name + '@' + version }, entries: versioned.entries }
  }
  const owner = visible.find(item => wanted.startsWith(item.name.toLowerCase() + '/'))
  if (owner) {
    const name = wanted.slice(owner.name.length + 1)
    const entry = owner.entries.find(item => [item.id, item.name, ...item.aliases ?? []].filter(Boolean)
      .some(value => value.toLowerCase() === name))
    if (!entry) throw new Error('Unknown package entry: ' + text)
    return { package: owner.name, entry: { ...entry, ...(entry.implementation && { markdown: documentEntry(entry) }) } }
  }
  const matchedPackages = rankItems(visible.map(item => ({ ...item, id: item.name, aliases: [item.summary] })), text)
  const entries = rankItems(visible.flatMap(item => item.entries.map(entry => ({
    ...entry, package: item.name, aliases: [...entry.aliases ?? [], item.name], action: 'discover', target: item.name + '/' + entry.id,
  }))), text)
  return { packages: matchedPackages.slice(0, limit), entries: entries.slice(0, limit) }
}

async function discoveryFile(directory, filename) {
  if (filename === undefined) return join(directory, 'syntrofic.discover.json')
  if (typeof filename !== 'string' || !filename.endsWith('.json')) throw new Error('Set discover to a local JSON file')
  const actual = await realpath(resolve(directory, filename))
  const path = relative(directory, actual)
  if (!path || isAbsolute(path) || path === '..' || path.startsWith('..' + sep)) throw new Error('Set discover to a JSON file inside the project')
  return actual
}

export function formattedDiscovery(result, all) {
  if (result.entry) return result.entry.markdown?.trim() ?? [result.package, result.entry.type, result.entry.name, result.entry.summary].filter(Boolean).join('\n')
  if (result.package) return [result.package.name + '\t' + result.package.install,
    ...result.entries.map(item => [item.type, item.id, item.name].join('\t'))].join('\n')
  return [
    ...result.packages.flatMap(item => [
      [item.name, item.installed ? 'installed' : 'available', item.install].join('\t'),
      ...item.entries.slice(0, all ? undefined : 10).map(entry => '  ' + [entry.type, entry.id, entry.name].join('\t')),
      !all && item.entries.length > 10 ? '  +' + (item.entries.length - 10) + ' more' : '',
    ].filter(Boolean)),
    ...result.entries?.map(entry => [entry.package, entry.type, entry.id, entry.name].join('\t')) ?? [],
  ].join('\n')
}
