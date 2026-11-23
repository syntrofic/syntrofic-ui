import { prefersReducedMotion, startLayoutCompanion, themeTempo } from './motion'
import { resolveMotionSpring, rubberBand, rubberBandSlope, solveSpring } from './motion-physics'

const bandLimit = 8
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

export function resizeBand(raw: number, minimum: number, maximum: number, grabbed: number) {
  const edge = clamp(raw, minimum, maximum)
  const excess = raw - edge
  if (!excess) return { offset: 0, slope: 1 }
  const held = excess * grabbed > 0 ? grabbed : 0
  if (Math.abs(excess) <= Math.abs(held)) return { offset: excess, slope: 1 }
  const room = bandLimit - Math.abs(held)
  const remaining = excess - held
  const offset = held + rubberBand(remaining, room)
  return { offset: Math.max(-edge, offset), slope: offset < -edge ? 0 : rubberBandSlope(remaining, room) }
}

export interface ResizeSpringTiming {
  duration: number
  easing: string
  scaleTempo: false
}

/** A shared progress curve keeps the pane, its grid track and the divider together. */
export function resizeSpringTiming(node: HTMLElement, from: number, velocity: number, low: number, high: number): ResizeSpringTiming {
  const tempo = themeTempo(node)
  const spring = solveSpring({ from, to: 0, velocity: clamp(velocity, -1800, 1800) * tempo, spring: resolveMotionSpring(node) })
  const seconds = clamp(spring.settleTime(.025), .12, 1.2)
  const count = Math.ceil(seconds * 100)
  const points = Array.from({ length: count + 1 }, (_, index) => {
    if (index === 0) return 0
    if (index === count) return 1
    const at = seconds * index / count
    return (1 - clamp(spring.value(at), low, high) / from).toFixed(5)
  })
  return { duration: seconds * 1000 * tempo, easing: `linear(${points.join(', ')})`, scaleTempo: false }
}

export function createResizeBandMotion(handle: HTMLElement) {
  let animation: Animation | undefined
  let from = 0
  let held = false

  function clear() {
    const current = animation
    animation = undefined
    held = false
    current?.cancel()
    handle.removeAttribute('data-sy-resize-band')
  }

  function frames(a: number, b: number, axis: 'horizontal' | 'vertical', direction: number) {
    return [a, b].map(offset => ({ translate: axis === 'horizontal' ? `${offset * direction}px 0px` : `0px ${offset * direction}px` }))
  }

  function shown() {
    if (!animation) return 0
    const progress = animation.effect?.getComputedTiming().progress ?? 1
    return from * (1 - progress)
  }

  function paint(offset: number, axis: 'horizontal' | 'vertical', direction: number) {
    if (!offset) { clear(); return }
    const painted = clamp(offset, -bandLimit, bandLimit)
    const keyframes = frames(painted, painted, axis, direction)
    if (held && animation?.effect) (animation.effect as KeyframeEffect).setKeyframes(keyframes)
    else {
      clear()
      animation = handle.animate(keyframes, { duration: 1, fill: 'both', composite: 'add' })
      animation.pause()
      animation.currentTime = 0
      void animation.finished.catch(() => {})
      held = true
      handle.setAttribute('data-sy-resize-band', '')
    }
    from = painted
  }

  function settle(axis: 'horizontal' | 'vertical', direction: number, velocity: number, timing?: ResizeSpringTiming) {
    const offset = shown()
    clear()
    if (Math.abs(offset) < .025 || prefersReducedMotion(handle)) return
    const { duration, easing } = timing ?? resizeSpringTiming(handle, offset, velocity, -bandLimit, bandLimit)
    const effect = handle.animate(frames(offset, 0, axis, direction), { duration, easing, fill: 'backwards', composite: 'add' })
    handle.setAttribute('data-sy-resize-band', '')
    animation = startLayoutCompanion(handle, effect)
    from = offset
    const finish = () => { if (animation === effect) clear() }
    effect.finished.then(finish, finish)
  }

  return { clear, paint, settle, shown }
}
