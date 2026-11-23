import { defaultRangeExtractor, useVirtualizer } from '@tanstack/vue-virtual'
import { computed, markRaw, nextTick, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'
import type { TableColumn } from '../types'

export interface TableWindowColumn { key: string; width: number; pinned?: 'start' | 'end' }
export interface TableColumnsWindowOptions {
  columns: MaybeRefOrGetter<readonly TableWindowColumn[]>
  viewport: MaybeRefOrGetter<HTMLElement | null | undefined>
  initialViewportWidth?: number
  overscan?: number
  rtl?: MaybeRefOrGetter<boolean>
  focusedColumn?: MaybeRefOrGetter<string | null | undefined>
}

export interface TableColumnsVirtualizationOptions {
  initialViewportWidth: number
  overscan?: number
}

export interface TableColumnsVirtualization {
  columnGeometry: ComputedRef<TableColumnsVirtualizationOptions | undefined>
}

export function useTableColumnsVirtualization(options: TableColumnsWindowOptions): ReturnType<typeof externalColumnsWindow>
export function useTableColumnsVirtualization(options: MaybeRefOrGetter<TableColumnsVirtualizationOptions>): TableColumnsVirtualization
export function useTableColumnsVirtualization(options: TableColumnsWindowOptions | MaybeRefOrGetter<TableColumnsVirtualizationOptions>) {
  if (typeof options === 'object' && 'columns' in options) return externalColumnsWindow(options)
  const columnGeometry = computed(() => {
    const config = toValue(options)
    if (!Number.isFinite(config.initialViewportWidth) || config.initialViewportWidth <= 0) return
    return config
  })
  return markRaw({ columnGeometry })
}

function externalColumnsWindow(options: TableColumnsWindowOptions) {
  const columns = computed(() => toValue(options.columns))
  const engine = useVirtualizer<HTMLElement, HTMLElement>(computed(() => {
    const list = columns.value
    const focused = toValue(options.focusedColumn)
    const retained = list.flatMap((column, index) => column.pinned || column.key === focused ? [index] : [])
    const initialWidth = options.initialViewportWidth ?? 640
    return {
      horizontal: true, isRtl: toValue(options.rtl) ?? false,
      count: list.length,
      getItemKey: index => list[index]?.key ?? index,
      getScrollElement: () => toValue(options.viewport) ?? null,
      estimateSize: index => Math.max(1, Number.isFinite(list[index]?.width) ? list[index].width : 1),
      initialRect: { width: Math.max(1, Number.isFinite(initialWidth) ? initialWidth : 640), height: 0 },
      overscan: Math.max(0, Number.isFinite(options.overscan) ? options.overscan! : 2),
      rangeExtractor: range => [...new Set([...defaultRangeExtractor(range), ...retained])].sort((a, b) => a - b),
    }
  }))
  const items = computed(() => engine.value.getVirtualItems().flatMap(item => {
    const column = columns.value[item.index]
    return column ? [{ ...item, column }] : []
  }))
  return { items, width: computed(() => engine.value.getTotalSize()), scrollTo: (index: number) => engine.value.scrollToIndex(index, { align: 'auto' }) }
}

type Pins = { start: readonly string[]; end: readonly string[] }
type ColumnEntry<Row> = { kind: 'column'; column: TableColumn<Row>; index: number; key: string } |
  { kind: 'space'; width: number; key: string }

function trackAt(tracks: readonly { end: number }[], offset: number) {
  let first = 0
  let last = tracks.length - 1
  while (first < last) {
    const middle = Math.floor((first + last) / 2)
    if (tracks[middle].end > offset) last = middle
    else first = middle + 1
  }
  return first
}

export function useTableColumnWindow<Row>(options: {
  config: () => TableColumnsVirtualizationOptions | undefined
  viewport: Readonly<Ref<HTMLDivElement | null>>
  columns: () => readonly TableColumn<Row>[]
  width: (column: TableColumn<Row>) => number | undefined
  leadingWidth: () => number
  pins: () => Pins | undefined
  minimumWidth: () => number | undefined
}) {
  const viewportWidth = ref<number>()
  const offset = ref(0)
  const focused = ref<string>()
  const plan = computed(() => {
    const config = options.config()
    if (!config) return
    const columns = options.columns()
    if (!columns.length || new Set(columns.map(column => column.key)).size !== columns.length) return
    const pins = options.pins()
    const leading = options.leadingWidth()
    const startCount = pins?.start.length ?? 0
    const endIndex = columns.length - (pins?.end.length ?? 0)
    let total = leading
    const tracks: { key: string; width: number; start: number; end: number }[] = []
    for (const column of columns) {
      const width = options.width(column)
      if (width === undefined || !Number.isFinite(width) || width <= 0 || column.wrap) return
      tracks.push({ key: column.key, width, start: total, end: total + width })
      total += width
    }
    if ((options.minimumWidth() ?? 0) > total) return
    const startWidth = startCount ? tracks[startCount - 1].end : 0
    const endWidth = endIndex < columns.length ? total - tracks[endIndex].start : 0
    return { tracks, total, startCount, endIndex, startWidth, endWidth }
  })
  const width = computed(() => viewportWidth.value ?? options.config()?.initialViewportWidth ?? 0)
  const overscan = computed(() => {
    const value = options.config()?.overscan ?? 2
    return Number.isFinite(value) ? Math.max(0, Math.min(30, Math.trunc(value))) : 2
  })
  const first = computed(() => plan.value ? trackAt(plan.value.tracks, offset.value + plan.value.startWidth) - overscan.value : 0)
  const last = computed(() => plan.value ? trackAt(plan.value.tracks,
    offset.value + Math.max(plan.value.startWidth, width.value - plan.value.endWidth - .01)) + overscan.value : 0)
  const entries = computed<ColumnEntry<Row>[]>(() => {
    const columns = options.columns()
    const geometry = plan.value
    const all = columns.map((column, index) => ({ kind: 'column' as const, column, index, key: 'column:' + column.key }))
    if (!geometry || width.value >= geometry.total) return all
    const result: ColumnEntry<Row>[] = []
    let gap = 0
    let gapStart = 0
    for (const item of all) {
      const index = item.index
      if (index < geometry.startCount || index >= geometry.endIndex || index >= first.value && index <= last.value || focused.value === item.column.key) {
        if (gap) result.push({ kind: 'space', width: gap, key: 'space:' + gapStart })
        gap = 0
        result.push(item)
      } else {
        if (!gap) gapStart = index
        gap += geometry.tracks[index].width
      }
    }
    if (gap) result.push({ kind: 'space', width: gap, key: 'space:' + gapStart })
    return result
  })
  function update() {
    const node = options.viewport.value
    if (plan.value && node) offset.value = Math.abs(node.scrollLeft)
  }
  function pinFrom(target: EventTarget | null) {
    if (!plan.value) return
    const cell = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-table-column-key]') : null
    focused.value = cell?.closest('.sy-table__scroll') === options.viewport.value ? cell?.dataset.tableColumnKey : undefined
  }
  const enabled = computed(() => Boolean(plan.value))
  watch(() => [options.viewport.value, enabled.value] as const, ([node, active], _, cleanup) => {
    if (!node || !active) { viewportWidth.value = undefined; return }
    const view = node.ownerDocument.defaultView
    const measure = () => {
      if (!node.clientWidth) return
      viewportWidth.value = node.clientWidth
      update()
    }
    const Resize = view?.ResizeObserver
    const sizing = Resize ? new Resize(measure) : undefined
    sizing?.observe(node)
    measure()
    cleanup(() => sizing?.disconnect())
  }, { flush: 'post', immediate: true })
  watch(plan, (next, previous, cleanup) => {
    const node = options.viewport.value
    if (!node || !next || !previous || !node.scrollLeft || width.value >= next.total) return
    const previousOffset = Math.abs(node.scrollLeft) + previous.startWidth
    const anchor = previous.tracks[trackAt(previous.tracks, previousOffset)]
    const replacement = next.tracks.find(track => track.key === anchor?.key)
    if (!replacement) return
    const relativeOffset = Math.min(previousOffset - anchor.start, replacement.width - 1)
    const target = Math.max(0, Math.min(next.total - width.value, replacement.start + relativeOffset - next.startWidth))
    offset.value = target
    let active = true
    cleanup(() => { active = false })
    void nextTick(() => {
      if (!active || node !== options.viewport.value) return
      const rtl = node.ownerDocument.defaultView?.getComputedStyle(node).direction === 'rtl'
      node.scrollLeft = rtl ? -target : target
      update()
    })
  })
  const byKey = computed(() => new Map(plan.value?.tracks.map(track => [track.key, track.width])))
  return { entries, enabled, width: computed(() => plan.value?.total), byKey, update, pinFrom }
}
