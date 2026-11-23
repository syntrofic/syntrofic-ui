import { defaultRangeExtractor, useVirtualizer } from '@tanstack/vue-virtual'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, type ComponentPublicInstance, type ComputedRef } from 'vue'
import type { TableKey, TableVirtualOptions } from '../types'
import { useTableFixedMeasurement, type TableRowsVirtualizationOptions } from './table-row-geometry'

interface VisibleRow<Row> {
  kind: 'row'
  key: TableKey
  index: number
  row: Row
}

interface Spacer {
  kind: 'space'
  key: string
  height: number
}

function positive(value: number | undefined, original: number) {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : original
}

export function useTableWindow<Row>(
  readRows: () => readonly Row[],
  getKey: (row: Row) => TableKey,
  readOptions: () => TableVirtualOptions | undefined,
  fixedGeometry?: ComputedRef<TableRowsVirtualizationOptions | undefined>,
) {
  const viewport = useTemplateRef<HTMLDivElement>('viewport')
  const header = useTemplateRef<HTMLTableSectionElement>('header')
  const headerHeight = ref(0)
  const pinnedKey = ref<TableKey>()
  const fixed = fixedGeometry && useTableFixedMeasurement(viewport, fixedGeometry, () => layout.value)
  const virtual = computed(() => {
    const options = readOptions() ?? fixed?.measurement.value
    if (!options) return undefined
    const overscan = options.overscan ?? 5
    return {
      height: positive(options.height, 300),
      estimate: positive(options.estimatedRowHeight, 40),
      overscan: Number.isFinite(overscan) ? Math.min(30, Math.max(0, Math.trunc(overscan))) : 5,
      minimumWidth: options.minWidth,
    }
  })

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>(computed(() => {
    const settings = virtual.value
    const rows = readRows()
    const pinned = pinnedKey.value === undefined ? -1 : rows.findIndex(row => getKey(row) === pinnedKey.value)
    return {
      enabled: Boolean(settings),
      count: rows.length,
      estimateSize: () => settings?.estimate ?? 40,
      getScrollElement: () => viewport.value,
      getItemKey: index => rows[index] === undefined ? `missing:${index}` : getKey(rows[index]),
      scrollMargin: headerHeight.value,
      initialRect: { width: 0, height: settings?.height ?? 0 },
      overscan: settings?.overscan ?? 0,
      useAnimationFrameWithResizeObserver: true,
      rangeExtractor: range => {
        const indices = defaultRangeExtractor(range)
        return pinned >= 0 && !indices.includes(pinned) ? [...indices, pinned].sort((a, b) => a - b) : indices
      },
    }
  }))

  const layout = computed<(VisibleRow<Row> | Spacer)[]>(() => {
    const rows = readRows()
    function entry(index: number): VisibleRow<Row> {
      const row = rows[index]
      const key = getKey(row)
      return { kind: 'row', key: `row:${typeof key}:${key}`, index, row }
    }

    if (!virtual.value) return rows.map((_, index) => entry(index))
    const result: (VisibleRow<Row> | Spacer)[] = []
    const engine = virtualizer.value
    const items = engine.getVirtualItems()
    let cursor = 0
    const margin = headerHeight.value
    for (const item of items) {
      if (item.index >= rows.length) continue
      const gap = item.start - margin - cursor
      if (gap > .5) result.push({ kind: 'space', key: `spacer:${item.index}`, height: gap })
      result.push(entry(item.index))
      cursor = item.end - margin
    }
    const end = engine.getTotalSize() - cursor
    if (end > .5) result.push({ kind: 'space', key: 'spacer:end', height: end })
    return result
  })

  let resize: ResizeObserver | undefined
  onMounted(() => {
    if (!header.value) return
    const node = header.value
    function measure() { headerHeight.value = node.offsetHeight }
    measure()
    if (typeof ResizeObserver === 'function') {
      resize = new ResizeObserver(measure)
      resize.observe(node)
    }
  })
  onBeforeUnmount(() => resize?.disconnect())

  function measureRow(element: Element | ComponentPublicInstance | null) {
    if (virtual.value) virtualizer.value.measureElement(element instanceof HTMLTableRowElement ? element : null)
  }

  function pinFrom(target: EventTarget | null) {
    if (!virtual.value) return
    const element = target instanceof HTMLElement ? target.closest<HTMLTableRowElement>('tr[data-index]') : null
    if (element?.closest('.sy-table__scroll') !== viewport.value) {
      pinnedKey.value = undefined
      return
    }
    const row = readRows()[Number(element?.dataset.index)]
    pinnedKey.value = row === undefined ? undefined : getKey(row)
  }

  function scrollTo(index: number) {
    if (virtual.value) virtualizer.value.scrollToIndex(index, { align: 'auto' })
  }

  return { virtual, layout, viewport, header, measureRow, pinFrom, scrollTo, fixed }
}
