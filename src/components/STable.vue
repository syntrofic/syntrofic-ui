<script setup lang="ts" generic="Row extends object">
import { computed, nextTick, onBeforeUpdate, shallowRef, useId, useSlots, useTemplateRef, watch } from 'vue'
import SButton from './SButton.vue'
import SCheckbox from './SCheckbox.vue'
import SPopover from './SPopover.vue'
import SSpinner from './SSpinner.vue'
import SMotionText from './SMotionText.vue'
import { useTableContentMotion } from '../internal/table-motion'
import { useTableCells } from '../internal/table-cells'
import { useTableRowStatus, type TableGroupedRowsControl, type TableInfiniteLoader, type TableRowGroup, type TableRowIndexColumn, type TableRowStatus } from '../internal/table-features'
import { useDevWarning } from '../internal/element-behavior'
import STablePageControls from '../internal/STablePageControls.vue'
import STableColumnFilter from '../internal/STableColumnFilter.vue'
import SShellResizeHandle from '../internal/SShellResizeHandle.vue'
import STableRowMarker from '../internal/STableRowMarker.vue'
import { useTableWindow } from '../internal/table-window'
import type { TableRowsVirtualization } from '../internal/table-row-geometry'
import { useTableColumnResize, useTableColumnResizeView, type TableColumnResizeControl } from '../internal/table-column-resize'
import type { TableColumnSettingsControl } from '../internal/table-column-settings'
import { useTableStickyView, type TableStickyColumnsControl } from '../internal/table-column-sticky'
import { useTableColumnWindow, type TableColumnsVirtualization } from '../internal/table-columns-window'
import type { TableColumnFilteringControl } from '../internal/table-filtering'
import { useTableTextOverflow } from '../internal/table-text-overflow'
import { labelDirection } from '../internal/label-direction'
import SInlineLabel from '../internal/SInlineLabel'
import { useTablePagination, useTableSelection, useTableSortableState, type TablePaginationAlign, type TablePaginationControl,
  type TablePaginationPosition, type TablePaginationVariant } from '../internal/table-state'
import type { TableRowExpansion, TableTreeData } from '../internal/table-expansion'
import { treeElementKey } from '../internal/tree-data'
import type { TableColumn, TableDensity, TableKey, TableSort, TableTextOverflow, TableVirtualOptions } from '../types'

const props = withDefaults(defineProps<{
  label: string
  rows: readonly Row[]
  columns: readonly TableColumn<Row>[]
  rowKey: (row: Row) => TableKey
  density?: TableDensity
  textOverflow?: TableTextOverflow
  columnLayout?: 'auto' | 'fixed'
  striped?: boolean
  dividers?: 'none' | 'rows' | 'grid'
  highlightOnHover?: boolean
  selectionMode?: 'none' | 'multiple'
  isRowDisabled?: (row: Row) => boolean
  isRowSelectable?: (row: Row) => boolean
  rowLabel?: (row: Row) => string
  rowStatus?: (row: Row) => TableRowStatus | null | undefined
  rowIndex?: TableRowIndexColumn<Row>
  statusColumnLabel?: string
  loading?: boolean
  emptyText?: string
  loadingText?: string
  pageSize?: number
  rowCount?: number
  totalPages?: number
  hasMore?: boolean
  pageSizeOptions?: readonly number[]
  pageSizeLabel?: string
  paginationVariant?: TablePaginationVariant
  paginationPosition?: TablePaginationPosition
  paginationAlign?: TablePaginationAlign
  pagination?: TablePaginationControl
  paginationLabel?: (label: string, position: 'above' | 'below') => string
  sortMode?: 'client' | 'manual'
  multiSort?: boolean
  allowUnsorted?: boolean
  sortPriorityLabel?: (priority: number, direction: TableSort['direction']) => string
  previousLabel?: string
  nextLabel?: string
  selectAllLabel?: string
  selectionColumnLabel?: string
  pageLabel?: string
  locale?: string
  virtual?: TableVirtualOptions
  virtualization?: TableRowsVirtualization | TableColumnsVirtualization | readonly (TableRowsVirtualization | TableColumnsVirtualization)[]
  tree?: TableTreeData<Row>
  rowExpansion?: TableRowExpansion<Row>
  rowGroups?: TableGroupedRowsControl<Row>
  columnResize?: TableColumnResizeControl<Row>
  columnSettings?: TableColumnSettingsControl
  stickyColumns?: TableStickyColumnsControl
  columnFiltering?: TableColumnFilteringControl
  infiniteScroll?: TableInfiniteLoader
  loadMoreLabel?: string
  loadingMoreLabel?: string
}>(), {
  selectionMode: 'none',
  striped: true,
  statusColumnLabel: 'Row status',
  emptyText: 'No rows',
  loadingText: 'Loading rows',
  sortMode: 'client',
  sortPriorityLabel: (priority, direction) => `Sort priority ${priority}, ${direction}`,
  previousLabel: 'Previous',
  nextLabel: 'Next',
  selectAllLabel: 'Select all rows on this page',
  selectionColumnLabel: 'Select rows',
  pageLabel: 'Pagination',
  pageSizeLabel: 'Rows per page',
  paginationVariant: 'compact',
  paginationAlign: 'end',
  hasMore: undefined,
  loadMoreLabel: 'Load more',
  loadingMoreLabel: 'Loading more rows',
})

