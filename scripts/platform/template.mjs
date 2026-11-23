import { lstat, readFile, realpath } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { checkoutBlocks, standardTemplates } from '../../site/template-catalog.mjs'
import { emitFiles, scaffold } from './scaffold.mjs'

export const templateCapabilities = ['list [query]', 'info <id>', 'add <id>', 'show <id>', 'skeleton <id>']
const corePackage = '@syntrofic/ui'
const examples = {
  'standard-template': 'StandardTemplateDemo.vue', 'identity-template': 'IdentityTemplateDemo.vue', 'operations-template': 'OperationsTemplateDemo.vue',
  'offering-template': 'OfferingTemplateDemo.vue', 'table-template': 'TableTemplateDemo.vue', 'reference-template': 'ReferenceTemplateDemo.vue',
  'workspace-template': 'WorkspaceTemplateDemo.vue', 'collection-template': 'CollectionTemplateDemo.vue',
  'communication-template': 'CommunicationTemplateDemo.vue', 'records-template': 'RecordsTemplateDemo.vue',
}
const templates = [{ id: 'dashboard', name: '交付仪表盘', component: 'SWorkspaceTemplate', description: '在工作区查看订单、交付数据和物流记录。' }, ...standardTemplates]
  .map(entry => ({ ...entry, type: 'page', package: corePackage }))
const core = [...templates, ...checkoutBlocks]
function find(query, entries = templates) {
  const term = query.trim().toLowerCase()
  const words = term.split(/\s+/).filter(Boolean)
  return entries.map(entry => {
    const text = [entry.id, entry.name, entry.component, entry.description, entry.replaces].filter(Boolean).join(' ').toLowerCase()
    const points = (entry.id.toLowerCase() === term || entry.replaces?.toLowerCase() === term ? 100 : 0)
      + words.filter(word => text.includes(word)).length
    return { entry, points }
  }).filter(result => !words.length || result.points).sort((a, b) => b.points - a.points).map(result => result.entry)
}

export function coreTemplates() { return core }

