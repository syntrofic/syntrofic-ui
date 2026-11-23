import { watch, type MaybeRefOrGetter, toValue } from 'vue'
import { gestureMotion } from './motion-defaults'

export const longPressDuration = gestureMotion.longPress.delayMs
export const longPressMovement = gestureMotion.longPress.travel

export interface LongPressOptions {
  delay?: number
  moveTolerance?: number
  pointerTypes?: readonly string[]
}

export function useLongPress(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  handler: (event: PointerEvent) => void,
  options: LongPressOptions = {},
) {
  return watch(() => toValue(target), (node, _, cleanup) => {
    const win = node?.ownerDocument.defaultView
    if (!node || !win) return
    let pointer: PointerEvent | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let fired = false

    function clear(event?: PointerEvent) {
      if (!event || event.pointerId === pointer?.pointerId) { clearTimeout(timer); pointer = undefined }
    }
    function down(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0 || options.pointerTypes && !options.pointerTypes.includes(event.pointerType)) return
      clear()
      fired = false
      pointer = event
      timer = setTimeout(() => {
        fired = true
        handler(event)
      }, Math.max(0, options.delay ?? longPressDuration))
    }
    function move(event: PointerEvent) {
      if (pointer && event.pointerId === pointer.pointerId &&
        Math.hypot(event.clientX - pointer.clientX, event.clientY - pointer.clientY) > (options.moveTolerance ?? longPressMovement)) clear(event)
    }
    function click(event: MouseEvent) {
      if (!fired || event.detail === 0) return
      fired = false
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    node.addEventListener('pointerdown', down)
    node.addEventListener('click', click, true)
    win.addEventListener('pointermove', move)
    win.addEventListener('pointerup', clear)
    win.addEventListener('pointercancel', clear)
    cleanup(() => {
      clear()
      node.removeEventListener('pointerdown', down)
      node.removeEventListener('click', click, true)
      win.removeEventListener('pointermove', move)
      win.removeEventListener('pointerup', clear)
      win.removeEventListener('pointercancel', clear)
    })
  }, { flush: 'post', immediate: true })
}
