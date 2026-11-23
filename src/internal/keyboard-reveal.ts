import { nextTick, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { documentFocus, parentAcrossShadow } from './focus-order'
import { acceptsKeyboard, subscribeKeyboardViewport, type KeyboardViewport } from './keyboard-inset'
import { createKeyboardDock } from './keyboard-dock'
import { createScrollMotion } from './scroll-motion'

const clearance = 10
const coordinators = new WeakMap<Window, ReturnType<typeof coordinateKeyboardReveals>>()

function* scrollChain(field: Element, view: Window) {
  const document = field.ownerDocument
  const root = document.scrollingElement
  for (let ancestor = parentAcrossShadow(field); ancestor; ancestor = parentAcrossShadow(ancestor)) {
    const { overflowY, position } = view.getComputedStyle(ancestor)
    if (ancestor === root) {
      const bodyOverflow = document.body && view.getComputedStyle(document.body).overflowY
      if (!/^(hidden|clip)$/.test(overflowY) && !/^(hidden|clip)$/.test(bodyOverflow || '')) yield ancestor as HTMLElement
      return
    }
    if (ancestor !== document.body && /^(auto|scroll|overlay)$/.test(overflowY) && ancestor.scrollHeight > ancestor.clientHeight) {
      yield ancestor as HTMLElement
    }
    if (position === 'fixed' || ancestor.matches('dialog[open], [role="dialog"][aria-modal="true"]')) return
  }
}

function coordinateKeyboardReveals(view: Window) {
  const fields = new Map<Element, number>()
  const moved = new Map<HTMLElement, { before: number; after: number }>()
  const manuallyMoved = new Set<HTMLElement>()
  const returning = new Map<HTMLElement, ReturnType<typeof createScrollMotion>>()
  const dock = createKeyboardDock(view)
  let previous: KeyboardViewport | undefined
  let unsubscribe: (() => void) | undefined

  function stopReturns() {
    for (const motion of returning.values()) motion.dispose()
    returning.clear()
  }
  function scrollBack() {
    for (const [node, { before, after }] of moved) {
      if (!node.isConnected || Math.abs(after - node.scrollTop) > 1) continue
      const motion = createScrollMotion(node)
      returning.set(node, motion)
      motion.scrollBack(before, () => {
        returning.delete(node)
        motion.dispose()
      })
    }
  }
  function reveal(field: Element, top: number, bottom: number) {
    for (const node of scrollChain(field, view)) {
      const box = field.getBoundingClientRect()
      const pane = node.getBoundingClientRect()
      const leading = node === field.ownerDocument.scrollingElement ? top : Math.max(top, pane.top + node.clientTop)
      const trailing = node === field.ownerDocument.scrollingElement ? bottom : Math.min(bottom, pane.top + node.clientTop + node.clientHeight)
      if (trailing <= leading || !box.height) continue
      const delta = box.top < leading || box.height > trailing - leading
        ? box.top - leading : Math.max(0, box.bottom - trailing)
      if (Math.abs(delta) <= 1) continue
      const before = node.scrollTop
      const earlier = moved.get(node)
      if (earlier && Math.abs(earlier.after - before) > 1) {
        moved.delete(node)
        manuallyMoved.add(node)
      }
      // The field follows each keyboard geometry report without queuing a second motion.
      node.scrollTo({ top: before + delta, behavior: 'instant' })
      const after = node.scrollTop
      if (!manuallyMoved.has(node) && after !== before) moved.set(node, { before: earlier?.before ?? before, after })
    }
  }
  function update(report: KeyboardViewport) {
    const { height, top, bottom, focus, zoomed } = report
    if (previous?.focus !== focus && focus && fields.has(focus)) stopReturns()
    const changed = previous?.height !== height || previous?.focus !== focus
    const boundaryChanged = previous?.bottom !== bottom
    const closing = Boolean(previous?.height) && height === 0
    previous = report
    if (closing) {
      dock.release(!zoomed)
      if (!zoomed) scrollBack()
      moved.clear()
      manuallyMoved.clear()
    }
    if (focus && acceptsKeyboard(focus) && !fields.has(focus)) dock.release()
    if (focus && fields.has(focus) && acceptsKeyboard(focus) && (changed || boundaryChanged) && height) {
      stopReturns()
      // Give panels a chance to apply the same viewport report to their scroll area.
      view.queueMicrotask(() => void nextTick(() => {
        if (previous === report && fields.has(focus) && documentFocus(view.document) === focus) {
          dock.follow(focus, report, clearance)
          if (changed) reveal(focus, top + clearance, bottom - clearance)
        }
      }))
    }
  }
  return {
    add(field: Element) {
      fields.set(field, (fields.get(field) ?? 0) + 1)
      if (!unsubscribe) unsubscribe = subscribeKeyboardViewport(view, update)
      else if (previous?.focus === field && previous.height && acceptsKeyboard(field)) {
        stopReturns()
        dock.follow(field, previous, clearance)
        reveal(field, previous.top + clearance, previous.bottom - clearance)
      }
      return () => {
        const count = fields.get(field) ?? 0
        if (count > 1) fields.set(field, count - 1)
        else fields.delete(field)
        if (fields.size) return
        unsubscribe?.()
        dock.dispose()
        stopReturns()
        coordinators.delete(view)
      }
    },
  }
}

/** Automatically reveal a focused text entry on keyboard show and height changes. */
export function useKeyboardReveal(field: MaybeRefOrGetter<Element | null | undefined>) {
  watch(() => toValue(field), (element, _, cleanup) => {
    const view = element?.ownerDocument.defaultView
    if (!element || !view || view.top !== view) return
    let coordinator = coordinators.get(view)
    if (!coordinator) coordinators.set(view, coordinator = coordinateKeyboardReveals(view))
    cleanup(coordinator.add(element))
  }, { immediate: true, flush: 'post' })
}
