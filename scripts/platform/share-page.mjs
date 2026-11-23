import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { emitFiles } from './scaffold.mjs'
import { installedAt } from './project-discovery.mjs'
import { readThemeOutput, writeThemeOutputs } from './theme-write.mjs'
import { readResponseBytes } from './remote-file.mjs'

const marker = 'data-syntrofic-page'
const restoredMarker = '<!-- Syntrofic restored entry -->'
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'])
const imageLimit = 8 * 1024 * 1024
const extensions = new Set(['.html', '.vue', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.woff2', '.woff', '.ttf', '.txt', '.md'])
const hash = content => createHash('sha256').update(content).digest('hex')
const escapeHtml = text => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const portable = file => file.split(sep).join('/')
const outputs = result => (Array.isArray(result) ? result : [result]).flatMap(chunk => chunk.output ?? [])
const run = promisify(execFile)
const allowedPath = file => typeof file === 'string' && file.length > 0 && !file.includes('\\') &&
  !file.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.') || part === 'node_modules' || part.includes(':')) && extensions.has(extname(file))

function originalPath(directory, filename, extension) {
  if (!filename || extname(filename) !== extension) throw new Error('Specify a ' + extension + ' file')
  const path = resolve(directory, filename)
  if (!allowedPath(portable(relative(directory, path)))) throw new Error('Choose a page file inside the project')
  return path
}

async function existing(path) {
  try { return await stat(path) } catch (error) { if (error.code !== 'ENOENT') throw error }
}

async function directoryInsideProject(directory, path) {
  const project = await realpath(directory)
  for (let cursor = path; ; cursor = dirname(cursor)) {
    try {
      const actual = relative(project, await realpath(cursor))
      if (isAbsolute(actual) || actual === '..' || actual.startsWith(`..${sep}`)) throw new Error('Choose a path inside the project')
      return
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
}

async function renderSnapshot(build, configuration, plugin, entry) {
  const generated = outputs(await build({ ...configuration, plugins: plugin,
    build: { write: false, ssr: entry, rollupOptions: { output: { entryFileNames: 'preview.mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } }))
  const main = generated.find(file => file.type === 'chunk' && file.isEntry)
  if (!main) throw new Error('No server-rendered page was produced')
  const scratch = await mkdtemp(join(configuration.root, '.syntrofic-share-'))
  const snapshot = join(scratch, 'snapshot.html')
  try {
    await emitFiles(scratch, Object.fromEntries(generated.map(file => [file.fileName, file.type === 'chunk' ? file.code : file.source])))
    await run(process.execPath, ['--input-type=module', '--eval', [
      "import { writeFile } from 'node:fs/promises'",
      'const { default: render } = await import(process.argv[1])',
      'await writeFile(process.argv[2], await render())',
    ].join('\n'), '--', pathToFileURL(join(scratch, main.fileName)).href, snapshot],
    { cwd: configuration.root, timeout: 10000, maxBuffer: 1024 * 1024 })
    return await readFile(snapshot, 'utf8')
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

function firstHeading(markup) {
  const match = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(markup)
  return match && decodeHtml(match[1].replace(/<[^>]*>/g, '')).trim()
}

function decodeHtml(value) {
  return value.replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => (
    { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[name]
  ))
}

async function fetchImage(address) {
  const url = new URL(address)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Expected an HTTPS image URL')
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error('HTTP ' + response.status)
  const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  if (!imageTypes.has(type)) throw new Error('The response is not a supported image')
  return `data:${type};base64,${(await readResponseBytes(response, imageLimit)).toString('base64')}`
}

async function embedRemoteImages(markup, script, css) {
  const addresses = new Map()
  for (const match of markup.matchAll(/<img\b[^>]*?\ssrc\s*=\s*(['"])(https:\/\/[^'"]+)\1/gi)) {
    addresses.set(decodeHtml(match[2]), match[2])
  }
  const embedded = []
  const unavailable = []
  const entries = [...addresses]
  for (let at = 0; at < entries.length; at += 8) {
    const batch = await Promise.all(entries.slice(at, at + 8).map(async ([url, encoded]) => {
      const literal = JSON.stringify(url).slice(1, -1)
      const code = ['"', "'", '`'].map(quote => quote + literal + quote)
      const urls = ['"', "'", ''].map(quote => `url(${quote}${url}${quote})`)
      if (!code.some(value => script.includes(value)) && !urls.some(value => css.includes(value))) {
        return { url, reason: 'The live image URL is computed at runtime' }
      }
      try { return { url, encoded, code, urls, asset: await fetchImage(url) } }
      catch (error) { return { url, reason: error.message.split('\n')[0] } }
    }))
    for (const { url, encoded, code, urls, asset, reason } of batch) {
      if (!asset) { unavailable.push({ url, reason }); continue }
      for (const quote of ['"', "'"]) markup = markup.replaceAll(quote + encoded + quote, quote + asset + quote)
      for (const match of code) script = script.replaceAll(match, JSON.stringify(asset))
      for (const match of urls) css = css.replaceAll(match, `url(${JSON.stringify(asset)})`)
      embedded.push(url)
    }
  }
  return { markup, script, css, embedded, unavailable }
}

export async function exportPage(directory, filename, options) {
  const page = originalPath(directory, filename, '.vue')
  await directoryInsideProject(directory, page)
  const source = await readFile(page)
  const entry = portable(relative(directory, page))
  const target = options.out ? resolve(directory, options.out) : page.replace(/\.vue$/, '.html')
  if (extname(target) !== '.html') throw new Error('The export path must end in .html')
  if (options['dry-run']) return { page: entry, output: target, format: 1 }
  const importer = createRequire(join(directory, 'package.json'))
  let build, vue
  try {
    const dependencies = await Promise.all(['vite', '@vitejs/plugin-vue'].map(async id => import(pathToFileURL(importer.resolve(id)).href)))
    build = dependencies[0].build
    vue = dependencies[1].default
  } catch { throw new Error('Install vite and @vitejs/plugin-vue in the Vue project before exporting a page') }
  const files = new Map([[entry, source]])
  const virtualId = '\0syntrofic-page-export'
  const virtual = 'syntrofic-page-export'
  const pageImport = 'import Page from ' + JSON.stringify(page) + '\n'
  function plugin(server = false) {
    return [{
      name: 'syntrofic-page-export',
      resolveId(id) { return id === virtual || id === resolve(directory, virtual) ? virtualId : undefined },
      load(id) {
        if (id !== virtualId) return
        if (server) return pageImport + "import { createSSRApp } from 'vue'\nimport { renderToString } from 'vue/server-renderer'\nexport default () => renderToString(createSSRApp(Page))\n"
        return pageImport + "import { createApp, createSSRApp } from 'vue'\nimport '@syntrofic/ui/style.css'\nconst root = document.getElementById('app')\nconst app = root.hasAttribute('data-prerendered') ? createSSRApp(Page) : createApp(Page)\napp.mount(root)\n"
      },
      async transform(_, id) {
        if (id.startsWith('\0') || !id.startsWith(directory + sep)) return
        const absolute = id.split('?')[0]
        const file = portable(relative(directory, absolute))
        if (allowedPath(file) && !files.has(file) && (await existing(absolute))?.isFile()) {
          await directoryInsideProject(directory, absolute)
          files.set(file, await readFile(absolute))
        }
      },
    }, vue()]
  }
  const configuration = { root: directory, configFile: false, logLevel: 'silent', publicDir: false }
  const output = await build({ ...configuration,
    define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' }, plugins: plugin(),
    build: { write: false, assetsInlineLimit: Infinity, cssCodeSplit: false,
      lib: { entry: virtual, name: 'SyntroficExport', formats: ['iife'], fileName: 'page', cssFileName: 'page' } },
  })
  const contents = outputs(output)
  const scripts = contents.filter(item => item.type === 'chunk')
  const styles = contents.filter(item => item.type === 'asset' && item.fileName.endsWith('.css'))
  if (scripts.length !== 1 || contents.some(item => item.type === 'asset' && !item.fileName.endsWith('.css'))) throw new Error('The page produced assets that cannot be embedded')
  const sourceScript = scripts[0].code.replace(/<\/script/gi, '<\\/script')
  const sourceCss = styles.map(item => String(item.source)).join('\n').replace(/<\/style/gi, '<\\/style')
  if (!/\bsy-(?:button|field|table|surface|chart|dialog|card|layout|text|chat)\b/.test(sourceScript)) throw new Error('The page must use Syntrofic components to export')
  let rendered = ''
  const warnings = []
  try { rendered = await renderSnapshot(build, configuration, plugin(true), virtual) }
  catch (error) {
    const reason = error.killed ? 'Server rendering exceeded its time limit.' : typeof error.stderr === 'string'
      ? error.stderr.match(/^(?:\w*Error): [^\r\n]+/m)?.[0] ?? 'Server rendering failed.' : error.message.split('\n')[0]
    warnings.push('Live browser rendering is available: ' + reason)
  }
  const { markup, script, css, embedded, unavailable } = await embedRemoteImages(rendered, sourceScript, sourceCss)
  const packageNames = ['@syntrofic/ui', 'vue', 'vite']
  const versions = await Promise.all(packageNames.map(async name => [name, (await installedAt(directory, name))?.meta.version]))
  const manifest = { version: 1, entry, markupHash: hash(markup), packages: Object.fromEntries(versions.filter(([, version]) => version)),
    files: Object.fromEntries([...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, content]) => (
    [file, { encoding: 'base64', data: content.toString('base64'), sha256: hash(content) }]
  ))) }
  const title = escapeHtml(options.title ?? (firstHeading(markup) || basename(page, '.vue')))
  const recorded = JSON.stringify(manifest).replaceAll('<', '\\u003c')
  const document = `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>\n<style>html{background:var(--sy-canvas,#fff);color:var(--sy-text)}${css}</style></head><body>\n<div id="app"${markup ? ' data-prerendered' : ''}>${markup}</div>\n<script type="application/json" ${marker}>${recorded}</script>\n<script>${script}</script>\n</body></html>\n`
  const previous = await existing(target)
  if (previous) {
    const before = (await lstat(target)).isFile() ? await readFile(target, 'utf8') : ''
    if (!options.overwrite || !before.includes(`type="application/json" ${marker}`)) throw new Error('Output file already exists: ' + target)
  }
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, document, { flag: previous ? 'w' : 'wx' })
  return { page: entry, output: target, format: 1, files: [...files.keys()].sort(), bytes: Buffer.byteLength(document),
    prerendered: Boolean(markup), warnings, packages: manifest.packages, images: { embedded, unavailable } }
}

const staticTags = new Set('main article section aside header footer nav div span p strong em b i small h1 h2 h3 h4 h5 h6 a img ul ol li dl dt dd table caption thead tbody tfoot tr td th form label button input select option textarea fieldset legend details summary hr br figure figcaption code pre output'.split(' '))
const singleton = new Set(['img', 'input', 'hr', 'br'])
const staticComponents = { 'sy-button': 'SButton', 'sy-card': 'SCard', 'sy-badge': 'SBadge', 'sy-surface': 'SSurface' }

async function recoverStaticPage(html, filename) {
  const { parse } = await import('vue/compiler-sfc')
  const markup = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? html
  const { descriptor } = parse('<template>' + markup + '</template>', { sourceMap: false })
  const imports = new Set()
  const escape = value => escapeHtml(value).replaceAll('{', '&#123;')
  function render(node) {
    if (node.type === 2) return escape(node.content)
    if (node.type !== 1 || !staticTags.has(node.tag.toLowerCase())) return ''
    const tag = node.tag.toLowerCase()
    const props = node.props.filter(prop => prop.type === 6)
    const names = props.find(prop => prop.name === 'class')?.value?.content.split(/\s+/) ?? []
    const component = names.find(className => Object.hasOwn(staticComponents, className))
    const element = component ? staticComponents[component] : tag
    if (component) imports.add(element)
    const attributes = props.flatMap(({ name, value }) => {
      const content = value?.content
      if (component && ['data-variant', 'data-size', 'data-tone'].includes(name) && content && /^[a-z-]+$/i.test(content)) return [` ${name.slice(5)}="${content}"`]
      if (!/^(?:aria-[\w-]+|class|id|alt|title|role|type|for|disabled|readonly|placeholder|value|checked|href|src|width|height|colspan|rowspan)$/i.test(name)) return []
      if ((name === 'href' || name === 'src') && (!content || /[\u0000-\u0020]/.test(content) || /^(?!https:)[a-z][\w+.-]*:/i.test(content) || content.startsWith('//'))) return []
      if (name === 'class' && component) {
        const rest = names.filter(className => className !== component).join(' ')
        return rest ? [` class="${escape(rest)}"`] : []
      }
      return [content === undefined ? ' ' + name : ' ' + name + '="' + escape(content) + '"']
    }).join('')
    const open = '<' + element + attributes + '>'
    return singleton.has(tag) && !component ? open : open + node.children.map(render).join('') + '</' + element + '>'
  }
  const body = descriptor.template?.ast?.children.map(render).join('').trim()
  if (!body || !imports.size) throw new Error('This page does not contain Syntrofic components or embedded source')
  const entry = basename(filename, '.html') + '.vue'
  return { entry, files: { [entry]: `<script setup lang="ts">\nimport { ${[...imports].sort().join(', ')} } from '@syntrofic/ui'\n</script>\n\n<template>\n  ${body}\n</template>\n` },
    warnings: ['Recovered the page layout from its HTML markup.'] }
}

function restoreEmbedded(html, envelope) {
  const manifest = JSON.parse(envelope)
  if (manifest?.version !== 1 || !allowedPath(manifest.entry) || extname(manifest.entry) !== '.vue' || !manifest.files || !Object.hasOwn(manifest.files, manifest.entry)) {
    throw new Error('Unsupported or invalid Syntrofic page manifest')
  }
  const files = Object.fromEntries(Object.entries(manifest.files).map(([path, item]) => {
    if (!allowedPath(path) || item?.encoding !== 'base64' || typeof item.data !== 'string') throw new Error('Invalid embedded file: ' + path)
    const content = Buffer.from(item.data, 'base64')
    if (content.toString('base64') !== item.data || hash(content) !== item.sha256) throw new Error('Embedded file checksum failed: ' + path)
    return [path, content]
  }))
  const snapshot = /<div id="app"(?: data-prerendered)?>([\s\S]*?)<\/div>\n<script type="application\/json" data-syntrofic-page>/i.exec(html)?.[1]
  const changed = typeof manifest.markupHash === 'string' && hash(snapshot ?? '') !== manifest.markupHash
  return { entry: manifest.entry, files, format: manifest.version, packages: manifest.packages,
    warnings: changed ? ['The HTML preview differs from the embedded source.'] : [] }
}

export async function importPage(directory, filename, options) {
  const file = originalPath(directory, filename, '.html')
  await directoryInsideProject(directory, file)
  const html = await readFile(file, 'utf8')
  const envelope = /<script type="application\/json" data-syntrofic-page>([\s\S]*?)<\/script>/i.exec(html)?.[1]
  const { entry, files, format, packages, warnings } = envelope ? restoreEmbedded(html, envelope) : await recoverStaticPage(html, file)
  const wrapper = options.out?.endsWith('.vue') ? originalPath(directory, options.out, '.vue') : undefined
  const base = wrapper ? wrapper.replace(/\.vue$/, '-sources') : resolve(dirname(file), basename(file, '.html') + '-restored')
  let output = options.out && !wrapper ? resolve(directory, options.out) : base
  const destination = portable(relative(directory, output))
  if (destination.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.') || part === 'node_modules')) throw new Error('Choose a restore directory inside the project')
  for (let index = 2; (!options.out || wrapper) && await existing(output); index++) output = `${base}-${index}`
  if (await existing(output)) throw new Error('Restore directory already exists: ' + output)
  await directoryInsideProject(directory, dirname(output))
  const sourcePage = join(output, entry)
  let previous
  if (wrapper) {
    previous = await readThemeOutput(wrapper)
    if (previous !== undefined && (!options.overwrite || !previous.startsWith(restoredMarker + '\n'))) throw new Error('Restore file already exists: ' + wrapper)
  }
  if (!options['dry-run']) {
    await mkdir(dirname(output), { recursive: true })
    const temp = await mkdtemp(join(dirname(output), '.syntrofic-restore-'))
    let written = false
    try {
      await emitFiles(temp, files)
      await rename(temp, output)
      written = true
      if (wrapper) {
        const specifier = './' + portable(relative(dirname(wrapper), sourcePage))
        const expected = restoredMarker + '\n<script lang="ts">\nexport { default } from ' + JSON.stringify(specifier) + '\n</script>\n'
        await writeThemeOutputs(dirname(wrapper), [{ file: basename(wrapper), expected, previous }])
      }
    } catch (error) {
      if (written) await rm(output, { recursive: true, force: true })
      throw error
    } finally { await rm(temp, { recursive: true, force: true }) }
  }
  return { output, page: wrapper ?? sourcePage, files: Object.keys(files), ...(wrapper && { sourcePage }), format, ...(packages && { packages }), warnings }
}