async function includeCoreExamples(files, examples) {
  const location = new URL('../../site/', import.meta.url)
  const seen = new Set()
  async function visit(file) {
    if (seen.has(file)) return
    seen.add(file)
    const body = await readFile(new URL(file, location), 'utf8')
    const imports = body.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*)['"]\.\/([A-Za-z][\w-]*\.vue)['"]/g)
    for (const [, nested] of imports) await visit(nested)
    if (body.includes('../preview/assets/delivery-area.png') && !files['src/assets/delivery-area.png']) {
      files['src/assets/delivery-area.png'] = await readFile(new URL('../../preview/assets/delivery-area.png', import.meta.url))
    }
    if (body.includes('@internationalized/date')) {
      const pkg = JSON.parse(files['package.json'])
      const library = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'))
      pkg.dependencies['@internationalized/date'] = library.dependencies['@internationalized/date']
      files['package.json'] = JSON.stringify(pkg, null, 2) + '\n'
    }
    files['src/components/' + file] = body.replaceAll("'../src/internal/shell-layout'", "'@syntrofic/ui'")
      .replaceAll("'../src'", "'@syntrofic/ui'").replaceAll('../preview/assets/', '../assets/')
      .replace(/(["'])(\/(?:docs|templates)\/)/g, '$1https://ui.syntrofic.com$2')
  }
  for (const example of examples) await visit(example)
}

async function filesFor(entry, target, source, theme, project = target) {
  const name = basename(target).replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'syntrofic-app'
  const files = scaffold('vue', name, source)
  if (entry.package !== corePackage) {
    const { contributionFiles } = await import('./contribution-source.mjs')
    const contribution = await contributionFiles(project, entry)
    for (const [file, content] of Object.entries(contribution.files)) files['src/' + file] = content
    const manifest = JSON.parse(files['package.json'])
    Object.assign(manifest.dependencies, contribution.dependencies)
    files['package.json'] = JSON.stringify(manifest, null, 2) + '\n'
    files['src/App.vue'] = `<script setup lang="ts">\nimport Template from './${contribution.filename}'\n</script>\n\n<template><Template /></template>\n`
    return files
  }
  const example = entry.type === 'block' ? entry.file : examples[entry.island]
  if (example) await includeCoreExamples(files, [example])
  if (entry.type === 'block') {
    files['src/App.vue'] = '<script setup lang="ts">\nimport { ref } from "vue"\nimport Block' + entry.imports
      + ' from "./components/' + entry.file + '"\nconst value = ref(' + entry.initial + ')\n</script>\n\n'
      + '<template><Block v-model="value"' + entry.attributes + ' /></template>\n'
    return files
  }
  const tag = example ? 'TemplateDemo' : 'SWorkspaceTemplate'
  const module = example ? `import TemplateDemo from './components/${example}'` : `import { SWorkspaceTemplate } from '@syntrofic/ui'`
  if (theme) files['src/theme.json'] = JSON.stringify(theme, null, 2) + '\n'
  const themeModule = theme ? "\nimport theme from './theme.json'\nimport type { BrandTheme } from '@syntrofic/ui'" : ''
  files['src/App.vue'] = `<script setup lang="ts">\n${module}${themeModule}\n</script>\n\n<template>\n  <main data-sy-theme="light" style="max-width:72rem;margin-inline:auto;padding:1rem;background:var(--sy-canvas);color:var(--sy-text)">\n    <${tag} kind="${entry.id}"${theme ? ' :theme="theme as BrandTheme"' : ''} />\n  </main>\n</template>\n`
  return files
}

export async function themePreviewFiles(directory, source, theme, config) {
  const files = await filesFor(templates.find(entry => entry.id === 'theme-showcase'), directory, source, theme)
  const entries = templates.filter(entry => !entry.native && !entry.id.startsWith('shell-'))
  await includeCoreExamples(files, [...new Set(entries.flatMap(entry => examples[entry.island] ?? []))])
  files['src/App.vue'] = await readFile(new URL('./theme-preview/App.vue', import.meta.url), 'utf8')
  files['src/vite-env.d.ts'] = '/// <reference types="vite/client" />\n/// <reference types="@syntrofic/ui/vite/client" />\n'
  const pkg = JSON.parse(files['package.json'])
  const library = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'))
  pkg.scripts.typecheck = 'vue-tsc --noEmit'
  pkg.devDependencies['vue-tsc'] = library.devDependencies['vue-tsc']
  files['package.json'] = JSON.stringify(pkg, null, 2) + '\n'
  files['tsconfig.json'] = JSON.stringify({ compilerOptions: { strict: true, skipLibCheck: true, noEmit: true, target: 'ESNext',
    module: 'ESNext', moduleResolution: 'Bundler', resolveJsonModule: true, lib: ['ESNext', 'DOM', 'DOM.Iterable'] },
  include: ['src/**/*.ts', 'src/**/*.vue', 'vite.config.ts'] }, null, 2) + '\n'
  files['src/preview-templates.json'] = JSON.stringify(entries.map(({ id, name, island }) => ({ id, name, example: examples[island] })), null, 2) + '\n'
  const { components } = JSON.parse(await readFile(new URL('../../catalog/parity.json', import.meta.url), 'utf8'))
  const implementation = JSON.parse(await readFile(new URL('../../catalog/implementation.json', import.meta.url), 'utf8'))
  files['src/preview-components.json'] = JSON.stringify(components.filter(entry => entry.track.startsWith('web') && implementation[entry.id]?.component)
    .map(({ id, name, category }) => ({ name, category, symbol: implementation[id].component })), null, 2) + '\n'
  files['syntrofic.theme-preview.json'] = JSON.stringify(config, null, 2) + '\n'
  files['vite.config.ts'] = files['vite.config.ts'].replace("import { defineConfig }", "import { syntroficThemePlugin } from '@syntrofic/ui/vite'\nimport { defineConfig }")
    .replace('plugins: [vue()]', 'plugins: [vue(), syntroficThemePlugin()]')
  return files
}

export async function availableTemplates(directory, options) {
  if (options.package === corePackage) return core
  let integrations = []
  try {
    const { discover } = await import('./discover.mjs')
    const { packages } = await discover(directory, '', { type: 'template', installed: true })
    integrations = packages.filter(item => item.name !== corePackage && item.version).flatMap(item => item.entries
      .filter(entry => entry.file?.endsWith('.vue'))
      .map(entry => ({
        id: entry.id, name: entry.name, description: entry.summary, file: entry.file, type: entry.templateType,
        package: item.name, ...(entry.replaces && { replaces: entry.replaces }),
      })))
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (options.package) {
    const selected = integrations.filter(entry => entry.package === options.package)
    if (!selected.length) throw new Error('No templates for package ' + options.package)
    return selected
  }
  const replaced = new Set(integrations.map(entry => entry.type + ':' + entry.replaces))
  return [...core.filter(entry => !replaced.has(entry.type + ':' + entry.id)), ...integrations]
}

const spatialProps = new Set(['align', 'as', 'columns', 'density', 'gap', 'justify', 'layout', 'padding', 'side', 'size', 'width', 'max-width', 'style'])
async function templateSkeleton(source, filename, id) {
  const { parse } = await import('vue/compiler-sfc')
  const { descriptor, errors } = parse(source, { filename, sourceMap: false })
  if (errors.length) throw new Error('Could not read the template layout: ' + filename)
  if (!descriptor.template?.ast) return ''
  function lines(nodes, depth = 0) {
    return nodes.flatMap(node => {
      if (node.type !== 1) return []
      const condition = node.props.find(prop => prop.type === 7 && ['if', 'else-if'].includes(prop.name))?.exp?.content
      const branch = /^\s*(?:props\.)?kind\s*===\s*(['"])([\w-]+)\1\s*$/.exec(condition ?? '')?.[2]
      if (branch && branch !== id) return []
      const attributes = node.props.flatMap(prop => {
        if (prop.type === 6 && spatialProps.has(prop.name) && prop.value) return [prop.name + '=' + JSON.stringify(prop.value.content)]
        if (prop.type === 7 && prop.name === 'bind' && prop.arg?.isStatic && spatialProps.has(prop.arg.content)) {
          return [':' + prop.arg.content + '=' + JSON.stringify(prop.exp?.content ?? '')]
        }
        if (prop.type === 7 && (prop.name === 'slot' || prop.name === 'for')) return [prop.name === 'slot' ? '#' + (prop.arg?.content ?? 'default') : 'v-for']
        return []
      })
      return ['  '.repeat(depth) + [node.tag, ...attributes].join(' '), ...lines(node.children, depth + 1)]
    })
  }
  return lines(descriptor.template.ast.children).join('\n')
}

async function builtInSkeleton(content, filename, entry) {
  const layout = await templateSkeleton(content, filename, entry.id)
  const exported = await readFile(new URL('../../src/index.ts', import.meta.url), 'utf8')
  const sources = [...exported.matchAll(/export\s*{\s*default as (\w+)\s*}\s*from\s*'\.(\/[^']+\.vue)'/g)]
  const component = sources.find(match => match[1] === entry.component)?.[2]
  if (!component || layout.split('\n').length > 1) return layout
  const source = await readFile(new URL('../../src' + component, import.meta.url), 'utf8')
  const outline = await templateSkeleton(source, component, entry.id)
  return outline ? layout + '\n' + outline.split('\n').map(line => '  ' + line).join('\n') : layout
}

function inside(directory, path) {
  const relativePath = relative(directory, path)
  return relativePath !== '..' && !relativePath.startsWith('..' + sep) && !isAbsolute(relativePath)
}

async function outputRoot(directory, input) {
  const requested = input.startsWith('~/') ? resolve(homedir(), input.slice(2)) : input
  const target = resolve(directory, requested)
  const temporary = process.platform === 'win32' ? [tmpdir()] : [tmpdir(), '/tmp']
  const scratch = isAbsolute(requested) && temporary.find(folder => inside(folder, target))
  const root = inside(directory, target) ? await realpath(directory) : scratch ? await realpath(scratch) : undefined
  if (!root) throw new Error('Choose a template path inside the project or an absolute temporary path')
  for (let current = target; ; current = dirname(current)) {
    try {
      if (!inside(root, await realpath(current))) throw new Error('The template path resolves outside the destination')
      return { target, root }
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (dirname(current) === current) throw new Error('The template destination has no existing ancestor')
  }
}

async function emitPage(entry, directory, path, source, options) {
  const { target, root } = await outputRoot(directory, path)
  if (extname(target) && extname(target) !== '.vue') throw new Error('Specify a .vue file or a directory for the template')
  const folder = extname(target) ? dirname(target) : target
  const name = extname(target) ? basename(target) : entry.type === 'block' ? basename(entry.file) : 'page.vue'
  const files = await filesFor(entry, folder, source, undefined, directory)
  const selected = Object.fromEntries(Object.entries(files).filter(([file]) => /^src\/(components|assets|integrations)\//.test(file))
    .map(([file, body]) => [file.slice(4), body]))
  const sourcePath = entry.package === corePackage && entry.type === 'block' ? 'components/' + entry.file : undefined
  const page = sourcePath ? selected[sourcePath] : files['src/App.vue']
  if (sourcePath) delete selected[sourcePath]
  selected[name] = page
  for (const file of Object.keys(selected)) {
    const output = resolve(folder, file)
    if (!inside(root, await realParent(output))) throw new Error('The template output resolves outside the destination')
    try {
      if ((await lstat(output)).isSymbolicLink()) throw new Error('The template target is a symbolic link: ' + file)
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  if (!options['dry-run']) await emitFiles(folder, selected, options.overwrite)
  return { template: entry.id, directory: folder, page: name, files: Object.keys(selected), dependencies: JSON.parse(files['package.json']).dependencies }
}

async function realParent(path) {
  for (let current = dirname(path); ; current = dirname(current)) {
    try { return await realpath(current) }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
}

async function emitCdnStarter(directory, input, options) {
  const { target } = await outputRoot(directory, input)
  try {
    const existing = await lstat(target)
    if (!existing.isFile()) throw new Error('The starter target must be a regular file')
    if (!options.overwrite) return { template: 'cdn', file: target, written: false }
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (!options['dry-run']) {
    const { cdnStarter } = await import('./cdn-starter.mjs')
    await emitFiles(dirname(target), { [basename(target)]: await cdnStarter() }, options.overwrite)
  }
  return { template: 'cdn', file: target, written: !options['dry-run'] }
}

export async function templateCommand(directory, [first, ...input], options, source, rank = false) {
  if (options.cdn && !rank) {
    if (input.length || options.list || options.skeleton || options.type || options.package) {
      throw new Error('--cdn accepts one destination and cannot be combined with --list, --skeleton, --type or --package')
    }
    return emitCdnStarter(directory, first ?? 'cdn.template.html', options)
  }
  const known = ['list', 'info', 'add', 'show', 'skeleton']
  const direct = first && !known.includes(first)
  const action = direct ? options.skeleton ? 'skeleton' : input.length ? 'page' : 'show' : first ?? 'list'
  const query = direct ? first : input.join(' ')
  if (options.type && !['page', 'block'].includes(options.type)) throw new Error('Template type must be page or block')
  if (options.list && (options.skeleton || options.overwrite || first && first !== 'list')) {
    throw new Error('--list cannot be combined with a template, --skeleton or --overwrite')
  }
  if (options.skeleton && action !== 'skeleton' || action === 'skeleton' && (options.overwrite || direct && input.length)) {
    throw new Error('A skeleton needs a template name and writes no files')
  }
  const entries = (await availableTemplates(directory, options)).filter(entry => (!rank || entry.type === 'page') && (!options.type || entry.type === options.type))
  if (action === 'list') return find(query, entries)
  if (direct && input.length > 1) throw new Error('Specify one template destination')
  if (options.overwrite && ['info', 'show'].includes(action)) throw new Error('--overwrite needs a template destination')
  const matches = entries.filter(entry => entry.id === query || entry.replaces === query)
  if (!rank && matches.length > 1) throw new Error('Ambiguous template: ' + query + '. Specify --package or --type.')
  const selected = rank ? find(query, entries)[0] : matches[0]
  if (!selected) throw new Error('Unknown template: ' + query)
  if (action === 'info') return selected
  if (action === 'page') return emitPage(selected, directory, input[0], source, options)
  if (action === 'show' || action === 'skeleton') {
    if (selected.package !== corePackage) {
      const { contributionFiles } = await import('./contribution-source.mjs')
      const { filename, files } = await contributionFiles(directory, selected)
      const content = files[filename]
      return action === 'skeleton' ? { template: selected.id, file: selected.file, skeleton: await templateSkeleton(content, filename, selected.id) }
        : { template: selected.id, file: selected.file, source: content }
    }
    const files = await filesFor(selected, directory, source)
    const example = selected.type === 'block' ? selected.file : examples[selected.island]
    const filename = example ? 'src/components/' + example : 'src/App.vue'
    const content = files[filename]
    if (action === 'skeleton') return { template: selected.id, file: filename, skeleton: await builtInSkeleton(content, filename, selected) }
    return { template: selected.id, file: filename, source: content }
  }
  const target = options.out ? directory : resolve(directory, selected.id)
  const files = await filesFor(selected, target, source, undefined, directory)
  if (!options['dry-run']) await emitFiles(target, files, options.overwrite)
  return { template: selected.id, directory: target, files: Object.keys(files), dependencies: JSON.parse(files['package.json']).dependencies }
}
