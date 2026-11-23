import { computed, markRaw, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import type { TableColumn, TableKey, TableSort } from '../types'
import { useTableCells } from './table-cells'

export type TablePaginationVariant = 'pages' | 'count' | 'compact' | 'dots' | 'none'
export type TablePaginationPosition = 'below' | 'above' | 'both' | 'none'
export type TablePaginationAlign = 'start' | 'center' | 'end'

export interface TablePaginationOptions {
  page?: number
  pageSize?: number
  totalItems?: number
  totalPages?: number
  hasMore?: boolean
  pageSizeOptions?: readonly number[]
  variant?: TablePaginationVariant
  position?: TablePaginationPosition
  align?: TablePaginationAlign
  label?: string
  loading?: boolean
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

function integer(value: number | undefined, fallback: number, minimum = 0) {
  return value === undefined || !Number.isFinite(value) ? fallback : Math.max(minimum, Math.trunc(value))
}

export function useTablePagination(options: MaybeRefOrGetter<TablePaginationOptions>) {
  const config = computed(() => toValue(options))
  const pageSize = computed(() => config.value.pageSize === 0 ? 0 : integer(config.value.pageSize, 10, 1))
  const totalItems = computed(() => config.value.totalItems === undefined ? undefined : integer(config.value.totalItems, 0))
  const pages = computed(() => {
    if (!pageSize.value) return 1
    if (config.value.totalPages !== undefined) return integer(config.value.totalPages, 1, 1)
    if (totalItems.value !== undefined) return Math.max(1, Math.ceil(totalItems.value / pageSize.value))
  })
  const page = computed(() => Math.min(pages.value ?? Infinity, integer(config.value.page, 1, 1)))
  const offset = computed(() => (page.value - 1) * pageSize.value)
  const hasPrevious = computed(() => page.value > 1)
  const hasNext = computed(() => pages.value === undefined ? Boolean(config.value.hasMore) : page.value < pages.value)
  const sizes = computed(() => config.value.onPageSizeChange ? [...new Set(config.value.pageSizeOptions)]
    .filter(size => Number.isInteger(size) && size > 0) : [])
  const position = computed(() => config.value.position ?? 'below')
  const variant = computed(() => config.value.variant ?? 'pages')
  const align = computed(() => config.value.align ?? 'center')
  const label = computed(() => config.value.label ?? 'Table pagination')
  const loading = computed(() => Boolean(config.value.loading))
  function change(next: number) {
    if (loading.value || !Number.isInteger(next) || next < 1 || next === page.value) return false
    if (pages.value !== undefined ? next > pages.value : next > page.value + Number(hasNext.value)) return false
    config.value.onPageChange?.(next)
    return true
  }
  function changeSize(size: number) {
    if (loading.value || !Number.isInteger(size) || size < 1 || size === pageSize.value || !config.value.onPageSizeChange) return false
    config.value.onPageSizeChange(size)
    return true
  }
  return markRaw({ page, pageSize, totalItems, pages, offset, hasPrevious, hasNext, sizes, position, variant, align, label, loading, change, changeSize })
}
export type TablePaginationControl = ReturnType<typeof useTablePagination>

export interface TableSelectionOptions<Row> {
  data: readonly Row[]
  rowKey: (row: Row) => TableKey
  selectedKeys?: readonly TableKey[]
  defaultSelectedKeys?: readonly TableKey[]
  getIsItemSelectable?: (row: Row) => boolean
  getIsItemEnabled?: (row: Row) => boolean
  onSelectionChange?: (keys: readonly TableKey[]) => void
}

export interface TableSelectionState {
  readonly selectedKeys: ReadonlySet<TableKey>
  readonly selectedCount: number
  readonly hasSelection: boolean
  clearSelection: () => void
}

export function useTableSelectionState<Row>(options: MaybeRefOrGetter<TableSelectionOptions<Row>>) {
  const config = computed(() => toValue(options))
  const local = shallowRef<readonly TableKey[]>(config.value.defaultSelectedKeys ?? [])
  const selection = computed(() => config.value.selectedKeys ?? local.value)
  const selected = computed(() => new Set(selection.value))
  const isSelectable = (row: Row) => config.value.getIsItemSelectable?.(row) !== false
  const isEnabled = (row: Row) => config.value.getIsItemEnabled?.(row) !== false
  const canSelect = (row: Row) => isSelectable(row) && isEnabled(row)
  const available = computed(() => [...new Set(config.value.data.filter(canSelect).map(config.value.rowKey))])
  const selectedCount = computed(() => available.value.filter(key => selected.value.has(key)).length)
  const allSelected = computed(() => selectedCount.value > 0 && selectedCount.value === available.value.length)
  const someSelected = computed(() => !allSelected.value && selectedCount.value > 0)
  function commit(value: readonly TableKey[]) {
    if (config.value.selectedKeys === undefined) local.value = value
    config.value.onSelectionChange?.(value)
  }
  function update(keys: readonly TableKey[], active: boolean) {
    const next = new Set(selection.value)
    for (const key of keys) {
      if (active) next.add(key)
      else next.delete(key)
    }
    commit([...next])
  }
  function select(row: Row, active: boolean) {
    if (canSelect(row)) update([config.value.rowKey(row)], active)
  }
  function selectAll(active: boolean) { update(available.value, active) }
  const selectionState: TableSelectionState = {
    get selectedKeys() { return selected.value },
    get selectedCount() { return selected.value.size },
    get hasSelection() { return selected.value.size > 0 },
    clearSelection: () => commit([]),
  }
  return { selected, selection, available, allSelected, someSelected, isSelectable, isEnabled, select, selectAll, selectionState }
}

export function useTableSelection<Row>(options: MaybeRefOrGetter<TableSelectionOptions<Row>>) {
  const controls = useTableSelectionState(options)
  const config = computed(() => toValue(options))
  return { ...controls, getIsItemSelected: (row: Row) => controls.selected.value.has(config.value.rowKey(row)),
    getIsAllSelected: () => controls.allSelected.value, getIsIndeterminate: () => controls.someSelected.value,
    onSelectItem: ({ item, isSelected }: { item: Row; isSelected: boolean }) => controls.select(item, isSelected),
    onSelectAll: ({ isAllSelected }: { isAllSelected: boolean }) => controls.selectAll(isAllSelected),
  }
}

export interface TableSortableOptions<Row> {
  data: readonly Row[]
  columns: readonly TableColumn<Row>[]
  sort?: readonly TableSort[]
  defaultSort?: readonly TableSort[]
  locale?: string
  manual?: boolean
  allowUnsortedState?: boolean
  isMultiSortEnabled?: boolean
  onSortChange?: (sort: readonly TableSort[]) => void
}

export function useTableSortableState<Row>(options: MaybeRefOrGetter<TableSortableOptions<Row>>) {
  const config = computed(() => toValue(options))
  const local = shallowRef<readonly TableSort[]>(config.value.defaultSort ?? [])
  const sort = computed(() => config.value.sort ?? local.value)
  const { sortRows } = useTableCells(() => config.value.locale)
  const applySort = (rows: readonly Row[]) => sortRows(rows, config.value.manual ? null : sort.value, config.value.columns)
  const sortedData = computed(() => applySort(config.value.data))
  const direction = (key: string) => sort.value.find(item => item.key === key)?.direction
  function toggle(key: string, additive = false) {
    if (!config.value.columns.some(column => column.key === key && column.sortable)) return
    const previous = direction(key)
    const next = previous === 'ascending' ? 'descending' : previous === 'descending' && config.value.allowUnsortedState !== false ? undefined : 'ascending'
    const ordering = additive && config.value.isMultiSortEnabled ? [...sort.value] : []
    const index = ordering.findIndex(item => item.key === key)
    const replacement: TableSort[] = next ? [{ key, direction: next }] : []
    if (index >= 0) ordering.splice(index, 1, ...replacement)
    else if (next) ordering.push({ key, direction: next })
    if (config.value.sort === undefined) local.value = ordering
    config.value.onSortChange?.(ordering)
  }
  return { sort, sortedData, direction, toggle, applySort }
}

export const useTableSortable = useTableSortableState
