import { spawnSync } from 'node:child_process'
import { lstat, mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { component, matchRecords } from './catalog.mjs'
import { installedAt, projectAt, readJSON } from './project-discovery.mjs'
import { coreTemplates } from './template.mjs'
import { readThemeOutput, writeThemeOutputs } from './theme-write.mjs'

const manifestName = 'syntrofic.integration.json'
export const integrationCapabilities = ['add <kind> <name>', 'check', 'verify', 'pack']
export const integrationDiagnostics = ['validate', 'components', 'templates', 'docs']

const kinds = {
  component: ['vue', name => `<script setup lang="ts">\ndefineProps<{ label?: string }>()\n</script>\n\n<template>\n  <section :aria-label="label"><slot>${name}</slot></section>\n</template>\n`],
  template: ['vue', name => `<template>\n  <main class="sy-workspace" data-sy-theme="light">\n    <h1>${name}</h1>\n  </main>\n</template>\n`],
  doc: ['md', name => `# ${name}\n\nDocument the purpose and setup for this contribution.\n`],
  'agent-doc': ['md', name => `# Agent guidance\n\n${name}\n`],
  codemod: ['mjs', () => 'export default function transform(source) {\n  return source\n}\n'],
  theme: ['json', name => JSON.stringify({ version: 1, id: kebab(name), name, modes: { light: { canvas: '#ffffff' }, dark: {} } }, null, 2) + '\n'],
}
const kebab = name => name.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase()
const identifier = /^[A-Za-z][A-Za-z0-9-]{0,69}$/
const idPattern = /^[A-Za-z][A-Za-z0-9_-]{0,69}$/
const docsRoute = /^[\w-]+(?:\/[\w-]+)*$/
export const migrationVersion = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?$/i
const pathName = /^(?:[a-z0-9][a-z0-9_.-]*\/)*[a-z0-9][a-z0-9_.-]*\.(?:vue|md|mjs|json)$/i

async function jsonAt(path) { return JSON.parse(await readFile(path, 'utf8')) }
async function descriptor(directory, required = true) {
  try { return await jsonAt(join(directory, manifestName)) }
  catch (error) {
    if (error.code !== 'ENOENT' || required) throw error
    return { version: 1, contributions: [] }
  }
}
function validateShape(manifest) {
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.contributions)) throw new Error('Invalid integration manifest')
}

