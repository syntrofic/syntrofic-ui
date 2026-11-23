import { access, readFile, readdir, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { delimiter, dirname, extname, join, relative, resolve } from 'node:path'
import { installedAt, projectAt, readProjectSettings } from './project-discovery.mjs'

async function readJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
}

async function onPath(name) {
  const candidates = (process.env.PATH ?? '').split(delimiter).filter(Boolean).map(path => resolve(path, name))
  const results = await Promise.all([...new Set(candidates)].map(async path => {
    try { await access(path, constants.X_OK); return path } catch { return undefined }
  }))
  return results.filter(Boolean)
}

async function builtFiles(directory, input) {
  let root = resolve(directory, input)
  const origin = await stat(root)
  if (origin.isFile()) {
    if (extname(root) !== '.html') throw new Error('--built expects an HTML file or a build directory')
    return { root: dirname(root), files: [root] }
  }
  const project = await readJson(join(root, 'package.json'))
  if (project) {
    for (const target of ['dist', 'dist-site', '.output/public', 'build']) {
      const candidate = join(root, target)
      try { if ((await stat(candidate)).isDirectory()) { root = candidate; break } }
      catch (error) { if (error.code !== 'ENOENT') throw error }
    }
  }
  const files = []
  const pending = [root]
  const ignored = new Set(['node_modules', '.git', '.nuxt', '.cache'])
  while (pending.length) {
    const folder = pending.pop()
    for (const item of await readdir(folder, { withFileTypes: true })) {
      if (ignored.has(item.name) || item.name.startsWith('.')) continue
      const path = join(folder, item.name)
      if (item.isDirectory()) pending.push(path)
      else if (item.isFile() && ['.html', '.css', '.js', '.mjs'].includes(extname(item.name))) files.push(path)
    }
  }
  return { root, files: files.sort() }
}

