export const agentNodeKinds = [
  'dashboard', 'kpi-grid', 'metric-grid', 'line-chart', 'area-chart', 'bar-chart', 'composed-chart',
  'candlestick-chart', 'pie-chart', 'donut-chart', 'funnel-chart', 'radar-chart', 'radial-chart',
  'gauge-chart', 'sunburst-chart', 'sankey-chart', 'scatter-chart', 'heatmap', 'data-table',
  'comparison-list', 'meter-list', 'card', 'text', 'callout', 'image', 'tag-list', 'list', 'list-block',
  'accordion', 'steps', 'code-block', 'diagram', 'tabs', 'generated-composition', 'product-card',
  'record-card', 'item-card', 'item-card-group', 'product-signals', 'composition-api', 'map', 'row',
  'column', 'grid', 'spacer', 'divider', 'heading', 'badge', 'icon', 'rating', 'progress', 'form',
  'switch-group', 'toggle-group', 'action-group', 'follow-up', 'button',
] as const

export type AgentNodeKind = typeof agentNodeKinds[number]
export type AgentValue = string | number | boolean | null
export type AgentFieldType = 'text' | 'number' | 'email' | 'checkbox' | 'select'

export interface AgentEntry {
  id: string
  label: string
  value?: AgentValue
  detail?: string
  values?: Readonly<Record<string, AgentValue>>
  series?: readonly number[]
  children?: readonly AgentEntry[]
}
export interface AgentField {
  id: string
  label: string
  type: AgentFieldType
  required?: boolean
  options?: readonly string[]
}
export interface AgentAction {
  id: string
  label: string
  intent?: 'confirm' | 'secondary' | 'danger'
}
export interface AgentNode {
  id: string
  kind: AgentNodeKind
  title?: string
  text?: string
  label?: string
  src?: string
  values?: readonly AgentEntry[]
  children?: readonly AgentNode[]
  fields?: readonly AgentField[]
  actions?: readonly AgentAction[]
  value?: number
  min?: number
  max?: number
}
export interface AgentDocument {
  version: 1
  nodes: readonly AgentNode[]
}
export interface AgentActionEvent {
  node: string
  action: string
  values: Readonly<Record<string, AgentValue>>
}

const kinds = new Set<string>(agentNodeKinds)
const fields = new Set(['text', 'number', 'email', 'checkbox', 'select'])
const intents = new Set(['confirm', 'secondary', 'danger'])
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const reserved = new Set(['__proto__', 'prototype', 'constructor'])
type ObjectValue = Record<string, unknown>

function object(value: unknown, path: string): ObjectValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${path} must be an object`)
  return value as ObjectValue
}
function prop(value: ObjectValue, key: string) { return own(value, key) ? value[key] : undefined }
function string(value: unknown, path: string, limit = 4000) {
  if (typeof value !== 'string' || value.length > limit) throw new TypeError(`${path} must be a string of at most ${limit} characters`)
  return value
}
function optionalString(value: unknown, path: string) { return value === undefined ? undefined : string(value, path) }
function id(value: unknown, path: string) {
  const label = string(value, path, 100)
  if (!label.trim() || reserved.has(label)) throw new TypeError(`${path} must be a usable identifier`)
  return label
}
function finite(value: unknown, path: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${path} must be finite`)
  return value
}
function optionalNumber(value: unknown, path: string) { return value === undefined ? undefined : finite(value, path) }
function scalar(value: unknown, path: string): AgentValue {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'number') return finite(value, path)
  return string(value, path)
}
function array<T>(value: unknown, path: string, parse: (entry: unknown, path: string) => T, maximum = 100) {
  if (!Array.isArray(value) || value.length > maximum) throw new TypeError(`${path} must be an array with at most ${maximum} entries`)
  return value.map((entry, index) => parse(entry, `${path}[${index}]`))
}
function optionalArray<T>(value: unknown, path: string, parse: (entry: unknown, path: string) => T, maximum?: number) {
  return value === undefined ? undefined : array(value, path, parse, maximum)
}
function unique<T extends { id: string }>(values: T[] | undefined, path: string) {
  if (values && new Set(values.map(value => value.id)).size !== values.length) throw new TypeError(`${path} has duplicate identifiers`)
  return values
}
function media(value: unknown, path: string) {
  if (value === undefined) return undefined
  const src = string(value, path, 2000)
  if (/^(?:https:\/\/|\/(?!\/)|\.\/)/i.test(src) && !/[\\\u0000-\u001f]/.test(src)) return src
  throw new TypeError(`${path} must use HTTPS or a local path`)
}

