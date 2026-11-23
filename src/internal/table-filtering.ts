import { computed, markRaw, ref, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import type { PowerSearchConfig, SearchField, SearchFilter, SearchOperator, SearchValueType } from '../components/SPowerSearch.vue'
import type { SelectOption, TableCell, TableColumn } from '../types'
import { foldSearch, matchesSearch, searchOperators, searchTerms } from './search-filters'

export type TableFilterValue = string | number | readonly string[]
export type TableColumnFilters = Readonly<Record<string, TableFilterValue | undefined>>
export type TableFilterVariant = 'popover' | 'inline' | 'inline-compact'
export interface TableFilterFieldRef { field: string; operator?: SearchOperator }
export interface TableFilterState { query: string; filters: readonly SearchFilter[]; columnFilters?: TableColumnFilters }

export function validColumnFilter(value: TableFilterValue | null | undefined): value is TableFilterValue {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') return Boolean(value.trim())
  return Boolean(value?.length)
}

export function setTableColumnFilter(filters: TableColumnFilters, key: string, value: TableFilterValue | null): TableColumnFilters {
  if (validColumnFilter(value)) return { ...filters, [key]: typeof value === 'object' ? [...value] : value }
  const { [key]: removed, ...remaining } = filters
  return remaining
}

export function useTableFilterState(initial: Partial<TableFilterState> = {}) {
  const query = ref(initial.query ?? '')
  const filters = ref(initial.filters?.map(filter => ({ ...filter })) ?? [])
  const columnFilters = ref({ ...initial.columnFilters })
  function apply(value: TableFilterState) {
    query.value = value.query
    filters.value = value.filters.map(filter => ({ ...filter }))
    columnFilters.value = { ...value.columnFilters }
  }
  function onFilterChange(key: string, value: TableFilterValue | null) {
    columnFilters.value = setTableColumnFilter(columnFilters.value, key, value)
  }
  return { query, filters, columnFilters, apply, onFilterChange,
    clearAll: () => { columnFilters.value = {} }, clear: () => apply({ query: '', filters: [] }) }
}

export interface TableFilteringOptions<Row> {
  rows: MaybeRefOrGetter<readonly Row[]>
  fields: MaybeRefOrGetter<readonly SearchField[]>
  state: MaybeRefOrGetter<TableFilterState>
  getField: (row: Row, key: string) => TableCell
  getText: (row: Row) => string
  timeZone?: MaybeRefOrGetter<string | undefined>
}

export interface TableColumnFilteringOptions {
  filters: TableColumnFilters
  onFilterChange: (key: string, value: TableFilterValue | null) => void
  searchConfig: PowerSearchConfig
  variant?: TableFilterVariant
  locale?: string
  labels?: Partial<Record<'apply' | 'clear' | 'calendar' | 'choose' | 'yes' | 'no', string>>
  getLabel?: (columnLabel: string) => string
}

export interface TableFilterEditor {
  field: SearchField
  operator: SearchOperator
  type: 'text' | 'number' | 'date' | 'select' | 'multiple'
  options: readonly SelectOption[]
}

export interface TableColumnFilteringControl {
  options: ComputedRef<TableColumnFilteringOptions>
  fieldFor: (filter: TableColumn<unknown>['filter']) => TableFilterEditor | undefined
  valueFor: (key: string) => TableFilterValue | undefined
  change: (key: string, value: TableFilterValue | null) => void
}

function editorType(type: SearchValueType | undefined, hasOptions: boolean): TableFilterEditor['type'] | undefined {
  if (type === 'number' || type === 'date') return type
  if (type === 'list') return 'multiple'
  if (type === 'boolean' || type === 'enum' || hasOptions) return 'select'
  if (type === 'text' || type === undefined) return 'text'
}

function resolveFilter(filter: TableColumn<unknown>['filter'], fields: ReadonlyMap<string, SearchField>, labels?: TableColumnFilteringOptions['labels']): TableFilterEditor | undefined {
  if (!filter) return
  const key = typeof filter === 'string' ? filter : filter.field
  const field = fields.get(key)
  if (!field) return
  const operators = searchOperators(field)
  const requested = typeof filter === 'string' ? field.defaultOperator : filter.operator ?? field.defaultOperator
  const selected = requested ? operators.find(item => item.key === requested) : operators[0]
  if (!selected || ['between', 'exists', 'missing', 'last', 'next'].includes(selected.key)) return
  const options = selected.options ?? field.options ?? (field.type === 'boolean' ? [
    { value: 'true', label: labels?.yes ?? 'Yes' }, { value: 'false', label: labels?.no ?? 'No' },
  ] : [])
  const takesList = selected.key === 'in' || selected.key === 'not-in'
  const type = editorType(selected.type ?? (takesList ? 'list' : field.type), options.length > 0)
  return type && { field, operator: selected.key, options, type }
}

export function toSearchFilters<Row>(filters: TableColumnFilters, columns: readonly TableColumn<Row>[], config: PowerSearchConfig): SearchFilter[] {
  const fields = new Map(config.fields.map(field => [field.key, field]))
  return columns.flatMap(column => {
    const value = Object.hasOwn(filters, column.key) ? filters[column.key] : undefined
    if (!validColumnFilter(value)) return []
    const filter = resolveFilter(column.filter, fields)
    if (!filter) return []
    const base = { field: filter.field.key, operator: filter.operator }
    return [typeof value === 'object' ? { ...base, value: value[0] ?? '', values: [...value] } : { ...base, value: String(value).trim() }]
  })
}

function filterRows<Row>(options: TableFilteringOptions<Row>) {
  const fields = computed(() => new Map(toValue(options.fields).map(field => [field.key, field])))
  return computed(() => {
    const { query, filters } = toValue(options.state)
    const terms = searchTerms(query)
    const valid = filters.flatMap(filter => {
      const field = fields.value.get(filter.field)
      return field ? [{ field, filter }] : []
    })
    const rows = toValue(options.rows)
    if (!terms.length && !valid.length) return rows
    const context = { timeZone: toValue(options.timeZone) }
    return rows.filter(row => {
      const text = terms.length ? foldSearch(options.getText(row)) : ''
      return terms.every(term => text.includes(term)) && valid.every(({ field, filter }) => matchesSearch(field, options.getField(row, field.key), filter, context))
    })
  })
}

export function useTableFiltering<Row>(options: TableFilteringOptions<Row>): ComputedRef<readonly Row[]>
export function useTableFiltering(options: MaybeRefOrGetter<TableColumnFilteringOptions>): TableColumnFilteringControl
export function useTableFiltering<Row>(input: TableFilteringOptions<Row> | MaybeRefOrGetter<TableColumnFilteringOptions>) {
  if (typeof input === 'object' && 'rows' in input) return filterRows(input)
  const options = computed(() => toValue(input))
  const fields = computed(() => new Map(options.value.searchConfig.fields.map(field => [field.key, field])))
  return markRaw<TableColumnFilteringControl>({
    options,
    fieldFor: filter => resolveFilter(filter, fields.value, options.value.labels),
    valueFor(key) { return Object.hasOwn(options.value.filters, key) ? options.value.filters[key] : undefined },
    change: (key, value) => options.value.onFilterChange(key, value),
  })
}
