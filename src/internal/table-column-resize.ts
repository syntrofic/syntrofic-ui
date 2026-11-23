import { computed, markRaw, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { gridTracks, type DataGridColumn, type DataGridWidth, type DataGridWidths } from './data-grid'
import { useShellMeasurement } from './shell-layout'
import type { TableColumn } from '../types'

export interface TableColumnResizeOptions<Row> {
  columns?: readonly TableColumn<Row>[]
  columnWidths?: DataGridWidths
  minWidth?: number
  maxWidth?: number
  getResizeLabel?: (column: TableColumn<Row>) => string
  onColumnResizeEnd?: (updates: DataGridWidths) => void
}

type Track<Row> = { column: TableColumn<Row>; pixels: number; min: number; max: number; flexible: boolean }
export interface TableColumnResizeControl<Row> {
  tracks: (columns: readonly TableColumn<Row>[], width: number, overrides?: DataGridWidths) => Track<Row>[]
  label: (column: TableColumn<Row>) => string
  commit: (updates: DataGridWidths) => void
}

function widthOf(width?: string): DataGridWidth {
  return width && /^\d*\.?\d+(?:px|%|fr)?$/.test(width) ? width as DataGridWidth : '1fr'
}

export function useTableColumnResize<Row>(options: MaybeRefOrGetter<TableColumnResizeOptions<Row>> = {}): TableColumnResizeControl<Row> {
  const config = computed(() => toValue(options))
  const local = shallowRef<DataGridWidths>({})
  return markRaw({
    tracks(columns, extent, overrides) {
      const { minWidth, maxWidth, columnWidths } = config.value
      const preferred = new Map(config.value.columns?.map(column => [column.key, column]))
      const inputs: DataGridColumn<Row>[] = columns.map(column => ({ ...column,
        width: widthOf(preferred.get(column.key)?.width ?? column.width),
        minWidth: minWidth ?? preferred.get(column.key)?.minWidth ?? column.minWidth,
        maxWidth: maxWidth ?? preferred.get(column.key)?.maxWidth ?? column.maxWidth,
      }))
      return gridTracks(inputs, { ...(columnWidths ?? local.value), ...overrides }, extent).map((track, index) => ({
        ...track, flexible: String(track.column.width).endsWith('fr'), column: columns[index],
      }))
    },
    label: column => config.value.getResizeLabel?.(column) ?? `Resize ${column.label}`,
    commit(updates) {
      if (config.value.columnWidths === undefined) local.value = { ...local.value, ...updates }
      config.value.onColumnResizeEnd?.(updates)
    },
  })
}

function resizePlan<Row>(tracks: readonly Track<Row>[], index: number) {
  const track = tracks[index]
  if (!track || track.column.resizable === false) return
  const neighbor = [tracks[index + 1], tracks[index - 1]].find(other =>
    other && other.column.resizable !== false && (other.flexible || track.flexible))
  const min = Math.ceil(neighbor ? Math.max(track.min, track.pixels + neighbor.pixels - neighbor.max) : track.min)
  const max = Math.floor(neighbor ? Math.min(track.max, track.pixels + neighbor.pixels - neighbor.min) : track.max)
  return { track, neighbor, min, max: Math.max(min, max) }
}

export function useTableColumnResizeView<Row>(options: {
  control: () => TableColumnResizeControl<Row> | undefined
  viewport: Readonly<Ref<HTMLElement | null>>
  columns: () => readonly TableColumn<Row>[]
  leadingWidth: () => number
}) {
  const active = shallowRef<{ plan: NonNullable<ReturnType<typeof resizePlan<Row>>>; updates?: DataGridWidths }>()
  const view = computed(() => options.control() ? options.viewport.value : null)
  const width = useShellMeasurement(view, node => node.clientWidth)
  const tracks = computed(() => options.control()?.tracks(options.columns(), Math.max(0, (width.value ?? 640) - options.leadingWidth()), active.value?.updates))
  const total = computed(() => tracks.value ? options.leadingWidth() + tracks.value.reduce((sum, track) => sum + track.pixels, 0) : undefined)
  const byKey = computed(() => new Map(tracks.value?.map(track => [track.column.key, track])))
  const plans = computed(() => new Map(tracks.value?.map((track, index, list) => [track.column.key, resizePlan(list, index)])))
  watch([options.control, options.columns], () => { active.value = undefined })
  function begin(key: string) {
    const plan = plans.value.get(key)
    if (plan) active.value = { plan }
  }
  function preview(key: string, value: number) {
    if (active.value?.plan.track.column.key !== key) begin(key)
    const session = active.value
    if (!session) return
    const { track, neighbor, min, max } = session.plan
    const pixels = Math.min(max, Math.max(min, value))
    const difference = pixels - track.pixels
    if (Math.abs(difference) < .5) { active.value = { plan: session.plan }; return }
    const updates: Record<string, number> = { [key]: pixels }
    if (neighbor) updates[neighbor.column.key] = neighbor.pixels - difference
    active.value = { plan: session.plan, updates }
  }
  function finish(key: string, commit = true) {
    if (active.value?.plan.track.column.key !== key) return
    const updates = active.value.updates
    active.value = undefined
    if (commit && updates) options.control()?.commit(updates)
  }
  function limits(key: string) {
    return active.value?.plan.track.column.key === key ? active.value.plan : plans.value.get(key)
  }
  return { viewportWidth: width, total, byKey, limits, begin, preview, finish }
}
