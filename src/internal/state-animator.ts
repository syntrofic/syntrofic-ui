import { toValue, watch, type MaybeRefOrGetter } from 'vue'
import { prefersReducedMotion, themeTempo } from './motion'
import { resolveMotionSpring, solveDecay, solveSpring, type MotionSample, type MotionSpring } from './motion-physics'

export interface AnimatorValues { x: number; y: number; scale: number; rotate: number; opacity: number }
export interface AnimatorSpringOptions { velocity?: Partial<AnimatorValues>; spring?: MotionSpring }
type Channel = keyof AnimatorValues
type Animation = { channel: Channel; to: number; sample: (seconds: number) => MotionSample }
const channels: readonly Channel[] = ['x', 'y', 'scale', 'rotate', 'opacity']
const resting: AnimatorValues = { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }
const stopped: AnimatorValues = { x: 0, y: 0, scale: 0, rotate: 0, opacity: 0 }

function limit(channel: Channel, value: number) {
  if (channel === 'opacity') return Math.max(0, Math.min(1, value))
  return channel === 'scale' ? Math.max(0, value) : value
}

export function useAnimator(target: MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>) {
  let node: HTMLElement | SVGElement | undefined
  let frame = 0
  let finish: (() => void) | undefined
  let current = { ...resting }
  let speed = { ...stopped }

  function paint(changed: readonly Channel[]) {
    if (!node) return
    if (changed.includes('x') || changed.includes('y')) node.style.translate = `${current.x}px ${current.y}px`
    if (changed.includes('scale')) node.style.scale = String(current.scale)
    if (changed.includes('rotate')) node.style.rotate = `${current.rotate}deg`
    if (changed.includes('opacity')) node.style.opacity = String(current.opacity)
  }
  function stop() {
    if (frame) node?.ownerDocument.defaultView?.cancelAnimationFrame(frame)
    frame = 0
    const resolve = finish
    finish = undefined
    speed = { ...stopped }
    resolve?.()
  }
  function set(values: Partial<AnimatorValues>) {
    stop()
    if (!node) return
    const changed = channels.filter(channel => Number.isFinite(values[channel]))
    for (const channel of changed) current[channel] = limit(channel, values[channel]!)
    paint(changed)
  }
  function play(jobs: readonly Animation[]) {
    stop()
    const view = node?.ownerDocument.defaultView
    if (!node || !view || !jobs.length) return Promise.resolve()
    const tempo = themeTempo(node)
    const changed = jobs.map(job => job.channel)
    const origin = view.performance.now()
    return new Promise<void>(resolve => {
      finish = resolve
      const tick = (now: number) => {
        const elapsed = Math.max(0, now - origin) / (1000 * tempo)
        let atRest = true
        for (const job of jobs) {
          const sample = job.sample(elapsed)
          const tolerance = job.channel === 'scale' || job.channel === 'opacity' ? .003 : .25
          current[job.channel] = limit(job.channel, sample.value)
          speed[job.channel] = sample.velocity / tempo
          if (Math.abs(sample.value - job.to) > tolerance || Math.abs(sample.velocity) > tolerance * 8) atRest = false
        }
        if (atRest || elapsed >= 4) {
          for (const job of jobs) current[job.channel] = job.to
          paint(changed)
          stop()
        } else {
          paint(changed)
          frame = view.requestAnimationFrame(tick)
        }
      }
      frame = view.requestAnimationFrame(tick)
    })
  }
  function animate(values: Partial<AnimatorValues>, options: AnimatorSpringOptions = {}) {
    if (!node) return Promise.resolve()
    if (prefersReducedMotion(node)) { set(values); return Promise.resolve() }
    const spring = resolveMotionSpring(node, options.spring)
    const tempo = themeTempo(node)
    return play(channels.flatMap(channel => {
      const target = values[channel]
      if (target === undefined || !Number.isFinite(target)) return []
      const to = limit(channel, target)
      const proposed = options.velocity?.[channel]
      const velocity = proposed !== undefined && Number.isFinite(proposed) ? proposed : speed[channel]
      return [{ channel, to, sample: solveSpring({ from: current[channel], to, velocity: velocity * tempo, spring }) }]
    }))
  }
  function decay(velocity: Partial<AnimatorValues>, rate = .998) {
    if (!node || prefersReducedMotion(node)) { stop(); return Promise.resolve() }
    return play(channels.flatMap(channel => {
      const value = velocity[channel]
      if (value === undefined || !Number.isFinite(value) || value === 0) return []
      const coast = solveDecay({ from: current[channel], velocity: value, rate })
      const to = limit(channel, coast.rest)
      return [{ channel, to, sample: (seconds: number) => {
        const value = coast.value(seconds)
        const constrained = limit(channel, value)
        return { value: constrained, velocity: constrained === value ? coast.velocity(seconds) : 0 }
      } }]
    }))
  }

  watch(() => toValue(target), (element, _, cleanup) => {
    if (!element) return
    node = element
    current = { ...resting }
    const style = element.style
    const before = { translate: style.translate, scale: style.scale, rotate: style.rotate, opacity: style.opacity }
    cleanup(() => { stop(); Object.assign(style, before); node = undefined; current = { ...resting } })
  }, { flush: 'post', immediate: true })
  return { animate, decay, set, stop, get: () => ({ ...current }), getVelocity: () => ({ ...speed }) }
}
