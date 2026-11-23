import type { NativeCollectionItem } from './collection-state'
import type { NativeSelectValue } from './menu-state'

export interface NativeOptionItem extends NativeCollectionItem {
  keywords?: readonly string[]
}

export interface NativeOptionFieldOptions {
  label: string
  description?: string
  placeholder?: string
  items?: readonly NativeOptionItem[]
  loadOptions?: (query: string, signal?: AbortSignal) => Promise<readonly NativeOptionItem[]>
  filter?: (item: NativeOptionItem, query: string) => boolean
  minimumCharacters?: number
  debounce?: number
  multiple?: boolean
  clearable?: boolean
  disabled?: boolean
  readonly?: boolean
  invalid?: boolean
  openOnFocus?: boolean
  keepOpenOnSelect?: boolean
  allowCustomValue?: boolean
  showTrigger?: boolean
  clearLabel?: string
  triggerLabel?: string
  closeLabel?: string
  emptyText?: string
  loadingText?: string
  errorText?: string
  minimumText?: string
  formatSelection?: (items: readonly NativeOptionItem[]) => string
}

export type NativeOptionFieldEvents = {
  change: [value: NativeSelectValue]
  select: [item: NativeOptionItem, selected: boolean]
  submit: [query: string]
  clear: []
  loadError: [error: unknown]
}

const searchText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()

export function matchesNativeOption(item: NativeOptionItem, query: string) {
  const needle = searchText(query.trim())
  return !needle || [item.label, item.description, ...(item.keywords ?? [])]
    .some(value => value !== undefined && searchText(value).includes(needle))
}

export function nextNativeOptionIndex(current: number, length: number, key: 'first' | 'last' | 'previous' | 'next') {
  if (!length) return -1
  if (key === 'first') return 0
  if (key === 'last' || current < 0 && key === 'previous') return length - 1
  return (current + (key === 'next' ? 1 : length - 1)) % length
}
