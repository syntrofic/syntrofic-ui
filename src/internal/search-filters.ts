import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { toCalendarDate } from '@internationalized/date'
import type { PowerSearchConfig, SearchDateUnit, SearchField, SearchFilter, SearchOperator, SearchOperatorOption } from '../components/SPowerSearch.vue'
import { formatSearchDate, readSearchDate, searchDateKey, searchDateZone } from './search-dates'

type SearchableValue = string | number | boolean | Date

export const searchOperatorLabels: Readonly<Record<SearchOperator, string>> = {
  is: 'is', 'is-not': 'is not', contains: 'contains', 'starts-with': 'starts with', gt: 'is greater than', lt: 'is less than',
  gte: 'is at least', lte: 'is at most', between: 'is between', in: 'is one of', 'not-in': 'is not one of', exists: 'exists', missing: 'is missing',
  last: 'in the last', next: 'in the next',
}

type FilterValueLabels = SearchDateUnit | 'yes' | 'no'
const defaultValueLabels: Readonly<Record<FilterValueLabels, string>> = { yes: 'Yes', no: 'No', days: 'days', weeks: 'weeks', months: 'months' }

export function formatSearchFilter(filter: SearchFilter, fields: readonly SearchField[], options: {
  operatorLabels?: Partial<Record<SearchOperator, string>>
  valueLabels?: Partial<Record<FilterValueLabels, string>>
  optionLabel?: (field: string, key: string) => string | undefined
  locale?: string
  timeZone?: string
  limit?: number
} = {}): string {
  const field = fields.find(item => item.key === filter.field)
  const operator = searchOperators(field).find(item => item.key === filter.operator)
  const choices = operator?.options ?? field?.options
  const valueLabel = (key: FilterValueLabels) => options.valueLabels?.[key] ?? defaultValueLabels[key]
  const label = (key: string) => choices?.find(option => option.value === key)?.label ?? options.optionLabel?.(filter.field, key)
    ?? (field?.type === 'date' && !filter.unit && key ? formatSearchDate(key, searchDateZone(options.timeZone, field.dateOnly),
      field.dateOnly !== false, options.locale ?? 'en') : undefined)
    ?? (field?.type === 'boolean' && key === 'true' ? valueLabel('yes') : field?.type === 'boolean' && key === 'false' ? valueLabel('no') : key)
  const value = filter.children?.length ? filter.children.map(child => formatSearchFilter(child, field?.fields ?? [], { ...options, limit: undefined })).join(' · ')
    : operator?.format ? operator.format(filter.value)
    : filter.values?.length ? filter.values.map(label).join(', ') : filter.endValue ? `${label(filter.value)} – ${label(filter.endValue)}`
    : filter.unit ? `${label(filter.value)} ${valueLabel(filter.unit)}` : label(filter.value)
  const limit = options.limit === undefined ? undefined : Math.max(1, Math.trunc(options.limit))
  const characters = limit === undefined ? undefined : Array.from(value)
  const shown = characters && limit !== undefined && characters.length > limit ? `${characters.slice(0, limit).join('')}…` : value
  const operatorLabel = operator?.label ?? options.operatorLabels?.[filter.operator] ?? searchOperatorLabels[filter.operator]
  return [field?.label ?? filter.field, operatorLabel, shown].filter(Boolean).join(' ')
}

export function searchOperators(field?: SearchField): SearchOperatorOption[] {
  if (!field) return []
  const defaults: SearchOperator[] = field.type === 'range' ? ['between'] : field.type === 'list' ? ['in', 'not-in'] : field.options ? ['is', 'is-not']
    : field.type === 'date' ? ['is', 'is-not', 'gt', 'lt', 'between', 'last', 'next']
    : field.type === 'number' || field.type === 'time' ? ['is', 'is-not', 'gt', 'lt', 'between']
      : ['boolean', 'entity', 'nested', 'custom'].includes(field.type ?? '') ? ['is', 'is-not'] : ['contains', 'is', 'is-not', 'starts-with', 'exists', 'missing']
  return (field.operators ?? defaults).map(option => typeof option === 'string' ? { key: option } : option)
}

export function foldSearch(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase()
}

export function searchTerms(query: string) {
  return foldSearch(query).trim().split(/\s+/).filter(Boolean)
}

function dateAt(value: SearchableValue, zone: string) {
  const date = typeof value === 'boolean' ? undefined : readSearchDate(value, zone)
  return date && toCalendarDate(date)
}
function isSearchable(value: unknown): value is SearchableValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date
}

