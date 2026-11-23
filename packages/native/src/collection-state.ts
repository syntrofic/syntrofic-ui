export type NativeCollectionKey = string | number

export interface NativeCollectionItem {
  id: NativeCollectionKey
  label: string
  description?: string
  disabled?: boolean
}

export interface NativeAccordionItem extends NativeCollectionItem {
  text?: string
}

export interface NativeTagItem extends NativeCollectionItem {
  removable?: boolean
}

export type NativeSelectionMode = 'none' | 'single' | 'multiple'

export function isSelected(values: readonly NativeCollectionKey[], key: NativeCollectionKey) {
  return values.some(value => Object.is(value, key))
}

export function toggleCollectionSelection(
  values: readonly NativeCollectionKey[],
  key: NativeCollectionKey,
  mode: NativeSelectionMode,
  allowEmpty = true,
): NativeCollectionKey[] {
  if (mode === 'none') return [...values]
  const selected = isSelected(values, key)
  if (selected) return allowEmpty || mode === 'multiple' && values.length > 1
    ? values.filter(value => !Object.is(value, key)) : [...values]
  return mode === 'single' ? [key] : [...values, key]
}

export function activeCollectionItem(items: readonly NativeCollectionItem[], value: NativeCollectionKey | undefined) {
  return items.find(item => Object.is(item.id, value) && !item.disabled) ?? items.find(item => !item.disabled)
}

export function tagRemovalTarget(items: readonly NativeTagItem[], index: number, pending: ReadonlySet<NativeCollectionKey>) {
  const canReceiveFocus = (item: NativeTagItem) => !item.disabled && !pending.has(item.id)
  return items.slice(index).find(canReceiveFocus) ?? items.slice(0, index).reverse().find(canReceiveFocus)
}

export function scrollEdges(offset: number, maximum: number, length: number) {
  const size = Math.max(1, length)
  const position = Math.max(0, Math.min(maximum, offset))
  return {
    leading: maximum <= 1 || position <= 1 ? 0 : Math.min(1, position / size),
    trailing: maximum <= 1 || maximum - position <= 1 ? 0 : Math.min(1, (maximum - position) / size),
  }
}
