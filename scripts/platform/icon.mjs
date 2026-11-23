import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { projectConfig } from './project-config.mjs'
import { iconId, iconModule, libraryIcons } from './icon-library.mjs'
import { installedAt, packageId, projectAt, projectPackages, readJSON } from './project-discovery.mjs'

export const iconCapabilities = ['new-set <name>', 'new-definition <name>', 'add [id]', 'map [definition] [icon]', 'use <name>', 'list']
const config = projectConfig('syntrofic.icons.json', () => ({ version: 1, active: null, sets: [] }), state => state?.version === 1 && Array.isArray(state.sets))
const identifier = /^[a-z][a-z0-9:_-]{0,63}$/i

function setOf(state, key) {
  const owned = state.sets.find(item => item.id === key && !item.owner)
  const named = state.sets.filter(item => item.id === key || item.owner && item.owner + '/' + item.id === key)
  if (!owned && named.length > 1) throw new Error('Use the package and set name to select an icon set: ' + key)
  const set = owned ?? named[0]
  if (!set) throw new Error('Choose an icon set using experimental icon use or --set')
  return set
}

function installedIcon(entry, owner) {
  const source = specifier => specifier?.startsWith('./') ? owner + '/' + specifier.slice(2) : specifier
  return { ...entry, ...(entry.module && { module: source(entry.module) }), ...(entry.adapter && { adapter: source(entry.adapter) }),
    ...(entry.variants && { variants: Object.fromEntries(Object.entries(entry.variants).map(([variant, item]) => [variant, installedIcon(item, owner)])) }) }
}

