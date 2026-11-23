import { toValue, watch, type MaybeRefOrGetter } from 'vue'

const locks = new WeakMap<Document, { count: number; restore: () => void }>()

function preventTouchOverscroll(document: Document) {
  const view = document.defaultView
  if (!view?.matchMedia('(pointer: coarse)').matches) return () => {}
  let last: { x: number; y: number } | undefined
  function start(event: TouchEvent) {
    const [touch] = event.touches
    last = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : undefined
  }
  function move(event: TouchEvent) {
    if (event.touches.length !== 1 || !last || (view?.visualViewport?.scale ?? 1) > 1.01) return
    const [touch] = event.touches
    const x = touch.clientX - last.x
    const y = touch.clientY - last.y
    last = { x: touch.clientX, y: touch.clientY }
    if (Math.abs(y) < Math.abs(x) || y === 0) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('input[type="range"]')) return
    for (let node = target; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      if (!/^(auto|scroll|overlay)$/.test(view!.getComputedStyle(node).overflowY)) continue
      const maximum = node.scrollHeight - node.clientHeight
      if (maximum > 0 && (y > 0 ? node.scrollTop > 1 : node.scrollTop < maximum - 1)) return
    }
    if (event.cancelable) event.preventDefault()
  }
  document.addEventListener('touchstart', start, { passive: true, capture: true })
  document.addEventListener('touchmove', move, { passive: false, capture: true })
  return () => {
    document.removeEventListener('touchstart', start, true)
    document.removeEventListener('touchmove', move, true)
  }
}

export function lockDocumentScroll(document: Document) {
  const root = document.documentElement
  let lock = locks.get(document)
  if (!lock) {
    const body = document.body
    const view = document.defaultView
    const before = { overflowY: root.style.overflowY, scrollbarGutter: root.style.scrollbarGutter,
      overscrollBehaviorY: root.style.overscrollBehaviorY, marginLeft: root.style.marginLeft, marginRight: root.style.marginRight }
    const widthBefore = root.getBoundingClientRect()
    const rootStyle = view?.getComputedStyle(root)
    const oldMargins = { left: parseFloat(rootStyle?.marginLeft ?? '') || 0, right: parseFloat(rootStyle?.marginRight ?? '') || 0 }
    const bodyBefore = body ? { overflowY: body.style.overflowY, overscrollBehaviorY: body.style.overscrollBehaviorY,
      paddingRight: body.style.paddingRight, marginRight: body.style.marginRight } : undefined
    const bodyOverflow = body && view?.getComputedStyle(body).overflowY
    const dispose = preventTouchOverscroll(document)
    lock = { count: 0, restore: () => {
      Object.assign(root.style, before)
      if (body && bodyBefore) Object.assign(body.style, bodyBefore)
      dispose()
    } }
    locks.set(document, lock)
    if (view && rootStyle?.scrollbarGutter === 'auto' && view.innerWidth > root.clientWidth) root.style.scrollbarGutter = 'stable'
    root.style.overflowY = 'hidden'
    root.style.overscrollBehaviorY = 'none'
    if (body) {
      body.style.overscrollBehaviorY = 'none'
      if (bodyOverflow === 'auto' || bodyOverflow === 'scroll') body.style.overflowY = 'hidden'
    }
    // Some browsers also remove a styled classic gutter when the viewport is locked.
    const widthAfter = root.getBoundingClientRect()
    const left = widthBefore.left - widthAfter.left
    const right = widthAfter.right - widthBefore.right
    if (left > .5) root.style.marginLeft = oldMargins.left + left + 'px'
    if (right > .5) root.style.marginRight = oldMargins.right + right + 'px'
  }
  lock.count++
  let released = false

  return () => {
    if (released) return
    released = true
    if (--lock.count) return
    lock.restore()
    locks.delete(document)
  }
}

export function showModalWithScrollLock(dialog: HTMLDialogElement) {
  const unlock = lockDocumentScroll(dialog.ownerDocument)
  try { dialog.showModal(); return unlock }
  catch (error) { unlock(); throw error }
}

// Reserve the document gutter before a child layer mounts and measures its viewport.
export function useScrollLock(locked: MaybeRefOrGetter<boolean>, document: MaybeRefOrGetter<Document | null | undefined> = () => globalThis.document) {
  return watch([() => toValue(locked), () => toValue(document)], ([active, owner], _, cleanup) => {
    if (active && owner) cleanup(lockDocumentScroll(owner))
  }, { immediate: true, flush: 'pre' })
}
