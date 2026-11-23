import type { InjectionKey } from 'vue'

export type PanelSide = 'top' | 'right' | 'bottom' | 'left'
export type PanelPlacement = PanelSide | 'start' | 'end'
export type PanelSnapPoint = number | `${number}${'px' | 'rem' | '%' | 'vh' | 'dvh' | 'vw' | 'dvw'}`
export type SheetHeight = 'hug' | 'capped' | 'tall' | PanelSnapPoint
export type OverlayPurpose = 'info' | 'form' | 'required'

export interface PanelOptions {
  title: string
  description?: string
  side?: PanelPlacement
  direction?: 'ltr' | 'rtl'
  purpose?: OverlayPurpose
  size?: 'sm' | 'md' | 'lg' | 'full'
  extent?: PanelSnapPoint
  modal?: boolean
  draggable?: boolean
  autofocus?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  hideCloseButton?: boolean
  hideTitle?: boolean
  dismissLabel?: string
  resizeLabel?: string
  portalTarget?: string | HTMLElement
  contentId?: string
  contentClass?: string
}

export interface SheetOptions extends PanelOptions {
  height?: SheetHeight
  detached?: boolean
  snapPoints?: readonly PanelSnapPoint[]
  initialSnapPoint?: PanelSnapPoint | null
  sequential?: boolean
  dismissOnDrag?: boolean
}

export const panelDefaults = {
  modal: true,
  draggable: true,
  autofocus: true,
  closeOnBackdrop: undefined,
  closeOnEscape: undefined,
  hideCloseButton: undefined,
  dismissLabel: 'Close',
  resizeLabel: 'Resize panel',
} as const

export const panelDepth: InjectionKey<number> = Symbol('panel-depth')

export function resolvePanelSide(side: PanelPlacement, direction: 'ltr' | 'rtl'): PanelSide {
  if (side !== 'start' && side !== 'end') return side
  return (side === 'start') === (direction === 'ltr') ? 'left' : 'right'
}
