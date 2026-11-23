import type { NativeCollectionItem, NativeCollectionKey } from './collection-state'

export interface NativeTabItem extends NativeCollectionItem {
  shortLabel?: string
}

export interface NativePagedTabsOptions {
  items: readonly NativeTabItem[]
  label: string
  defaultSelected?: NativeCollectionKey
  pagerHeight?: number
  disabled?: boolean
  scrollable?: boolean
  equalWidth?: boolean
  separators?: boolean
  tabPlacement?: 'top' | 'bottom'
  swipeEnabled?: boolean
  animated?: boolean
  lazy?: boolean
  keepAlive?: boolean
  size?: 'sm' | 'md' | 'lg'
  scrollAlign?: 'start' | 'center' | 'end' | 'visible'
}

export interface NativeStepItem extends NativeCollectionItem {
  complete?: boolean
  status?: 'current' | 'complete' | 'pending'
}