export function matchesSearch(field: SearchField, input: unknown, filter: SearchFilter, context?: { timeZone?: string; now?: Date }): boolean {
  const option = searchOperators(field).find(item => item.key === filter.operator)
  if (option?.match) return option.match(input, filter)
  if ((option?.type ?? field.type) === 'nested') {
    const nestedRules = (filter.children ?? []).flatMap(child => {
      const definition = field.fields?.find(item => item.key === child.field)
      return definition ? [{ field: definition, filter: child }] : []
    })
    const collection = Array.isArray(input) ? input : [input]
    const match = nestedRules.length > 0 && collection.some(row => row && typeof row === 'object'
      && nestedRules.every(rule => matchesSearch(rule.field, Reflect.get(row, rule.field.key), rule.filter, context)))
    return filter.operator === 'is-not' ? !match : match
  }
  if (Array.isArray(input) && (filter.operator === 'in' || filter.operator === 'not-in')) {
    const candidates = new Set((filter.values ?? filter.value.split(',')).map(value => foldSearch(value.trim())))
    const match = input.some(value => isSearchable(value) && candidates.has(foldSearch(String(value))))
    return filter.operator === 'in' ? match : !match
  }
  let value = isSearchable(input) ? input : undefined
  let filterValue = filter.value
  let filterEnd = filter.endValue
  if (filter.operator === 'last' || filter.operator === 'next') {
    const count = Number(filter.value)
    if (value == null || !Number.isSafeInteger(count) || count < 1) return false
    try {
      const zone = context?.timeZone ?? 'UTC'
      const anchor = dateAt(context?.now ?? new Date(), zone)
      const date = dateAt(value, zone)
      if (!anchor || !date) return false
      const duration = { [filter.unit ?? 'days']: count }
      return filter.operator === 'last' ? date.compare(anchor) <= 0 && date.compare(anchor.subtract(duration)) >= 0
        : date.compare(anchor) >= 0 && date.compare(anchor.add(duration)) <= 0
    } catch { return false }
  }
  if (field.type === 'date' && value != null) {
    const dateOnly = field.dateOnly !== false
    const zone = searchDateZone(context?.timeZone, dateOnly)
    value = typeof value === 'boolean' ? undefined : searchDateKey(value, zone, dateOnly)
    const wanted = searchDateKey(filterValue, zone, dateOnly)
    const boundary = filterEnd === undefined ? undefined : searchDateKey(filterEnd, zone, dateOnly)
    if (wanted === undefined && filter.operator !== 'exists' && filter.operator !== 'missing') return false
    filterValue = String(wanted ?? '')
    filterEnd = boundary === undefined ? undefined : String(boundary)
  } else if (value instanceof Date) {
    if (Number.isNaN(value.valueOf())) value = undefined
    else {
      const date = value.toISOString()
      value = field.type === 'time' ? date.slice(11, 16) : date
    }
  }
  if (filter.operator === 'exists') return value != null && value !== ''
  if (filter.operator === 'missing') return value == null || value === ''
  if (value == null) return filter.operator === 'is-not' || filter.operator === 'not-in'
  const actual = foldSearch(String(value))
  const wanted = foldSearch(filterValue)
  const metric = field.type !== 'time' && (field.type === 'number' || typeof value === 'number')
  const compare = (input: string) => metric ? input.trim() ? Number(input) : NaN : input
  const comparable = compare(actual)
  const boundary = compare(wanted)
  switch (filter.operator) {
    case 'is': return comparable === boundary
    case 'is-not': return comparable !== boundary
    case 'contains': return actual.includes(wanted)
    case 'starts-with': return actual.startsWith(wanted)
    case 'gt': return comparable > boundary
    case 'lt': return comparable < boundary
    case 'gte': return comparable >= boundary
    case 'lte': return comparable <= boundary
    case 'between': {
      if (filterEnd === undefined) return false
      return comparable >= boundary && comparable <= compare(foldSearch(filterEnd))
    }
    case 'in':
    case 'not-in': {
      const match = (filter.values ?? filter.value.split(',')).some(option => actual === foldSearch(option.trim()))
      return filter.operator === 'in' ? match : !match
    }
  }
}

type PowerSearchOptions = Pick<PowerSearchConfig, 'name' | 'contentSearchFieldKey' | 'timeZone'> & { now?: () => Date }

export function usePowerSearchConfig(definitions: MaybeRefOrGetter<readonly SearchField[]>, configuration: MaybeRefOrGetter<PowerSearchOptions> = {}) {
  const settings = computed(() => toValue(configuration))
  const config = computed<PowerSearchConfig>(() => {
    const { now, ...options } = settings.value
    return { name: 'PowerSearchConfig', ...options, fields: toValue(definitions).map(field => ({ ...field, operators: searchOperators(field) })) }
  })
  const fields = computed(() => new Map(config.value.fields.map(field => [field.key, field])))
  function applyFilters<Row extends object>(filters: readonly SearchFilter[], rows: readonly Row[],
    read: (row: Row, key: string) => unknown = Reflect.get) {
    const rules = filters.flatMap(filter => {
      const field = fields.value.get(filter.field)
      return field ? [{ field, filter }] : []
    })
    const context = { now: settings.value.now?.() ?? new Date(), timeZone: config.value.timeZone }
    return rows.filter(row => rules.every(({ field, filter }) => matchesSearch(field, read(row, field.key), filter, context)))
  }
  return { config, applyFilters }
}
