<script setup lang="ts" generic="Row extends object">
import { computed, nextTick, ref, shallowRef, useId, watch, type CSSProperties } from 'vue'
import { gridFold, gridTracks, type DataGridColumn, type DataGridEdit, type DataGridReorder, type DataGridWidths } from '../internal/data-grid'
import { useShellMeasurement } from '../internal/shell-layout'
import { useTableCells } from '../internal/table-cells'
import { useTableInfiniteScroll } from '../internal/table-features'
import { useTableContentMotion } from '../internal/table-motion'
import { useTableStickyColumns } from '../internal/table-column-sticky'
import { useTableWindow } from '../internal/table-window'
import { flattenTree, moveTree, treeElementKey, type TreeChildren, type TreeEntry, type TreeReplace } from '../internal/tree-data'
import type { TableCell, TableKey, TableSort, TableVirtualOptions } from '../types'
import SButton from './SButton.vue'
import SCheckbox from './SCheckbox.vue'
import SMotionText from './SMotionText.vue'
import SShellResizeHandle from '../internal/SShellResizeHandle.vue'

const props = withDefaults(defineProps<{
  label: string
  rows: readonly Row[]
  columns: readonly DataGridColumn<Row>[]
  rowKey: (row: Row) => TableKey
  rowLabel?: (row: Row) => string
  getChildren?: TreeChildren<Row>
  withChildren?: TreeReplace<Row>
  filter?: (row: Row) => boolean
  query?: string
  selectionMode?: 'none' | 'single' | 'multiple'
  selectionBehavior?: 'toggle' | 'replace'
  showSelectionCheckboxes?: boolean
  defaultSelected?: readonly TableKey[]
  defaultExpanded?: readonly TableKey[]
  defaultSort?: TableSort | null
  sortMode?: 'client' | 'manual'
  isRowDisabled?: (row: Row) => boolean
  treeColumn?: string
  treeIndent?: number
  columnResize?: boolean
  reorderable?: boolean
  stickyHeader?: boolean
  scrollHeight?: number
  virtual?: TableVirtualOptions
  loading?: boolean
  hasMore?: boolean
  loadingMore?: boolean
  direction?: 'ltr' | 'rtl'
  locale?: string
  density?: 'compact' | 'comfortable'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  emptyText?: string
  loadingText?: string
  moreText?: string
  selectAllLabel?: string
  selectColumnLabel?: string
  reorderLabel?: string
  resizeLabel?: (column: DataGridColumn<Row>) => string
  toggleLabel?: (row: Row, expanded: boolean) => string
}>(), {
  selectionMode: 'none', selectionBehavior: 'toggle', showSelectionCheckboxes: true, defaultSelected: () => [],
  defaultExpanded: () => [], defaultSort: null, sortMode: 'client', treeIndent: 16, density: 'compact',
  verticalAlign: 'middle', emptyText: 'No rows', loadingText: 'Loading rows', moreText: 'Load more',
  selectAllLabel: 'Select all visible rows', selectColumnLabel: 'Selection', reorderLabel: 'Move row',
})

const selectedModel = defineModel<readonly TableKey[]>('selected')
const expandedModel = defineModel<readonly TableKey[]>('expanded')
const sortModel = defineModel<TableSort | null>('sort')
const widthsModel = defineModel<DataGridWidths>('widths')
const emit = defineEmits<{
  edit: [change: DataGridEdit<Row>]
  rowAction: [row: Row, key: TableKey]
  reorder: [change: DataGridReorder<Row>]
  resizeEnd: [widths: DataGridWidths]
  loadMore: []
}>()

