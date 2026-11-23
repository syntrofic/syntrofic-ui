import { shallowRef } from 'vue'
import type { TableKey } from '../types'

export interface KanbanColumn {
  id: string
  title: string
  tone?: 'neutral' | 'sage' | 'blue' | 'sand' | 'rose'
  disabled?: boolean
}

export interface KanbanDestination {
  column: string
  index: number
}

export interface KanbanMove<Item> {
  keys: readonly TableKey[]
  from: readonly { key: TableKey; column: string; index: number }[]
  to: KanbanDestination
  items: readonly Item[]
}

export interface KanbanOptions<Item> {
  getKey: (item: Item) => TableKey
  getColumn: (item: Item) => string
  setColumn: (item: Item, column: string) => Item
}

export function moveKanban<Item>(
  items: readonly Item[], keys: readonly TableKey[], destination: KanbanDestination, options: KanbanOptions<Item>,
): KanbanMove<Item> | undefined {
  const requested = new Set(keys)
  const moving = items.filter(item => requested.has(options.getKey(item)))
  if (!moving.length) return
  const remaining = items.filter(item => !requested.has(options.getKey(item)))
  const placement = remaining.filter(item => options.getColumn(item) === destination.column)
  const index = Math.max(0, Math.min(placement.length, Number.isFinite(destination.index) ? Math.floor(destination.index) : placement.length))
  const next = placement[index]
  const previous = placement.at(-1)
  const insertion = next ? remaining.indexOf(next) : previous ? remaining.indexOf(previous) + 1 : remaining.length
  const updated = moving.map(item => options.getColumn(item) === destination.column ? item : options.setColumn(item, destination.column))
  const result = [...remaining.slice(0, insertion), ...updated, ...remaining.slice(insertion)]
  const from = moving.map(item => {
    const column = options.getColumn(item)
    return { key: options.getKey(item), column, index: items.filter(entry => options.getColumn(entry) === column).indexOf(item) }
  })
  if (from.every(source => source.column === destination.column)) {
    const before = items.filter(item => options.getColumn(item) === destination.column)
    const after = result.filter(item => options.getColumn(item) === destination.column)
    if (after.every((item, at) => options.getKey(item) === options.getKey(before[at]))) return
  }
  return { keys: from.map(source => source.key), from, to: { ...destination, index }, items: result }
}

export function useKanban<Item>(options: KanbanOptions<Item> & { initialItems?: readonly Item[] }) {
  const items = shallowRef<readonly Item[]>(options.initialItems ?? [])
  function addItem(item: Item) {
    if (!items.value.some(entry => options.getKey(entry) === options.getKey(item))) items.value = [...items.value, item]
  }
  function removeItem(key: TableKey) {
    items.value = items.value.filter(item => options.getKey(item) !== key)
  }
  function updateItem(key: TableKey, next: Item) {
    if (options.getKey(next) === key) items.value = items.value.map(item => options.getKey(item) === key ? next : item)
  }
  function moveItems(keys: readonly TableKey[], destination: KanbanDestination) {
    const next = moveKanban(items.value, keys, destination, options)
    if (next) items.value = next.items
    return next
  }
  return { items, addItem, removeItem, updateItem, moveItems }
}
