import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readdir, realpath, rename, rm } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { projectConfig } from './project-config.mjs'
import { emitFiles } from './scaffold.mjs'
import { coreTemplates, themePreviewFiles } from './template.mjs'
import { projectAt, readJSON } from './project-discovery.mjs'
import { validateThemeDestination } from './theme-descriptor.mjs'
import { readThemeOutput, writeThemeOutputs } from './theme-write.mjs'

export const previewCapabilities = ['preview add [page]', 'preview list', 'preview remove [page]', 'preview app <directory>']
const defaults = [
  { id: 'overview', label: '概览', kind: 'overview' },
  { id: 'components', label: '组件', kind: 'components' },
  { id: 'colors', label: '颜色', kind: 'colors' },
]
const config = projectConfig('syntrofic.theme-preview.json', () => ({ version: 1, pages: [] }),
  state => state?.version === 1 && Array.isArray(state.pages) && state.pages.every(page => typeof page.id === 'string' && typeof page.label === 'string'))

export async function refreshThemePreviewRoute(directory, theme, active, dryRun, stage) {
  const select = state => state.route && (state.theme ?? active) === theme
  if (!select(await config.read(directory))) return
  return config.update(directory, dryRun, async state => {
    if (!select(state)) return { result: undefined }
    const changes = await previewRouteChanges(directory, state.route, true)
    if (!dryRun && changes.length) {
      if (stage) stage(directory, changes)
      else await writeThemeOutputs(directory, changes)
    }
    return { result: { route: state.route, files: changes.map(item => item.file) } }
  })
}

