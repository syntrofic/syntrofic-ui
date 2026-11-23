import type { LayerAlignment, LayerPlacement } from './layer'

type Edge = 'top' | 'right' | 'bottom' | 'left'
const opposite: Record<Edge, Edge> = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' }
const horizontal = (edge: Edge) => edge === 'left' || edge === 'right'
const startsAxis = (edge: Edge) => edge === 'left' || edge === 'top'

export function layerLogicalEdges(direction: string, writingMode: string) {
  const vertical = writingMode !== 'horizontal-tb' && writingMode !== ''
  const blockStart = vertical ? writingMode.endsWith('-lr') ? 'left' : 'right' : 'top'
  const inlineOrigin = vertical ? writingMode === 'sideways-lr' ? 'bottom' : 'top' : 'left'
  const inlineStart = direction === 'rtl' ? opposite[inlineOrigin] : inlineOrigin
  return { blockStart, blockEnd: opposite[blockStart], inlineStart, inlineEnd: opposite[inlineStart] } as const
}

export function positionLayer(node: HTMLElement, anchor: Element, spacing: CSSStyleDeclaration, offset: number,
  placement: LayerPlacement, align: LayerAlignment, direction: string, writingMode: string) {
  const edges = layerLogicalEdges(direction, writingMode)
  const sides = { above: edges.blockStart, below: edges.blockEnd, start: edges.inlineStart, end: edges.inlineEnd }
  const side = sides[placement]
  const alignmentEdge = placement === 'above' || placement === 'below' ? edges.inlineStart : edges.blockStart
  const document = node.ownerDocument
  const viewport = document.defaultView?.visualViewport
  const viewX = viewport?.offsetLeft ?? 0
  const viewY = viewport?.offsetTop ?? 0
  const viewWidth = viewport?.width ?? document.documentElement.clientWidth
  const viewHeight = viewport?.height ?? document.documentElement.clientHeight
  const minX = viewX + (parseFloat(spacing.paddingLeft) || 0)
  const minY = viewY + (parseFloat(spacing.paddingTop) || 0)
  const maxX = viewX + viewWidth - (parseFloat(spacing.paddingRight) || 0)
  const maxY = viewY + viewHeight - (parseFloat(spacing.paddingBottom) || 0)
  const bounds = anchor.getBoundingClientRect()
  // The panel may be entering with a transform. Layout dimensions stay stable.
  const width = node.offsetWidth
  const height = node.offsetHeight
  const onX = horizontal(side)
  const size = onX ? width : height
  const min = onX ? minX : minY
  const max = onX ? maxX : maxY
  const start = onX ? bounds.left : bounds.top
  const end = onX ? bounds.right : bounds.bottom
  const before = start - offset - size
  const after = end + offset
  const fitsBefore = before >= min && before + size <= max
  const fitsAfter = after >= min && after + size <= max
  const preferBefore = startsAxis(side)
  const useBefore = preferBefore
    ? fitsBefore || !fitsAfter && start - min >= max - end
    : !fitsAfter && (fitsBefore || start - min > max - end)
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high))
  const main = clamp(useBefore ? before : after, min, max - size)
  const crossMin = onX ? minY : minX
  const crossMax = onX ? maxY : maxX
  const crossSize = onX ? height : width
  const crossStart = onX ? bounds.top : bounds.left
  const crossEnd = onX ? bounds.bottom : bounds.right
  const atStart = align === 'start' ? startsAxis(alignmentEdge) : !startsAxis(alignmentEdge)
  const crossPosition = align === 'center' ? (crossStart + crossEnd - crossSize) / 2 : atStart ? crossStart : crossEnd - crossSize
  const cross = clamp(crossPosition, crossMin, crossMax - crossSize)
  return { x: onX ? main : cross, y: onX ? cross : main, side: useBefore === preferBefore ? side : opposite[side] }
}

const phrasingContext = 'a, abbr, b, bdi, bdo, button, cite, code, data, dfn, em, h1, h2, h3, h4, h5, h6, i, kbd, label, mark, meter, p, pre, progress, q, ruby, s, samp, small, span, strong, sub, summary, sup, time, u, var'
const restrictedHost = 'colgroup, dl, html, menu, ol, optgroup, option, select, table, tbody, thead, tfoot, tr, ul'

export function findLayerHost(origin: HTMLElement) {
  let host = origin
  for (let parent = origin; parent.parentElement; parent = parent.parentElement) {
    if (parent.matches(phrasingContext)) host = parent.parentElement
  }
  while (host.matches(restrictedHost) && host.parentElement) host = host.parentElement
  return host
}