const selected = defineModel<readonly TableKey[]>('selected', { default: () => [] })
const sort = defineModel<TableSort | null>('sort', { default: null })
const sorts = defineModel<readonly TableSort[]>('sorts', { default: () => [] })
const page = defineModel<number>('page', { default: 1 })
const emit = defineEmits<{ 'update:pageSize': [size: number] }>()
const captionId = useId()
const messageKey = Symbol('table-message')
const tree = computed(() => props.tree?.hasExpandableRows ? props.tree : undefined)
const slots = useSlots()
const activeColumns = computed(() => props.columnSettings?.applyColumns(props.columns) ?? props.columns)
const treeColumn = computed(() => activeColumns.value.find(column => column.key === tree.value?.treeColumnKey)?.key ?? activeColumns.value[0]?.key)
const detailMenuOpen = shallowRef(false)
const detailMenuPoint = useTemplateRef<HTMLElement>('detailMenuPoint')
const detailMenuItem = useTemplateRef<HTMLButtonElement>('detailMenuItem')
const tail = useTemplateRef<HTMLDivElement>('tail')
const detailContext = shallowRef<{ row: Row; element: HTMLElement; tree: boolean; x: number; y: number }>()
watch([detailMenuOpen, detailMenuItem], ([open, item], _, cleanup) => {
  const view = item?.ownerDocument.defaultView
  if (!open || !item || !view) return
  const frame = view.requestAnimationFrame(() => item.focus({ preventScroll: true }))
  cleanup(() => view.cancelAnimationFrame(frame))
}, { flush: 'post' })

const { numberFormat, formatCell } = useTableCells(() => props.locale)
const sortController = useTableSortableState(() => ({ data: props.rows, columns: props.columns,
  sort: props.multiSort && sorts.value.length ? sorts.value : sort.value ? [sort.value] : [], locale: props.locale,
  manual: props.sortMode === 'manual' || Boolean(tree.value), isMultiSortEnabled: props.multiSort, allowUnsortedState: props.allowUnsorted,
  onSortChange(order) { if (props.multiSort) sorts.value = order; sort.value = order[0] ?? null },
}))
const { sortedData: orderedRows, sort: ordering } = sortController
const priorities = computed(() => new Map(ordering.value.length > 1 ? ordering.value.map((entry, index) => [entry.key, index + 1] as const) : []))
function sortDescription(key: string) {
  const priority = priorities.value.get(key)
  return priority && props.sortPriorityLabel(priority, ordering.value[priority - 1].direction) || undefined
}
function priorityDisplay(key: string) {
  const priority = priorities.value.get(key)
  return priority ? numberFormat.value.format(priority) : ''
}
const remote = computed(() => Boolean(props.pagination) || props.rowCount !== undefined || props.totalPages !== undefined || props.hasMore !== undefined)
const localPageSize = computed(() => props.pageSize !== undefined && Number.isFinite(props.pageSize) ? Math.max(1, Math.trunc(props.pageSize)) : 0)
const groupPages = computed(() => {
  const control = props.rowGroups
  const size = localPageSize.value
  if (!control || remote.value || !size) return
  const result: { rows: Row[]; offset: number }[] = []
  let page: Row[] = []
  let offset = 0
  for (const group of control.groupsFor(orderedRows.value)) {
    if (page.length >= size) {
      result.push({ rows: page, offset })
      offset += page.length
      page = []
    }
    for (const row of group.rows) page.push(row)
  }
  if (page.length) result.push({ rows: page, offset })
  return result
})
const localPagination = useTablePagination(() => ({ page: page.value,
  pageSize: localPageSize.value,
  totalItems: props.rowCount ?? (remote.value ? undefined : props.rows.length), totalPages: props.totalPages ?? groupPages.value?.length, hasMore: props.hasMore,
  onPageChange: value => { page.value = value }, loading: props.loading,
  onPageSizeChange(size) { emit('update:pageSize', size); page.value = 1 },
  pageSizeOptions: props.pageSizeOptions, position: props.paginationPosition, variant: props.paginationVariant,
  align: props.paginationAlign, label: props.pageLabel,
}))
const paging = computed(() => props.pagination ?? localPagination)
const currentPage = computed(() => paging.value.page.value)
const pageSize = computed(() => paging.value.pageSize.value)
const pages = computed(() => paging.value.pages.value)
const offset = computed(() => paging.value.offset.value)
const total = computed(() => paging.value.totalItems.value)
const busy = computed(() => props.loading || paging.value.loading.value)
const groupPage = computed(() => groupPages.value?.[currentPage.value - 1])
const pageOffset = computed(() => groupPage.value?.offset ?? offset.value)
const pageRows = computed(() => {
  if (groupPage.value) return groupPage.value.rows
  if (!pageSize.value || remote.value) return orderedRows.value
  return orderedRows.value.slice(offset.value, offset.value + pageSize.value)
})
const groups = computed(() => props.rowGroups?.groupsFor(pageRows.value))
const visibleRows = computed(() => groups.value?.flatMap(group => group.collapsed ? [] : group.rows) ?? pageRows.value)

type DataRow = { key: TableKey; row: Row; detail: boolean; striped: boolean; position: number; parentGroup?: string }
type GroupRow = { key: TableKey; group: TableRowGroup<Row> }
function bodyRows(row: Row, index: number, parentGroup?: string): DataRow[] {
  const key = props.rowKey(row)
  const data = { row, key: props.rowExpansion || props.rowGroups ? `data:${treeElementKey(key)}` : key, detail: false, striped: index % 2 === 1,
    position: pageOffset.value + index, parentGroup }
  return detailExpanded(row) ? [data, { ...data, key: `panel:${treeElementKey(key)}`, detail: true }] : [data]
}
const physicalRows = computed<(DataRow | GroupRow)[]>(() => {
  if (!groups.value) return pageRows.value.flatMap((row, index) => bodyRows(row, index))
  const result: (DataRow | GroupRow)[] = []
  let index = 0
  for (const group of groups.value) {
    result.push({ key: `group:${treeElementKey(group.key)}`, group })
    if (group.collapsed) index += group.rows.length
    else for (const row of group.rows) result.push(...bodyRows(row, index++, groupId(group.key)))
  }
  return result
})
const capabilities = computed(() => {
  const input = props.virtualization
  return input ? Array.isArray(input) ? input : [input] as readonly (TableRowsVirtualization | TableColumnsVirtualization)[] : []
})
const rowCapability = computed(() => capabilities.value.find((item): item is TableRowsVirtualization => 'geometry' in item))
const columnCapability = computed(() => capabilities.value.find((item): item is TableColumnsVirtualization => 'columnGeometry' in item))
const rectangular = computed(() => !props.rowGroups && !props.rowExpansion && !tree.value && !slots.cell)
const stableIdentity = computed(() => {
  const seen = new Set<TableKey>()
  for (const row of props.rows) {
    const key = props.rowKey(row)
    if ((typeof key !== 'string' && (typeof key !== 'number' || !Number.isFinite(key))) || seen.has(key)) return false
    seen.add(key)
  }
  return true
})
const fixedGeometry = computed(() => !props.virtual && props.textOverflow !== 'wrap' && !activeColumns.value.some(column => column.wrap)
  && rectangular.value && rowCapability.value && stableIdentity.value
  ? rowCapability.value.geometry.value : undefined)