export function parseAgentDocument(input: unknown): AgentDocument {
  const root = object(input, 'document')
  if (prop(root, 'version') !== 1) throw new TypeError('Unsupported agent document version')
  let budget = 1000
  const seen = new Set<string>()
  function entry(raw: unknown, path: string, depth = 0): AgentEntry {
    if (--budget < 0 || depth > 6) throw new TypeError(`${path} exceeds the document limits`)
    const input = object(raw, path)
    const data = prop(input, 'values')
    const values = data === undefined ? undefined : Object.fromEntries(Object.entries(object(data, path + '.values'))
      .slice(0, 48).map(([key, value]) => [id(key, path + '.values'), scalar(value, path + '.values.' + key)]))
    return {
      id: id(prop(input, 'id'), path + '.id'), label: string(prop(input, 'label'), path + '.label'),
      value: prop(input, 'value') === undefined ? undefined : scalar(prop(input, 'value'), path + '.value'),
      detail: optionalString(prop(input, 'detail'), path + '.detail'), values,
      series: optionalArray(prop(input, 'series'), path + '.series', finite, 240),
      children: unique(optionalArray(prop(input, 'children'), path + '.children', (value, key) => entry(value, key, depth + 1)), path),
    }
  }
  function field(raw: unknown, path: string): AgentField {
    const value = object(raw, path)
    const type = string(prop(value, 'type'), path + '.type')
    if (!fields.has(type)) throw new TypeError(`Unknown field type at ${path}`)
    const required = prop(value, 'required')
    if (required !== undefined && typeof required !== 'boolean') throw new TypeError(`Invalid required state at ${path}`)
    return { id: id(prop(value, 'id'), path + '.id'), label: string(prop(value, 'label'), path + '.label'),
      type: type as AgentFieldType, required, options: optionalArray(prop(value, 'options'), path + '.options', string) }
  }
  function action(raw: unknown, path: string): AgentAction {
    const value = object(raw, path)
    const intent = optionalString(prop(value, 'intent'), path + '.intent')
    if (intent && !intents.has(intent)) throw new TypeError(`Unknown action intent at ${path}`)
    return { id: id(prop(value, 'id'), path + '.id'), label: string(prop(value, 'label'), path + '.label'), intent: intent as AgentAction['intent'] }
  }
  function node(raw: unknown, path: string, depth = 0): AgentNode {
    if (--budget < 0 || depth > 12) throw new TypeError(`${path} exceeds the document limits`)
    const value = object(raw, path)
    const key = id(prop(value, 'id'), path + '.id')
    if (seen.has(key)) throw new TypeError(`Duplicate node identifier ${key}`)
    seen.add(key)
    const kind = string(prop(value, 'kind'), path + '.kind')
    if (!kinds.has(kind)) throw new TypeError(`Unknown node kind ${kind}`)
    return {
      id: key, kind: kind as AgentNodeKind, title: optionalString(prop(value, 'title'), path + '.title'),
      text: optionalString(prop(value, 'text'), path + '.text'), label: optionalString(prop(value, 'label'), path + '.label'),
      src: media(prop(value, 'src'), path + '.src'), value: optionalNumber(prop(value, 'value'), path + '.value'),
      min: optionalNumber(prop(value, 'min'), path + '.min'), max: optionalNumber(prop(value, 'max'), path + '.max'),
      values: unique(optionalArray(prop(value, 'values'), path + '.values', entry), path),
      fields: unique(optionalArray(prop(value, 'fields'), path + '.fields', field, 24), path),
      actions: unique(optionalArray(prop(value, 'actions'), path + '.actions', action, 24), path),
      children: optionalArray(prop(value, 'children'), path + '.children', (child, childPath) => node(child, childPath, depth + 1)),
    }
  }
  return { version: 1, nodes: array(prop(root, 'nodes'), 'nodes', node) }
}
