import { createAnimator, glideOf, prefersReducedMotion, startLayoutCompanion } from './motion'

export type LayoutEdge = 'block-start' | 'block-end' | 'inline-start' | 'inline-end'
export interface HeldLayoutSwap {
  copy: HTMLElement
  dispose(): void
}
interface EdgeMotionOptions {
  edge?: LayoutEdge
  anchor?: HTMLElement
  conceal?: boolean
}

function physicalSide(element: HTMLElement, edge: LayoutEdge) {
  const styles = element.ownerDocument.defaultView?.getComputedStyle(element)
  if (!styles) return 0
  const vertical = /^(vertical|sideways)/.test(styles.writingMode)
  const rtl = styles.direction === 'rtl'
  const start = edge.endsWith('start')
  if (edge.startsWith('block')) return vertical ? start === styles.writingMode.endsWith('-lr') ? 3 : 1 : start ? 0 : 2
  if (vertical) return start !== rtl ? 0 : 2
  return start !== rtl ? 3 : 1
}

/** Reveal or conceal a panel from an edge, optionally at the pace of a nearby layout glide. */
export function revealLayoutEdge(element: HTMLElement, { edge = 'block-end', anchor, conceal = false }: EdgeMotionOptions = {}) {
  if (typeof element.animate !== 'function' || prefersReducedMotion(element)) return
  const side = physicalSide(element, edge)
  const animator = createAnimator(element)
  const rider = anchor && glideOf(anchor)
  const frames = (rider?.effect as KeyframeEffect | undefined)?.getKeyframes()
  const axis = side % 2 === 0 ? 1 : 0
  const offset = (frame: ComputedKeyframe) => parseFloat(String(frame.translate).split(' ')[axis] ?? '0')
  const initial = frames?.length ? offset(frames[0]) : 0
  const clip = (progress: number): Keyframe => {
    const hidden = Math.min(100, Math.max(0, (conceal ? progress : 1 - progress) * 100))
    const edges = ['0%', '0%', '0%', '0%']
    edges[(side + 2) % 4] = hidden + '%'
    return { clipPath: 'inset(' + edges.join(' ') + ')' }
  }
  if (rider && frames?.length && Number.isFinite(initial) && Math.abs(initial) > 1) {
    const animation = animator.animate('edge', frames.map(frame => ({ ...clip(1 - offset(frame) / initial), offset: frame.computedOffset })),
      { role: conceal ? 'exit' : 'enter', duration: rider.effect?.getComputedTiming().duration, easing: 'linear', scaleTempo: false, fill: 'backwards' })
    return startLayoutCompanion(element, animation, rider)
  }
  const animation = animator.animate('edge', [clip(0), clip(1)], { role: conceal ? 'exit' : 'enter', fill: 'backwards' })
  return startLayoutCompanion(element, animation, rider)
}

/** Capture the outgoing visual before Vue commits a swap. The copy has no focusable surface. */
export function holdLayoutSwap(element: HTMLElement, boundary?: HTMLElement): HeldLayoutSwap | undefined {
  if (!element.isConnected || prefersReducedMotion(element) || typeof element.animate !== 'function') return
  const box = element.getBoundingClientRect()
  const document = element.ownerDocument
  const view = document.defaultView
  if (!view || !box.width || !box.height) return
  const style = view.getComputedStyle(element)
  const copy = element.cloneNode(true) as HTMLElement
  copy.removeAttribute('id')
  const privateAttributes = ['id', 'name', 'form', 'autofocus', 'data-reka-collection-item',
    'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-activedescendant']
  for (const control of [copy, ...copy.querySelectorAll(privateAttributes.map(attribute => `[${attribute}]`).join(','))]) {
    for (const attribute of privateAttributes) control.removeAttribute(attribute)
  }
  copy.setAttribute('aria-hidden', 'true')
  copy.setAttribute('data-layout-swap-copy', '')
  copy.inert = true
  const layer = boundary ?? element.closest<HTMLElement>(view.CSS.supports('selector(:popover-open)') ? 'dialog[open], [popover]:popover-open' : 'dialog[open]')
  // Keep copies inside the top layer when their source is in a modal.
  const origin = layer?.getBoundingClientRect()
  const scaleX = boundary && origin && boundary.offsetWidth ? origin.width / boundary.offsetWidth : 1
  const scaleY = boundary && origin && boundary.offsetHeight ? origin.height / boundary.offsetHeight : 1
  const host = layer ?? document.body
  Object.assign(copy.style, {
    position: layer ? 'absolute' : 'fixed', inset: 'auto', margin: '0', pointerEvents: 'none',
    zIndex: '1', top: ((box.top - (origin?.top ?? 0)) / scaleY + (boundary ? boundary.scrollTop - boundary.clientTop : 0)) + 'px',
    left: ((box.left - (origin?.left ?? 0)) / scaleX + (boundary ? boundary.scrollLeft - boundary.clientLeft : 0)) + 'px',
    width: box.width / scaleX + 'px', height: box.height / scaleY + 'px', boxSizing: 'border-box', overflow: 'hidden',
    transform: 'none', translate: 'none', color: style.color, backgroundColor: style.backgroundColor, font: style.font, opacity: style.opacity,
  })
  for (const property of Array.from(style)) {
    if (property.startsWith('--sy-')) copy.style.setProperty(property, style.getPropertyValue(property))
  }
  host.append(copy)
  return { copy, dispose: () => copy.remove() }
}

export function playLayoutSwap(previous: HeldLayoutSwap | undefined, next: HTMLElement | null | undefined, options: Omit<EdgeMotionOptions, 'conceal'> = {}) {
  if (!previous || !next?.isConnected || prefersReducedMotion(next)) { previous?.dispose(); return }
  const rider = options.anchor && glideOf(options.anchor)
  const outgoing = createAnimator(previous.copy).animate('swap', [{ opacity: previous.copy.style.opacity || 1 }, { opacity: 0 }], { role: 'exit', fill: 'backwards' })
  const incoming = createAnimator(next).animate('swap', [{ opacity: .12 }, { opacity: 1 }], { role: 'enter', fill: 'backwards' })
  startLayoutCompanion(previous.copy, outgoing, rider)
  startLayoutCompanion(next, incoming, rider ?? outgoing)
  const edge = options.edge || options.anchor ? revealLayoutEdge(next, options) : undefined
  outgoing.finished.then(previous.dispose, previous.dispose)
  return { incoming, outgoing, edge }
}
