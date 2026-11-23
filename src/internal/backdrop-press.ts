import { watch } from 'vue'
import { documentFocus, focusWithin } from './focus-order'
import { backdropChildDismissal } from './layer-focus'

type OutsidePressEvent = CustomEvent<{ originalEvent: Event }>
const outsideDismissals = new WeakMap<Event, { origin: Element; request?: Event }[]>()

/** Record the physical press so a containing modal can yield to this dismissal. */
export function noteOutsidePress(event: OutsidePressEvent | PointerEvent, origin?: Element | null) {
  const request = 'pointerId' in event ? undefined : event
  const pointer = request ? request.detail.originalEvent : event
  if (!origin || pointer.type !== 'pointerdown') return
  const outcomes = outsideDismissals.get(pointer) ?? []
  outcomes.push({ origin, request })
  outsideDismissals.set(pointer, outcomes)
}

function openPopovers(surface: HTMLElement) {
  const view = surface.ownerDocument.defaultView
  if (!view?.CSS.supports('selector(:popover-open)')) return []
  return Array.from(surface.querySelectorAll(':is([popover="auto"], [popover=""]):popover-open'))
}

interface BackdropPressOptions {
  surface: () => HTMLElement | null | undefined
  enabled: () => boolean
  isBackdrop: (surface: HTMLElement, hit: Element | null, event: MouseEvent) => boolean
  dismiss: () => void
}

export function useBackdropPress({ surface, enabled, isBackdrop, dismiss }: BackdropPressOptions) {
  watch([surface, enabled], ([node, active], _, cleanup) => {
    const document = node?.ownerDocument
    const view = document?.defaultView
    if (!node || !document || !view || !active) return
    const controller = new AbortController()
    const config = { capture: true, signal: controller.signal }
    let press: { start: PointerEvent; release?: PointerEvent; popovers: Element[]; child?: () => boolean } | undefined
    let timeout = 0
    const hitsBackdrop = (event: MouseEvent) => {
      // Touch and pen pointer capture can report the press target on release.
      const root = node.getRootNode() as Document | ShadowRoot
      return isBackdrop(node, root.elementFromPoint(event.clientX, event.clientY), event)
    }
    document.addEventListener('pointerdown', event => {
      press = undefined
      view.clearTimeout(timeout)
      if (event.isPrimary && event.button === 0 && !event.ctrlKey && hitsBackdrop(event)) {
        press = { start: event, popovers: openPopovers(node), child: backdropChildDismissal(node) }
      }
    }, config)
    document.addEventListener('pointerup', event => {
      if (press?.start.pointerId === event.pointerId && hitsBackdrop(event)) press.release = event
    }, config)
    document.addEventListener('pointercancel', event => {
      if (press?.start.pointerId === event.pointerId) press = undefined
    }, config)
    view.addEventListener('click', event => {
      const completed = press
      press = undefined
      const release = completed?.release
      if (!completed || !release || event.button !== 0 || !event.detail || !hitsBackdrop(event)) return
      if (Math.hypot(event.clientX - release.clientX, event.clientY - release.clientY) > 2) return
      // WebKit delivers touch activation as a mouse-typed click with a different pointer ID.
      const click = event as PointerEvent
      const compatibilityClick = release.pointerType !== 'mouse' && click.pointerType === 'mouse'
      if ('pointerId' in click && click.pointerId !== release.pointerId && !compatibilityClick) return
      // Native popovers and dismissable children can finish this click later in its dispatch.
      timeout = view.setTimeout(() => {
        if (!enabled() || event.defaultPrevented) return
        const nested = completed.popovers.some(popover => !popover.matches(':popover-open'))
          || outsideDismissals.get(completed.start)?.some(({ origin, request }) => !request?.defaultPrevented && focusWithin(node, origin))
          || completed.child?.()
        if (nested) {
          if (!focusWithin(node, documentFocus(document))) node.focus({ preventScroll: true })
        } else dismiss()
      }, 0)
    }, { signal: controller.signal })
    cleanup(() => { controller.abort(); view.clearTimeout(timeout) })
  }, { immediate: true, flush: 'post' })
}
