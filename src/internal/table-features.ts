import { computed, markRaw, onScopeDispose, ref, shallowRef, toRaw, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type VNodeChild } from 'vue'
import type { TableKey } from '../types'

interface RowGroup<Row, Key> { key: Key; rows: readonly Row[] }

function collectGroups<Row, Key>(rows: readonly Row[], groupBy: (row: Row) => Key): RowGroup<Row, Key>[] {
  const groups = new Map<Key, Row[]>()
  for (const row of rows) {
    const key = groupBy(row)
    const siblings = groups.get(key)
    if (siblings) siblings.push(row)
    else groups.set(key, [row])
  }
  return Array.from(groups, ([key, rows]) => ({ key, rows }))
}

export interface TableRowGroup<Row> extends RowGroup<Row, TableKey> {
  label: string
  collapsed: boolean
}

export interface TableGroupedRowsOptions<Row> {
  data: readonly Row[]
  groupBy: (row: Row) => TableKey
  collapsedGroups?: ReadonlySet<TableKey>
  defaultCollapsedGroups?: Iterable<TableKey>
  groupOrder?: readonly TableKey[]
  onToggleGroup?: (key: TableKey, collapsed: boolean) => void
  getGroupLabel?: (key: TableKey, count: number, collapsed: boolean) => string
  renderGroupHeader?: (key: TableKey, count: number, collapsed: boolean) => VNodeChild
}

export interface TableGroupedRowsControl<Row> {
  groupsFor: (rows: readonly Row[]) => TableRowGroup<Row>[]
  toggle: (key: TableKey) => void
  renderGroupHeader: (group: TableRowGroup<Row>) => VNodeChild
}

export function useTableGroupedRows<Row, Key>(rows: MaybeRefOrGetter<readonly Row[]>, group: (row: Row) => Key): ComputedRef<RowGroup<Row, Key>[]>
export function useTableGroupedRows<Row>(options: MaybeRefOrGetter<TableGroupedRowsOptions<Row>>): {
  groups: ComputedRef<TableRowGroup<Row>[]>; control: TableGroupedRowsControl<Row>
}
export function useTableGroupedRows<Row, Key>(
  input: MaybeRefOrGetter<readonly Row[]> | MaybeRefOrGetter<TableGroupedRowsOptions<Row>>,
  keyOf?: (row: Row) => Key,
) {
  if (keyOf) return computed(() => collectGroups(toValue(input as MaybeRefOrGetter<readonly Row[]>), keyOf))
  const options = computed(() => toValue(input as MaybeRefOrGetter<TableGroupedRowsOptions<Row>>))
  const local = shallowRef<ReadonlySet<TableKey>>(new Set(options.value.defaultCollapsedGroups))
  const collapsed = computed(() => options.value.collapsedGroups ?? local.value)
  const groupOrder = computed(() => new Map([...new Set([...(options.value.groupOrder ?? []), ...options.value.data.map(options.value.groupBy)])]
    .map((key, index) => [key, index])))
  function groupsFor(rows: readonly Row[]) {
    return collectGroups(rows, options.value.groupBy)
      .sort((left, right) => (groupOrder.value.get(left.key) ?? Infinity) - (groupOrder.value.get(right.key) ?? Infinity))
      .map(group => {
        const hidden = collapsed.value.has(group.key)
        return { ...group, collapsed: hidden, label: options.value.getGroupLabel?.(group.key, group.rows.length, hidden) ?? `${group.key} (${group.rows.length})` }
      })
  }
  function toggle(key: TableKey) {
    const next = new Set(collapsed.value)
    const hidden = !next.delete(key)
    if (hidden) next.add(key)
    if (options.value.collapsedGroups === undefined) local.value = next
    options.value.onToggleGroup?.(key, hidden)
  }
  const control = markRaw<TableGroupedRowsControl<Row>>({ groupsFor, toggle, renderGroupHeader(group) {
    return options.value.renderGroupHeader?.(group.key, group.rows.length, group.collapsed) ?? group.label
  } })
  return { groups: computed(() => groupsFor(options.value.data)), control }
}

export interface TableRowIndexOptions<Row> {
  data?: readonly Row[]
  getRowKey?: (row: Row) => TableKey
  label?: string
  startFrom?: number
}

export interface TableRowIndexColumn<Row> {
  label: ComputedRef<string>
  numberFor: (row: Row, position: number) => number | undefined
}

