import type { TableKey } from '../types'

export type TreeDropPosition = 'before' | 'after' | 'inside'
export type TreeChildren<T> = (item: T) => readonly T[] | undefined
export type TreeReplace<T> = (item: T, children: readonly T[]) => T

export interface TreeEntry<T> {
  item: T
  key: TableKey
  parent: TableKey | null
  level: number
  position: number
  size: number
  group: number
}

export function flattenTree<T>(
  forest: readonly (readonly T[])[],
  key: (item: T) => TableKey,
  children: TreeChildren<T>,
  expanded?: (item: T, key: TableKey) => boolean,
) {
  const output: TreeEntry<T>[] = []
  const seen = new Set<TableKey>()
  function visit(items: readonly T[], parent: TableKey | null, level: number, group: number) {
    for (const [index, item] of items.entries()) {
      const id = key(item)
      if (seen.has(id)) continue
      seen.add(id)
      output.push({ item, key: id, parent, level, position: index + 1, size: items.length, group })
      const nested = children(item)
      if (nested?.length && (!expanded || expanded(item, id))) visit(nested, id, level + 1, group)
    }
  }
  forest.forEach((items, group) => visit(items, null, 1, group))
  return output
}

export function moveTree<T>(
  forest: readonly (readonly T[])[],
  keys: readonly TableKey[],
  target: TableKey,
  position: TreeDropPosition,
  keyOf: (item: T) => TableKey,
  childrenOf: TreeChildren<T>,
  withChildren: TreeReplace<T>,
) {
  const entries = flattenTree(forest, keyOf, childrenOf)
  const lookup = new Map(entries.map(entry => [entry.key, entry]))
  const requested = new Set(keys)
  const targetEntry = lookup.get(target)
  if (!targetEntry || requested.has(target)) return
  function hasSelectedAncestor(entry: TreeEntry<T>, candidates: ReadonlySet<TableKey>) {
    let current = entry.parent
    while (current !== null) {
      if (candidates.has(current)) return true
      current = lookup.get(current)?.parent ?? null
    }
    return false
  }
  if (hasSelectedAncestor(targetEntry, requested)) return
  const sources = entries.filter(entry => requested.has(entry.key) && !hasSelectedAncestor(entry, requested))
  if (!sources.length) return
  const moving = new Set(sources.map(source => source.key))
  const moved = sources.map(source => source.item)
  function update(items: readonly T[]): readonly T[] {
    let changed = false
    const result: T[] = []
    for (const item of items) {
      const id = keyOf(item)
      if (moving.has(id)) {
        changed = true
        continue
      }
      if (id === target && position === 'before') {
        result.push(...moved)
        changed = true
      }
      const children = childrenOf(item)
      const previous = children ?? []
      const next = id === target && position === 'inside' ? [...update(previous), ...moved] :
        children?.length ? update(children) : previous
      if (next !== previous) changed = true
      result.push(next !== previous ? withChildren(item, next) : item)
      if (id === target && position === 'after') {
        result.push(...moved)
        changed = true
      }
    }
    return changed ? result : items
  }
  return { moved: sources.map(source => source.key), forest: forest.map(update) }
}

export function treeElementKey(key: TableKey) {
  return `${typeof key === 'number' ? 'n' : 's'}-${key}`
}