type Entry = TreeEntry<Row>
type Cell = { row: TableKey | null; column: string }
const selectionId = Symbol('data-grid-selection')
const reorderId = Symbol('data-grid-reorder')
const gridId = `sy-grid-${useId()}`
const messageId = Symbol('data-grid-message')
const selected = computed(() => selectedModel.value ?? props.defaultSelected)
const selectedKeys = computed(() => new Set(selected.value))
const expanded = computed(() => expandedModel.value ?? props.defaultExpanded)
const expandedKeys = computed(() => new Set(expanded.value))
const sort = computed(() => sortModel.value === undefined ? props.defaultSort : sortModel.value)
const widths = computed(() => widthsModel.value ?? {})
const active = shallowRef<Cell>()
const editor = shallowRef<{ key: TableKey; column: DataGridColumn<Row>; draft: string; original: TableCell }>()
const orderDrag = shallowRef<{ key: TableKey; keyboard: boolean; target?: TableKey; position?: 'before' | 'after' }>()
const resizeColumn = ref<string>()
const lastSelection = shallowRef<TableKey>()
const sentinel = ref<HTMLTableRowElement | null>(null)
const announcement = ref('')
const { formatCell, sortRows } = useTableCells(() => props.locale)
const checkable = computed(() => props.selectionMode !== 'none' && props.showSelectionCheckboxes)
const rearrange = computed(() => props.reorderable && (!props.getChildren || Boolean(props.withChildren)))
const canReorder = computed(() => rearrange.value && !sort.value && !props.loading)
const columns = computed(() => [
  ...props.columns.filter(column => column.pinned === 'start'),
  ...props.columns.filter(column => !column.pinned),
  ...props.columns.filter(column => column.pinned === 'end'),
])
const treeColumn = computed(() => props.treeColumn ?? columns.value.find(column => column.rowHeader)?.key ?? columns.value[0]?.key)
const query = computed(() => gridFold((props.query ?? '').trim(), props.locale))
const allEntries = computed(() => flattenTree([props.rows], props.rowKey, row => props.getChildren?.(row)))
const matched = computed(() => {
  if (!query.value && !props.filter) return null
  const all = new Set<TableKey>()
  for (const entry of [...allEntries.value].reverse()) {
    if (all.has(entry.key) || ((props.filter?.(entry.item) ?? true) && (!query.value ||
      columns.value.some(column => gridFold(formatCell(column.value(entry.item)), props.locale).includes(query.value))))) {
      all.add(entry.key)
      if (entry.parent !== null) all.add(entry.parent)
    }
  }
  return all
})
const visible = computed(() => flattenTree([ordered(props.rows)], props.rowKey, row => ordered(props.getChildren?.(row) ?? []),
  (_, key) => matched.value !== null || expandedKeys.value.has(key)))
const entryByKey = computed(() => new Map(visible.value.map(entry => [entry.key, entry])))
const { viewport, header, virtual, layout, measureRow, pinFrom, scrollTo } = useTableWindow(
  () => visible.value, entry => entry.key, () => props.virtual,
)
useTableContentMotion(viewport, () => visible.value.length ? 'rows' : props.loading ? `loading:${props.loadingText}` : `empty:${props.emptyText}`,
  () => visible.value.map(entry => entry.key), () => Boolean(virtual.value))
const width = useShellMeasurement(viewport, node => node.clientWidth)
const controlWidth = 34
const controls = computed(() => controlWidth * (Number(checkable.value) + Number(rearrange.value)))
const tracks = computed(() => gridTracks(columns.value, widths.value, Math.max(0, Math.max(width.value ?? 640, virtual.value?.minimumWidth ?? 0) - controls.value)))
const totalWidth = computed(() => tracks.value.reduce((sum, track) => sum + track.pixels, controls.value))
const pinnedWidths = useTableStickyColumns(tracks, controls)
const columnCount = computed(() => columns.value.length + Number(checkable.value) + Number(rearrange.value))
const availableColumns = computed(() => columns.value.map(column => column.key))
const eligible = computed(() => visible.value.filter(entry => !disabled(entry)).map(entry => entry.key))
const allSelected = computed(() => eligible.value.length > 0 && eligible.value.every(key => selectedKeys.value.has(key)))
const partiallySelected = computed(() => !allSelected.value && eligible.value.some(key => selectedKeys.value.has(key)))
const focusCell = computed(() => {
  const cell = active.value
  const first = availableColumns.value[0]
  if (cell && availableColumns.value.includes(cell.column) && (cell.row === null || entryByKey.value.has(cell.row))) return cell
  return first ? { row: visible.value[0]?.key ?? null, column: first } : undefined
})
let focusRequest = 0

function ordered(rows: readonly Row[]) {
  const list = matched.value ? rows.filter(row => matched.value!.has(props.rowKey(row))) : rows
  return sortRows(list, props.sortMode === 'manual' ? null : sort.value, columns.value)
}

function disabled(entry: Entry) { return props.isRowDisabled?.(entry.item) ?? false }

