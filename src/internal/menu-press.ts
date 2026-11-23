import { onScopeDispose, toValue, type MaybeRefOrGetter } from 'vue'

type MenuTarget = MaybeRefOrGetter<HTMLElement | null | undefined>
export interface MenuPressOptions {
  menu?: MenuTarget
  menuRef?: MenuTarget
  triggerRef?: MenuTarget
  itemSelector: string
  acceptItem?: (item: HTMLElement) => boolean
  enabled?: MaybeRefOrGetter<boolean>
  isEnabled?: MaybeRefOrGetter<boolean>
  longPressDelay?: number
  longPressDelayMs?: number
  getScroller?: () => HTMLElement | null
  onTriggerPress?: (pointerType: string) => boolean
  activateOnRelease?: boolean
  onStart?: (item: HTMLElement | null) => void
  onEnd?: () => void
  onHighlight?: (item: HTMLElement | null) => void
  onActivate?: (item: HTMLElement, event: PointerEvent) => void
  onDismiss?: () => void
}

const managed = new WeakSet<Event>()
export function isMenuPressActivation(event: Event) { return managed.has(event) }

function inScrollView(target: HTMLElement) {
  const view = target.ownerDocument.defaultView
  if (!view) return false
  for (let node: HTMLElement | null = target; node && node !== target.ownerDocument.body; node = node.parentElement) {
    const { overflowY, overflowX, position } = view.getComputedStyle(node)
    if (/auto|scroll/.test(overflowY) && node.scrollHeight > node.clientHeight
      || /auto|scroll/.test(overflowX) && node.scrollWidth > node.clientWidth) return true
    if (position === 'fixed') return false
  }
  const documentScroll = target.ownerDocument.scrollingElement
  return Boolean(documentScroll && documentScroll.scrollHeight > documentScroll.clientHeight + 1)
}

export function cancelTouchClick(view: Window, touch: Touch, ended?: (event?: TouchEvent) => void) {
  const listener = new AbortController()
  const options = { capture: true, passive: false, signal: listener.signal }
  const expire = view.setTimeout(() => { stop(); ended?.() }, 1500)
  const stop = () => {
    view.clearTimeout(expire)
    listener.abort()
  }
  const finish = (event: Event) => {
    const release = event as TouchEvent
    if (!Array.from(release.changedTouches ?? []).some(contact => contact.identifier === touch.identifier)) return
    if (event.type === 'touchend' && event.cancelable) event.preventDefault()
    stop()
    ended?.(release)
  }
  for (const target of new Set([view, touch.target])) {
    target.addEventListener('touchend', finish, options)
    target.addEventListener('touchcancel', finish, options)
  }
  return stop
}

const releaseGuards = new WeakMap<Window, () => void>()

