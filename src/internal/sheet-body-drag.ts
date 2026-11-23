import { gestureMotion } from './motion-defaults'
import type { PanelDragContact } from './use-panel-position'

interface SheetDragDriver {
  begin: (contact: PanelDragContact) => boolean
  update: (contact: PanelDragContact) => void
  finish: (contact: PanelDragContact) => void
  cancel: (id: number) => void
  canExpand: () => boolean
}

type Edge = 'top' | 'bottom'
const slop = gestureMotion.pan.threshold
const atEdge = (scrollers: HTMLElement[], edge: Edge) => scrollers.every(node =>
  edge === 'top' ? node.scrollTop <= 1 : node.scrollHeight - node.clientHeight - node.scrollTop <= 1)

export function attachSheetBodyDrag(body: HTMLElement, driver: SheetDragDriver) {
  const view = body.ownerDocument.defaultView
  let gesture: {
    origin: PanelDragContact
    x: number
    previousY: number
    scrollers: HTMLElement[]
    initial: Record<Edge, boolean>
    scrolled: boolean
    boundary?: { edge: Edge; contact: PanelDragContact }
    dragging?: Edge
  } | undefined

  function cancel() {
    if (gesture?.dragging) driver.cancel(gesture.origin.id)
    gesture = undefined
  }

  function start(event: TouchEvent) {
    cancel()
    const touch = event.changedTouches[0]
    if (!view || event.defaultPrevented || event.touches.length !== 1 || !touch) return
    const path = event.composedPath()
    const stop = path.indexOf(body)
    if (stop < 0) return
    const scrollers: HTMLElement[] = []
    let panX = true
    let panY = true
    for (const target of path.slice(0, stop + 1)) {
      if (!(target instanceof Element)) continue
      if (target.matches('dialog, [role="dialog"], [role="alertdialog"]')) return
      const { overflowY, touchAction } = view.getComputedStyle(target)
      if (target !== body && touchAction && touchAction !== 'auto' && touchAction !== 'manipulation') {
        panX &&= /\bpan-(x|left|right)\b/.test(touchAction)
        panY &&= /\bpan-(y|up|down)\b/.test(touchAction)
        if (!panX && !panY) return
      }
      if (target instanceof HTMLElement && (overflowY === 'auto' || overflowY === 'scroll')) {
        scrollers.push(target)
      }
    }
    const origin = { id: touch.identifier, position: touch.clientY, time: event.timeStamp }
    gesture = { origin, x: touch.clientX, previousY: touch.clientY, scrollers, scrolled: false,
      initial: { top: atEdge(scrollers, 'top'), bottom: atEdge(scrollers, 'bottom') } }
  }

  function move(event: TouchEvent) {
    if (event.touches.length > 1) { cancel(); return }
    const active = gesture
    const touch = event.touches[0]
    if (!active || touch?.identifier !== active.origin.id) return
    const { clientY, clientX } = touch
    const step = clientY - active.previousY
    active.previousY = clientY
    const contact = { id: touch.identifier, position: clientY, time: event.timeStamp }
    if (active.dragging) {
      if (event.cancelable) event.preventDefault()
      else if (!atEdge(active.scrollers, active.dragging)) { cancel(); return }
      driver.update(contact)
      return
    }
    const travel = clientY - active.origin.position
    const across = Math.abs(clientX - active.x)
    if (across >= slop && across > Math.abs(travel)) { cancel(); return }
    const direction = active.scrolled ? step : travel
    if (!direction) return
    const edge = direction > 0 ? 'top' : 'bottom'
    if (!atEdge(active.scrollers, edge) || (edge === 'bottom' && !driver.canExpand())) {
      active.scrolled = true
      active.boundary = undefined
      return
    }
    let origin = active.origin
    if (active.scrolled || !active.initial[edge]) {
      // Only motion beyond the scroll edge belongs to the sheet.
      if (active.boundary?.edge !== edge) active.boundary = { edge, contact }
      origin = active.boundary.contact
    }
    if (Math.abs(clientY - origin.position) < slop || !driver.begin(origin)) return
    active.dragging = edge
    if (event.cancelable) event.preventDefault()
    driver.update(contact)
  }

  function end(event: TouchEvent) {
    const touch = Array.from(event.changedTouches).find(touch => touch.identifier === gesture?.origin.id)
    if (!touch) { if (!event.touches.length) cancel(); return }
    const dragging = gesture?.dragging
    gesture = undefined
    if (!dragging) return
    if (event.type === 'touchcancel') driver.cancel(touch.identifier)
    else {
      if (event.cancelable) event.preventDefault()
      driver.finish({ id: touch.identifier, position: touch.clientY, time: event.timeStamp })
    }
  }

  const events = new AbortController()
  body.addEventListener('touchstart', start, { passive: true, signal: events.signal })
  body.addEventListener('touchmove', move, { passive: false, signal: events.signal })
  body.addEventListener('touchend', end, { passive: false, signal: events.signal })
  body.addEventListener('touchcancel', end, { passive: true, signal: events.signal })
  return () => { cancel(); events.abort() }
}