export async function themePreviewApp(directory, name, options, theme) {
  if (!name || name !== name.trim() || name.includes('\\')) throw new Error('Specify a directory for the preview app')
  const target = resolve(directory, name)
  const location = relative(directory, target)
  if (!location || location === '..' || location.startsWith(`..${sep}`) || location.split(sep).some(part => ['.git', 'node_modules', 'dist', 'public'].includes(part))) {
    throw new Error('Choose a new directory inside the project')
  }
  try {
    if (!(await lstat(target)).isDirectory() || (await readdir(target)).length) throw new Error('Preview app directory must be empty: ' + target)
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  const project = await realpath(directory)
  for (let parent = dirname(target); ; parent = dirname(parent)) {
    try {
      const inside = relative(project, await realpath(parent))
      if (inside === '..' || inside.startsWith(`..${sep}`)) throw new Error('Choose a directory inside the project')
      break
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  const files = await themePreviewFiles(target, options.source ?? '^0.1.0', theme, { version: 1, pages: defaults })
  if (!options['dry-run']) {
    await mkdir(dirname(target), { recursive: true })
    const temp = await mkdtemp(join(dirname(target), '.syntrofic-preview-'))
    try {
      await emitFiles(temp, files)
      await rename(temp, target)
    } finally { await rm(temp, { recursive: true, force: true }) }
  }
  return { directory: target, theme: theme.id, files: Object.keys(files), path: '/', commands: ['pnpm install', 'pnpm dev'] }
}

export async function themePreviewCommand(directory, [action = 'list', ...terms], options) {
  const project = await projectAt(directory)
  const query = terms.filter(Boolean).join(' ').trim()
  if (action === 'list') return config.read(project.directory)
  if (action === 'remove') return config.update(project.directory, options['dry-run'], state => {
    const id = query || options.template
    if (id && !state.pages.some(page => page.id === id)) throw new Error('Unknown preview page: ' + id)
    const next = { ...state, pages: id ? state.pages.filter(page => page.id !== id) : [] }
    return { state: next, result: next }
  })
  if (action !== 'add') throw new Error('Unknown preview action: ' + action)
  if (options.template && query) throw new Error('Choose a template or describe the preview page')
  const top = Number(options.top ?? 1)
  if (!Number.isInteger(top) || top < 1 || top > 3) throw new Error('Choose between one and three preview pages')
  const templates = coreTemplates().filter(entry => entry.type === 'page' && !entry.native && !entry.id.startsWith('shell-'))
  const id = options.template ?? query
  const direct = options.template ? undefined : defaults.find(page => page.id === id)
  const exact = templates.find(entry => entry.id === id)
  if (options.template && !exact) throw new Error('Choose a Vue page template: ' + id)
  const narrowed = [...new Set(query.split(/\s+/))].slice(0, 40).join(' ')
  const { rankItems } = await import('./search.mjs')
  const ranked = !direct && !exact && narrowed ? rankItems(templates.map(entry => ({ ...entry, summary: entry.description,
    aliases: [entry.component], action: 'template info', target: entry.id })), narrowed).slice(0, top) : []
  if (query && !direct && !exact && !ranked.length) {
    throw new Error('No matching preview template. Choose a page with --template')
  }
  const matched = exact ? [exact] : ranked
  const pages = direct ? [direct] : matched.length ? matched.map(entry => ({ id: entry.id, label: options.name ?? entry.name, kind: 'template' })) : defaults
  const registry = await readJSON(join(project.directory, 'syntrofic.themes.json'))
  if (options.theme && !registry?.themes?.some(theme => theme.id === options.theme)) throw new Error('Add the theme to the current project first: ' + options.theme)
  return config.update(project.directory, options['dry-run'], async state => {
    const route = options.route ?? state.route ?? await nuxtRoute(project)
    const routeChanges = route ? await previewRouteChanges(project.directory, route, Boolean(registry)) : []
    if (routeChanges.length && !options['dry-run']) await writeThemeOutputs(project.directory, routeChanges)
    const existing = new Set(state.pages.map(page => page.id))
    const next = { ...state, ...(options.theme && { theme: options.theme }), ...(route && { route }),
      pages: [...state.pages, ...pages.filter(page => !existing.has(page.id))] }
    return { state: next, result: { ...next, ...(route && { files: routeChanges.map(item => item.file) }),
      ...(ranked.length && { matched: ranked.map(({ id, name, score, match }) => ({ id, name, score, match })) }) } }
  })
}

async function nuxtRoute(project) {
  if (!Object.hasOwn({ ...project.manifest.dependencies, ...project.manifest.devDependencies }, 'nuxt')) return
  for (const path of ['app/pages', 'pages']) {
    try { if ((await lstat(join(project.directory, path))).isDirectory()) return path + '/syntrofic-preview.vue' }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
}

async function previewRouteChanges(directory, route, hasRegistry) {
  const target = resolve(directory, route)
  const name = relative(directory, target)
  if (!name || isAbsolute(name) || name.split(sep).some(part => ['..', '.git', 'node_modules'].includes(part))
    || !/^[\w-]+\.vue$/.test(basename(target))) throw new Error('Choose a .vue preview route inside the project')
  const work = join(directory, '.syntrofic/preview-routes', name.slice(0, -4))
  const specifier = (from, to) => {
    const path = relative(from, to).split(sep).join('/')
    return path.startsWith('./') || path.startsWith('../') ? path : './' + path
  }
  const { createStandardBrandTheme } = await import('@syntrofic/ui')
  const files = await themePreviewFiles(directory, '^0.1.0', createStandardBrandTheme('neutral'), { version: 1, pages: defaults })
  const assets = Object.fromEntries(Object.entries(files).filter(([path]) => path.startsWith('src/') && !path.endsWith('.d.ts'))
    .map(([path, source]) => [join(work, path.slice(4)), source]))
  const app = join(work, 'App.vue')
  const fileSource = hasRegistry ? `import themeRegistry from ${JSON.stringify(specifier(work, join(directory, 'syntrofic.themes.json')))}
const builtThemes = import.meta.glob<BrandTheme>(${JSON.stringify(specifier(work, join(directory, 'src/themes')) + '/*/manifest.json')}, { eager: true, import: 'default' })
import.meta.glob(${JSON.stringify(specifier(work, join(directory, 'src/themes')) + '/*/theme.css')}, { eager: true })
const themes = Object.fromEntries([...(themeRegistry.themes as BrandTheme[]), ...Object.values(builtThemes)].map(theme => [theme.id, theme]))
const defaultTheme = themes[themeRegistry.active ?? '']` : 'const themes: Record<string, BrandTheme> = {}\nconst defaultTheme: BrandTheme | undefined = undefined'
  assets[app] = assets[app].replace("import { defaultTheme, themes } from 'virtual:syntrofic-theme'", fileSource)
    .replace("'./themes/*/palette.json'", JSON.stringify(specifier(work, join(directory, 'src/themes')) + '/*/palette.json'))
    .replace("'../syntrofic.theme-preview.json'", JSON.stringify(specifier(work, join(directory, 'syntrofic.theme-preview.json'))))
    .replace('<main class="preview-content"', '<section class="preview-content"').replace('</main>', '</section>')
    .replace(':global(body) { margin: 0; }\n', '').replace('min-height: 100dvh;', '')
  assets[target] = `<script setup lang="ts">
import Preview from ${JSON.stringify(specifier(dirname(target), app))}
</script>

<template><Preview /></template>
`
  const receipts = join(work, '.preview-build.json')
  await validateThemeDestination(directory, receipts)
  const receipt = await readThemeOutput(receipts)
  const owned = receipt ? JSON.parse(receipt) : {}
  const hashes = {}
  const digest = content => createHash('sha256').update(content).digest('hex')
  const changes = []
  for (const [path, expected] of Object.entries(assets)) {
    await validateThemeDestination(directory, path)
    const file = relative(directory, path)
    const previous = await readThemeOutput(path, Buffer.isBuffer(expected) ? null : 'utf8')
    const hash = digest(expected)
    const prior = previous === undefined ? undefined : digest(previous)
    if (prior !== undefined && prior !== hash && prior !== owned[file]) throw new Error('Preview route already has a file: ' + file)
    hashes[file] = hash
    if (prior !== hash) changes.push({ file, previous, expected })
  }
  const expected = JSON.stringify(hashes, null, 2) + '\n'
  if (receipt !== expected) changes.push({ file: relative(directory, receipts), previous: receipt, expected })
  return changes
}
