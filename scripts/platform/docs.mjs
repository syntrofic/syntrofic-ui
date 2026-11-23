import { readFile, realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { component, documentEntry } from './catalog.mjs'
import { cliManifest, hookCommand } from './cli-reference.mjs'
import { installedAt, packageId, projectAt, projectPackages } from './project-discovery.mjs'

const guides = [
  ['getting-started', 'Vue 3 入门', 'vue.md'], ['native', 'NativeScript Vue', 'native.md'],
  ['standard-design', '标准设计', 'standard-design.md'], ['theme', '主题与样式', 'theming.md'], ['releases', '版本记录', 'releases.md'],
  ['design-rules', 'Syntrofic UI 设计规范', 'design-rules.md'], ['design-rules/en', 'Syntrofic UI design rules', 'en/design-rules.md'],
  ['cli', 'CLI 与集成工具', 'tools.md'],
]
const slug = text => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
const safeId = /^[\p{L}\p{N}_-]+$/u
export const userDirectory = () => resolve(process.env.SYNTROFIC_USER_DIR ?? resolve(process.env.XDG_CONFIG_HOME ?? resolve(homedir(), '.config'), 'syntrofic'))

async function localFile(path) {
  try { return await readFile(path, 'utf8') }
  catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error }
}

function sections(markdown) {
  const lines = markdown.split('\n')
  const headings = []
  let fence = ''
  for (const [index, line] of lines.entries()) {
    const delimiter = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1]
    if (delimiter && (!fence || delimiter[0] === fence[0] && delimiter.length >= fence.length)) {
      fence = fence ? '' : delimiter
      continue
    }
    if (fence) continue
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading) headings.push({ index, depth: heading[1].length, title: heading[2] })
  }
  const keys = new Set()
  return headings.map(({ index, depth, title }, position) => {
    const base = slug(title) || 'section'
    let key = base
    let occurrence = 2
    while (keys.has(key)) key = `${base}-${occurrence++}`
    keys.add(key)
    const end = headings.slice(position + 1).find(item => item.depth <= depth)?.index ?? lines.length
    return { key, title, depth, markdown: lines.slice(index, end).join('\n').trim() }
  })
}

function commandDoc(entry) {
  return [
    `# syntrofic ${entry.name}`, entry.summary, '## 用法', `\`syntrofic ${entry.name}${entry.usage ? ' ' + entry.usage : ''}\``,
    entry.flags?.length && '## 参数\n\n' + entry.flags.map(flag => `- \`${flag.name}\` · ${flag.type}`).join('\n'),
    entry.subcommands?.length && '## 子命令\n\n' + entry.subcommands.map(action => `- \`${action}\``).join('\n'),
  ].filter(Boolean).join('\n\n')
}