function guardRelease(view: Window, root: HTMLElement | null | undefined, trigger: HTMLElement, pointer: string, touch?: Touch) {
  releaseGuards.get(view)?.()
  const events = new AbortController()
  const options = { capture: true, signal: events.signal }
  const fromTouch = pointer === 'touch'
  let waitingForTouchEnd = Boolean(touch)
  let touchEnded = false
  let armed = false
  let timeout = 0
  function stop() {
    if (releaseGuards.get(view) === stop) releaseGuards.delete(view)
    events.abort()
    view.clearTimeout(timeout)
    stopTouchEnd?.()
  }
  function arm() {
    armed = true
    view.clearTimeout(timeout)
    timeout = view.setTimeout(() => {
      armed = false
      if (!waitingForTouchEnd) stop()
    }, 450)
  }
  const stopTouchEnd = touch && cancelTouchClick(view, touch, event => {
    waitingForTouchEnd = false
    if (event?.type === 'touchend') {
      // WebKit can send compatibility mouse events even after a cancelled touchend.
      touchEnded = true
      arm()
    } else if (event || !armed) stop()
  })
  const consume = (event: MouseEvent) => {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
  const inMenu = (event: MouseEvent) => {
    const path = event.composedPath()
    return path.includes(trigger) || Boolean(root && path.includes(root))
  }
  view.addEventListener('pointerdown', event => { if (event.isTrusted) stop() }, options)
  if (fromTouch) {
    for (const type of ['mousedown', 'mouseup'] as const) view.addEventListener(type, event => {
      if (armed && event.isTrusted) consume(event)
    }, options)
  }
  view.addEventListener('click', event => {
    if (!armed || !event.detail || isMenuPressActivation(event)) return
    if (!(fromTouch && event.isTrusted) && (touchEnded || !inMenu(event))) return
    consume(event)
    if (!fromTouch) stop()
  }, options)
  releaseGuards.set(view, stop)
  arm()
}

export function useMenuPress(options: MenuPressOptions) {
  let finish: (() => void) | undefined
  let triggerClickUntil = 0
  let touchFromTrigger = false

  const menu = () => toValue(options.menuRef ?? options.menu)
  const enabled = () => toValue(options.isEnabled ?? options.enabled) !== false
  function cancel() { finish?.() }
  function itemAt(node: Element | null) {
    const root = menu()
    const item = node?.closest<HTMLElement>(options.itemSelector)
    return item && root?.contains(item) && options.acceptItem?.(item) !== false
      && !item.matches(':disabled, [aria-disabled="true"], [data-disabled]') ? item : null
  }
  function press(event: PointerEvent, fromTrigger: boolean) {
    if (!event.isPrimary || event.button !== 0 || !enabled() || event.pointerType === 'mouse' && event.ctrlKey) return
    const target = event.currentTarget as HTMLElement
    const document = target.ownerDocument
    const owner = document.defaultView
    if (!owner) return
    const view = owner
    if (!fromTrigger && event.target instanceof view.Element
      && event.target.closest('[data-sy-menu-press]') !== target) return
    const requestFrame = view.requestAnimationFrame.bind(view)
    const pointer = event.pointerType
    const fromTouch = pointer === 'touch' || pointer === 'pen'
    const trigger = toValue(options.triggerRef) ?? target
    cancel()
    triggerClickUntil = 0
    const controller = new AbortController()
    const listeners = { signal: controller.signal, capture: true }
    let timer: ReturnType<typeof setTimeout> | undefined
    let frame = 0
    let started = !fromTrigger
    let moved = false
    let touch: Touch | undefined
    let point = { x: event.clientX, y: event.clientY }
    const initial = fromTrigger || !(event.target instanceof view.Element) ? null : itemAt(event.target)
    if (options.activateOnRelease && !initial) { controller.abort(); return }
    let highlighted = initial
    let handledTrigger = false
    touchFromTrigger = fromTouch && fromTrigger
    finish = () => {
      controller.abort()
      clearTimeout(timer)
      if (frame) view.cancelAnimationFrame(frame)
      finish = undefined
      touchFromTrigger = false
      options.onEnd?.()
    }
    options.onStart?.(initial)
    function highlight(item: HTMLElement | null) {
      if (highlighted === item) return
      highlighted = item
      if (options.onHighlight) options.onHighlight(item)
      else (item ?? menu())?.focus({ preventScroll: true })
    }
    const hit = () => document.elementFromPoint(point.x, point.y)
    function step() {
      frame = 0
      const scroll = options.getScroller?.() ?? menu()
      if (!scroll || scroll.scrollHeight <= scroll.clientHeight) return
      const { top, bottom, left, right } = scroll.getBoundingClientRect()
      if (point.x < left || point.x > right || point.y < top || point.y > bottom) return
      const edge = Math.min((bottom - top) / 4, 26)
      const speed = point.y < top + edge ? -Math.ceil((top + edge - point.y) / 3) : Math.ceil(Math.max(0, point.y - bottom + edge) / 3)
      const previous = scroll.scrollTop
      if (speed === 0) return
      scroll.scrollTop += speed
      if (scroll.scrollTop === previous) return
      highlight(itemAt(hit()))
      frame = requestFrame(step)
    }
    function move(next: PointerEvent) {
      if (next.pointerId !== event.pointerId) return
      if (!enabled()) { cancel(); return }
      const distance = Math.hypot(next.clientX - event.clientX, next.clientY - event.clientY)
      point = { x: next.clientX, y: next.clientY }
      moved ||= distance >= 10
      if (!started) {
        if (distance > 8) cancel()
        return
      }
      if (fromTouch && fromTrigger && !moved) return
      highlight(itemAt(hit()))
      if (!frame) frame = requestFrame(step)
    }
    function release(next: PointerEvent) {
      if (next.pointerId !== event.pointerId) return
      cancel()
      if (handledTrigger) triggerClickUntil = Date.now() + 700
      if (!started || !enabled()) return
      point = { x: next.clientX, y: next.clientY }
      moved ||= Math.hypot(point.x - event.clientX, point.y - event.clientY) >= 10
      const node = hit()
      const item = itemAt(node)
      const root = menu()
      if (item && (options.activateOnRelease || (fromTrigger ? !fromTouch || moved : initial !== item))) {
        // A pick may remove the original hit target before its touchend bubbles.
        triggerClickUntil = 0
        guardRelease(view, root, trigger, pointer, touch)
        if (options.onActivate) options.onActivate(item, next)
        else {
          const activation = new (item.ownerDocument.defaultView?.MouseEvent ?? MouseEvent)('click', {
            bubbles: true, composed: true, cancelable: true, button: next.button,
            altKey: next.altKey, ctrlKey: next.ctrlKey, shiftKey: next.shiftKey, metaKey: next.metaKey,
            clientX: next.clientX, clientY: next.clientY,
          })
          managed.add(activation)
          item.dispatchEvent(activation)
        }
      } else if (!item && pointer === 'mouse' && (!node || (!root?.contains(node) && !trigger.contains(node)))) {
        options.onDismiss?.()
      } else if (fromTouch && !fromTrigger && !item && (options.activateOnRelease || moved)) {
        guardRelease(view, root, trigger, pointer, touch)
      }
    }
    view.addEventListener('pointermove', move, listeners)
    view.addEventListener('pointerup', release, listeners)
    view.addEventListener('pointercancel', next => { if (next.pointerId === event.pointerId) cancel() }, listeners)
    view.addEventListener('blur', cancel, { signal: controller.signal })
    if (pointer === 'touch') view.addEventListener('touchstart', start => {
      const touches = Array.from(start.changedTouches ?? [])
      touch = touches.find(candidate => candidate.identifier === event.pointerId)
        ?? (touches.length === 1 ? touches[0] : undefined)
    }, { ...listeners, once: true, passive: true })
    if (!fromTrigger || !options.onTriggerPress) return
    if (pointer === 'touch') view.addEventListener('touchmove', event => {
      if (started && event.touches.length === 1 && event.cancelable) event.preventDefault()
    }, { ...listeners, passive: false })
    const open = () => {
      if (!enabled()) { cancel(); return }
      triggerClickUntil = Date.now() + 9000
      handledTrigger = true
      started = options.onTriggerPress?.(pointer) ?? false
    }
    const hold = fromTouch ? options.longPressDelayMs ?? options.longPressDelay ?? (inScrollView(trigger) ? 150 : 0) : 0
    if (hold > 0 && Number.isFinite(hold)) timer = setTimeout(open, hold)
    else open()
  }

  function isTriggerClickFromPress() {
    const consumed = Date.now() < triggerClickUntil
    triggerClickUntil = 0
    return consumed
  }
  onScopeDispose(cancel)
  return {
    menuProps: { onPointerdown: (event: PointerEvent) => press(event, false), 'data-sy-menu-press': '' },
    triggerProps: { onPointerdown: (event: PointerEvent) => press(event, true),
      onContextmenu: (event: MouseEvent) => { if (touchFromTrigger) event.preventDefault() } },
    cancel, isTriggerClickFromPress,
  }
}
