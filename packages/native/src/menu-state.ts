import type { NativeCollectionItem, NativeCollectionKey, NativeSelectionMode } from './collection-state'

export type NativeSelectValue = NativeCollectionKey | NativeCollectionKey[] | null

export interface NativeMenuItem extends NativeCollectionItem {
  meta?: string
  tone?: 'default' | 'danger'
  action?: boolean
  children?: readonly NativeMenuItem[]
  closeOnSelect?: boolean
}

export interface NativeMenuSection {
  id: NativeCollectionKey
  label?: string
  items: readonly NativeMenuItem[]
  selectionMode?: NativeSelectionMode
  disabled?: boolean
}

export function adjacentMenuItem(items: readonly NativeMenuItem[], current: NativeCollectionKey | undefined, key: 'previous' | 'next' | 'first' | 'last') {
  const enabled = items.filter(item => !item.disabled)
  if (!enabled.length) return undefined
  if (key === 'first') return enabled[0]
  if (key === 'last') return enabled.at(-1)
  const index = enabled.findIndex(item => Object.is(item.id, current))
  if (index < 0) return key === 'previous' ? enabled.at(-1) : enabled[0]
  return enabled[(index + (key === 'next' ? 1 : enabled.length - 1)) % enabled.length]
}