async function documents(directory) {
  const entries = new Map(guides.map(([route, title, file]) => [route, {
    title, read: () => readFile(new URL(`../../site/guides/${file}`, import.meta.url), 'utf8'),
  }]))
  const add = (route, title, read) => entries.set(route, { title, read })
  add('cli/commands', 'CLI 命令', async () => '# CLI 命令\n\n查看各命令的用途、参数与子命令。')
  for (const entry of cliManifest().commands) add(`cli/commands/${entry.name}`, entry.summary, async () => commandDoc(entry))
  add('cli/api', 'CLI 与组件工具接口', async () => '# CLI 与组件工具接口')
  add('cli/api/functions', '组件工具函数', async () => '# 组件工具函数\n\n按名称查找已导出的组件工具。')
  for (const hook of await hookCommand(undefined, {})) {
    add(`cli/api/functions/${hook.name}`, hook.name, async () => [
      `# ${hook.name}`, '## 用法', `\`${hook.signature ?? `${hook.name}(${hook.parameters.join(', ')})`}\``,
      hook.reference && `[对标源码](${hook.reference})`,
    ].filter(Boolean).join('\n\n'))
  }
  add('authoring', '集成作者指南', async () => '# 集成作者指南')
  add('authoring/quick-start', '贡献、校验和打包', async () => {
    const guide = await entries.get('cli').read()
    return sections(guide).find(item => item.key === '校验集成包')?.markdown ?? guide
  })
  add('skills', '工作说明', async () => '# 工作说明\n\n按项目、当前用户和安装的集成查找工作说明。')
  const project = await projectAt(directory)
  const [projectGuide, userGuide] = await Promise.all([
    localFile(resolve(project.directory, 'AGENTS.md')),
    localFile(resolve(userDirectory(), 'AGENTS.md')),
  ])
  if (projectGuide) add('skills/project', '项目 AGENTS.md', async () => projectGuide)
  if (userGuide) add('skills/user', '用户 AGENTS.md', async () => userGuide)
  if (projectGuide || userGuide) entries.set('skills/syntrofic', { title: 'Syntrofic 工作说明', read: async () => projectGuide ?? userGuide, alias: true })
  const dependencies = await projectPackages(project)
  const names = Object.keys(dependencies).filter(name => packageId.test(name))
  const extensions = await Promise.all(names.map(async name => {
    const installed = await installedAt(project.directory, name)
    if (!installed) return []
    const directory = await realpath(installed.path)
    const manifest = await localFile(resolve(directory, 'syntrofic.integration.json'))
    if (!manifest) return []
    const { version, contributions } = JSON.parse(manifest)
    if (version !== 1 || !Array.isArray(contributions)) return []
    return contributions.flatMap(item => {
      if (!item || !['doc', 'agent-doc'].includes(item.kind) || typeof item.id !== 'string' || !safeId.test(item.id)
        || typeof item.file !== 'string' || !item.file.endsWith('.md')) return []
      const nameSpace = item.kind === 'agent-doc' ? 'skills' : 'integrations'
      const parent = item.kind === 'doc' && typeof item.parent === 'string' && item.parent.split('/').every(part => safeId.test(part)) ? item.parent + '/' : ''
      const route = nameSpace + '/' + name + '/' + parent + item.id
      function read() {
        return realpath(resolve(directory, item.file)).then(file => {
          const subpath = relative(directory, file)
          if (!subpath || subpath === '..' || subpath.startsWith('..' + sep) || isAbsolute(subpath)) throw new Error('Guide is outside its package')
          return readFile(file, 'utf8')
        })
      }
      return [{ route, alias: item.kind === 'agent-doc' ? 'skills/' + item.id : undefined, title: item.title ?? item.id, read,
        replaces: item.kind === 'doc' ? item.replaces : undefined, extends: item.kind === 'doc' ? item.extends : undefined }]
    })
  }))
  const contributions = extensions.flat()
  const unique = new Map()
  for (const item of contributions) {
    entries.set(item.route, { title: item.title, read: item.read, optional: true })
    if (item.alias) unique.set(item.alias, unique.has(item.alias) ? null : item)
  }
  for (const [route, item] of unique) {
    if (item && !entries.has(route)) entries.set(route, { title: item.title, read: item.read, optional: true, alias: true })
  }
  const replacements = new Map()
  for (const item of contributions) {
    if (entries.has(item.replaces)) replacements.set(item.replaces, replacements.has(item.replaces) ? null : item)
  }
  for (const [route, item] of replacements) {
    if (item) entries.set(route, { title: item.title, read: item.read, optional: true, alias: true })
  }
  for (const item of contributions) {
    const base = entries.get(item.extends)
    if (base && item.route !== item.extends) {
      entries.set(item.extends, { ...base, read: async () => (await base.read()).trimEnd() + '\n\n' + (await item.read()).trim() + '\n' })
    }
  }
  return entries
}

export async function searchableDocuments(directory) {
  const all = await documents(directory)
  return (await Promise.all([...all].map(async ([route, entry]) => {
    try { return { route, title: entry.title, markdown: await entry.read() } }
    catch (error) { if (!entry.optional) throw error }
  }))).filter(Boolean)
}

