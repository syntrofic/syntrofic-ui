import { readFile } from 'node:fs/promises'
const root = new URL('../../', import.meta.url)
const registry = JSON.parse(await readFile(new URL('catalog/parity.json', root), 'utf8'))
const build = JSON.parse(await readFile(new URL('catalog/implementation.json', root), 'utf8'))
export const records = Object.values(registry).filter(Array.isArray).flat().filter(entry => entry?.id).map(entry => ({
  ...entry, implementation: build[entry.id],
}))
export function component(id) {
  const key = id.toLowerCase()
  return records.find(entry => entry.id.toLowerCase() === key || entry.name.toLowerCase() === key)
    ?? records.find(entry => entry.implementation?.component?.toLowerCase() === key || entry.implementation?.related?.some(name => name.toLowerCase() === key))
}
export function matchRecords(query = '') {
  const key = query.trim().toLowerCase()
  return records.filter(entry => [entry.id, entry.name, entry.track, entry.category].some(value => value?.toLowerCase().includes(key)))
}
export function documentEntry(entry) {
  const data = entry.implementation
  return [
    '# ' + entry.name, '标识 ' + entry.id, entry.track && '发行线 ' + entry.track,
    entry.criteria && '验收要求\n\n' + entry.criteria,
    data?.component && '实现 `' + data.component + '`',
    data?.reviewNumber && '验收编号 ' + data.reviewNumber,
    entry.upstream && '[对标资料](' + entry.upstream + ')',
  ].filter(Boolean).join('\n\n') + '\n'
}
export async function astryxCoverage(query = '') {
  const catalog = JSON.parse(await readFile(new URL('catalog/astryx.json', root), 'utf8'))
  const { repository, revision } = catalog
  const search = query.trim().toLowerCase()
  const entries = Object.entries(catalog.groups).flatMap(([group, rows]) => rows.map(([name, source, status, symbol, id]) => ({
    group, name, status, source: repository + '/blob/' + revision + '/' + source,
    symbol: symbol || undefined, id: id || undefined,
  }))).filter(entry => [entry.group, entry.name, entry.status, entry.symbol, entry.id]
    .some(value => value?.toLowerCase().includes(search)))
  return { repository, revision, entries }
}

export function docsBundle() {
  const all = records.map(entry => `- [${entry.name}](./components.md#${entry.id}) — ${entry.id}`).join('\n')
  const pages = records.map(entry => documentEntry(entry).replace(/^# /, `<a id="${entry.id}"></a>\n\n## `)).join('\n')
  return {
    'llms.txt': '# Syntrofic UI\n\n> Vue 3、TypeScript 和 NativeScript 组件库。\n\n' + all + '\n',
    'llms-full.txt': '# Syntrofic UI 完整目录\n\n' + pages,
    'components.md': '# 组件目录\n\n' + pages,
    'patterns.md': '# 常用模式\n\n受控选择使用 v-model。长操作通过加载状态保留控件尺寸。使用带语义名称的按钮和按系统偏好减少动效。\n',
    'catalog.json': JSON.stringify(records, null, 2) + '\n',
    'openapi.json': JSON.stringify({
      openapi: '3.1.0', info: { title: 'Syntrofic UI documentation', version: '1.0.0' }, paths: {
        '/catalog': { get: { operationId: 'searchCatalog', parameters: [{ in: 'query', name: 'q', schema: { type: 'string' } }], responses: { 200: { description: 'Matching entries' } } } },
        '/components/{id}': { get: { operationId: 'getComponent', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Component record' }, 404: { description: 'Unknown component' } } } },
      },
    }, null, 2) + '\n',
  }
}
