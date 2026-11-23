export type NativePopoverSide = 'top' | 'bottom' | 'left' | 'right'
export type NativePopoverAlign = 'start' | 'center' | 'end'
export type NativePopoverWidth = 'trigger' | 'content-fit' | 'full' | number
export type NativePopoverPresentation = 'popover' | 'bottom-sheet'

export interface NativePopoverOptions {
  presentation?: NativePopoverPresentation
  placement?: NativePopoverSide
  align?: NativePopoverAlign
  width?: NativePopoverWidth
  offset?: number
  alignOffset?: number
  inset?: number
  maxHeight?: number
  avoidCollisions?: boolean
  dismissOnOutside?: boolean
  dismissOnBack?: boolean
  scrollable?: boolean
}

export interface OverlayRect {
  x: number
  y: number
  width: number
  height: number
}

export interface PopoverPlacementOptions {
  side: NativePopoverSide
  align: NativePopoverAlign
  offset: number
  alignOffset: number
  inset: number
  avoidCollisions: boolean
  rtl: boolean
}

const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const
const vertical = (side: NativePopoverSide) => side === 'top' || side === 'bottom'
const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value))

export function popoverWidth(width: NativePopoverWidth, trigger: number, content: number, viewport: number) {
  const desired = width === 'trigger' ? trigger : width === 'content-fit' ? content : width === 'full' ? viewport : width
  return clamp(Number.isFinite(desired) ? desired : content, Math.min(width === 'content-fit' ? 64 : 1, viewport), viewport)
}

export function placePopover(viewport: OverlayRect, anchor: OverlayRect, panel: Pick<OverlayRect, 'width' | 'height'>, options: PopoverPlacementOptions) {
  const inset = Math.max(0, options.inset)
  const left = viewport.x + inset
  const right = Math.max(left + 1, viewport.x + viewport.width - inset)
  const top = viewport.y + inset
  const bottom = Math.max(top + 1, viewport.y + viewport.height - inset)
  const gap = options.offset
  const room = {
    top: anchor.y - top - gap,
    bottom: bottom - anchor.y - anchor.height - gap,
    left: anchor.x - left - gap,
    right: right - anchor.x - anchor.width - gap,
  }
  const preferred = options.side
  const main = vertical(preferred) ? panel.height : panel.width
  const alternate = opposite[preferred]
  const side = options.avoidCollisions && room[preferred] < main && room[alternate] > room[preferred] ? alternate : preferred
  const alongY = vertical(side)
  const width = Math.min(panel.width, right - left, !alongY && options.avoidCollisions ? Math.max(64, room[side]) : Infinity)
  const height = Math.min(panel.height, bottom - top, alongY && options.avoidCollisions ? Math.max(56, room[side]) : Infinity)
  const a = options.align === 'center' ? 0.5
    : (options.align === 'end') !== (alongY && options.rtl) ? 1 : 0
  const cross = options.alignOffset * (alongY && options.rtl ? -1 : 1)
  let x = alongY ? anchor.x + (anchor.width - width) * a + cross : side === 'right' ? anchor.x + anchor.width + gap : anchor.x - width - gap
  let y = alongY ? side === 'bottom' ? anchor.y + anchor.height + gap : anchor.y - height - gap
    : anchor.y + (anchor.height - height) * a + cross
  if (options.avoidCollisions) {
    x = clamp(x, left, right - width)
    y = clamp(y, top, bottom - height)
  }
  return { x, y, width, height, side }
}