export function useTableRowIndex<Row>(rows: MaybeRefOrGetter<readonly Row[]>, keyOf: (row: Row) => TableKey): (key: TableKey) => number | undefined
export function useTableRowIndex<Row>(options?: MaybeRefOrGetter<TableRowIndexOptions<Row>>): TableRowIndexColumn<Row>
export function useTableRowIndex<Row>(
  input: MaybeRefOrGetter<readonly Row[]> | MaybeRefOrGetter<TableRowIndexOptions<Row>> = {},
  keyOf?: (row: Row) => TableKey,
) {
  if (keyOf) {
    const index = computed(() => new Map(toValue(input as MaybeRefOrGetter<readonly Row[]>).map((row, position) => [keyOf(row), position])))
    return (key: TableKey) => index.value.get(key)
  }
  const options = computed(() => toValue(input as MaybeRefOrGetter<TableRowIndexOptions<Row>>))
  const key = (row: Row) => options.value.getRowKey ? options.value.getRowKey(row) : toRaw(row)
  const lookup = computed(() => options.value.data && new Map(options.value.data.map((row, position) => [key(row), position])))
  const start = computed(() => {
    const value = options.value.startFrom ?? 1
    return Number.isFinite(value) ? Math.trunc(value) : 1
  })
  return markRaw({ label: computed(() => options.value.label ?? '#'), numberFor(row: Row, position: number) {
    const index = lookup.value ? lookup.value.get(key(row)) : position
    return index === undefined ? undefined : start.value + index
  } })
}

export type TableRowStatus = { status: 'success' | 'warning' | 'error'; label: string; color?: never; icon?: never }
  | { status?: never; color: string; icon?: string; label: string }

export interface TableRowMarker { color: string; label: string; icon?: string }
const rowStatusColors: Record<string, string> = {
  success: 'var(--sy-success)', warning: 'var(--sy-warning)', error: 'var(--sy-danger)', accent: 'var(--sy-accent)',
}
export function useTableRowStatus<Row>(getStatus: (row: Row) => TableRowStatus | null | undefined) {
  return (row: Row): TableRowMarker | null => {
    const value = getStatus(row)
    if (!value) return null
    const color = value.status ?? value.color
    const paint = Object.hasOwn(rowStatusColors, color) ? rowStatusColors[color] : color
    return { color: paint, label: value.label, icon: value.status ?? value.icon }
  }
}

export interface TableInfiniteScrollOptions {
  sentinel: MaybeRefOrGetter<Element | null | undefined>
  viewport: MaybeRefOrGetter<Element | null | undefined>
  hasMore: MaybeRefOrGetter<boolean>
  loading?: MaybeRefOrGetter<boolean>
  count: MaybeRefOrGetter<number>
  load: () => void
  margin?: string
}

export interface TableInfiniteLoaderOptions {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => Promise<void>
}

export interface TableInfiniteLoader {
  hasMore: ComputedRef<boolean>
  busy: ComputedRef<boolean>
  request: (getCount: () => number, manual?: boolean) => void
}

export function useTableInfiniteScroll(options: TableInfiniteScrollOptions): (manual?: boolean) => void
export function useTableInfiniteScroll(options: MaybeRefOrGetter<TableInfiniteLoaderOptions>): TableInfiniteLoader
export function useTableInfiniteScroll(options: TableInfiniteScrollOptions | MaybeRefOrGetter<TableInfiniteLoaderOptions>) {
  if (typeof options === 'object' && 'sentinel' in options) return observeLegacyTableEnd(options)

  const config = computed(() => toValue(options))
  const hasMore = computed(() => config.value.hasMore)
  const pending = ref(false)
  const busy = computed(() => pending.value || config.value.isLoading)
  const settled = shallowRef<{ ok: boolean; count: number; getCount: () => number }>()
  let paused = false
  let disposed = false
  onScopeDispose(() => { disposed = true }, true)

  function request(getCount: () => number, manual = false) {
    if (disposed || busy.value || !hasMore.value || paused && !manual) return
    pending.value = true
    const count = getCount()
    function finish(ok: boolean) {
      if (!disposed) settled.value = { ok, count, getCount }
    }
    try {
      const work = config.value.onLoadMore()
      if (work && typeof work.then === 'function') Promise.resolve(work).then(() => finish(true), () => finish(false))
      else finish(false)
    } catch { finish(false) }
  }

  watch([settled, () => config.value.isLoading], ([result, loading]) => {
    if (!result || loading) return
    paused = !result.ok || result.getCount() <= result.count
    settled.value = undefined
    pending.value = false
  }, { flush: 'post' })

  return markRaw({ hasMore, busy, request })
}

function observeLegacyTableEnd(options: TableInfiniteScrollOptions) {
  let requested = -1
  function request(manual = false) {
    const count = toValue(options.count)
    if (!toValue(options.hasMore) || toValue(options.loading) || (!manual && requested === count)) return
    requested = count
    options.load()
  }
  watch(() => [toValue(options.sentinel), toValue(options.viewport), toValue(options.hasMore), toValue(options.loading), toValue(options.count)] as const,
    ([node, viewport, enabled, busy], _, cleanup) => {
      if (!enabled) requested = -1
      const Observer = node?.ownerDocument.defaultView?.IntersectionObserver
      if (!node || !viewport || !enabled || busy || !Observer) return
      const observer = new Observer(entries => {
        if (entries.some(entry => entry.isIntersecting)) request()
      }, { root: viewport, rootMargin: options.margin ?? '0px 0px 20px' })
      observer.observe(node)
      cleanup(() => observer.disconnect())
    }, { flush: 'post', immediate: true })
  return request
}