async function add(directory, kind, name, options) {
  if (!Object.hasOwn(kinds, kind ?? '') || typeof name !== 'string' || !name.trim()) throw new Error('Specify a contribution kind and name')
  const project = await projectAt(directory)
  directory = project.directory
  const pkgText = await readThemeOutput(join(directory, 'package.json'))
  const pkg = pkgText ? JSON.parse(pkgText) : {}
  if (!pkg.name) throw new Error('The integration package needs a name')
  const [extension, template] = kinds[kind]
  const id = kind === 'agent-doc' ? options.name ?? (identifier.test(name) ? name : 'guidance-' + slugLine(name)) : name
  if (!(kind === 'doc' ? idPattern : identifier).test(id)) throw new Error('Invalid contribution identifier: ' + id)
  if (kind === 'agent-doc' && (name.length > 1000 || /[\r\n]/.test(name))) throw new Error('Supply one line of agent guidance')
  if (options.type && (kind !== 'template' || !['page', 'block'].includes(options.type))) throw new Error('Only templates can specify --type page or block')
  if (options.replaces && (!['template', 'component', 'doc'].includes(kind) || !(kind === 'doc' ? docsRoute : identifier).test(options.replaces))) {
    throw new Error('--replaces needs a valid template, component or document identifier')
  }
  const relations = [options.replaces, options.extends, options.parent].filter(Boolean)
  if (kind === 'doc' && relations.length > 1 || (options.extends || options.parent) && (kind !== 'doc' || !relations.every(value => docsRoute.test(value)))) {
    throw new Error('Choose one document relationship with --replaces, --extends or --parent')
  }
  if (options.from && kind !== 'theme') throw new Error('--from needs a theme contribution')
  if (kind === 'codemod' ? !migrationVersion.test(options.to ?? '') : options.to !== undefined) throw new Error('Codemods need an exact --to version')
  const contribution = { kind, id, file: `syntrofic/${kind}/${kebab(id)}.${extension}`,
    ...(kind === 'component' && { props: [{ name: 'label', type: 'string', required: false, description: 'Accessible name for the component.' }] }),
    ...(options.type && { templateType: options.type }), ...(options.replaces && { replaces: options.replaces }),
    ...(options.extends && { extends: options.extends }), ...(options.parent && { parent: options.parent }),
    ...(options.to && { to: options.to }) }
  const previous = await readThemeOutput(join(directory, manifestName))
  const manifest = previous ? JSON.parse(previous) : { version: 1, contributions: [] }
  validateShape(manifest)
  if (manifest.contributions.some(item => item.file === contribution.file || item.kind === kind && item.id.toLowerCase() === id.toLowerCase())) {
    throw new Error('Contribution already exists: ' + id)
  }
  const output = join(directory, contribution.file)
  for (const folder of [join(directory, 'syntrofic'), dirname(output)]) {
    try {
      if (!(await lstat(folder)).isDirectory()) throw new Error('Expected a local directory: ' + folder)
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  if (await readThemeOutput(output) !== undefined) throw new Error('Contribution file already exists: ' + contribution.file)
  let authored = template(name)
  if (kind === 'theme') {
    const ui = await import('@syntrofic/ui')
    const { validatedTheme } = await import('./theme.mjs')
    const from = options.from
    const presets = ['morandi', 'mist', 'slate', 'clay', ...ui.standardBrandPresets]
    const registry = from && !presets.includes(from) ? await readJSON(join(directory, 'syntrofic.themes.json')) : undefined
    const base = registry?.themes?.find(theme => theme.id === from)
    if (from && !presets.includes(from) && !base) throw new Error('Unknown theme: ' + from)
    const theme = base ? validatedTheme(base, ui) : ui.createBrandTheme(kebab(name), name, from)
    authored = JSON.stringify({ ...theme, id: kebab(name), name, revision: 0 }, null, 2) + '\n'
  }
  let exportPath
  let packageChanged = false
  if (['component', 'template'].includes(kind) && pkg.exports && typeof pkg.exports === 'object' && !Array.isArray(pkg.exports)) {
    if (Object.keys(pkg.exports).every(key => key.startsWith('.'))) {
      exportPath = './' + kebab(id)
      if (Object.hasOwn(pkg.exports, exportPath)) throw new Error('Package export already exists: ' + exportPath)
      pkg.exports[exportPath] = './' + contribution.file
      packageChanged = true
    }
  }
  const outputManifest = { ...manifest, package: pkg.name, contributions: [...manifest.contributions, contribution] }
  const updates = [{ file: manifestName, previous, expected: JSON.stringify(outputManifest, null, 2) + '\n' },
    { file: contribution.file, previous: undefined, expected: authored }]
  if (packageChanged) updates.push({ file: 'package.json', previous: pkgText, expected: JSON.stringify(pkg, null, 2) + '\n' })
  if (!options['dry-run']) await writeThemeOutputs(directory, updates)
  return { contribution, files: updates.map(update => update.file), ...(exportPath && { import: pkg.name + exportPath.slice(1) }) }
}

const slugLine = line => line.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'custom'

function compareLinks(text, id, documents, warnings) {
  for (const match of text.matchAll(/\{@link\s+([\w./-]+)(?:\s+[^}]*)?\}/g)) {
    if (!documents.has(match[1].toLowerCase())) warnings.push('Unknown document link in ' + id + ': ' + match[1])
  }
}

async function compareDocProse(local, documents, warnings) {
  if (!local.length) return
  const { default: MarkdownIt } = await import('markdown-it')
  const markdown = new MarkdownIt()
  function passages(source) {
    const phrases = new Set()
    for (const token of markdown.parse(source, {})) {
      if (token.type !== 'inline') continue
      const text = token.children.filter(child => child.type === 'text').map(child => child.content).join(' ')
      const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
      for (let index = 0; index + 10 <= words.length; index++) phrases.add(words.slice(index, index + 10).join(' '))
    }
    return phrases
  }
  const known = [...documents].filter(([route, source]) => source && !/^(?:integrations|skills)\//.test(route))
    .map(([id, source]) => ({ id, passages: passages(source) }))
  for (const { id, source, replaces } of local) {
    const text = passages(source)
    const phrases = [...text]
    for (const { id: other, passages: comparison } of known) {
      if (other !== replaces && phrases.some(phrase => comparison.has(phrase))) warnings.push('Repeated prose in ' + id + ' and ' + other)
    }
    known.push({ id: id.toLowerCase(), passages: text })
    for (const directive of source.matchAll(/\{@command\s+docs\s+([\w./-]+)[^}]*}/g)) {
      warnings.push('Use a documentation link in ' + id + ': ' + directive[1])
    }
  }
}

function comparableType(value) {
  if (!value) return
  const parts = value.toLowerCase().split('|').map(item => item.trim()).sort()
  if (parts.every(item => ['string', 'number', 'boolean', 'bigint', 'symbol', 'function', 'array', 'object', 'date', 'map', 'set'].includes(item))) {
    return parts.join(' | ')
  }
}

async function compareProps(item, file, documents, warnings, skipped) {
  if (item.props === undefined) return
  const { inspectComponentSource } = await import('./component.mjs')
  const result = await inspectComponentSource(file)
  if (result.propsUnavailable) { skipped.push({ id: item.id, reason: result.propsUnavailable }); return }
  const actual = new Map(result.props.map(prop => [kebab(prop.name), prop]))
  for (const documented of item.props) {
    const id = item.id + '.' + documented.name
    if (documented.description) compareLinks(documented.description, id, documents, warnings)
    const prop = actual.get(kebab(documented.name))
    if (!prop) { warnings.push('Documented prop is absent: ' + id); continue }
    actual.delete(kebab(documented.name))
    if (documented.required !== undefined && Boolean(prop.required) !== documented.required) warnings.push('Prop required flag differs: ' + id)
    if (!documented.type) continue
    const actualType = comparableType(prop.type)
    const describedType = comparableType(documented.type)
    if (!actualType || !describedType) skipped.push({ id, reason: 'The Vue runtime prop and documented type could not be compared exactly.' })
    else if (actualType !== describedType) warnings.push('Prop type differs: ' + id + ' is ' + actualType)
  }
  for (const prop of actual.values()) warnings.push('Undocumented prop: ' + item.id + '.' + prop.name)
}

async function examine(directory, mode = 'validate') {
  if (!integrationDiagnostics.includes(mode)) throw new Error('Unknown integration diagnostic: ' + mode)
  const pkg = await jsonAt(join(directory, 'package.json'))
  const manifest = await descriptor(directory)
  validateShape(manifest)
  const realDirectory = await realpath(directory)
  const errors = []
  const warnings = []
  const skipped = []
  const information = []
  if (!pkg.name || pkg.name !== manifest.package) errors.push('The package name and manifest package must match.')
  const builtin = new Set(matchRecords().flatMap(entry => [entry.id, entry.name, entry.implementation?.component]).filter(Boolean).map(name => name.toLowerCase()))
  const templates = new Map(coreTemplates().map(entry => [entry.id.toLowerCase(), entry]))
  const replacements = new Set()
  const documents = new Map()
  const authoredDocuments = []
  if (['docs', 'components', 'validate'].includes(mode)) {
    const { searchableDocuments } = await import('./docs.mjs')
    for (const entry of await searchableDocuments(directory)) documents.set(entry.route.toLowerCase(), entry.markdown)
  }
  for (const item of manifest.contributions) {
    if (typeof item?.id === 'string' && ['doc', 'agent-doc'].includes(item.kind)) {
      const key = item.id.toLowerCase()
      if (!documents.has(key)) documents.set(key, null)
    }
  }
  const keys = new Set()
  const files = new Set()
  const checked = []
  const filters = { components: ['component'], templates: ['template'], docs: ['doc', 'agent-doc'], validate: Object.keys(kinds) }
  for (const item of manifest.contributions) {
    if (!item || !Object.hasOwn(kinds, item.kind) || typeof item.id !== 'string' || !(item.kind === 'doc' ? idPattern : identifier).test(item.id)
      || typeof item.file !== 'string' || !pathName.test(item.file)) {
      errors.push('A contribution has an invalid kind, identifier or file path.')
      continue
    }
    if (item.templateType !== undefined && (item.kind !== 'template' || !['page', 'block'].includes(item.templateType))) errors.push('Invalid template type: ' + item.id)
    if (item.replaces !== undefined && (!['template', 'component', 'doc'].includes(item.kind) || typeof item.replaces !== 'string' ||
      !(item.kind === 'doc' ? /^[\w/-]+$/ : identifier).test(item.replaces))) {
      errors.push('Invalid replacement: ' + item.id)
    }
    if (item.extends !== undefined && (item.kind !== 'doc' || typeof item.extends !== 'string' || !/^[\w/-]+$/.test(item.extends))) {
      errors.push('Invalid document extension: ' + item.id)
    }
    if (item.parent !== undefined && (item.kind !== 'doc' || !docsRoute.test(item.parent) || item.replaces || item.extends)) {
      errors.push('Invalid document namespace: ' + item.id)
    }
    if (item.kind === 'codemod' ? !migrationVersion.test(item.to ?? '') : item.to !== undefined) {
      errors.push('Missing or invalid codemod version: ' + item.id)
    }
    const propNames = new Set()
    const validProps = item.props === undefined || item.kind === 'component' && Array.isArray(item.props) && item.props.every(prop => {
      if (!prop || typeof prop.name !== 'string' || !/^[a-z][\w-]*$/i.test(prop.name) || propNames.has(kebab(prop.name))
        || prop.type !== undefined && typeof prop.type !== 'string' || prop.required !== undefined && typeof prop.required !== 'boolean'
        || prop.description !== undefined && typeof prop.description !== 'string') return false
      propNames.add(kebab(prop.name))
      return true
    })
    if (!validProps) errors.push('Invalid documented props: ' + item.id)
    const key = item.kind + ':' + item.id.toLowerCase()
    if (keys.has(key) || files.has(item.file)) errors.push('Duplicate contribution: ' + item.id)
    keys.add(key)
    files.add(item.file)
    if (!filters[mode].includes(item.kind)) continue
    checked.push(item.id)
    let file
    let source
    try {
      const path = await realpath(resolve(realDirectory, item.file))
      const subpath = relative(realDirectory, path)
      if (!subpath || isAbsolute(subpath) || subpath === '..' || subpath.startsWith('../') || subpath.startsWith('..\\') || !(await stat(path)).isFile()) {
        throw new Error('The contribution must be a file inside the integration package')
      }
      source = await readFile(path, 'utf8')
      file = { folder: realDirectory, file: path, source }
      if (!item.file.endsWith('.' + kinds[item.kind][0])) errors.push('Unexpected file type for ' + item.id)
      if (!source.trim()) errors.push('Empty contribution: ' + item.file)
      if (item.kind === 'theme' && JSON.parse(source).version !== 1) errors.push('Unsupported theme manifest: ' + item.file)
      if ((item.kind === 'doc' || item.kind === 'agent-doc') && !/^#\s+\S/m.test(source)) warnings.push('Missing page title: ' + item.file)
    } catch (error) { errors.push(item.file + ': ' + error.message) }
    const name = item.id.toLowerCase()
    const type = item.templateType ?? 'page'
    const replaces = typeof item.replaces === 'string' ? item.replaces.toLowerCase() : ''
    const extension = typeof item.extends === 'string' ? item.extends.toLowerCase() : ''
    if (item.kind === 'template' || item.kind === 'component') {
      const target = item.kind === 'template' ? templates.get(replaces)?.type === type && templates.get(replaces) : component(replaces)
      const sameName = item.kind === 'template' ? templates.get(name)?.type === type : builtin.has(name)
      if (replaces && !target) errors.push('Unknown ' + item.kind + ' replacement: ' + item.replaces)
      if (replaces && target) {
        const replacementKey = item.kind + ':' + target.id
        if (replacements.has(replacementKey)) errors.push('Multiple contributions replace ' + target.id)
        if (item.kind === 'component' && sameName && component(item.id)?.id !== target.id) errors.push('A replacement uses a different built-in name: ' + item.id)
        replacements.add(replacementKey)
        const command = 'syntrofic ' + item.kind + ' ' + (target.implementation?.component ?? target.id) + ' --package @syntrofic/ui'
        information.push({ id: item.id, replaces: target.id, command })
      } else if (sameName) {
        warnings.push('Overlaps the built-in catalog: ' + item.id + '. Use --package ' + pkg.name + ' to select this contribution.')
      }
    }
    if (mode === 'components' && item.kind === 'component' && file && validProps) {
      if (typeof item.description === 'string') compareLinks(item.description, item.id, documents, warnings)
      await compareProps(item, file, documents, warnings, skipped)
    }
    if ((item.kind === 'doc' || item.kind === 'agent-doc') && source) {
      const relation = replaces || extension
      if (relation && !documents.get(relation)) errors.push('Unknown built-in document: ' + relation)
      else if (relation) information.push({ id: item.id, ...(replaces ? { replaces } : { extends: extension }) })
      else if (documents.get(name)) errors.push('Document overlaps a built-in topic: ' + item.id)
      compareLinks(source, item.id, documents, warnings)
      if (mode === 'docs') authoredDocuments.push({ id: item.id, source, replaces })
    }
  }
  await compareDocProse(authoredDocuments, documents, warnings)
  if (!checked.length && mode === 'validate') warnings.push('No contributions defined.')
  return { package: pkg.name, mode, checked, files: [manifestName, ...files], errors, warnings, skipped, information, valid: errors.length === 0 }
}

export async function integrationCommand(directory, [action = 'help', kind, name, ...words], options) {
  if (action === 'help') return { actions: integrationCapabilities, diagnostics: integrationDiagnostics, manifest: manifestName }
  if (action === 'add') return add(directory, kind, kind === 'agent-doc' ? [name, ...words].filter(Boolean).join(' ') : name, options)
  if (action === 'diagnostic') {
    if (!kind) return { actions: integrationDiagnostics, manifest: manifestName }
    const project = await projectAt(directory)
    if (!name || project.manifest.name === name) return examine(project.directory, kind)
    const installed = await installedAt(project.directory, name)
    if (!installed) throw new Error('Integration package is not installed: ' + name)
    return examine(installed.path, kind)
  }
  if (action === 'check' || action === 'verify' || action === 'pack') {
    if (action === 'pack' && !options.check) throw new Error('Use integration pack --check or integration verify')
    const project = await projectAt(directory)
    const result = await examine(project.directory)
    if (action === 'check') {
      const checks = [result, ...await Promise.all(integrationDiagnostics.filter(mode => mode !== 'validate').map(mode => examine(project.directory, mode)))]
      return { ...result, checks, errors: [...new Set(checks.flatMap(check => check.errors))],
        warnings: [...new Set(checks.flatMap(check => check.warnings))], skipped: checks.flatMap(check => check.skipped),
        valid: checks.every(check => check.valid && (!options.strict || !check.warnings.length && !check.skipped.length)) }
    }
    if (action !== 'check' && result.valid) {
      const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
      const scratch = await mkdtemp(join(tmpdir(), 'syntrofic-integration-pack-'))
      try {
        const processOptions = { cwd: project.directory, encoding: 'utf8', maxBuffer: 2 ** 24 }
        const flags = ['--pack-destination', scratch, '--json']
        let run = spawnSync(npm, ['pack', '--ignore-scripts', ...flags], processOptions)
        if (run.error?.code === 'ENOENT') {
          const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
          run = spawnSync(pnpm, ['--config.ignore-scripts=true', 'pack', ...flags], processOptions)
        }
        if (run.error || run.status) throw run.error ?? new Error(run.stderr || 'npm pack failed')
        const receipt = JSON.parse(run.stdout)
        const pack = Array.isArray(receipt) ? receipt[0] : receipt
        if (!pack?.filename || !(await stat(resolve(scratch, pack.filename))).isFile()) throw new Error('The package archive was not created')
        const included = new Set(pack.files.map(file => file.path))
        for (const file of result.files) if (!included.has(file)) result.errors.push('Missing from package output: ' + file)
        result.packageFiles = pack.files.length
      } finally {
        await rm(scratch, { recursive: true, force: true })
      }
    }
    if (action === 'pack') result.notice = 'Use syntrofic integration verify.'
    result.valid = !result.errors.length && (!options.strict || !result.warnings.length)
    return result
  }
  throw new Error('Unknown integration action: ' + action)
}
