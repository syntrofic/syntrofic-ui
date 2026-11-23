import { computed, markRaw, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

type Edge = 'start' | 'end'
interface StickyTrack { column: { key: string; pinned?: Edge }; pixels: number }
export interface TableStickyColumnsOptions { startKeys?: readonly string[]; endKeys?: readonly string[] }
export interface TableStickyColumnsControl {
  ranges: (keys: readonly string[]) => { start: readonly string[]; end: readonly string[] }
}

function stickyOffsets(list: readonly StickyTrack[], leading = 0) {
  const offsets = new Map<string, number>()
  let start = leading
  let end = 0
  for (const { column, pixels } of list) {
    if (column.pinned !== 'start') continue
    offsets.set(column.key, start)
    start += pixels
  }
  for (let index = list.length - 1; index >= 0; index--) {
    const { column, pixels } = list[index]
    if (column.pinned !== 'end') continue
    offsets.set(column.key, end)
    end += pixels
  }
  return { start, end, offsets }
}

export function useTableStickyColumns(tracks: MaybeRefOrGetter<readonly StickyTrack[]>, leading?: MaybeRefOrGetter<number>): ReturnType<typeof legacyStickyColumns>
export function useTableStickyColumns(options?: MaybeRefOrGetter<TableStickyColumnsOptions>): TableStickyColumnsControl
export function useTableStickyColumns(input: MaybeRefOrGetter<readonly StickyTrack[] | TableStickyColumnsOptions> = {}, leading: MaybeRefOrGetter<number> = 0) {
  if (Array.isArray(toValue(input))) return legacyStickyColumns(input as MaybeRefOrGetter<readonly StickyTrack[]>, leading)
  return markRaw<TableStickyColumnsControl>({ ranges(keys) {
    const options = toValue(input as MaybeRefOrGetter<TableStickyColumnsOptions>)
    const atStart = new Set(options.startKeys)
    const atEnd = new Set(options.endKeys)
    const lastStart = keys.reduce((last, key, index) => atStart.has(key) ? index : last, -1)
    const firstEnd = keys.findIndex(key => atEnd.has(key))
    return { start: keys.slice(0, lastStart + 1), end: firstEnd < 0 ? [] : keys.slice(Math.max(firstEnd, lastStart + 1)) }
  } })
}

function legacyStickyColumns(tracks: MaybeRefOrGetter<readonly StickyTrack[]>, leading: MaybeRefOrGetter<number>) {
  return computed(() => stickyOffsets(toValue(tracks), toValue(leading)))
}

export function useTableStickyView(options: {
  control: () => TableStickyColumnsControl | undefined
  viewport: Readonly<Ref<HTMLDivElement | null>>
  header: Readonly<Ref<HTMLTableSectionElement | null>>
  keys: () => readonly string[]
  auxiliary: () => readonly string[]
}) {
  const ranges = computed(() => options.control()?.ranges(options.keys()))
  const enabled = computed(() => Boolean(ranges.value?.start.length || ranges.value?.end.length))
  const measures = shallowRef({ widths: new Map<string, number>(), start: false, end: false })
  let schedule: (() => void) | undefined
  watch(() => [enabled.value, options.viewport.value, options.header.value, ranges.value, options.auxiliary()] as const,
    ([active, viewport, header], _, cleanup) => {
      const view = viewport?.ownerDocument.defaultView
      const row = header?.rows[0]
      if (!active || !viewport || !view || !header || !row) return
      const table = header.closest('table')
      if (!table) return
      let frame = 0
      let measureTracks = true
      const read = () => {
        frame = 0
        const rtl = view.getComputedStyle(viewport).direction === 'rtl'
        const area = viewport.getBoundingClientRect()
        const content = table.getBoundingClientRect()
        const leftEdge = area.left + viewport.clientLeft
        const left = content.left < leftEdge - 1
        const right = content.right > leftEdge + viewport.clientWidth + 1
        const start = rtl ? right : left
        const end = rtl ? left : right
        const previous = measures.value
        if (measureTracks || start !== previous.start || end !== previous.end) {
          const widths = measureTracks ? new Map([...row.cells].flatMap(cell => {
            const { tableColumnKey, tableAuxiliary } = cell.dataset
            const key = tableAuxiliary !== undefined ? 'aux:' + tableAuxiliary : tableColumnKey !== undefined ? 'data:' + tableColumnKey : undefined
            return key !== undefined && cell.hasAttribute('data-table-pin') ? [[key, cell.getBoundingClientRect().width] as const] : []
          })) : previous.widths
          measures.value = { widths, start, end }
        }
        measureTracks = false
      }
      const update = () => { if (!frame) frame = view.requestAnimationFrame(read) }
      const resize = () => { measureTracks = true; update() }
      schedule = update
      const sizing = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(resize) : undefined
      for (const node of [viewport, table, ...row.cells]) sizing?.observe(node)
      const direction = typeof view.MutationObserver === 'function' ? new view.MutationObserver(update) : undefined
      const host = viewport.closest('.sy-table')
      if (host) direction?.observe(host, { attributes: true, attributeFilter: ['dir'] })
      update()
      cleanup(() => { sizing?.disconnect(); direction?.disconnect(); view.cancelAnimationFrame(frame); schedule = undefined })
    }, { flush: 'post', immediate: true })
  const columns = computed(() => {
    const plan = ranges.value
    const metrics = measures.value
    if (!plan) return new Map<string, { edge: Edge; offset: number; shadow?: Edge }>()
    const leading = options.auxiliary()
    const body = options.keys()
    const leadingWidths = leading.map(key => metrics.widths.get('aux:' + key) ?? 0)
    const start = new Set(plan.start)
    const end = new Set(plan.end)
    const tracks = body.map((key): StickyTrack => ({ column: { key, pinned: start.has(key) ? 'start' : end.has(key) ? 'end' : undefined },
      pixels: metrics.widths.get('data:' + key) ?? 0 }))
    const offsets = stickyOffsets(tracks, plan.start.length ? leadingWidths.reduce((sum, value) => sum + value, 0) : 0).offsets
    const result = new Map<string, { edge: Edge; offset: number; shadow?: Edge }>()
    let offset = 0
    if (plan.start.length) for (const [index, key] of leading.entries()) {
      result.set('aux:' + key, { edge: 'start', offset })
      offset += leadingWidths[index] ?? 0
    }
    for (const [key, shift] of offsets) {
      const edge = start.has(key) ? 'start' : 'end'
      const shadow = edge === 'start' ? key === plan.start.at(-1) && metrics.start : key === plan.end[0] && metrics.end
      result.set('data:' + key, { edge, offset: shift, shadow: shadow ? edge : undefined })
    }
    return result
  })
  function attributes(key: string, auxiliary = false) {
    const column = columns.value.get((auxiliary ? 'aux:' : 'data:') + key)
    return column && { 'data-table-pin': column.edge, 'data-table-shadow': column.shadow,
      style: { [column.edge === 'start' ? 'insetInlineStart' : 'insetInlineEnd']: column.offset + 'px' } }
  }
  return { enabled, ranges, attributes, updateEdges: () => schedule?.() }
}