function cellId(row: TableKey | null, column: string) {
  const rowId = row === null ? 'header' : encodeURIComponent(treeElementKey(row))
  return `${gridId}-${rowId}-${encodeURIComponent(column)}`
}

function initialTab(row: TableKey | null, column: string) {
  return focusCell.value?.row === row && focusCell.value.column === column ? 0 : -1
}

function shiftSort(column: DataGridColumn<Row>) {
  if (props.loading || !column.sortable) return
  if (sort.value?.key === column.key && sort.value.direction === 'descending') sortModel.value = null
  else sortModel.value = { key: column.key, direction: sort.value?.key === column.key ? 'descending' : 'ascending' }
}

function resize(track: (typeof tracks.value)[number], next: number, final: boolean) {
  const resized = { ...widths.value, [track.column.key]: next }
  widthsModel.value = resized
  if (final) emit('resizeEnd', resized)
}

function trackStyle(track: (typeof tracks.value)[number]): CSSProperties {
  const style: CSSProperties = { width: `${track.pixels}px` }
  if (!track.column.pinned) return style
  const offset = pinnedWidths.value.offsets.get(track.column.key) ?? 0
  return { ...style, [track.column.pinned === 'start' ? 'insetInlineStart' : 'insetInlineEnd']: `${offset}px` }
}

function isExpanded(entry: Entry) { return matched.value !== null || expandedKeys.value.has(entry.key) }
function hasChildren(entry: Entry) { return Boolean(ordered(props.getChildren?.(entry.item) ?? []).length) }

function toggle(entry: Entry) {
  if (!hasChildren(entry) || disabled(entry) || matched.value !== null) return
  const open = expandedKeys.value.has(entry.key)
  expandedModel.value = open ? expanded.value.filter(key => key !== entry.key) : [...expanded.value, entry.key]
}

function setSelection(keys: readonly TableKey[], checked: boolean) {
  if (props.loading || props.selectionMode === 'none') return
  if (props.selectionMode === 'single') selectedModel.value = checked ? keys.slice(0, 1) : []
  else {
    const next = new Set(selected.value)
    for (const key of keys) checked ? next.add(key) : next.delete(key)
    selectedModel.value = [...next]
  }
}

function choose(entry: Entry, event: Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey'>) {
  if (disabled(entry) || props.loading || props.selectionMode === 'none') return
  const replace = props.selectionBehavior === 'replace' && !event.metaKey && !event.ctrlKey
  if (event.shiftKey && props.selectionMode === 'multiple' && lastSelection.value !== undefined) {
    const first = eligible.value.indexOf(lastSelection.value)
    const next = eligible.value.indexOf(entry.key)
    if (first >= 0 && next >= 0) {
      const range = eligible.value.slice(Math.min(first, next), Math.max(first, next) + 1)
      if (replace) selectedModel.value = range
      else setSelection(range, true)
      return
    }
  }
  if (replace) selectedModel.value = [entry.key]
  else setSelection([entry.key], !selectedKeys.value.has(entry.key))
  lastSelection.value = entry.key
}

async function focus(row: TableKey | null, column?: string) {
  if (!column) return
  const attempt = ++focusRequest
  active.value = { row, column }
  const id = cellId(row, column)
  const document = viewport.value?.ownerDocument
  if (!document) return
  if (row !== null && !document.getElementById(id)) {
    const index = visible.value.findIndex(item => item.key === row)
    if (index >= 0) scrollTo(index)
  }
  await nextTick()
  for (let retries = 0; retries < 4 && attempt === focusRequest; retries++) {
    const node = document.getElementById(id)
    if (node) {
      node.focus({ preventScroll: true })
      if (virtual.value && row !== null) scrollTo(visible.value.findIndex(entry => entry.key === row))
      else node.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      revealColumn(node)
      return
    }
    await new Promise<void>(resolve => { document.defaultView?.requestAnimationFrame(() => resolve()) ?? resolve() })
  }
}

function revealColumn(node: HTMLElement) {
  const container = viewport.value
  if (!container || node.dataset.pinned) return
  const bounds = container.getBoundingClientRect()
  const target = node.getBoundingClientRect()
  const rtl = container.ownerDocument.defaultView?.getComputedStyle(container).direction === 'rtl'
  const left = bounds.left + pinnedWidths.value[rtl ? 'end' : 'start']
  const right = bounds.right - pinnedWidths.value[rtl ? 'start' : 'end']
  if (right <= left) return
  const offset = target.width > right - left ? (rtl ? target.right - right : target.left - left) :
    target.right > right ? target.right - right : target.left < left ? target.left - left : 0
  if (offset) container.scrollBy({ left: offset })
}

