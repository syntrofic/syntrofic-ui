import { cancelTouchClick } from './menu-press'

/** Hold only contacts that begin during entrance. The opening gesture can finish. */
export function holdTouchInput(view: Window, scope?: HTMLElement) {
  const events = new AbortController()
  const options = { signal: events.signal, capture: true, passive: false }
  const pointers = new Map<number, PointerEvent>()
  const touches = new Map<number, () => void>()
  let guard: { id: number; type: string } | undefined
  let entering = true
  let expiry = 0
  let guardExpiry = 0

  function dispose() {
    events.abort()
    for (const stop of touches.values()) stop()
    touches.clear()
    view.clearTimeout(expiry)
    view.clearTimeout(guardExpiry)
  }
  function settle() {
    if (!entering && !pointers.size && !touches.size && !guard) dispose()
  }
  function consume(event: Event) {
    if (event.cancelable) event.preventDefault()
    event.stopImmediatePropagation()
  }
  view.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    guard = undefined
    if (!entering) { settle(); return }
    if (scope && !event.composedPath().includes(scope)) return
    pointers.set(event.pointerId, event)
    consume(event)
  }, options)
  view.addEventListener('pointermove', event => {
    if (pointers.has(event.pointerId)) consume(event)
  }, options)
  for (const type of ['pointerup', 'pointercancel'] as const) view.addEventListener(type, event => {
    if (!pointers.delete(event.pointerId)) return
    if (type === 'pointerup') {
      guard = { id: event.pointerId, type: event.pointerType }
      view.clearTimeout(guardExpiry)
      guardExpiry = view.setTimeout(() => { guard = undefined; settle() }, 420)
    }
    consume(event)
    settle()
  }, options)
  view.addEventListener('touchstart', event => {
    for (const contact of Array.from(event.changedTouches)) {
      touches.get(contact.identifier)?.()
      touches.delete(contact.identifier)
      if ([...pointers.values()].some(pointer => Math.hypot(pointer.clientX - contact.clientX, pointer.clientY - contact.clientY) < 3)) {
        touches.set(contact.identifier, cancelTouchClick(view, contact))
      }
    }
    settle()
  }, options)
  view.addEventListener('touchmove', event => {
    // A second contact may still join a pinch. Only hold a single-contact pan.
    if (event.touches.length === 1 && touches.has(event.touches[0].identifier)) consume(event)
  }, options)
  for (const type of ['touchend', 'touchcancel'] as const) view.addEventListener(type, event => {
    const changed = Array.from(event.changedTouches)
    let held = 0
    for (const contact of changed) {
      const stop = touches.get(contact.identifier)
      if (!stop) continue
      held++
      stop()
      touches.delete(contact.identifier)
    }
    if (type === 'touchend' && held && held === changed.length) consume(event)
    settle()
  }, options)
  view.addEventListener('click', event => {
    if (!guard || !event.detail) return
    const pointer = event as PointerEvent
    const touchClick = (event as MouseEvent & { sourceCapabilities?: { firesTouchEvents: boolean } }).sourceCapabilities?.firesTouchEvents
    if (pointer.pointerType === guard.type && pointer.pointerId === guard.id || guard.type === 'touch' && touchClick) {
      consume(event)
      guard = undefined
      settle()
    }
  }, options)
  return {
    release() {
      if (!entering) return
      entering = false
      settle()
      if (!events.signal.aborted) expiry = view.setTimeout(dispose, 1500)
    },
  }
}

export function holdEntranceInput(
  surface: HTMLElement,
  { viewport = false, animations }: { viewport?: boolean; animations?: Animation[] } = {},
) {
  const view = surface.ownerDocument.defaultView
  if (!view?.matchMedia('(pointer: coarse)').matches) return
  const entrance = (animations ?? surface.getAnimations?.() ?? []).filter(animation => {
    const end = animation.effect?.getComputedTiming().endTime
    return animation.playState === 'running' && typeof end === 'number' && Number.isFinite(end) && end > 0
  })
  if (!entrance.length) return
  const { release } = holdTouchInput(view, viewport ? undefined : surface)
  void Promise.allSettled(entrance.map(animation => animation.finished)).then(release)
  return release
}
