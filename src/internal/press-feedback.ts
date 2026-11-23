import { onMounted, onScopeDispose, toValue, type MaybeRefOrGetter } from 'vue'
import { motionTimings } from './motion-timing'

interface Press {
  element: HTMLElement
  pointer?: number
  x: number
  y: number
  touch: boolean
  painted: boolean
  cancelled: boolean
  delay?: ReturnType<typeof setTimeout>
}

const documents = new WeakMap<Document, { count: number; dispose: () => void }>()
const pressableProps = Object.freeze({ 'data-sy-pressable': '' })

function watchPresses(owner: Document) {
  const view = owner.defaultView
  const events = new AbortController()
  const capture = { signal: events.signal, capture: true, passive: true }
  const releases = new Map<HTMLElement, ReturnType<typeof setTimeout>>()
  let active: Press | undefined
  function target(event: Event) {
    return event.composedPath().find((item): item is HTMLElement => item instanceof HTMLElement && item.hasAttribute('data-sy-pressable'))
  }
  function usable(element: HTMLElement) {
    return !element.matches(':disabled, [aria-disabled="true"], [aria-busy="true"]:not([data-sy-interruptible])')
      && !element.closest('[inert], [hidden]')
  }
  function inScroller(element: HTMLElement) {
    for (let container = element.parentElement; container && container !== owner.documentElement; container = container.parentElement) {
      const style = view?.getComputedStyle(container)
      if (style && (/auto|scroll/.test(style.overflowY) && container.scrollHeight > container.clientHeight + 1
        || /auto|scroll/.test(style.overflowX) && container.scrollWidth > container.clientWidth + 1)) return true
    }
    return false
  }
  function clean(element: HTMLElement) {
    clearTimeout(releases.get(element))
    releases.delete(element)
    delete element.dataset.syPress
    delete element.dataset.syTouchPress
  }
  function paint(press: Press) {
    if (press.cancelled || !press.element.isConnected || !usable(press.element)) return
    press.painted = true
    press.element.dataset.syPress = 'held'
  }
  function cancel() {
    if (!active || active.cancelled) return
    clearTimeout(active.delay)
    active.cancelled = true
    active.element.dataset.syPress = 'cancelled'
  }
  function finish(aborted = false) {
    const press = active
    active = undefined
    if (!press) return
    clearTimeout(press.delay)
    if (aborted || press.cancelled || !usable(press.element)) {
      press.element.dataset.syPress = 'cancelled'
      releases.set(press.element, setTimeout(() => clean(press.element), 24))
      return
    }
    if (press.painted) clean(press.element)
    else {
      paint(press)
      releases.set(press.element, setTimeout(() => clean(press.element), motionTimings.press.flashMs))
    }
  }
  function pointerDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || active) return
    const element = target(event)
    const touch = event.pointerType === 'touch' || event.pointerType === 'pen'
    if (!element || !usable(element) || !touch && !view?.matchMedia('(pointer: coarse)').matches) return
    clean(element)
    const press = { element, pointer: event.pointerId, x: event.clientX, y: event.clientY, touch, painted: false, cancelled: false } as Press
    active = press
    if (touch) element.dataset.syTouchPress = ''
    if (touch && inScroller(element)) press.delay = setTimeout(() => paint(press), motionTimings.press.scrollBrakeMs)
    else paint(press)
  }
  function pointerMove(event: PointerEvent) {
    if (active?.pointer !== event.pointerId || !active.touch) return
    if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 10) cancel()
  }
  function pointerEnd(event: PointerEvent) {
    if (active?.pointer === event.pointerId) finish(event.type === 'pointercancel')
  }
  function keyDown(event: KeyboardEvent) {
    if (active || event.key !== ' ' || event.repeat || event.defaultPrevented || event.isComposing) return
    const element = target(event)
    if (!element || !usable(element)) return
    clean(element)
    active = { element, x: 0, y: 0, touch: false, painted: false, cancelled: false }
    paint(active)
  }
  function keyUp(event: KeyboardEvent) {
    if (active && active.pointer === undefined && event.key === ' ') finish()
  }
  owner.addEventListener('pointerdown', pointerDown, capture)
  owner.addEventListener('pointermove', pointerMove, capture)
  owner.addEventListener('pointerup', pointerEnd, capture)
  owner.addEventListener('pointercancel', pointerEnd, capture)
  owner.addEventListener('keydown', keyDown, capture)
  owner.addEventListener('keyup', keyUp, capture)
  owner.addEventListener('scroll', event => {
    if (active?.touch && event.target instanceof Node && event.target.contains(active.element)) cancel()
  }, capture)
  owner.addEventListener('focusout', event => {
    if (active && active.pointer === undefined && target(event) === active.element) finish(true)
  }, capture)
  view?.addEventListener('blur', () => finish(true), capture)
  return () => {
    events.abort()
    if (active) { clearTimeout(active.delay); clean(active.element); active = undefined }
    for (const element of releases.keys()) clean(element)
  }
}

export function usePressFeedback(owner?: MaybeRefOrGetter<Element | Document | null | undefined>) {
  let release: (() => void) | undefined
  onMounted(() => {
    const target = toValue(owner)
    const doc = target instanceof Document ? target : target?.ownerDocument ?? globalThis.document
    if (!doc) return
    let record = documents.get(doc)
    if (!record) {
      record = { count: 0, dispose: watchPresses(doc) }
      documents.set(doc, record)
    }
    record.count++
    release = () => {
      if (--record.count === 0) { record.dispose(); documents.delete(doc) }
    }
  })
  onScopeDispose(() => release?.())
  return pressableProps
}
