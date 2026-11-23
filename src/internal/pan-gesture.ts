import { toValue, watch, type MaybeRefOrGetter } from 'vue'
import { gestureMotion } from './motion-defaults'

export interface PanPosition {
  x: number
  y: number
  velocityX: number
  velocityY: number
}
export interface PanGestureOptions {
  axis?: 'horizontal' | 'vertical' | 'both'
  threshold?: number
  shouldStart?: (event: PointerEvent) => boolean
  onStart?: (position: PanPosition, event: PointerEvent) => void
  onMove: (position: PanPosition, event: PointerEvent) => void
  onEnd?: (position: PanPosition, event: PointerEvent, cancelled: boolean) => void
}

export function createPanGesture(element: HTMLElement, options: PanGestureOptions) {
  let pointer: { id: number; x: number; y: number; lastX: number; lastY: number; time: number } | undefined
  let accepted = false
  let position: PanPosition = { x: 0, y: 0, velocityX: 0, velocityY: 0 }
  const win = element.ownerDocument.defaultView
  const threshold = options.threshold ?? gestureMotion.pan.threshold

  function down(event: PointerEvent) {
    if (pointer || !event.isPrimary || event.button !== 0) return
    const target = event.target
    const allowed = options.shouldStart?.(event) ?? !(target instanceof Element && target.closest('button,a,input,video,[contenteditable="true"]'))
    if (!allowed) return
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY,
      lastX: event.clientX, lastY: event.clientY, time: event.timeStamp }
    accepted = false
    position = { x: 0, y: 0, velocityX: 0, velocityY: 0 }
  }

  function move(event: PointerEvent) {
    if (!pointer || event.pointerId !== pointer.id) return
    const x = event.clientX - pointer.x
    const y = event.clientY - pointer.y
    if (!accepted) {
      if (Math.hypot(x, y) < threshold) return
      if ((options.axis === 'horizontal' && Math.abs(y) > Math.abs(x)) ||
        (options.axis === 'vertical' && Math.abs(x) > Math.abs(y))) {
        pointer = undefined
        return
      }
      accepted = true
      options.onStart?.(position, event)
    }
    const elapsed = Math.max(1, event.timeStamp - pointer.time)
    position = { x, y, velocityX: (event.clientX - pointer.lastX) / elapsed, velocityY: (event.clientY - pointer.lastY) / elapsed }
    pointer.lastX = event.clientX
    pointer.lastY = event.clientY
    pointer.time = event.timeStamp
    options.onMove(position, event)
  }

  function end(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId) return
    const stale = event.timeStamp - pointer.time > gestureMotion.pan.endStillnessMs
    pointer = undefined
    if (accepted) options.onEnd?.(stale ? { ...position, velocityX: 0, velocityY: 0 } : position, event, event.type === 'pointercancel')
  }

  element.addEventListener('pointerdown', down)
  win?.addEventListener('pointermove', move, { passive: true })
  win?.addEventListener('pointerup', end)
  win?.addEventListener('pointercancel', end)
  return () => {
    element.removeEventListener('pointerdown', down)
    win?.removeEventListener('pointermove', move)
    win?.removeEventListener('pointerup', end)
    win?.removeEventListener('pointercancel', end)
    pointer = undefined
  }
}

export interface PanEvent {
  state: 'began' | 'changed' | 'ended' | 'cancelled'
  translation: { x: number; y: number }
  velocity: { x: number; y: number }
  event: PointerEvent
}
export interface UsePanGestureOptions {
  axis?: 'x' | 'y'
  threshold?: number
  shouldStart?: (event: PointerEvent) => boolean
  onPan: (event: PanEvent) => void
}

export function usePanGesture(target: MaybeRefOrGetter<HTMLElement | null | undefined>, options: MaybeRefOrGetter<UsePanGestureOptions>) {
  return watch([() => toValue(target), () => toValue(options).axis, () => toValue(options).threshold], ([element, axis, threshold], _, cleanup) => {
    if (!element) return
    function report(state: PanEvent['state'], position: PanPosition, event: PointerEvent) {
      toValue(options).onPan({ state,
        translation: { x: axis === 'y' ? 0 : position.x, y: axis === 'x' ? 0 : position.y },
        velocity: {
          x: state === 'cancelled' || axis === 'y' ? 0 : position.velocityX * 1000,
          y: state === 'cancelled' || axis === 'x' ? 0 : position.velocityY * 1000,
        },
        event,
      })
    }
    cleanup(createPanGesture(element, {
      axis: axis === 'x' ? 'horizontal' : axis === 'y' ? 'vertical' : 'both',
      threshold: threshold ?? gestureMotion.pan.touchThreshold,
      shouldStart(event) {
        const target = event.target
        const choice = toValue(options).shouldStart?.(event)
        if (choice !== undefined) return choice
        if (!(target instanceof Element)) return true
        if (target.closest('button,a,input,video,textarea,select,[contenteditable="true"]')) return false
        const selectable = target.ownerDocument.defaultView?.getComputedStyle(target).userSelect !== 'none'
        return !(event.pointerType !== 'touch' && selectable && [...target.childNodes].some(node => node.nodeType === 3 && node.textContent?.trim()))
      },
      onStart: (position, event) => report('began', position, event),
      onMove: (position, event) => report('changed', position, event),
      onEnd: (position, event, cancelled) => report(cancelled ? 'cancelled' : 'ended', position, event),
    }))
  }, { flush: 'post', immediate: true })
}
