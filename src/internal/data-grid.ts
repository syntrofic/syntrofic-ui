import type { TableCell, TableColumn, TableKey } from '../types'

export type DataGridWidth = number | `${number}` | `${number}${'px' | '%' | 'fr'}`
export type DataGridWidths = Readonly<Partial<Record<string, number>>>

export interface DataGridColumn<Row> extends Omit<TableColumn<Row>, 'width' | 'align'> {
  width?: DataGridWidth
  defaultWidth?: DataGridWidth
  minWidth?: number
  maxWidth?: number
  align?: 'start' | 'center' | 'end'
  pinned?: 'start' | 'end'
  resizable?: boolean
  editable?: boolean | ((row: Row) => boolean)
  input?: 'text' | 'number'
  parse?: (draft: string, row: Row) => TableCell
}

export interface DataGridEdit<Row> {
  row: Row
  key: TableKey
  column: DataGridColumn<Row>
  value: TableCell
  previous: TableCell
}

export interface DataGridReorder<Row> {
  keys: readonly TableKey[]
  target: { key: TableKey; position: 'before' | 'after' }
  rows: readonly Row[]
}

export function gridBounds(column: { minWidth?: number; maxWidth?: number }) {
  const min = Number.isFinite(column.minWidth) ? Math.max(24, column.minWidth!) : 84
  const max = Number.isFinite(column.maxWidth) ? Math.max(min, column.maxWidth!) : Math.max(min, 1400)
  return { min, max }
}

export function gridTracks<Row>(columns: readonly DataGridColumn<Row>[], widths: DataGridWidths, extent: number) {
  const tracks = columns.map(column => {
    const size = widths[column.key] ?? column.defaultWidth ?? column.width ?? (column.pinned ? column.minWidth ?? 120 : '1fr')
    const { min, max } = gridBounds(column)
    const length = typeof size === 'number' ? size : Number.parseFloat(size)
    const flexible = typeof size === 'string' && size.endsWith('fr')
    const pixels = typeof size === 'string' && size.endsWith('%') ? extent * length / 100 : length
    return { column, min, max, pixels: flexible ? min : Math.max(min, Math.min(max, Number.isFinite(pixels) ? pixels : min)),
      weight: flexible && length > 0 ? length : 0 }
  })
  let extra = extent - tracks.reduce((sum, track) => sum + track.pixels, 0)
  while (extra >= .1) {
    const flexible = tracks.filter(track => track.weight > 0 && track.pixels < track.max - .1)
    const total = flexible.reduce((sum, track) => sum + track.weight, 0)
    if (!total) break
    const available = extra
    for (const track of flexible) {
      const portion = Math.min(track.max - track.pixels, available * track.weight / total)
      track.pixels += portion
      extra -= portion
    }
  }
  return tracks
}

export function gridFold(value: string, locale?: string) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase(locale)
}