async function packageIconSets(directory, observe) {
  const project = await projectAt(directory)
  observe?.(join(project.directory, 'package.json'))
  observe?.(join(project.directory, 'syntrofic.config.json'))
  const deps = await projectPackages(project)
  return (await Promise.all(Object.keys(deps).filter(name => packageId.test(name)).map(async owner => {
    const installed = await installedAt(project.directory, owner)
    if (!installed) return []
    const file = join(installed.path, 'syntrofic.icons.json')
    const registry = await readJSON(file)
    if (!registry) return []
    observe?.(file)
    if (registry.version !== 1 || !Array.isArray(registry.sets)) throw new Error('Invalid icon registry in ' + owner)
    return registry.sets.map(set => {
      if (!set || !identifier.test(set.id) || !set.icons || !set.mappings || !set.definitions) throw new Error('Invalid icon set in ' + owner)
      const icons = Object.fromEntries(Object.entries(set.icons).map(([key, icon]) => [key, installedIcon(icon, owner)]))
      return { ...set, owner, version: installed.meta.version, icons }
    })
  }))).flat()
}
function iconData(data) {
  const path = typeof data === 'string' ? data : data?.path
  if (typeof path !== 'string' || path.length > 24000 || !/^\s*[Mm][AaCcHhLlMmQqSsTtVvZz\dEe.+,\s-]+$/.test(path)) {
    throw new Error('Expected a valid SVG path string or JSON icon definition')
  }
  if (typeof data === 'string') return { path }
  const viewBox = data.viewBox?.trim().split(/\s+|,/).map(Number)
  if (viewBox && (viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0)) throw new Error('Invalid SVG viewBox')
  return { path, viewBox: viewBox?.join(' '), mirror: data.mirror === true || undefined }
}
const words = value => value?.split(',').map(word => word.trim()).filter(Boolean) ?? []
async function coreIcons() {
  const source = await readFile(new URL('../../src/internal/icons.ts', import.meta.url), 'utf8')
  const artwork = source.split('export const iconPaths = {')[1]?.split('\n}')[0] ?? ''
  return new Map([...artwork.matchAll(/^\s{2}(\w+):\s*'([^']+)'/gm)].map(([, key, path]) => [iconId(key), { key, path }]))
}
function actualKey(entries, input) {
  return Object.keys(entries).find(existing => iconId(existing) === iconId(input))
}
function iconName(set, input) {
  const key = actualKey(set.icons, input) ?? Object.keys(set.icons).find(key => iconId(set.icons[key].exportName) === iconId(input))
  if (!key) throw new Error('Unknown icon: ' + (input ?? ''))
  return key
}
function meaningKey(set, core, input) {
  const key = actualKey(set.definitions, input) ?? (core.has(iconId(input)) ? iconId(input) : undefined)
  if (!key) throw new Error('Unknown icon definition: ' + (input ?? ''))
  return key
}
function iconDefinition(options) {
  const description = options.description?.trim()
  const searchWords = words(options.words)
  if (!description || !searchWords.length) throw new Error('Provide a description and search words')
  return { description, words: searchWords }
}
function reference(module, exportName, adapter) {
  return { module, exportName, ...(adapter && { adapter }) }
}
function setVariants(options, previous) {
  const variants = options.variants ? words(options.variants).map(iconId) : previous?.variants ?? ['outline', 'filled']
  const defaultVariant = iconId(options['default-variant'] ?? previous?.defaultVariant ?? variants[0])
  if (variants.some(variant => !identifier.test(variant)) || !variants.includes(defaultVariant) || new Set(variants).size !== variants.length) {
    throw new Error('Choose unique variants and one default variant')
  }
  return { variants, defaultVariant }
}

function mergedIcons(state, name, backups, variant, builtIns) {
  const set = setOf(state, name)
  if (variant && !setVariants({}, set).variants.includes(variant)) throw new Error('Unknown variant: ' + variant)
  const select = [set, ...backups.map(key => setOf(state, key))]
  const icons = {}
  for (const chosen of select.reverse()) {
    const entries = { ...chosen.icons }
    for (const [semantic, id] of Object.entries(chosen.mappings)) {
      if (Object.hasOwn(chosen.icons, id)) entries[builtIns.get(iconId(semantic))?.key ?? semantic] = chosen.icons[id]
    }
    for (const [key, entry] of Object.entries(entries)) {
      const defaultLook = chosen.defaultVariant
      const preferred = entry.variants?.[variant || defaultLook]
      if (preferred) {
        const { variants, ...base } = entry
        icons[key] = { ...preferred, variants: { ...(defaultLook && { [defaultLook]: base }), ...variants } }
      } else icons[key] = entry
    }
  }
  return icons
}

export async function compileIcons(directory, sourceSpecifier, observe) {
  const state = await config.read(directory)
  if (!state.active) return iconModule({}, sourceSpecifier)
  const iconState = { ...state, sets: [...state.sets, ...await packageIconSets(directory, observe)] }
  const icons = mergedIcons(iconState, state.active, state.backups ?? [], state.variant, await coreIcons())
  return iconModule(icons, sourceSpecifier)
}

export async function iconCommand(directory, [action, name, target, ...rest], options) {
  const choose = state => setOf(state, options.set ?? state.active)
  const builtIns = await coreIcons()
  if (action === 'new-set') {
    if (!identifier.test(name ?? '')) throw new Error('Specify a valid icon-set name')
    const excluded = new Set(words(options.exclude).map(iconId))
    const imports = options.from ? (await libraryIcons(directory, options.from, options.adapter))
      .filter(exportName => exportName !== 'default' && identifier.test(iconId(exportName)) && !excluded.has(iconId(exportName))) : undefined
    if (imports && !imports.length) throw new Error('The module has no icon exports')
    return config.update(directory, options['dry-run'], state => {
      const previous = state.sets.find(item => item.id === name)
      if (previous && !imports && !options.variants && !options['display-name'] && !options['default-variant'] && !options.description) {
        throw new Error('Icon set already exists: ' + name)
      }
      const set = { id: name, definitions: {}, icons: {}, mappings: {}, ...previous, ...setVariants(options, previous),
        displayName: options['display-name'] ?? previous?.displayName ?? name, description: options.description ?? previous?.description }
      if (imports) {
        set.source = options.from
        const retained = Object.entries(set.icons).filter(([, entry]) => entry.module !== previous?.source || !previous?.source)
        set.icons = { ...Object.fromEntries(retained), ...Object.fromEntries(imports.map(exportName => {
          const id = iconId(exportName)
          const variants = previous?.icons[id]?.variants
          return [id, { ...reference(options.from, exportName, options.adapter), ...(variants && { variants }) }]
        })) }
        const remaining = Object.entries(set.mappings).filter(([, icon]) => Object.hasOwn(set.icons, icon))
        set.mappings = { ...Object.fromEntries(remaining) }
        for (const id of builtIns.keys()) if (!set.mappings[id] && actualKey(set.icons, id)) set.mappings[id] = actualKey(set.icons, id)
      }
      return { state: { ...state, active: state.active ?? name, sets: [...state.sets.filter(item => item.id !== name), set] }, result: set }
    })
  }
  if (action === 'use') return config.update(directory, options['dry-run'], async state => {
    const backups = [...new Set((options.backup ?? []).flatMap(words))].filter(key => key !== name)
    const variant = options.variant && iconId(options.variant)
    const available = { ...state, sets: [...state.sets, ...await packageIconSets(directory)] }
    const qualified = set => set.owner ? `${set.owner}/${set.id}` : set.id
    const active = qualified(setOf(available, name))
    const fallbacks = [...new Set(backups.map(key => qualified(setOf(available, key))))].filter(key => key !== active)
    const icons = mergedIcons(available, active, fallbacks, variant, builtIns)
    const data = { active, backups: fallbacks, variant, icons, module: iconModule(icons) }
    return { state: { ...state, active, backups: fallbacks, variant }, result: data }
  })
  if (action === 'new-definition' || action === 'add' || action === 'map') {
    if (action === 'map' && options.pairs) {
      if (name || target || options.remove) throw new Error('--pairs cannot be combined with a name or --remove')
      const pairs = words(options.pairs).map(pair => pair.split('='))
      if (!pairs.length || pairs.some(pair => pair.length !== 2 || !pair.every(Boolean))) throw new Error('Use definition=icon pairs')
      return config.update(directory, options['dry-run'], state => {
        const set = choose(state)
        const mappings = pairs.map(([meaning, icon]) => [meaningKey(set, builtIns, meaning), iconName(set, icon)])
        set.mappings = { ...set.mappings, ...Object.fromEntries(mappings) }
        return { state, result: set }
      })
    }
    const from = action === 'add' && options.from
    const exports = from ? await libraryIcons(directory, from, options.adapter) : undefined
    if (action === 'add' && options.all) {
      if (name || !exports || !options.variant) throw new Error('--all requires --from and --variant without an export name')
      return config.update(directory, options['dry-run'], state => {
        const set = choose(state)
        const variant = iconId(options.variant)
        if (!setVariants({}, set).variants.includes(variant)) throw new Error('Unknown variant: ' + variant)
        const copied = []
        for (const exportName of exports) {
          const id = actualKey(set.icons, exportName)
          if (!id) continue
          set.icons[id].variants = { ...set.icons[id].variants, [variant]: reference(from, exportName, options.adapter) }
          copied.push(id)
        }
        return { state, result: { set: set.id, variant, copied } }
      })
    }
    if (!identifier.test(name ?? '')) throw new Error('Specify a valid icon or definition name')
    const exportName = options.default ? 'default' : name
    if (exports && !exports.includes(exportName)) throw new Error('Icon component export was not found: ' + exportName)
    if (from && !options.definition && !options['new-definition'] && !options.variant) {
      const query = iconId(name)
      return { exportName, from, definitions: [...builtIns.keys()].filter(key => query.split('-').some(word => key.split('-').includes(word))) }
    }
    const definition = action === 'add' ? from ? reference(from, exportName, options.adapter) : iconData(options.source
      ? JSON.parse(await readFile(resolve(directory, options.source), 'utf8')) : options['path-data']) : undefined
    return config.update(directory, options['dry-run'], state => {
      const set = choose(state)
      const key = iconId(options.id ?? name)
      if (action === 'new-definition') {
        if (actualKey(set.definitions, name) || builtIns.has(key)) throw new Error('Definition already exists: ' + name)
        set.definitions[key] = iconDefinition(options)
        if (options.icon) set.mappings[key] = iconName(set, options.icon)
      } else if (action === 'add') {
        if (!identifier.test(key)) throw new Error('Specify a valid icon ID')
        const variant = options.variant && iconId(options.variant)
        if (variant) {
          if (!setVariants({}, set).variants.includes(variant)) throw new Error('Unknown variant: ' + variant)
          const existing = iconName(set, key)
          set.icons[existing].variants = { ...set.icons[existing].variants, [variant]: definition }
        } else {
          if (actualKey(set.icons, key)) throw new Error('Icon already exists: ' + name)
          set.icons[key] = definition
        }
        if (options.definition) set.mappings[meaningKey(set, builtIns, options.definition)] = iconName(set, key)
        if (options['new-definition']) {
          const id = iconId(options['new-definition'])
          if (!identifier.test(id) || actualKey(set.definitions, id) || builtIns.has(id)) throw new Error('Definition already exists or is invalid: ' + id)
          set.definitions[id] = iconDefinition(options)
          set.mappings[id] = iconName(set, key)
        }
      } else if (options.remove) delete set.mappings[meaningKey(set, builtIns, name)]
      else {
        set.mappings[meaningKey(set, builtIns, name)] = iconName(set, target)
      }
      return { state, result: set }
    })
  }
  const owned = await config.read(directory)
  const state = { ...owned, sets: [...owned.sets, ...await packageIconSets(directory)] }
  const term = [action, name, target, ...rest].filter(Boolean).join(' ')
  if (action === 'list' || options.list || !term && !options.definitions && !options['all-icons']) {
    if (term && term !== 'list') throw new Error('List icon sets without a query')
    return { active: state.active, sets: state.sets.map(({ id, icons, mappings, ...metadata }) =>
      ({ id, name: metadata.displayName, owner: metadata.owner, version: metadata.version, count: Object.keys(icons).length, mapped: Object.keys(mappings).length })) }
  }
  const limit = Number(options.limit ?? 10)
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Choose a positive icon search limit')
  if (options.definitions) {
    if (term || options['all-icons']) throw new Error('List icon definitions without a search query')
    const set = options.set || state.active ? choose(state) : undefined
    return { set: set?.id, definitions: [
      ...[...builtIns].map(([id, data]) => ({ id, builtIn: true, ...data, mapped: set?.mappings[id] })),
      ...Object.entries(set?.definitions ?? {}).map(([id, data]) => ({ id, builtIn: false, ...data, mapped: set.mappings[id] })),
    ] }
  }
  if (options['all-icons'] && (!options.set || term)) throw new Error('--all-icons needs --set and no query')
  const slash = term.lastIndexOf('/')
  const singleSet = slash >= 0 ? setOf(state, term.slice(0, slash)) : options.set ? choose(state) : undefined
  const query = iconId(slash >= 0 ? term.slice(slash + 1) : term).split(/[\s-]+/).filter(Boolean)
  if (!singleSet && !state.sets.length) return { icons: [...builtIns].flatMap(([id, data]) =>
    query.every(word => id.includes(word)) ? [{ id, ...data }] : []).slice(0, limit) }
  const sets = singleSet ? [singleSet] : [...state.sets].sort((a, b) => Number(b.id === state.active) - Number(a.id === state.active))
  const importLine = data => data.module && (data.exportName === 'default' ? 'import Icon from ' : 'import { ' + data.exportName + ' } from ')
    + JSON.stringify(data.module)
  const matches = sets.flatMap(set => Object.entries(set.icons).flatMap(([id, data]) => {
    const names = Object.keys(set.mappings).filter(name => set.mappings[name] === id)
    const words = names.flatMap(name => [name, set.definitions[name]?.description, ...set.definitions[name]?.words ?? []])
    const terms = [id, data.exportName, ...words].filter(Boolean).join(' ').toLowerCase()
    if (!(slash >= 0 ? id === query.join('-') : query.every(word => terms.includes(word)))) return []
    const preferred = data.variants?.[state.variant ?? set.defaultVariant] ?? data
    const variantImports = Object.fromEntries(Object.entries(data.variants ?? {}).flatMap(([variant, value]) =>
      value.module ? [[variant, importLine(value)]] : []))
    return [{ id, set: set.id, owner: set.owner, ...data, definitions: names, import: importLine(preferred), variantImports,
      score: id === query.join('-') ? 2 : query.every(word => id.includes(word)) ? 1 : 0 }]
  }))
  if (slash >= 0 && !matches.length) throw new Error('Unknown icon: ' + term)
  matches.sort((a, b) => b.score - a.score)
  return { ...(singleSet && { set: singleSet.id }), icons: (options['all-icons'] ? matches : matches.slice(0, limit)).map(({ score, ...icon }) => icon) }
}
