import { readFile } from 'node:fs/promises'
import { rankItems, resultLimit, searchIndex, searchKinds } from './search.mjs'
import { availableTemplates } from './template.mjs'

const fallback = 'shell-nav'
const symbols = {
  SFilteredTable: ['SPowerSearch', 'STable', 'SResizable'],
  SDashboard: ['SLineChart', 'SBarChart', 'SPowerSearch', 'SCard'],
  SFormWizard: ['SInput', 'SSelect', 'SDatePicker', 'SButton'],
  SAppLayout: ['SNavbar', 'SSidebar', 'SCommand'],
  SChatConversation: ['SChatComposer', 'SChatMessage', 'SStreamingMarkdown'],
}
const hooks = { SFilteredTable: ['useTableFilterState'], SDashboard: ['useScrollableArea'], SChatConversation: ['useStreamingText'] }
const commands = ['syntrofic search "<query>"', 'syntrofic component <name> --props',
  'syntrofic template <page> --skeleton', 'syntrofic template <page> ./src/pages/Page.vue']

export async function buildPlan(directory, query, options) {
  if (options.type && !searchKinds.includes(options.type)) throw new Error('Unknown build type: ' + options.type)
  const limit = resultLimit(options.limit ?? '60')
  if (!query.trim()) {
    const reference = await readFile(new URL('../../site/guides/standard-design.md', import.meta.url), 'utf8')
    return { playbook: reference.split('## 验收口径')[0].trim(), commands }
  }
  const [catalog, reference] = await Promise.all([availableTemplates(directory, {}), searchIndex(directory, ['component', 'hook'])])
  const templates = catalog.map(entry => ({ ...entry, aliases: [entry.component, ...(entry.keywords ?? [])], summary: entry.description,
    action: 'template info', target: entry.id }))
  const ranked = rankItems(templates, query).slice(0, limit)
  const match = ranked.filter(entry => entry.type === 'page')
  const pageFallback = templates.find(entry => entry.id === fallback) ?? templates.find(entry => entry.replaces === fallback)
  const start = match[0] ?? pageFallback ?? templates.find(entry => entry.type === 'page')
  const family = start?.id.split('-')[0]
  const similar = family ? rankItems(templates.filter(entry => entry.type === 'page'), family) : []
  const general = [pageFallback, templates.find(entry => entry.id === 'blank'), templates.find(entry => entry.id === 'dashboard')]
  const byId = new Map([...match.slice(1), ...similar, ...general].filter(entry => entry && entry.id !== start?.id).map(entry => [entry.id, entry]))
  const next = [...byId.values()].slice(0, 2)
  const blocks = ranked.filter(entry => entry.type === 'block')
  const related = new Set([start?.component, ...symbols[start?.component] ?? []])
  const candidates = rankItems(reference, query).slice(0, limit)
  for (const entry of reference) {
    const component = entry.implementation?.component
    if (entry.type === 'component' && related.has(component) && !candidates.some(candidate => candidate.id === entry.id)) {
      candidates.push({ ...entry, match: 'template', command: 'syntrofic component ' + component })
    } else if (entry.type === 'hook' && hooks[start?.component]?.includes(entry.id) && !candidates.some(candidate => candidate.id === entry.id)) {
      candidates.push({ ...entry, match: 'template', command: 'syntrofic hook ' + entry.id })
    }
  }
  function output(entry) {
    if (!entry) return
    const { id, name, type, package: owner, category, signature, implementation, component, summary, command, score, match } = entry
    return { id, name, type, command: command ?? 'syntrofic template info ' + id,
      ...(options.verbose && { package: owner, category, signature, component: component ?? implementation?.component, summary, score, match }) }
  }
  const only = domain => !options.type || options.type === domain
  return {
    query, template: only('template') ? start?.id : undefined, start: only('template') ? output(start) : undefined,
    alternatives: only('template') ? next.map(output) : [],
    blocks: only('template') ? blocks.map(output) : [],
    components: only('component') ? candidates.filter(entry => entry.type === 'component').slice(0, limit).map(output) : [],
    hooks: only('hook') ? candidates.filter(entry => entry.type === 'hook').slice(0, limit).map(output) : [],
  }
}

export function formattedBuildPlan(plan) {
  if (plan.playbook) return [plan.playbook, ...plan.commands].join('\n\n')
  return [plan.start, ...plan.alternatives, ...plan.blocks, ...plan.components, ...plan.hooks].filter(Boolean)
    .map(entry => [entry.name, entry.command, entry.summary].filter(Boolean).join('\t')).join('\n')
}
