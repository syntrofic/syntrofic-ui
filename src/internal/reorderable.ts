import { createPanGesture } from './pan-gesture'
import { createAnimator, prefersReducedMotion } from './motion'
import { createScrollMotion } from './scroll-motion'
import { reorderMotion } from './motion-defaults'

export interface ReorderMove {
  key: string
  target: string
  placement: 'before' | 'after'
  input: 'pointer' | 'keyboard'
}
export interface ReorderableOptions {
  axis?: 'horizontal' | 'vertical'
  handle?: string
  scrollRoot?: HTMLElement | null
  autoScroll?: boolean
  canMove?: (move: ReorderMove) => boolean
  onMove: (move: ReorderMove) => void
}

/** Pointer and Alt+Arrow reordering for direct children with data-reorder-key. */
export function createReorderable(root: HTMLElement, options: ReorderableOptions) {
  const vertical = options.axis !== 'horizontal'
  const handle = options.handle ?? '[data-reorder-handle]'
  const itemSelector = '[data-reorder-key]'
  let item: HTMLElement | undefined
  let target: HTMLElement | undefined
  let proposal: ReorderMove | undefined
  let original: string | undefined
  let returning: Animation | undefined
  let scroll: { viewport: HTMLElement; initial: number; timer?: number } | undefined
  let newest: { distance: number; cursor: number } | undefined
  let touchStart: number | undefined
  let scrollTouch: { viewport: HTMLElement; initial: number } | undefined
  let kinetic: ReturnType<typeof createScrollMotion> | undefined
  const view = root.ownerDocument.defaultView
  const scrollProperty = vertical ? 'scrollTop' : 'scrollLeft'

  function findViewport() {
    if (options.autoScroll === false) return
    if (options.scrollRoot !== undefined) return options.scrollRoot
    for (let node: HTMLElement | null = root; node; node = node.parentElement) {
      const style = view?.getComputedStyle(node)
      const overflow = vertical ? style?.overflowY : style?.overflowX
      const extent = vertical ? node.scrollHeight - node.clientHeight : node.scrollWidth - node.clientWidth
      if (extent > 1 && overflow && /^(auto|scroll|overlay)$/.test(overflow)) return node
    }
    const documentViewport = root.ownerDocument.scrollingElement
    if (documentViewport instanceof HTMLElement) {
      const extent = vertical ? documentViewport.scrollHeight - documentViewport.clientHeight : documentViewport.scrollWidth - documentViewport.clientWidth
      if (extent > 1) return documentViewport
    }
  }

  function entries() { return Array.from(root.children).filter(node => node instanceof HTMLElement && node.matches(itemSelector)) as HTMLElement[] }
  function source(event: Event) {
    const node = event.target instanceof Element ? event.target.closest(handle)?.closest<HTMLElement>(itemSelector) : null
    return node?.parentElement === root ? node : undefined
  }
  function move(source: HTMLElement, target: HTMLElement, placement: ReorderMove['placement'], input: ReorderMove['input']) {
    const key = source.dataset.reorderKey
    const relative = target.dataset.reorderKey
    if (!key || !relative || key === relative) return
    const move = { key, target: relative, placement, input }
    if (options.canMove?.(move) !== false) return move
  }
  function clear() {
    if (scroll?.timer !== undefined) view?.clearInterval(scroll.timer)
    scroll = newest = undefined
    scrollTouch = undefined
    touchStart = undefined
    if (item && original !== undefined) {
      item.style.translate = original
      item.removeAttribute('data-sy-reordering')
    }
    target?.removeAttribute('data-sy-reorder-target')
    target = item = undefined
    proposal = undefined
    original = undefined
  }

  function updateTarget(cursor: number) {
    if (!item) return
    const order = entries()
    let next: HTMLElement | undefined
    let nearest = Infinity
    let center = 0
    for (const sibling of order) {
      if (sibling === item) continue
      const box = sibling.getBoundingClientRect()
      const midpoint = vertical ? (box.top + box.bottom) / 2 : (box.left + box.right) / 2
      const distance = Math.abs(cursor - midpoint)
      if (distance < nearest) { nearest = distance; center = midpoint; next = sibling }
    }
    target?.removeAttribute('data-sy-reorder-target')
    target = undefined
    if (!next) { proposal = undefined; return }
    const rtl = !vertical && root.matches(':dir(rtl)')
    const placement = (cursor < center) !== rtl ? 'before' : 'after'
    const from = order.indexOf(item)
    const to = order.indexOf(next)
    const unchanged = to === from + 1 && placement === 'before' || to === from - 1 && placement === 'after'
    proposal = unchanged ? undefined : move(item, next, placement, 'pointer')
    if (proposal) {
      target = next
      target.setAttribute('data-sy-reorder-target', placement)
    }
  }
  function paint() {
    if (!item || !newest) return
    const travelled = scroll ? scroll.viewport[scrollProperty] - scroll.initial : 0
    const distance = newest.distance + travelled
    item.style.translate = vertical ? '0px ' + distance + 'px' : distance + 'px 0px'
    updateTarget(newest.cursor)
  }
  function scrollStep() {
    const viewport = scroll?.viewport
    if (!item || !viewport || !newest) return
    const box = item.getBoundingClientRect()
    const bounds = viewport === root.ownerDocument.scrollingElement
      ? new DOMRect(0, 0, viewport.clientWidth, viewport.clientHeight) : viewport.getBoundingClientRect()
    const before = vertical ? bounds.top - box.top : bounds.left - box.left
    const after = vertical ? box.bottom - bounds.bottom : box.right - bounds.right
    const depth = Math.max(before, after)
    if (depth < -reorderMotion.edgeInset) return
    const direction = before > after ? -1 : 1
    const amount = Math.round(2 + 8 * Math.min(1, Math.max(0, depth / 24)) ** 1.6) * direction
    const position = viewport[scrollProperty]
    if (vertical) viewport.scrollBy({ top: amount, behavior: 'instant' })
    else viewport.scrollBy({ left: amount, behavior: 'instant' })
    if (viewport[scrollProperty] !== position) paint()
  }

  const detach = createPanGesture(root, {
    axis: vertical ? 'vertical' : 'horizontal',
    shouldStart: event => {
      returning?.cancel()
      kinetic?.dispose()
      clear()
      item = source(event)
      touchStart = event.pointerType === 'touch' ? event.timeStamp : undefined
      return Boolean(item)
    },
    onStart: (_, event) => {
      if (!item) return
      const viewport = findViewport()
      if (viewport && touchStart !== undefined && event.timeStamp - touchStart < reorderMotion.claimDelayMs) {
        scrollTouch = { viewport, initial: viewport[scrollProperty] }
        return
      }
      original = item.style.translate
      item.setAttribute('data-sy-reordering', '')
      if (viewport) scroll = { viewport, initial: viewport[scrollProperty], timer: view?.setInterval(scrollStep, reorderMotion.tickMs) }
    },
    onMove: ({ x, y }, event) => {
      if (scrollTouch) {
        const value = scrollTouch.initial - (vertical ? y : x)
        scrollTouch.viewport.scrollTo(vertical ? { top: value, behavior: 'instant' } : { left: value, behavior: 'instant' })
        return
      }
      newest = { distance: vertical ? y : x, cursor: vertical ? event.clientY : event.clientX }
      paint()
    },
    onEnd: ({ velocityX, velocityY }, _, cancelled) => {
      if (scrollTouch) {
        const viewport = scrollTouch.viewport
        clear()
        if (!cancelled) {
          kinetic = createScrollMotion(viewport)
          kinetic.coast(-(vertical ? velocityY : velocityX) * 1000, vertical ? 'y' : 'x')
        }
        return
      }
      const result = proposal
      if (result && !cancelled) {
        try { options.onMove(result) } finally { clear() }
        return
      }
      const released = item
      const from = released?.style.translate
      clear()
      if (released && from && !prefersReducedMotion(released)) {
        returning = createAnimator(released).animate('reorder-return', [{ translate: from }, { translate: released.style.translate || '0px 0px' }], { role: 'move' })
      }
    },
  })

  function key(event: KeyboardEvent) {
    if (!event.altKey || event.ctrlKey || event.shiftKey || event.metaKey || event.isComposing) return
    const current = source(event)
    if (!current) return
    const rtl = !vertical && root.matches(':dir(rtl)')
    const previous = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft'
    const next = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight'
    const step = event.key === previous ? -1 : event.key === next ? 1 : 0
    if (!step) return
    const siblings = entries()
    const sibling = siblings[siblings.indexOf(current) + step]
    const result = sibling ? move(current, sibling, step < 0 ? 'before' : 'after', 'keyboard') : undefined
    if (!result) return
    event.preventDefault()
    options.onMove(result)
  }
  root.addEventListener('keydown', key)
  return () => { detach(); clear(); returning?.cancel(); kinetic?.dispose(); root.removeEventListener('keydown', key) }
}
