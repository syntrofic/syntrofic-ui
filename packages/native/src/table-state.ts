import type { NativeCollectionKey } from './collection-state'

export type NativeTableDirection = 'ascending' | 'descending'
export type NativeTableValue = string | number | boolean | Date | null | undefined

export interface NativeTableColumn {
  key: string
  label: string
  width?: number
  minWidth?: number
  weight?: number
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
}

export interface NativeTableSort {
  column: string
  direction: NativeTableDirection
}

export interface NativeTableRow {
  id: NativeCollectionKey
  disabled?: boolean
  label?: string
  cells: Readonly<Record<string, NativeTableValue>>
}

function finite(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value) ? value : fallback
}

export function nativeTableTracks(columns: readonly NativeTableColumn[], viewport: number, selectionWidth = 0) {
  const widths = columns.map(column => Math.max(56, finite(column.width, finite(column.minWidth, 104))))
  const weights = columns.map(column => column.width === undefined ? Math.max(0, finite(column.weight, 1)) : 0)
  const total = widths.reduce((sum, width) => sum + width, Math.max(0, selectionWidth))
  const spare = Math.max(0, finite(viewport, 0) - total)
  const weight = weights.reduce((sum, value) => sum + value, 0)
  const tracks = widths.map((width, index) => width + (weight ? spare * weights[index] / weight : 0))
  return { tracks, width: Math.max(total, viewport), selectionWidth: Math.max(0, selectionWidth) }
}

export function nativeTableSort<R extends NativeTableRow>(
  rows: readonly R[],
  sort: NativeTableSort | undefined,
  compareText: (a: string, b: string) => number = (a, b) => a.localeCompare(b),
) {
  if (!sort) return [...rows]
  const direction = sort.direction === 'ascending' ? 1 : -1
  function sortable(value: NativeTableValue) {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : undefined
    if (typeof value === 'number' && !Number.isFinite(value)) return undefined
    return value ?? undefined
  }
  return rows.map((row, position) => ({ row, position, value: sortable(row.cells[sort.column]) })).sort((a, b) => {
    if (a.value === undefined) return b.value === undefined ? a.position - b.position : 1
    if (b.value === undefined) return -1
    const compared = typeof a.value === 'number' && typeof b.value === 'number'
      ? a.value - b.value : compareText(String(a.value), String(b.value))
    return compared ? compared * direction : a.position - b.position
  }).map(({ row }) => row)
}
