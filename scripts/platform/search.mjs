import { records } from './catalog.mjs'
import { hookCommand } from './cli-reference.mjs'
import { searchableDocuments } from './docs.mjs'
import { coreTemplates } from './template.mjs'
import { themeCommand } from './theme.mjs'

export const searchKinds = ['component', 'hook', 'doc', 'template', 'theme']
const tracks = new Set(['web', 'web-pro', 'native', 'native-pro'])
const normalized = value => String(value ?? '').normalize('NFKC').replace(/([a-z\d])([A-Z])/g, '$1 $2').toLocaleLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const quote = value => /^[\w@./:-]+$/.test(value) ? value : "'" + value.replaceAll("'", "'\"'\"'") + "'"

export function resultLimit(value) {
  if (value === undefined) return 20
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new Error('--limit must be a positive integer')
  return Number(value)
}

const sources = {
  component: async () => records.filter(record => tracks.has(record.track)).map(record => ({
    ...record, aliases: [record.implementation?.component, ...(record.implementation?.related ?? []), record.category, record.track, record.upstream],
    summary: record.criteria, action: 'component',
  })),
  hook: async () => (await hookCommand(undefined, {})).map(hook => ({ ...hook, id: hook.name, aliases: [hook.category, ...hook.parameters],
    summary: hook.signature, action: 'hook' })),
  doc: async directory => (await searchableDocuments(directory)).map(doc => ({
    id: doc.route, name: doc.title, content: doc.markdown, summary: doc.markdown.split(/\r?\n/).find(text => text && !text.startsWith('#')),
    action: 'docs',
  })),
  template: async () => coreTemplates().map(template => ({
    ...template, name: template.name ?? template.title ?? template.id, aliases: [template.component, template.category, ...(template.keywords ?? [])],
    summary: template.description, action: 'template info',
  })),
  theme: async directory => (await themeCommand(directory, ['list'], {})).themes.map(theme => ({
    ...theme, aliases: [theme.source, 'theme appearance palette 配色 主题'], summary: theme.source === 'local' ? '项目主题' : '内置主题',
    action: 'theme editor show',
  })),
}

export function rankItems(items, query) {
  const phrase = normalized(query)
  const words = phrase.split(' ').filter(Boolean)
  return items.flatMap(item => {
    const names = [item.id, item.name].map(normalized)
    const extras = (item.aliases ?? []).filter(Boolean).map(normalized)
    const content = normalized([item.summary, item.content].filter(Boolean).join(' '))
    const score = words.reduce((total, word) => {
      if (total === null) return null
      if (names.some(name => name === word)) return total + 24
      if (names.some(name => name.split(' ').includes(word))) return total + 12
      if (names.some(name => name.includes(word))) return total + 8
      if (extras.some(name => name.includes(word))) return total + 5
      return content.includes(word) ? total + 2 : null
    }, 0)
    if (score === null) return []
    const exact = names.includes(phrase)
    const close = names.some(text => text.startsWith(phrase))
    const { aliases, content: _, action, target, ...data } = item
    return [{ ...data, score: score + (exact ? 30 : close ? 8 : 0),
      match: exact ? 'name' : close ? 'prefix' : 'terms',
      command: action ? 'syntrofic ' + action + ' ' + quote(target ?? item.id) : undefined }]
  }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
}

export async function searchCommand(directory, query, options) {
  if (!normalized(query)) throw new Error('Specify a search query')
  if (options.type && !searchKinds.includes(options.type)) throw new Error('Unknown search type: ' + options.type)
  const limit = resultLimit(options.limit)
  const types = options.type ? [options.type] : searchKinds
  const entries = await searchIndex(directory, types)
  return rankItems(entries, query).slice(0, limit)
}

export async function searchIndex(directory, kinds = searchKinds) {
  return (await Promise.all(kinds.map(async type => (await sources[type](directory)).map(entry => ({ ...entry, type }))))).flat()
}