const { virtual: windowOptions, layout, viewport, header, measureRow, pinFrom, fixed } = useTableWindow(
  () => physicalRows.value,
  item => item.key,
  () => props.virtual,
  fixedGeometry,
)
const auxiliaryWidths = computed(() => [props.rowIndex ? 56 : 0, props.rowExpansion ? 40 : 0, props.rowStatus ? 30 : 0,
  props.selectionMode === 'multiple' ? 46 : 0].filter(Boolean))
const auxiliaryKeys = computed(() => [
  props.rowIndex ? 'index' : '', props.rowExpansion ? 'details' : '', props.rowStatus ? 'status' : '',
  props.selectionMode === 'multiple' ? 'selection' : '',
].filter(Boolean))
const stickyKeys = computed(() => activeColumns.value.map(column => column.key))
const sticky = useTableStickyView({ control: () => props.stickyColumns, viewport, header,
  keys: () => stickyKeys.value, auxiliary: () => auxiliaryKeys.value })
const auxiliaryExtent = computed(() => auxiliaryWidths.value.reduce((sum, width) => sum + width, 0))
const fixedColumns = useTableColumnResize<Row>()
const sizingControl = computed(() => props.columnResize ?? (props.columnLayout === 'fixed' ? fixedColumns : undefined))
const columnSizing = useTableColumnResizeView({ control: () => sizingControl.value, columns: () => activeColumns.value,
  leadingWidth: () => auxiliaryExtent.value, viewport })
const columnWindow = useTableColumnWindow({
  config: () => props.textOverflow !== 'wrap' && rectangular.value && !slots.footer && columnCapability.value && stableIdentity.value
    ? columnCapability.value.columnGeometry.value : undefined,
  columns: () => activeColumns.value, viewport, pins: () => sticky.ranges.value, leadingWidth: () => auxiliaryExtent.value,
  width(column) {
    const sized = columnSizing.byKey.value.get(column.key)
    if (sized) return sized.pixels
    const declared = column.width?.match(/^(\d*\.?\d+)px$/)?.[1]
    if (declared !== undefined) return Number(declared)
    return column.width === undefined ? column.minWidth : undefined
  },
  minimumWidth: () => windowOptions.value?.minimumWidth,
})
const columnEntries = columnWindow.entries
const overflowMode = computed(() => props.textOverflow ?? (fixedGeometry.value || columnWindow.enabled.value ? 'truncate' : props.columnLayout === 'fixed' ? 'wrap' : undefined))
const truncate = computed(() => overflowMode.value === 'truncate')
const headerDirections = computed(() => new Map(truncate.value ? activeColumns.value.map(column => [column.key, labelDirection(column.label)]) : []))
const RenderOverflow = useTableTextOverflow(viewport, truncate)
const tableWidth = computed(() => columnWindow.width.value ?? columnSizing.total.value)
const physicalColumnCount = computed(() => auxiliaryWidths.value.length + columnEntries.value.length)
const bodyState = computed(() => pageRows.value.length ? 'rows' : busy.value ? 'loading' : 'empty')
const liveBody = (frame: HTMLElement) => frame.querySelector<HTMLTableSectionElement>(':scope > .sy-table__grid:not([data-layout-swap-copy]) > tbody')
const hasWindow = () => Boolean(windowOptions.value || fixedGeometry.value || columnWindow.enabled.value)
let delegatedLayout = false
watch(bodyState, () => {
  const node = viewport.value
  if (node && liveBody(node)?.contains(node.ownerDocument.activeElement)) node.focus({ preventScroll: true })
})
useTableContentMotion(viewport,
  () => `${props.textOverflow ?? 'auto'}:${bodyState.value}:${bodyState.value === 'rows' ? '' : busy.value ? props.loadingText : props.emptyText}`,
  () => physicalRows.value.map(row => row.key), hasWindow, () => !delegatedLayout)
function columnPosition(index: number) {
  return columnWindow.enabled.value ? auxiliaryKeys.value.length + index + 1 : undefined
}
function auxiliaryIndex(key: string) {
  return columnWindow.enabled.value ? auxiliaryKeys.value.indexOf(key) + 1 : undefined
}
function scrollTable() { sticky.updateEdges(); columnWindow.update() }
function pinCell(target: EventTarget | null) { pinFrom(target); columnWindow.pinFrom(target) }
function columnId(key: string) { return `${captionId}-col-${encodeURIComponent(key)}` }
function headingId(key: string) { return `${captionId}-heading-${encodeURIComponent(key)}` }
function resizeGesture(key: string, active: boolean, event?: PointerEvent) {
  if (active) columnSizing.begin(key)
  else columnSizing.finish(key, event?.type === 'pointerup')
}
useDevWarning(() => Boolean(rowCapability.value) && !props.virtual && !fixedGeometry.value,
  'STable fixed row virtualization uses valid dimensions, unique row keys and flat, single-line cells.')
