import { toValue, watch, type MaybeRefOrGetter } from 'vue'
import { gestureMotion } from './motion-defaults'

export const transformGestureThresholds = Object.freeze({ distance: gestureMotion.pinch.threshold, rotation: gestureMotion.rotation.threshold })
interface Point { x: number; y: number }
export interface TransformGesturePosition {
  center: Point
  translation: Point
  scale: number
  rotation: number
}
export interface TransformGestureOptions {
  distanceThreshold?: number
  rotationThreshold?: number
  shouldStart?: (event: PointerEvent) => boolean
  onStart?: (position: TransformGesturePosition, event: PointerEvent) => void
  onMove: (position: TransformGesturePosition, event: PointerEvent) => void
  onEnd?: (position: TransformGesturePosition, event: PointerEvent, cancelled: boolean) => void
}

function geometry([first, second]: readonly Point[]) {
  const x = second.x - first.x
  const y = second.y - first.y
  return { center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }, distance: Math.hypot(x, y), angle: Math.atan2(y, x) }
}
function shortestAngle(value: number) {
  return Math.atan2(Math.sin(value), Math.cos(value))
}

export function createTransformGesture(element: HTMLElement, options: TransformGestureOptions) {
  const view = element.ownerDocument.defaultView
  const contacts = new Map<number, Point>()
  let origin: ReturnType<typeof geometry> | undefined
  let previousAngle = 0
  let rotation = 0
  let current: TransformGesturePosition | undefined
  let lastEvent: PointerEvent | undefined
  const point = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY })
  function reset() {
    origin = undefined
    rotation = 0
    current = undefined
    lastEvent = undefined
  }
  function down(event: PointerEvent) {
    if (event.pointerType !== 'touch' || contacts.size >= 2 || options.shouldStart?.(event) === false) return
    contacts.set(event.pointerId, point(event))
    if (contacts.size === 2) {
      origin = geometry([...contacts.values()])
      previousAngle = origin.angle
    }
  }
  function move(event: PointerEvent) {
    if (!contacts.has(event.pointerId)) return
    contacts.set(event.pointerId, point(event))
    if (contacts.size !== 2 || !origin) return
    const next = geometry([...contacts.values()])
    if (origin.distance < 1) {
      if (next.distance >= 1) { origin = next; previousAngle = next.angle }
      return
    }
    if (next.distance < 1) return
    rotation += shortestAngle(next.angle - previousAngle)
    previousAngle = next.angle
    if (!current) {
      const distance = options.distanceThreshold ?? transformGestureThresholds.distance
      const angle = options.rotationThreshold ?? transformGestureThresholds.rotation
      if (Math.abs(origin.distance - next.distance) < distance && Math.abs(rotation) < angle) return
      options.onStart?.({ center: origin.center, translation: { x: 0, y: 0 }, scale: 1, rotation: 0 }, event)
    }
    current = { center: next.center, scale: next.distance / origin.distance, rotation,
      translation: { x: next.center.x - origin.center.x, y: next.center.y - origin.center.y } }
    lastEvent = event
    options.onMove(current, event)
  }
  function end(event: PointerEvent) {
    if (!contacts.delete(event.pointerId)) return
    if (current) options.onEnd?.(current, event, event.type === 'pointercancel')
    reset()
  }
  function blur() {
    if (current && lastEvent) options.onEnd?.(current, lastEvent, true)
    contacts.clear()
    reset()
  }
  element.addEventListener('pointerdown', down)
  view?.addEventListener('pointermove', move, { passive: true })
  view?.addEventListener('pointerup', end)
  view?.addEventListener('pointercancel', end)
  view?.addEventListener('blur', blur)
  return () => {
    element.removeEventListener('pointerdown', down)
    view?.removeEventListener('pointermove', move)
    view?.removeEventListener('pointerup', end)
    view?.removeEventListener('pointercancel', end)
    view?.removeEventListener('blur', blur)
    contacts.clear()
    reset()
  }
}

export function useTransformGesture(target: MaybeRefOrGetter<HTMLElement | null | undefined>, options: MaybeRefOrGetter<TransformGestureOptions>) {
  return watch([() => toValue(target), () => toValue(options).distanceThreshold, () => toValue(options).rotationThreshold],
    ([element, distanceThreshold, rotationThreshold], _, cleanup) => {
      if (!element) return
      cleanup(createTransformGesture(element, { distanceThreshold, rotationThreshold,
        shouldStart: event => toValue(options).shouldStart?.(event) ?? true,
        onStart: (position, event) => toValue(options).onStart?.(position, event),
        onMove: (position, event) => toValue(options).onMove(position, event),
        onEnd: (position, event, cancelled) => toValue(options).onEnd?.(position, event, cancelled),
      }))
    }, { immediate: true, flush: 'post' })
}