export async function docsCommand(directory, [topic, ...sectionParts], options) {
  if (options.index && options.full) throw new Error('--index and --full cannot be combined')
  const section = sectionParts.join(' ')
  if (options.list && (topic || section)) throw new Error('--list does not take a topic')
  const depth = options.depth === 'all' ? Infinity : options.depth === undefined ? 1 : /^\d+$/.test(options.depth) ? Number(options.depth) : NaN
  if (Number.isNaN(depth)) throw new Error('--depth must be a nonnegative number or all')
  const detail = options.detail ?? 'brief'
  if (!['brief', 'compact', 'full'].includes(detail)) throw new Error('--detail must be brief, compact or full')
  const entries = await documents(directory)
  const list = prefix => [...entries].filter(([route]) => (
    (prefix ? route.startsWith(prefix + '/') : true) && route.split('/').length - (prefix ? prefix.split('/').length : 0) <= depth
  ))
  if (!topic) return list('').map(([route, entry]) => ({ route, title: entry.title }))
  const path = topic.replace(/^\/+|\/+$/g, '')
  const alias = { theming: 'theme', tools: 'cli', web: 'getting-started' }
  const requested = Object.hasOwn(alias, path) ? alias[path] : path
  const route = [...entries.keys()].find(key => key.toLowerCase() === requested.toLowerCase())
  const entry = route && entries.get(route)
  const record = !entry ? component([topic, ...sectionParts].join(' ')) ?? component(topic) : undefined
  if (!entry && !record) throw new Error('Unknown documentation topic: ' + topic)
  if (record && options.json && !options.index && !options.full && !options.depth && component([topic, ...sectionParts].join(' ')) === record) return record
  const markdown = entry ? await entry.read() : documentEntry(record)
  const index = sections(markdown)
  const children = !route ? [] : await Promise.all(list(route).map(async ([route, item]) => ({
    route, title: item.title, ...(detail === 'compact' && { sections: sections(await item.read()).map(({ key, title, depth }) => ({ key, title, depth })) }),
    ...(detail === 'full' && { markdown: await item.read() }),
  })))
  if (section && (!record || component([topic, ...sectionParts].join(' ')) !== record)) {
    const key = slug(section)
    const matches = index.filter(item => item.key === key || item.title.toLowerCase() === section.toLowerCase())
    if (matches.length === 1) return { route: route ?? record.id, ...matches[0] }
    if (!matches.length && route) {
      const descendants = [...entries].filter(([child, item]) => child.startsWith(route + '/') && !item.alias)
      const replies = (await Promise.all(descendants.map(async ([child, item]) => {
        try {
          return sections(await item.read())
            .filter(candidate => candidate.key === key || candidate.title.toLowerCase() === section.toLowerCase())
            .map(candidate => ({ route: child, ...candidate }))
        } catch (error) {
          if (!item.optional) throw error
          return []
        }
      }))).flat()
      if (replies.length === 1) return replies[0]
    }
    throw new Error('Unknown or ambiguous documentation section: ' + section)
  }
  const title = entry?.title ?? record.name
  const showIndex = options.index || !options.full && !options.json && Buffer.byteLength(markdown, 'utf8') > 16 * 1024
  return { route: route ?? record.id, title, ...(showIndex ? { sections: index.map(({ key, title, depth }) => ({ key, title, depth })) } : { markdown }), children }
}

export function formattedDocs(result) {
  const listing = items => items.map(item => [item.route ?? item.key, item.title].join('\t')).join('\n')
  if (Array.isArray(result)) return listing(result)
  if (!result.children && result.markdown) return result.markdown.trim()
  const children = (result.children ?? []).map(item => [listing([item]), item.sections && listing(item.sections), item.markdown?.trim()].filter(Boolean).join('\n')).join('\n\n')
  return [result.markdown?.trim() ?? listing(result.sections ?? []), children].filter(Boolean).join('\n\n')
}