function canEdit(entry: Entry, column: DataGridColumn<Row>) {
  return !props.loading && !disabled(entry) && (typeof column.editable === 'function' ? column.editable(entry.item) : Boolean(column.editable))
}

function beginEdit(entry: Entry, column: DataGridColumn<Row>) {
  if (!canEdit(entry, column)) return false
  const original = column.value(entry.item)
  active.value = { row: entry.key, column: column.key }
  editor.value = { key: entry.key, column, original, draft: original == null ? '' : String(original) }
  void nextTick(() => {
    const cell = viewport.value?.ownerDocument.getElementById(cellId(entry.key, column.key))
    const input = cell?.querySelector<HTMLElement>('[data-grid-editor] :is(input,textarea,select,button,[tabindex])')
    input?.focus({ preventScroll: true })
    if (input instanceof HTMLInputElement) input.select()
  })
  return true
}

function editing(entry: Entry, column: DataGridColumn<Row>) {
  return editor.value?.key === entry.key && editor.value.column.key === column.key
}

function setDraft(draft: string) {
  if (editor.value) editor.value = { ...editor.value, draft }
}

function finishEdit(commit: boolean, restore = true) {
  const state = editor.value
  if (!state) return
  editor.value = undefined
  const entry = entryByKey.value.get(state.key)
  if (commit && entry) {
    const value = state.column.parse ? state.column.parse(state.draft, entry.item) :
      state.column.input === 'number' ? (state.draft.trim() && Number.isFinite(Number(state.draft)) ? Number(state.draft) : state.original) : state.draft
    if (!Object.is(value, state.original)) emit('edit', { row: entry.item, key: entry.key, column: state.column, value, previous: state.original })
  }
  if (restore) void focus(entry?.key ?? null, state.column.key)
}

watch(visible, () => {
  const state = editor.value
  if (state && !entryByKey.value.has(state.key)) finishEdit(false)
  else if (active.value && active.value.row !== null && !entryByKey.value.has(active.value.row) &&
    viewport.value?.contains(viewport.value.ownerDocument.activeElement)) {
    void focus(visible.value[0]?.key ?? null, focusCell.value?.column)
  }
})

function rowLabel(item: Row) { return props.rowLabel?.(item) ?? String(props.rowKey(item)) }

function reorderStart(entry: Entry, event?: DragEvent) {
  if (!canReorder.value || disabled(entry)) {
    event?.preventDefault()
    return
  }
  orderDrag.value = { key: entry.key, keyboard: !event }
  announcement.value = `${props.reorderLabel} ${rowLabel(entry.item)}`
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', rowLabel(entry.item))
  }
}

function makeMove(target: Entry, position: 'before' | 'after') {
  const moving = orderDrag.value
  if (!moving || disabled(target) || !canReorder.value) return
  const result = moveTree([props.rows], [moving.key], target.key, position,
    props.rowKey, props.getChildren ?? (() => undefined), props.withChildren ?? (item => item))
  if (!result) return
  orderDrag.value = undefined
  emit('reorder', { keys: result.moved, target: { key: target.key, position }, rows: result.forest[0] })
  if (moving.keyboard) void focus(moving.key, focusCell.value?.column)
}