useDevWarning(() => Boolean(columnCapability.value) && !columnWindow.enabled.value,
  'STable column virtualization uses known column widths, unique keys and flat, single-line cells.')
useDevWarning(() => Boolean(fixed?.unequal.value), 'STable renders every row when fixed-window rows have different heights.')
useDevWarning(() => Boolean(fixedGeometry.value && fixed?.height.value && fixed.height.value > fixedGeometry.value.rowHeight + 1),
  'STable now uses the measured row height because its rows need more space.')
const supportsInfiniteScroll = computed(() => !tree.value && !props.rowGroups && !props.rowExpansion && !pageSize.value)
const infinite = computed(() => supportsInfiniteScroll.value ? props.infiniteScroll : undefined)
const hasNextBatch = computed(() => Boolean(infinite.value?.hasMore.value))
const loadingNextBatch = computed(() => Boolean(infinite.value?.busy.value))
const rowCount = () => props.rows.length
function loadNextBatch() { if (!busy.value) infinite.value?.request(rowCount, true) }
useDevWarning(() => Boolean(props.infiniteScroll) && !supportsInfiniteScroll.value, 'STable infinite scrolling uses flat, unpaged rows.')
watch(() => [tail.value, viewport.value, Boolean(windowOptions.value), hasNextBatch.value, loadingNextBatch.value || busy.value, rowCount()] as const,
  ([sentinel, node, isWindowed, more, loading], _, cleanup) => {
    const Observer = sentinel?.ownerDocument.defaultView?.IntersectionObserver
    if (!sentinel || !Observer || (isWindowed && !node) || !more || loading) return
    let active = true
    const observer = new Observer(entries => {
      if (active && entries.some(entry => entry.isIntersecting)) infinite.value?.request(rowCount)
    }, { root: isWindowed ? node : null })
    observer.observe(sentinel)
    cleanup(() => { active = false; observer.disconnect() })
  }, { flush: 'post', immediate: true })
const renderedRows = computed(() => new Set(layout.value.flatMap(item => item.kind === 'row' ? [
  'group' in item.row ? groupId(item.row.group.key) : item.row.detail ? panelId(item.row.row) : rowId(props.rowKey(item.row.row)),
] : [])))
const pageLabelValue = computed(() => {
  const format = numberFormat.value
  if (paging.value.variant.value === 'count' && total.value !== undefined) {
    const from = total.value === 0 ? 0 : pageOffset.value + 1
    const end = Math.min(total.value, pageOffset.value + (groupPage.value?.rows.length ?? pageSize.value))
    return `${format.format(from)}–${format.format(end)} / ${format.format(total.value)}`
  }
  if (pages.value === undefined) return format.format(currentPage.value)
  const last = format.format(pages.value)
  const current = numberFormat.value.format(currentPage.value).padStart(last.length, '\u2007')
  return `${current} / ${last}`
})
const pageControls = computed(() => ({ page: currentPage.value, pages: pages.value, pageSize: pageSize.value,
  disabled: Boolean(busy.value), align: paging.value.align.value, variant: paging.value.variant.value,
  pageSummary: pageLabelValue.value, locale: props.locale, pageSizeLabel: props.pageSizeLabel,
  sizes: paging.value.sizes.value.map(size => ({ value: String(size), label: numberFormat.value.format(size) })),
  previousLabel: props.previousLabel, nextLabel: props.nextLabel, previous: paging.value.hasPrevious.value, next: paging.value.hasNext.value,
  go: updatePage, resize: updateSize,
}))
function pagingAt(position: 'above' | 'below') {
  const location = paging.value.position.value
  return pageSize.value > 0 && paging.value.variant.value !== 'none' && (location === position || location === 'both')
}
function pagingLabel(position: 'above' | 'below') {
  const label = paging.value.label.value
  if (paging.value.position.value !== 'both') return label
  return props.paginationLabel?.(label, position) ?? `${label} (${position === 'above' ? 'top' : 'bottom'})`
}
const leadingColumns = computed(() => Number(props.selectionMode === 'multiple') + Number(Boolean(props.rowStatus)) +
  Number(Boolean(props.rowExpansion)) + Number(Boolean(props.rowIndex)))
const columnCount = computed(() => activeColumns.value.length + leadingColumns.value)
const resolveStatus = useTableRowStatus((row: Row) => props.rowStatus?.(row))
const selection = useTableSelection(() => ({ data: visibleRows.value, rowKey: props.rowKey, selectedKeys: selected.value,
  getIsItemSelectable: props.isRowSelectable, getIsItemEnabled: row => !props.isRowDisabled?.(row),
  onSelectionChange: value => { selected.value = value },
}))
const { selected: selectedKeys, available: selectableKeys, allSelected, someSelected } = selection

