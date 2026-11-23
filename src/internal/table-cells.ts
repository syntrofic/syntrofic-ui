import { computed } from 'vue'
import type { TableCell, TableColumn, TableSort } from '../types'

export function useTableCells(locale: () => string | undefined) {
  const collator = computed(() => new Intl.Collator(locale(), { numeric: true, sensitivity: 'base' }))
  const numberFormat = computed(() => new Intl.NumberFormat(locale()))
  const dateFormat = computed(() => new Intl.DateTimeFormat(locale()))

  function compare(left: TableCell, right: TableCell) {
    const missing = (value: TableCell) => value == null || typeof value === 'number' && Number.isNaN(value) || value instanceof Date && Number.isNaN(value.getTime())
    const leftEmpty = missing(left)
    const rightEmpty = missing(right)
    if (leftEmpty || rightEmpty) return Number(leftEmpty) - Number(rightEmpty)
    if (typeof left === 'number' && typeof right === 'number') return left - right
    if (left instanceof Date && right instanceof Date) return left.valueOf() - right.valueOf()
    return collator.value.compare(String(left), String(right))
  }

  function sortRows<Row>(rows: readonly Row[], order: TableSort | readonly TableSort[] | null | undefined,
    columns: readonly Pick<TableColumn<Row>, 'key' | 'value' | 'compare' | 'sortable'>[]) {
    if (!order) return rows
    const ordering = 'key' in order ? [order] : order
    const active = ordering.flatMap(sort => {
      const column = columns.find(item => item.key === sort.key && item.sortable)
      return column ? [{ column, direction: sort.direction === 'ascending' ? 1 : -1 }] : []
    })
    if (!active.length) return rows
    return [...rows].sort((left, right) => {
      for (const { column, direction } of active) {
        const difference = column.compare ? column.compare(left, right) : compare(column.value(left), column.value(right))
        if (difference) return direction * difference
      }
      return 0
    })
  }

  function formatCell(value: TableCell) {
    if (value == null) return ''
    if (typeof value === 'number') return numberFormat.value.format(value)
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : dateFormat.value.format(value)
    return String(value)
  }
  return { numberFormat, formatCell, sortRows }
}
