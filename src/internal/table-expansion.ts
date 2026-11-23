import { computed, shallowRef, toValue, type MaybeRefOrGetter, type VNodeChild } from 'vue'
import type { TableKey } from '../types'
import { flattenTree, type TreeChildren } from './tree-data'

export interface TableTreeRowMeta {
  id: TableKey
  level: number
  hasChildren: boolean
  isExpanded: boolean
}

export interface TableTreeData<Row> {
  getRowMeta: (row: Row) => TableTreeRowMeta | undefined
  getChildKeys?: (row: Row) => readonly TableKey[]
  onToggleItem: (row: Row) => void
  getRowLabel?: (row: Row) => string
  hasExpandableRows: boolean
  hasExpandAllControl?: boolean
  isAllExpanded?: boolean | 'indeterminate'
  onExpandAll?: () => void
  onCollapseAll?: () => void
  indent?: 'sm' | 'md' | 'lg'
  treeColumnKey?: string
  hasRowClickExpansion?: boolean
  getToggleLabel?: (row: Row, expanded: boolean) => string
  expandAllLabel?: string
  collapseAllLabel?: string
}

export interface TableTreeStateOptions<Row extends object> {
  data: readonly Row[]
  idKey: keyof Row & string | ((row: Row) => TableKey)
  childrenKey?: keyof Row & string
  getChildren?: TreeChildren<Row>
  defaultExpandedIds?: Iterable<TableKey>
  expandedIds?: ReadonlySet<TableKey>
  onExpandedIdsChange?: (keys: ReadonlySet<TableKey>) => void
  isItemExpandable?: (row: Row) => boolean
  sortSiblings?: (siblings: readonly Row[]) => readonly Row[]
  indent?: TableTreeData<Row>['indent']
  treeColumnKey?: string
}

export function useTableTreeState<Row extends object>(options: MaybeRefOrGetter<TableTreeStateOptions<Row>>) {
  const config = computed(() => toValue(options))
  const local = shallowRef<ReadonlySet<TableKey>>(new Set(config.value.defaultExpandedIds))
  const expandedIds = computed(() => config.value.expandedIds ?? local.value)
  function keyOf(row: Row): TableKey {
    const key = config.value.idKey
    if (typeof key === 'function') return key(row)
    const value = row[key]
    return typeof value === 'number' ? value : String(value)
  }
  function childrenOf(row: Row): readonly Row[] {
    if (config.value.getChildren) return config.value.getChildren(row) ?? []
    const childProperty = config.value.childrenKey ?? 'children'
    const children = (row as Record<string, unknown>)[childProperty]
    return Array.isArray(children) ? children : []
  }
  const sort = (rows: readonly Row[]) => config.value.sortSiblings?.(rows) ?? rows
  const expandable = (row: Row) => config.value.isItemExpandable?.(row) ?? childrenOf(row).length > 0
  const all = computed(() => flattenTree([config.value.data], keyOf, childrenOf))
  const branches = computed(() => all.value.filter(entry => expandable(entry.item)).map(entry => entry.key))
  const visible = computed(() => flattenTree([sort(config.value.data)], keyOf, row => sort(childrenOf(row)),
    (row, key) => expandable(row) && expandedIds.value.has(key)))
  const visibleData = computed(() => visible.value.map(entry => entry.item))
  const metadata = computed(() => new Map(visible.value.map(entry => [entry.key, {
    id: entry.key, level: entry.level - 1, hasChildren: expandable(entry.item), isExpanded: expandedIds.value.has(entry.key),
  }])))
  const childKeys = computed(() => {
    const index = new Map<TableKey, TableKey[]>()
    for (const { parent, key } of visible.value) {
      if (parent === null) continue
      const children = index.get(parent)
      if (children) children.push(key)
      else index.set(parent, [key])
    }
    return index
  })
  const isAllExpanded = computed(() => {
    const count = branches.value.filter(key => expandedIds.value.has(key)).length
    return count === 0 ? false : count === branches.value.length ? true : 'indeterminate'
  })
  function update(next: ReadonlySet<TableKey>) {
    if (config.value.expandedIds === undefined) local.value = next
    config.value.onExpandedIdsChange?.(next)
  }
  function toggle(row: Row) {
    if (!expandable(row)) return
    const key = keyOf(row)
    const next = new Set(expandedIds.value)
    if (!next.delete(key)) next.add(key)
    update(next)
  }
  const expandAll = () => update(new Set([...expandedIds.value, ...branches.value]))
  const collapseAll = () => update(new Set())
  const treeConfig = computed<TableTreeData<Row>>(() => ({
    getRowMeta: row => metadata.value.get(keyOf(row)), getChildKeys: row => childKeys.value.get(keyOf(row)) ?? [],
    onToggleItem: toggle, hasExpandableRows: Boolean(branches.value.length), isAllExpanded: isAllExpanded.value,
    onExpandAll: expandAll, onCollapseAll: collapseAll, indent: config.value.indent, treeColumnKey: config.value.treeColumnKey,
  }))
  return { visibleData, treeConfig, expandedIds, isAllExpanded, expandAll, collapseAll }
}

export function useTableTreeData<Row>(options: MaybeRefOrGetter<TableTreeData<Row>>) {
  return computed(() => toValue(options))
}

export interface TableRowExpansion<Row> {
  expandedKeys: ReadonlySet<TableKey>
  onToggle: (key: TableKey) => void
  getRowKey: (row: Row) => TableKey
  getRowLabel?: (row: Row) => string
  getIsItemExpandable?: (row: Row) => boolean
  renderExpanded?: (row: Row) => VNodeChild
  panelVariant?: 'muted' | 'transparent'
  hasRowClickExpansion?: boolean
  animatedLayout?: (row: HTMLElement) => void | (() => void)
  getToggleLabel?: (row: Row, expanded: boolean) => string
}

export function useTableRowExpansion<Row>(options: MaybeRefOrGetter<TableRowExpansion<Row>>) {
  return computed(() => toValue(options))
}