async function inspectBuild(directory, input) {
  const { root, files } = await builtFiles(directory, input)
  const entries = files.filter(path => extname(path) === '.html')
  const inspected = new Set(files)
  const components = new Set()
  const themed = new Set()
  const rawElements = new Set()
  const rawIcons = new Set()
  const customStyles = new Set()
  const examples = []
  for (const path of inspected) {
    const source = await readFile(path, 'utf8')
    const file = relative(root, path)
    const extension = extname(path)
    const componentClass = /\bsy-(?:button|dialog|field__control|card|chart|select|menu|table|disclosure|checkbox|avatar|badge|surface|tab-bar)\b/
    if ((extension === '.html' && [...source.matchAll(/\bclass\s*=\s*["']([^"']+)["']/gi)].some(match => componentClass.test(match[1]))) ||
      (extension !== '.css' && extension !== '.html' && componentClass.test(source))) components.add(file)
    if (/--sy-(?:canvas|accent|font)\s*:|data-sy-theme/.test(source)) themed.add(file)
    if (extension !== '.html') continue
    for (const [tag, attributes] of [...source.matchAll(/<(button|input|select|textarea|dialog)\b([^<>]*)>/gi)].map(match => match.slice(1))) {
      if (!/\b(?:class\s*=\s*["'][^"']*\bsy-|data-sy-)/i.test(attributes)) rawElements.add(`${file} <${tag.toLowerCase()}>`)
    }
    if (/<svg\b[^<>]*>/i.test(source.replace(/<svg\b[^<>]*class\s*=\s*["'][^"']*\bsy-icon[^<>]*>/gi, ''))) rawIcons.add(file)
    if (/\sstyle\s*=/i.test(source)) customStyles.add(file)
    if (entries.length === 1 && files.length === 1) {
      for (const match of source.matchAll(/<(?:link|script)\b[^<>]*\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
        const url = match[1].split(/[?#]/)[0]
        if (/^(?:[a-z]+:|\/\/)/i.test(url) || !['.css', '.js', '.mjs'].includes(extname(url))) continue
        const asset = resolve(root, url.replace(/^\//, ''))
        if (relative(root, asset).startsWith('..')) continue
        try { if ((await stat(asset)).isFile()) inspected.add(asset) }
        catch (error) { if (error.code !== 'ENOENT') throw error }
      }
    }
    if (examples.length < 5) examples.push(file)
  }
  return { directory: root, valid: entries.length > 0 && components.size > 0, pages: entries.length, examples,
    components: [...components], themes: [...themed], rawElements: [...rawElements], rawIcons: [...rawIcons], customStyles: [...customStyles] }
}

async function registryHealth(directory, name, items) {
  try {
    const registry = await readJson(join(directory, name))
    if (!registry) return
    if (registry.version !== 1 || !Array.isArray(registry[items])) throw new Error('unsupported registry structure')
    const ids = registry[items].map(item => item?.id)
    if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error('identifiers must be unique')
    if (registry.active != null && !ids.includes(registry.active)) throw new Error('active entry is unavailable: ' + registry.active)
    return { file: name, ids, active: registry.active ?? null }
  } catch (error) { return { file: name, error: error.message } }
}

async function guidanceHealth(directory) {
  try {
    const content = await readFile(join(directory, 'AGENTS.md'), 'utf8')
    const opening = (content.match(/<!-- syntrofic:start -->/g) ?? []).length
    const closing = (content.match(/<!-- syntrofic:end -->/g) ?? []).length
    const ordered = content.indexOf('<!-- syntrofic:start -->') <= content.indexOf('<!-- syntrofic:end -->')
    return { file: 'AGENTS.md', managed: opening === 1 && closing === 1 && ordered,
      ...(opening !== closing || opening > 1 || !ordered ? { error: 'Managed guidance markers do not match.' } : {}) }
  } catch (error) { if (error.code !== 'ENOENT') throw error }
}

async function settingsHealth(directory) {
  try {
    const settings = await readProjectSettings(directory)
    const integrations = await Promise.all((settings.integrations ?? []).map(async name => {
      try {
        const installed = await installedAt(directory, name)
        if (!installed) return { name, error: 'Integration package is not installed' }
        const manifest = await readJson(join(installed.path, 'syntrofic.integration.json'))
        if (manifest?.version !== 1 || manifest.package !== name || !Array.isArray(manifest.contributions)) {
          return { name, error: 'Invalid or missing integration manifest' }
        }
        return { name, version: installed.meta.version, contributions: manifest.contributions.length }
      } catch (error) { return { name, error: error.message } }
    }))
    return { file: 'syntrofic.config.json', integrations }
  } catch (error) { return { file: 'syntrofic.config.json', error: error.message, integrations: [] } }
}

function closeProp(word, options) {
  if (word.length < 4) return
  return options.find(candidate => {
    if (Math.abs(candidate.length - word.length) > 1) return false
    const prefix = [...word].findIndex((char, index) => char !== candidate[index])
    if (prefix < 0) return candidate.length === word.length + 1
    const left = word.slice(prefix)
    const right = candidate.slice(prefix)
    if (left.length !== right.length) return left.slice(1) === right || left === right.slice(1)
    return left.slice(1) === right.slice(1) || left[0] === right[1] && left[1] === right[0] && left.slice(2) === right.slice(2)
  })
}

async function appComponentWarnings(directory) {
  const { parse } = await import('vue/compiler-sfc')
  const { component } = await import('./catalog.mjs')
  const { inspectComponentSource, readComponentSource } = await import('./component.mjs')
  const warnings = []
  const known = new Map()
  const propName = name => name.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
  const plainAttribute = /^(?:id|class|style|title|lang|dir|key|ref|role|tabindex|form|slot|aria-[\w-]+|data-[\w-]+)$/
  function properties(symbol) {
    if (!known.has(symbol)) known.set(symbol, (async () => {
      const entry = component(symbol)
      if (!entry) return []
      const source = await readComponentSource(directory, entry)
      const { props, propsUnavailable } = await inspectComponentSource(source)
      return propsUnavailable ? [] : props.map(prop => prop.name)
    })())
    return known.get(symbol)
  }
  const folders = (await readdir(directory, { withFileTypes: true })).filter(item => item.isDirectory()
    && ['src', 'app', 'pages', 'components'].includes(item.name)).map(item => join(directory, item.name))
  while (folders.length) {
    const folder = folders.pop()
    let items
    try { items = await readdir(folder, { withFileTypes: true }) }
    catch (error) { if (error.code === 'ENOENT') continue; throw error }
    for (const item of items) {
      if (item.name.startsWith('.') || ['node_modules', 'dist', 'vendor'].includes(item.name)) continue
      const file = join(folder, item.name)
      if (item.isDirectory()) { folders.push(file); continue }
      if (!item.isFile() || !item.name.endsWith('.vue')) continue
      const text = await readFile(file, 'utf8')
      if (!text.includes('SButton') && !text.includes('@syntrofic/ui')) continue
      const { descriptor } = parse(text, { filename: file, sourceMap: false })
      const sources = [descriptor.script?.content, descriptor.scriptSetup?.content].filter(Boolean).join('\n')
      const names = new Map([['SButton', 'SButton']])
      for (const entry of sources.matchAll(/import\s*\{([^}]+)}\s*from\s*['"]@syntrofic\/ui(?:\/[\w-]+)?['"]/g)) {
        for (const alias of entry[1].matchAll(/(?:^|,)\s*(S[A-Z][\w]*)(?:\s+as\s+([\w]+))?/g)) names.set(alias[2] ?? alias[1], alias[1])
      }
      async function inspect(node) {
        const symbol = node.type === 1 && names.get(node.tag)
        if (symbol) {
          const location = relative(directory, file) + ':' + node.loc.start.line
          const usable = node.props.some(prop => prop.type === 6 ? ['disabled', 'loading', 'href', 'to', 'as'].includes(prop.name)
            || prop.name === 'type' && ['submit', 'reset'].includes(prop.value?.content)
            : prop.type === 7 && (prop.name === 'on' || prop.name === 'bind' && (!prop.arg
              || ['disabled', 'loading', 'href', 'to', 'as', 'type'].includes(prop.arg.content))))
          if (symbol === 'SButton' && !usable) warnings.push(location + ' has a button without a visible action binding')
          const declared = await properties(symbol)
          for (const prop of node.props) {
            const key = prop.type === 6 ? prop.name : prop.name === 'bind' && prop.arg?.isStatic ? prop.arg.content : undefined
            if (!key || plainAttribute.test(key) || declared.includes(propName(key))) continue
            const nearby = closeProp(propName(key), declared)
            if (nearby) warnings.push(location + ' ' + node.tag + ' uses ' + key + '. Did you mean ' + nearby + '?')
          }
        }
        if (Array.isArray(node.children)) for (const child of node.children) await inspect(child)
      }
      if (descriptor.template?.ast) await inspect(descriptor.template.ast)
    }
  }
  return warnings
}

export async function projectDoctor(directory, packageName, options) {
  let project
  try { project = await projectAt(directory) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  const projectDirectory = project?.directory ?? directory
  const pkg = project?.manifest?.name ? project.manifest : await readJson(join(projectDirectory, 'package.json'))
  const answer = await readJson(new URL('../../package.json', import.meta.url))
  const dependencies = { ...pkg?.devDependencies, ...pkg?.peerDependencies, ...pkg?.optionalDependencies, ...pkg?.dependencies }
  const framework = options.native ? 'nativescript-vue' : 'vue'
  const [installed, installedFramework, cli, built, themes, icons, guidance, buttons, settings] = await Promise.all([
    installedAt(projectDirectory, packageName), installedAt(projectDirectory, framework), onPath('syntrofic'),
    options.built ? inspectBuild(directory, options.built) : undefined,
    registryHealth(projectDirectory, 'syntrofic.themes.json', 'themes'),
    registryHealth(projectDirectory, 'syntrofic.icons.json', 'sets'),
    guidanceHealth(projectDirectory),
    !options.native && dependencies[packageName] ? appComponentWarnings(projectDirectory) : [],
    settingsHealth(projectDirectory),
  ])
  const [major, minor] = process.versions.node.split('.').map(Number)
  const compatible = major > 22 || major === 22 && minor >= 12 || major === 20 && minor >= 19
  const warnings = [...buttons]
  if (built) {
    warnings.push(...built.rawElements.map(item => 'Raw control in build: ' + item), ...built.rawIcons.map(item => 'Raw SVG in build: ' + item),
      ...built.customStyles.map(item => 'Inline styles in build: ' + item))
  }
  const errors = [themes, icons, guidance, settings].flatMap(item => item?.error ? [item.file + ': ' + item.error] : [])
  errors.push(...settings.integrations.filter(item => item.error).map(item => item.name + ': ' + item.error))
  if (pkg && dependencies[packageName] && !installed) warnings.push(`${packageName} is declared and its installed manifest was unavailable`)
  if (pkg && dependencies[framework] && !installedFramework) warnings.push(`${framework} is declared and its installed manifest was unavailable`)
  if (packageName === '@syntrofic/ui' && installed?.meta.version && answer?.version && installed.meta.version !== answer.version) {
    warnings.push(`The CLI release ${answer.version} differs from the installed UI ${installed.meta.version}`)
  }
  return {
    node: process.version, manifest: Boolean(pkg), ui: Boolean(dependencies[packageName]), vue: Boolean(dependencies[framework]),
    mode: pkg ? 'project' : 'computer', release: answer?.version, cli,
    directory: projectDirectory, dependencies: { ui: { name: packageName, declared: dependencies[packageName] ?? null, installed: installed?.meta.version ?? null },
      framework: { name: framework, declared: dependencies[framework] ?? null, installed: installedFramework?.meta.version ?? null } },
    packageManager: pkg?.packageManager ?? null, nodeCompatible: compatible, warnings, errors, built, themes, icons, guidance, settings,
    valid: compatible && built?.valid !== false && !errors.length && (!options.strict || !warnings.length),
  }
}