function dragOver(entry: Entry, event: DragEvent) {
  const moving = orderDrag.value
  if (!moving || moving.keyboard || moving.key === entry.key || disabled(entry)) return
  event.preventDefault()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  orderDrag.value = { ...moving, target: entry.key, position: event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before' }
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function keyboard(event: KeyboardEvent, row: TableKey | null, column: DataGridColumn<Row>) {
  if (event.defaultPrevented || event.isComposing) return
  const node = event.target as HTMLElement
  if (node.closest('[data-grid-editor]')) {
    if (event.key === 'Escape' || event.key === 'Enter') {
      event.preventDefault()
      finishEdit(event.key === 'Enter')
    }
    return
  }
  if (node.matches('.sy-data-grid__resize') && event.key === 'Escape') {
    event.preventDefault()
    void focus(row, column.key)
    return
  }
  if (node !== event.currentTarget) return
  const entry = row !== null ? entryByKey.value.get(row) : undefined
  const usedColumn = availableColumns.value.indexOf(column.key)
  const usedRow = row === null ? -1 : visible.value.findIndex(item => item.key === row)
  const moving = orderDrag.value?.keyboard
  let nextRow = usedRow
  let nextColumn = usedColumn
  const rtl = viewport.value?.ownerDocument.defaultView?.getComputedStyle(node).direction === 'rtl'
  const forward = rtl ? -1 : 1
  switch (event.key) {
    case 'ArrowLeft': nextColumn -= forward; break
    case 'ArrowRight': nextColumn += forward; break
    case 'ArrowUp': nextRow--; break
    case 'ArrowDown': nextRow++; break
    case 'Home':
      nextColumn = 0
      if (event.ctrlKey || event.metaKey) nextRow = -1
      break
    case 'End':
      nextColumn = availableColumns.value.length - 1
      if (event.ctrlKey || event.metaKey) nextRow = visible.value.length - 1
      break
    case 'PageUp': nextRow -= 10; break
    case 'PageDown': nextRow += 10; break
    case 'Enter':
      if (!entry) shiftSort(column)
      else if (moving) {
        const destination = orderDrag.value?.target
        const target = destination === undefined ? undefined : entryByKey.value.get(destination)
        if (target && orderDrag.value?.position) makeMove(target, orderDrag.value.position)
      } else if (event.ctrlKey || event.metaKey) reorderStart(entry)
      else if (column.key === treeColumn.value && hasChildren(entry)) toggle(entry)
      else if (!beginEdit(entry, column) && !disabled(entry) && !props.loading) emit('rowAction', entry.item, entry.key)
      break
    case 'F2': {
      if (!entry || !beginEdit(entry, column)) node.querySelector<HTMLElement>('button, a, input, [role="separator"], [tabindex]')?.focus()
      break
    }
    case ' ':
      if (entry) choose(entry, event)
      else shiftSort(column)
      break
    case 'Escape':
      if (!moving) return
      orderDrag.value = undefined
      break
    default: return
  }
  event.preventDefault()
  if (nextRow === usedRow && nextColumn === usedColumn) return
  const rowIndex = Math.max(-1, Math.min(visible.value.length - 1, nextRow))
  const columnIndex = Math.max(0, Math.min(availableColumns.value.length - 1, nextColumn))
  const next = visible.value[rowIndex]
  if (moving && orderDrag.value && next && next.key !== orderDrag.value.key) {
    orderDrag.value = { ...orderDrag.value, target: next.key, position: rowIndex > usedRow ? 'after' : 'before' }
    announcement.value = `${props.reorderLabel} ${rowLabel(next.item)}`
  }
  void focus(next?.key ?? null, availableColumns.value[columnIndex])
}

function cellClick(entry: Entry, column: DataGridColumn<Row>, event: MouseEvent) {
  if (event.defaultPrevented || (event.target as Element).closest('button, a, input, textarea, select, [data-grid-editor], [contenteditable="true"]')) return
  if (event.detail > 1) return
  void focus(entry.key, column.key)
  choose(entry, event)
}

const requestMore = useTableInfiniteScroll({ sentinel, viewport, hasMore: () => props.hasMore,
  loading: () => props.loading || props.loadingMore, count: () => allEntries.value.length, load: () => emit('loadMore') })
</script>

<template>
  <div class="sy-table sy-data-grid" :data-density="density" :data-virtual="Boolean(virtual) || undefined" :dir="direction">
    <slot name="toolbar" :selected="selected" :clear="() => { selectedModel = [] }" />
    <div
      ref="viewport" class="sy-table__scroll sy-data-grid__scroll" tabindex="-1"
      :style="{ maxHeight: virtual ? `${virtual.height}px` : scrollHeight ? `${scrollHeight}px` : undefined }"
      @focusin="pinFrom($event.target)" @focusout="pinFrom($event.relatedTarget)"
    >
      <table
        class="sy-table__grid sy-data-grid__table" :role="getChildren ? 'treegrid' : 'grid'" :aria-label="label"
        :aria-rowcount="visible.length + 1" :aria-colcount="columnCount" :aria-busy="loading || undefined"
        :aria-multiselectable="selectionMode === 'multiple' || undefined"
        :data-sticky="stickyHeader || Boolean(virtual) || undefined" :data-align-vertical="verticalAlign"
        :style="{ width: `${totalWidth}px` }"
      >
        <colgroup>
          <col v-if="checkable" :key="selectionId" :style="{ width: `${controlWidth}px` }" />
          <col v-if="rearrange" :key="reorderId" :style="{ width: `${controlWidth}px` }" />
          <col v-for="track in tracks" :key="track.column.key" :style="{ width: `${track.pixels}px` }" />
        </colgroup>
        <thead ref="header">
          <tr aria-rowindex="1">
            <th v-if="checkable" class="sy-data-grid__aux" data-pinned="start" scope="col" :aria-label="selectColumnLabel">
              <SCheckbox v-if="selectionMode === 'multiple'" :model-value="allSelected" :indeterminate="partiallySelected"
                :aria-label="selectAllLabel" :disabled="!eligible.length || loading"
                @update:model-value="setSelection(eligible, Boolean($event))" />
              <span v-else class="sy-visually-hidden">{{ selectColumnLabel }}</span>
            </th>
            <th v-if="rearrange" class="sy-data-grid__aux" data-pinned="start" scope="col" :aria-label="reorderLabel"
              :style="{ insetInlineStart: checkable ? `${controlWidth}px` : '0px' }">
              <span class="sy-visually-hidden">{{ reorderLabel }}</span>
            </th>
            <th
              v-for="track in tracks" :id="cellId(null, track.column.key)" :key="track.column.key" scope="col"
              :data-pinned="track.column.pinned" :data-align="track.column.align" :style="trackStyle(track)"
              :aria-sort="sort?.key === track.column.key ? sort.direction : undefined"
              :tabindex="initialTab(null, track.column.key)" @focus="active = { row: null, column: track.column.key }"
              @keydown="keyboard($event, null, track.column)"
            >
              <div class="sy-data-grid__title">
                <button v-if="track.column.sortable" type="button" class="sy-table__sort" tabindex="-1"
                  :data-sort="sort?.key === track.column.key ? sort.direction : undefined" @click="shiftSort(track.column)">
                  <slot name="header" :column="track.column" :sort="sort">{{ track.column.label }}</slot>
                  <span class="sy-table__sort-indicator" aria-hidden="true" />
                </button>
                <slot v-else name="header" :column="track.column" :sort="sort">{{ track.column.label }}</slot>
              </div>
              <SShellResizeHandle
                v-if="columnResize && track.column.resizable !== false"
                class="sy-data-grid__resize" :controls="cellId(null, track.column.key)" edge="start" position="overlay" pill-placement="none"
                :label="resizeLabel?.(track.column) ?? `Resize ${track.column.label}`" :value="track.pixels"
                :min="track.min" :max="track.max" :disabled="loading"
                :data-active="resizeColumn === track.column.key || undefined"
                @resize="(next, raw) => resize(track, next, raw === undefined)"
                @dragging="value => { resizeColumn = value ? track.column.key : undefined; if (!value) emit('resizeEnd', widths) }"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in layout" :key="item.key">
            <tr v-if="item.kind === 'space'" class="sy-table__spacer" aria-hidden="true">
              <td :colspan="columnCount" :style="{ height: `${item.height}px` }" />
            </tr>
            <tr
              v-else :ref="virtual ? measureRow : undefined" :data-index="virtual ? item.index : undefined"
              :aria-rowindex="item.index + 2" :aria-level="getChildren ? item.row.level : undefined"
              :aria-posinset="getChildren ? item.row.position : undefined" :aria-setsize="getChildren ? item.row.size : undefined"
              :aria-expanded="hasChildren(item.row) ? isExpanded(item.row) : undefined"
              :aria-disabled="disabled(item.row) || undefined"
              :aria-selected="selectionMode === 'none' ? undefined : selectedKeys.has(item.row.key)"
              :data-selected="selectedKeys.has(item.row.key) || undefined"
              :data-drop="orderDrag?.target === item.row.key ? orderDrag.position : undefined"
              :data-moving="orderDrag?.key === item.row.key || undefined"
              @dragover="dragOver(item.row, $event)" @drop.prevent="orderDrag?.position && makeMove(item.row, orderDrag.position)"
            >
              <td v-if="checkable" class="sy-data-grid__aux" data-pinned="start" role="gridcell">
                <SCheckbox
                  :aria-label="rowLabel(item.row.item)" :model-value="selectedKeys.has(item.row.key)" :disabled="disabled(item.row) || loading"
                  @update:model-value="setSelection([item.row.key], Boolean($event))"
                />
              </td>
              <td v-if="rearrange" class="sy-data-grid__aux" data-pinned="start" role="gridcell"
                :style="{ insetInlineStart: checkable ? `${controlWidth}px` : '0px' }">
                <span :draggable="canReorder && !disabled(item.row)" class="sy-data-grid__drag" aria-hidden="true"
                  :data-enabled="canReorder && !disabled(item.row) || undefined"
                  @dragstart="reorderStart(item.row, $event)" @dragend="orderDrag = undefined" />
              </td>
              <component
                :is="track.column.rowHeader ? 'th' : 'td'" v-for="track in tracks" :key="track.column.key"
                :id="cellId(item.row.key, track.column.key)" :role="track.column.rowHeader ? 'rowheader' : 'gridcell'"
                :scope="track.column.rowHeader ? 'row' : undefined" :tabindex="initialTab(item.row.key, track.column.key)"
                :data-align="track.column.align" :data-pinned="track.column.pinned" :data-editing="editing(item.row, track.column) || undefined"
                :style="trackStyle(track)" @focus="active = { row: item.row.key, column: track.column.key }"
                @keydown="keyboard($event, item.row.key, track.column)" @click="cellClick(item.row, track.column, $event)"
                @dblclick="!beginEdit(item.row, track.column) && !disabled(item.row) && !loading && emit('rowAction', item.row.item, item.row.key)"
              >
                <div v-if="editing(item.row, track.column)" data-grid-editor
                  @focusout="!($event.currentTarget as Element).contains($event.relatedTarget as Node | null) && finishEdit(false, false)">
                  <slot name="editor" :row="item.row.item" :column="track.column" :draft="editor!.draft" :set-draft="setDraft"
                    :commit="() => finishEdit(true)" :cancel="() => finishEdit(false)">
                    <input
                      :aria-label="track.column.label" :type="track.column.input ?? 'text'" :value="editor!.draft"
                      @input="setDraft(($event.target as HTMLInputElement).value)"
                    />
                  </slot>
                </div>
                <div v-else class="sy-data-grid__cell"
                  :style="{ paddingInlineStart: track.column.key === treeColumn && getChildren ? `${(item.row.level - 1) * Math.max(0, treeIndent)}px` : undefined }">
                  <button
                    v-if="track.column.key === treeColumn && hasChildren(item.row)" type="button" class="sy-data-grid__tree-toggle"
                    :aria-label="toggleLabel?.(item.row.item, isExpanded(item.row)) ?? `${isExpanded(item.row) ? 'Collapse' : 'Expand'} ${rowLabel(item.row.item)}`"
                    :aria-expanded="isExpanded(item.row)" :disabled="disabled(item.row) || matched !== null"
                    @click="toggle(item.row)"
                  ><span aria-hidden="true" /></button>
                  <slot name="cell" :row="item.row.item" :column="track.column" :value="track.column.value(item.row.item)"
                    :start-edit="() => beginEdit(item.row, track.column)">
                    <span class="sy-data-grid__value"><SMotionText :value="formatCell(track.column.value(item.row.item))" /></span>
                  </slot>
                </div>
              </component>
            </tr>
          </template>
          <tr v-if="!visible.length" :key="messageId">
            <td class="sy-table__empty" role="gridcell" :colspan="Math.max(1, columnCount)">
              <slot v-if="loading" name="loading">{{ loadingText }}</slot>
              <slot v-else name="empty">{{ emptyText }}</slot>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="hasMore">
          <tr ref="sentinel" class="sy-data-grid__sentinel" :aria-busy="loadingMore || undefined">
            <td :colspan="Math.max(1, columnCount)">
              <slot v-if="loadingMore" name="loading-more">{{ loadingText }}</slot>
              <SButton v-else size="sm" variant="secondary" @click="requestMore(true)">{{ moreText }}</SButton>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
    <slot name="footer" :selected="selected" :visible-count="visible.length" />
    <span class="sy-visually-hidden" role="status">{{ loading ? loadingText : announcement }}</span>
  </div>
</template>