function rowId(key: TableKey) { return `${captionId}-row-${encodeURIComponent(treeElementKey(key))}` }
function panelId(row: Row) { return `${captionId}-detail-${encodeURIComponent(treeElementKey(props.rowKey(row)))}` }
function groupId(key: TableKey) { return `${captionId}-group-${encodeURIComponent(treeElementKey(key))}` }
function groupControls(group: TableRowGroup<Row>) {
  if (group.collapsed) return
  return group.rows.map(row => rowId(props.rowKey(row))).filter(id => renderedRows.value.has(id)).join(' ') || undefined
}
function toggleGroup(item: DataRow | GroupRow) {
  if ('group' in item) props.rowGroups?.toggle(item.group.key)
}
const RenderGroup = ({ group }: { group: TableRowGroup<Row> }) => props.rowGroups?.renderGroupHeader(group)
function expandLabel(expanded: boolean, label?: string) { return `${expanded ? 'Collapse' : 'Expand'} ${label?.trim() || 'row'}` }
function treeToggleLabel(row: Row) {
  const expanded = Boolean(tree.value?.getRowMeta(row)?.isExpanded)
  return tree.value?.getToggleLabel?.(row, expanded) ?? expandLabel(expanded, tree.value?.getRowLabel?.(row) ?? props.rowLabel?.(row))
}
function treeControls(row: Row) {
  if (!tree.value?.getRowMeta(row)?.isExpanded) return
  return tree.value.getChildKeys?.(row).map(rowId).filter(id => renderedRows.value.has(id)).join(' ') || undefined
}
function canExpandDetail(row: Row) { return Boolean(props.rowExpansion && props.rowExpansion.getIsItemExpandable?.(row) !== false) }
function detailExpanded(row: Row) {
  const expansion = props.rowExpansion
  return expansion && canExpandDetail(row) && expansion.expandedKeys.has(expansion.getRowKey(row))
}
function detailLabel(row: Row) {
  const expanded = Boolean(detailExpanded(row))
  return props.rowExpansion?.getToggleLabel?.(row, expanded) ?? expandLabel(expanded, props.rowExpansion?.getRowLabel?.(row) ?? props.rowLabel?.(row))
}
const RenderDetail = ({ row }: { row: Row }) => props.rowExpansion?.renderExpanded?.(row)
function toggleDetail(row: Row, element?: HTMLElement | null) {
  const expansion = props.rowExpansion
  if (!expansion || !canExpandDetail(row) || busy.value || props.isRowDisabled?.(row)) return
  const play = element && !windowOptions.value ? expansion.animatedLayout?.(element) : undefined
  if (play) delegatedLayout = true
  try { expansion.onToggle(expansion.getRowKey(row)) }
  finally { if (play) void nextTick(() => { delegatedLayout = false; play() }) }
}
function interactiveTarget(event: MouseEvent) {
  return (event.target as Element | null)?.closest('button, a[href], input, select, textarea, summary, label, [contenteditable], [role="button"], [role="link"]')
}
function rowClicked(row: Row, event: MouseEvent) {
  if (!tree.value?.hasRowClickExpansion && !props.rowExpansion?.hasRowClickExpansion) return
  if (event.defaultPrevented || busy.value || props.isRowDisabled?.(row) || interactiveTarget(event)) return
  const element = event.currentTarget as HTMLTableRowElement
  const selection = element.ownerDocument.getSelection()
  if (selection && !selection.isCollapsed && element.contains(selection.anchorNode)) return
  if (tree.value?.hasRowClickExpansion && tree.value.getRowMeta(row)?.hasChildren) tree.value.onToggleItem(row)
  else if (props.rowExpansion?.hasRowClickExpansion) toggleDetail(row, element)
}
function requestDetailContext(row: Row, event: MouseEvent | KeyboardEvent) {
  if (busy.value || props.isRowDisabled?.(row) || event.defaultPrevented) return
  const from = event.currentTarget as HTMLElement
  const element = from.closest('tr')
  const target = event.target as Element | null
  const treeTrigger = target?.closest<HTMLButtonElement>('[data-sy-expand-tree]')
  const toggle = treeTrigger ?? element?.querySelector<HTMLButtonElement>('[data-sy-expand-detail], [data-sy-expand-tree]')
  if (!element || !toggle) return
  const pointer = 'clientX' in event
  if (pointer && interactiveTarget(event) && !toggle.contains(event.target as Node)) return
  if (!pointer && event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
  event.preventDefault()
  toggle.focus({ preventScroll: true })
  const bounds = toggle.getBoundingClientRect()
  detailContext.value = { row, element, tree: toggle.hasAttribute('data-sy-expand-tree'),
    x: pointer ? event.clientX : bounds.left, y: pointer ? event.clientY : bounds.bottom }
  detailMenuOpen.value = true
}
const contextLabel = computed(() => {
  const context = detailContext.value
  return context ? context.tree ? treeToggleLabel(context.row) : detailLabel(context.row) : undefined
})
function activateContext() {
  const context = detailContext.value
  if (context && !busy.value && !props.isRowDisabled?.(context.row)) {
    if (context.tree) tree.value?.onToggleItem(context.row)
    else toggleDetail(context.row, context.element)
  }
  detailMenuOpen.value = false
}
onBeforeUpdate(() => {
  const node = viewport.value
  if (!node) return
  const element = node.ownerDocument.activeElement
  if (!hasNextBatch.value && tail.value?.contains(element)) node.focus({ preventScroll: true })
  const context = detailContext.value
  if (detailMenuOpen.value && context && !visibleRows.value.some(row => props.rowKey(row) === props.rowKey(context.row))) detailMenuOpen.value = false
  const row = element?.closest<HTMLTableRowElement>('tbody > tr[id]')
  if (!row || row.parentElement !== liveBody(node) || renderedRows.value.has(row.id)) return
  const group = row.dataset.sectionGroup
  const groupButton = group && renderedRows.value.has(group) ? node.ownerDocument.getElementById(group)?.querySelector('button') : undefined
  const opener = row.classList.contains('sy-table__detail') ? row.previousElementSibling : undefined
  const detailButton = opener && renderedRows.value.has(opener.id) ? opener.querySelector<HTMLElement>('[data-sy-expand-detail]') : undefined
  ;(detailButton ?? groupButton ?? node).focus({ preventScroll: true })
})

function updateSort(column: TableColumn<Row>, additive: boolean) {
  if (busy.value || !column.sortable) return
  sortController.toggle(column.key, additive)
  if (currentPage.value !== 1) updatePage(1)
}

function updatePage(next?: number) {
  if (!busy.value && next !== undefined && paging.value.change(next) && windowOptions.value && viewport.value) viewport.value.scrollTop = 0
}
function updateSize(next?: string) {
  if (!busy.value && paging.value.changeSize(Number(next)) && windowOptions.value && viewport.value) viewport.value.scrollTop = 0
}
</script>

<template>
  <div class="sy-table" :data-density="density" :data-text-overflow="overflowMode" :data-dividers="dividers" :data-unstriped="!striped || undefined" :data-hover-rows="highlightOnHover || undefined"
    :data-virtual="Boolean(windowOptions) || undefined" :data-row-details="Boolean(rowExpansion) || undefined"
    :data-row-groups="Boolean(rowGroups) || undefined" :data-fit="Boolean(fixedGeometry) || undefined"
    :data-column-resize="Boolean(columnResize) || undefined" :data-sticky-columns="sticky.enabled.value || undefined"
    :data-column-window="columnWindow.enabled.value || undefined" :data-column-layout="sizingControl ? 'fixed' : undefined"
    :style="{ '--sy-table-fixed-row-height': fixedGeometry ? fixedGeometry.rowHeight + 'px' : undefined }">
    <STablePageControls v-if="pagingAt('above')" v-bind="pageControls" position="above" :label="pagingLabel('above')" :announce="!pagingAt('below')">
      <template v-if="$slots.pagination" #default="controls"><slot name="pagination" v-bind="controls" /></template>
    </STablePageControls>
    <div
      ref="viewport"
      class="sy-table__scroll"
      role="region"
      :aria-labelledby="captionId"
      tabindex="0"
      :style="{ maxHeight: windowOptions && !fixedGeometry ? `${windowOptions.height}px` : undefined,
        '--sy-table-viewport-width': columnSizing.viewportWidth.value === undefined ? undefined : columnSizing.viewportWidth.value + 'px' }"
      @focusin="pinCell($event.target)"
      @focusout="pinCell($event.relatedTarget)"
      @scroll.passive="scrollTable"
    >
      <table
        class="sy-table__grid"
        :aria-busy="busy || undefined"
        :aria-rowcount="windowOptions ? physicalRows.length + 1 : undefined"
        :aria-colcount="columnWindow.enabled.value ? columnCount : undefined"
        :style="{ minWidth: !columnWindow.enabled.value && windowOptions?.minimumWidth ? `${windowOptions.minimumWidth}px` : undefined,
          width: tableWidth === undefined ? undefined : tableWidth + 'px' }"
      >
        <caption :id="captionId" class="sy-visually-hidden">{{ label }}</caption>
        <colgroup v-if="sizingControl || columnWindow.enabled.value">
          <col v-for="(width, index) in auxiliaryWidths" :key="index" :style="{ width: width + 'px' }">
          <col v-for="entry in columnEntries" :key="entry.key" :style="{
            width: (entry.kind === 'space' ? entry.width : columnWindow.byKey.value.get(entry.column.key) ?? columnSizing.byKey.value.get(entry.column.key)?.pixels) + 'px',
          }">
        </colgroup>
        <thead ref="header">
          <tr :aria-rowindex="windowOptions ? 1 : undefined">
            <th v-if="rowIndex" v-bind="sticky.attributes('index', true)" data-table-auxiliary="index" class="sy-table__row-index" scope="col"
              :aria-colindex="auxiliaryIndex('index')">{{ rowIndex.label.value }}</th>
            <th v-if="rowExpansion" v-bind="sticky.attributes('details', true)" data-table-auxiliary="details" class="sy-table__detail-toggle" scope="col"><span class="sy-visually-hidden">Row details</span></th>
            <th v-if="rowStatus" v-bind="sticky.attributes('status', true)" data-table-auxiliary="status" class="sy-table__status" scope="col"
              :aria-colindex="auxiliaryIndex('status')"><span class="sy-visually-hidden">{{ statusColumnLabel }}</span></th>
            <th v-if="selectionMode === 'multiple'" v-bind="sticky.attributes('selection', true)" data-table-auxiliary="selection" class="sy-table__check-cell"
              scope="col" :aria-colindex="auxiliaryIndex('selection')">
              <SCheckbox
                :aria-label="selectAllLabel"
                :model-value="allSelected"
                :indeterminate="someSelected"
                :disabled="busy || selectableKeys.length === 0"
                @update:model-value="selection.selectAll(Boolean($event))"
              />
              <span class="sy-visually-hidden">{{ selectionColumnLabel }}</span>
            </th>
            <template v-for="entry in columnEntries" :key="entry.key">
              <th
                v-if="entry.kind === 'column'"
                :data-table-column-key="entry.column.key"
                :aria-colindex="columnPosition(entry.index)"
                v-bind="sticky.attributes(entry.column.key)"
                :id="columnResize ? columnId(entry.column.key) : undefined"
                :data-resize-column="columnResize ? entry.column.key : undefined"
                scope="col"
                :data-align="entry.column.align"
                :style="{ width: sizingControl ? undefined : entry.column.width }"
                :aria-sort="ordering[0]?.key === entry.column.key ? ordering[0].direction : undefined"
                :aria-labelledby="!$slots['column-header'] ? headingId(entry.column.key) : undefined"
              >
                <div class="sy-table__heading" :data-cut-layout="truncate || undefined">
                  <div class="sy-table__heading-main">
                    <button v-if="entry.column.key === treeColumn && tree?.hasExpandAllControl && tree.onExpandAll && tree.onCollapseAll"
                      class="sy-table__expand" type="button" :aria-pressed="tree.isAllExpanded === 'indeterminate' ? 'mixed' : tree.isAllExpanded === true"
                      :aria-label="tree.isAllExpanded === true ? (tree.collapseAllLabel ?? 'Collapse all rows') : (tree.expandAllLabel ?? 'Expand all rows')"
                      :data-open="tree.isAllExpanded === true || undefined" :disabled="busy"
                      @click="tree.isAllExpanded === true ? tree.onCollapseAll() : tree.onExpandAll()"><span aria-hidden="true" /></button>
                    <slot name="column-header" :column="entry.column" :sort="sortController.direction(entry.column.key)" :disabled="busy">
                      <button v-if="entry.column.sortable" class="sy-table__sort" type="button" :data-sort="sortController.direction(entry.column.key)"
                        :aria-description="sortDescription(entry.column.key)"
                        :aria-disabled="busy || undefined" @click="updateSort(entry.column, $event.shiftKey)"
                        @keydown.shift.enter.prevent="!$event.repeat && updateSort(entry.column, true)"
                        @keydown.shift.space.prevent="!$event.repeat && updateSort(entry.column, true)">
                        <span :id="headingId(entry.column.key)" :dir="headerDirections.get(entry.column.key)"
                          :data-table-cut="truncate ? 'heading' : undefined">{{ entry.column.label }}</span>
                        <span class="sy-table__sort-meta" aria-hidden="true">
                          <span class="sy-table__sort-indicator"></span>
                          <span v-if="multiSort" class="sy-table__sort-priority" :data-priority="priorities.get(entry.column.key)"
                            :style="{ '--sy-table-priority-digits': priorityDisplay(entry.column.key).length }">
                            <SMotionText :value="priorityDisplay(entry.column.key)" motion="roll" />
                          </span>
                        </span>
                      </button>
                      <span v-else :id="headingId(entry.column.key)" :dir="headerDirections.get(entry.column.key)"
                        :data-table-cut="truncate ? 'heading' : undefined">{{ entry.column.label }}</span>
                    </slot>
                  </div>
                  <STableColumnFilter v-if="columnFiltering && entry.column.filter" :control="columnFiltering" :column-key="entry.column.key"
                    :column-label="entry.column.label" :definition="entry.column.filter" :disabled="busy" />
                </div>
                <SShellResizeHandle v-if="columnResize && columnSizing.limits(entry.column.key)" class="sy-table__column-handle"
                  edge="start" position="overlay" pill-placement="none"
                  :controls="columnId(entry.column.key)" :label="columnResize.label(entry.column)" :value="columnSizing.byKey.value.get(entry.column.key)!.pixels"
                  :min="columnSizing.limits(entry.column.key)!.min" :max="columnSizing.limits(entry.column.key)!.max" :disabled="busy" can-toggle
                  @resize="columnSizing.preview(entry.column.key, $event)" @toggle="columnSizing.finish(entry.column.key)"
                  @dragging="(active, event) => resizeGesture(entry.column.key, active, event)"
                  @blur="columnSizing.finish(entry.column.key, false)" @keydown.escape.stop.prevent="columnSizing.finish(entry.column.key, false)" />
              </th>
              <th v-else class="sy-table__column-gap" aria-hidden="true" />
            </template>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in layout" :key="item.key">
            <tr v-if="item.kind === 'space'" class="sy-table__spacer" aria-hidden="true">
              <td :colspan="physicalColumnCount" :style="{ height: `${item.height}px` }"></td>
            </tr>
            <tr v-else-if="'group' in item.row" :id="groupId(item.row.group.key)" class="sy-table__group" :ref="windowOptions ? measureRow : undefined"
              :data-index="windowOptions ? item.index : undefined" :aria-rowindex="windowOptions ? item.index + 2 : undefined">
              <td :colspan="Math.max(1, columnCount)">
                <button type="button" class="sy-table__group-toggle" :aria-expanded="!item.row.group.collapsed" :aria-controls="groupControls(item.row.group)"
                  :disabled="busy" @click="toggleGroup(item.row)">
                  <span class="sy-table__expand" :data-open="!item.row.group.collapsed || undefined" aria-hidden="true"><span /></span>
                  <slot name="group-header" :group="item.row.group"><RenderGroup :group="item.row.group" /></slot>
                </button>
              </td>
            </tr>
            <tr v-else-if="item.row.detail" :id="panelId(item.row.row)" class="sy-table__detail"
              :data-panel="rowExpansion?.panelVariant" :ref="windowOptions ? measureRow : undefined"
              :data-section-group="item.row.parentGroup"
              :data-stripe="item.row.striped || undefined" :data-selected="selectedKeys.has(rowKey(item.row.row)) || undefined"
              :data-enter="Boolean(rowExpansion?.animatedLayout && !windowOptions) || undefined"
              :data-index="windowOptions ? item.index : undefined" :aria-rowindex="windowOptions ? item.index + 2 : undefined">
              <td class="sy-table__detail-leading" :colspan="leadingColumns" />
              <td :colspan="Math.max(1, activeColumns.length)">
                <div class="sy-table__detail-content"><slot name="expanded" :row="item.row.row"><RenderDetail v-if="rowExpansion?.renderExpanded" :row="item.row.row" /></slot></div>
              </td>
            </tr>
            <tr
              v-else
              :id="rowId(rowKey(item.row.row))" :data-section-group="item.row.parentGroup"
              :ref="windowOptions ? measureRow : undefined"
              :data-index="windowOptions ? item.index : undefined"
              :data-sy-row-parity="item.row.striped ? 'even' : 'odd'"
              :aria-rowindex="windowOptions ? item.index + 2 : undefined"
              :data-stripe="striped && !windowOptions && item.row.striped || undefined"
              :data-selected="selectedKeys.has(rowKey(item.row.row)) || undefined"
              :aria-selected="selectionMode === 'multiple' && selection.isSelectable(item.row.row) ? selectedKeys.has(rowKey(item.row.row)) : undefined"
              @click="rowClicked(item.row.row, $event)" @contextmenu="requestDetailContext(item.row.row, $event)"
            >
              <td v-if="rowIndex" v-bind="sticky.attributes('index', true)" class="sy-table__row-index" :aria-colindex="auxiliaryIndex('index')">{{ rowIndex.numberFor(item.row.row, item.row.position) }}</td>
              <td v-if="rowExpansion" v-bind="sticky.attributes('details', true)" class="sy-table__detail-toggle">
                <button v-if="canExpandDetail(item.row.row)" type="button" class="sy-table__expand" data-sy-expand-detail
                  :aria-label="detailLabel(item.row.row)" :aria-expanded="Boolean(detailExpanded(item.row.row))"
                  :aria-controls="renderedRows.has(panelId(item.row.row)) ? panelId(item.row.row) : undefined" :data-open="detailExpanded(item.row.row) || undefined"
                  :disabled="busy || isRowDisabled?.(item.row.row)"
                  @click="toggleDetail(item.row.row, ($event.currentTarget as HTMLElement).closest('tr'))"
                  @keydown="requestDetailContext(item.row.row, $event)"><span aria-hidden="true" /></button>
              </td>
              <td v-if="rowStatus" v-bind="sticky.attributes('status', true)" class="sy-table__status" :aria-colindex="auxiliaryIndex('status')"><STableRowMarker :marker="resolveStatus(item.row.row)" /></td>
              <td v-if="selectionMode === 'multiple'" v-bind="sticky.attributes('selection', true)" class="sy-table__check-cell" :aria-colindex="auxiliaryIndex('selection')">
                <SCheckbox
                  v-if="selection.isSelectable(item.row.row)" :aria-label="rowLabel?.(item.row.row) ?? String(rowKey(item.row.row))"
                  :model-value="selectedKeys.has(rowKey(item.row.row))"
                  :disabled="busy || isRowDisabled?.(item.row.row)"
                  @update:model-value="selection.select(item.row.row, Boolean($event))"
                />
              </td>
              <template v-for="entry in columnEntries" :key="entry.key">
                <component
                  :is="entry.column.rowHeader ? 'th' : 'td'"
                  v-if="entry.kind === 'column'"
                  :data-table-column-key="entry.column.key"
                  :data-table-cell-wrap="entry.column.wrap === undefined ? undefined : String(entry.column.wrap)"
                  :aria-colindex="columnPosition(entry.index)"
                  v-bind="sticky.attributes(entry.column.key)"
                  :scope="entry.column.rowHeader ? 'row' : undefined"
                  :data-align="entry.column.align"
                >
                  <div v-if="entry.column.key === treeColumn && tree?.getRowMeta(item.row.row)" class="sy-table__tree-cell" :data-indent="tree.indent"
                    :style="{ '--sy-table-level': tree.getRowMeta(item.row.row)?.level }">
                    <button v-if="tree.getRowMeta(item.row.row)?.hasChildren" type="button" class="sy-table__expand"
                      data-sy-expand-tree
                      :aria-label="treeToggleLabel(item.row.row)" :aria-expanded="tree.getRowMeta(item.row.row)?.isExpanded"
                      :aria-controls="treeControls(item.row.row)" :data-open="tree.getRowMeta(item.row.row)?.isExpanded || undefined"
                      :disabled="busy || isRowDisabled?.(item.row.row)" @click="tree.onToggleItem(item.row.row)"
                      @keydown="requestDetailContext(item.row.row, $event)"><span aria-hidden="true" /></button>
                    <slot name="cell" :row="item.row.row" :column="entry.column" :value="entry.column.value(item.row.row)">
                      <SInlineLabel v-if="truncate && !entry.column.wrap" data-table-cut="body" :text="formatCell(entry.column.value(item.row.row))" />
                      <template v-else>{{ formatCell(entry.column.value(item.row.row)) }}</template>
                    </slot>
                  </div>
                  <slot v-else name="cell" :row="item.row.row" :column="entry.column" :value="entry.column.value(item.row.row)">
                    <SInlineLabel v-if="truncate && !entry.column.wrap" data-table-cut="body" :text="formatCell(entry.column.value(item.row.row))" />
                    <template v-else>{{ formatCell(entry.column.value(item.row.row)) }}</template>
                  </slot>
                </component>
                <td v-else class="sy-table__column-gap" aria-hidden="true" />
              </template>
            </tr>
          </template>
          <tr v-if="!pageRows.length" :key="messageKey">
            <td class="sy-table__empty" :colspan="Math.max(1, physicalColumnCount)">
              <div class="sy-table__message">
                <slot v-if="busy" name="loading">
                  <span class="sy-table__loading"><SSpinner size="sm" decorative />{{ loadingText }}</span>
                </slot>
                <slot v-else name="empty">{{ emptyText }}</slot>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="$slots.footer"><slot name="footer" :columns="columnCount" :rows="visibleRows" /></tfoot>
      </table>
      <div v-if="hasNextBatch" ref="tail" class="sy-table__load-more">
        <SButton size="sm" variant="secondary" :loading="loadingNextBatch" :aria-disabled="busy || loadingNextBatch || undefined" @click="loadNextBatch">
          {{ loadMoreLabel }}
        </SButton>
        <span class="sy-visually-hidden" role="status">{{ loadingNextBatch ? loadingMoreLabel : '' }}</span>
      </div>
    </div>
    <RenderOverflow v-if="truncate" />
    <template v-if="detailContext">
      <span ref="detailMenuPoint" class="sy-table__menu-point" :style="{ left: detailContext.x + 'px', top: detailContext.y + 'px' }" aria-hidden="true" />
      <SPopover v-model:open="detailMenuOpen" :anchor="detailMenuPoint" menu :surface="false">
        <div role="menu" class="sy-menu sy-table__detail-menu" :aria-label="contextLabel">
          <button ref="detailMenuItem" type="button" role="menuitem" class="sy-menu__item"
            @click="activateContext">
            {{ contextLabel }}
          </button>
        </div>
      </SPopover>
    </template>
    <span class="sy-visually-hidden" role="status">{{ busy ? loadingText : '' }}</span>
    <STablePageControls v-if="pagingAt('below')" v-bind="pageControls" position="below" :label="pagingLabel('below')" announce>
      <template v-if="$slots.pagination" #default="controls"><slot name="pagination" v-bind="controls" /></template>
    </STablePageControls>
  </div>
</template>
