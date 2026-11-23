import { useReducedMotion } from '../internal/reduced-motion'
import { onScopeDispose, shallowRef, watch, type Ref } from 'vue'
import { themeTempo } from '../internal/motion'
import { resolveMotionSpring, solveSpring } from '../internal/motion-physics'
import { spatialView, type SpatialView } from './spatial'

const axes = ['azimuth', 'elevation', 'distance'] as const
const still = { azimuth: 0, elevation: 0, distance: 0 }
const turn = Math.PI * 2

export function useSpatialCamera(host: Ref<HTMLElement | null>, target: Ref<SpatialView>, spin: () => number, animate: () => boolean) {
  const displayed = shallowRef(target.value)
  const reduced = useReducedMotion(host)
  let velocity: SpatialView = { ...still }
  let frame = 0
  let goal: SpatialView | undefined
  let owner: Window | undefined

  function stop() {
    if (frame) owner?.cancelAnimationFrame(frame)
    frame = 0
    goal = undefined
    velocity = { ...still }
  }

  function jump(next: SpatialView) {
    stop()
    displayed.value = next
  }

  function settle(next: SpatialView) {
    const element = host.value
    const window = element?.ownerDocument.defaultView
    const from = displayed.value
    if (!element || !window || reduced.value || !animate()) { jump(next); return }
    if (goal && axes.every(axis => goal![axis] === next[axis])) return
    if (axes.every(axis => from[axis] === next[axis])) { jump(next); return }
    const delta = next.azimuth - from.azimuth
    const longitude = delta - Math.round(delta / turn) * turn
    const to = { ...next, azimuth: from.azimuth + longitude }
    const tempo = themeTempo(element)
    const spring = resolveMotionSpring(element)
    const curves = axes.map(axis => solveSpring({ from: from[axis], to: to[axis], velocity: velocity[axis] * tempo, spring }))
    stop()
    owner = window
    goal = next
    const start = window.performance.now()
    function step(now: number) {
      const elapsed = Math.max(0, now - start) / (1000 * tempo)
      const [azimuth, elevation, distance] = curves.map(sample => sample(elapsed))
      const samples = [azimuth, elevation, distance]
      if (elapsed >= 2 || axes.every((axis, index) => Math.abs(samples[index].value - to[axis]) < .0006 && Math.abs(samples[index].velocity) < .008)) {
        jump(next)
        return
      }
      velocity = { azimuth: azimuth.velocity / tempo, elevation: elevation.velocity / tempo, distance: distance.velocity / tempo }
      displayed.value = spatialView({ azimuth: azimuth.value, elevation: elevation.value, distance: distance.value })
      frame = window!.requestAnimationFrame(step)
    }
    frame = window.requestAnimationFrame(step)
  }

  watch(target, settle)
  watch([reduced, animate], ([reduce, enabled]) => { if ((reduce || !enabled) && frame) jump(target.value) })
  watch([host, spin, reduced], ([element, speed, reduce], _, cleanup) => {
    const window = element?.ownerDocument.defaultView
    if (!element || !window || !speed || reduce) return
    const document = element.ownerDocument
    const ramp = 175 * themeTempo(element)
    let start: number | undefined
    let last: number | undefined
    let request = 0
    function tick(now: number) {
      start ??= now
      if (last !== undefined && !frame) {
        const current = displayed.value
        const progress = Math.min((now - start) / ramp, 1)
        const azimuth = current.azimuth + speed * Math.PI / 180 * progress * (2 - progress) * Math.min(now - last, 64) / 1000
        displayed.value = { ...current, azimuth: azimuth % turn }
      }
      last = now
      request = window!.requestAnimationFrame(tick)
    }
    function visibility() {
      window!.cancelAnimationFrame(request)
      start = undefined
      last = undefined
      if (!document.hidden) request = window!.requestAnimationFrame(tick)
    }
    document.addEventListener('visibilitychange', visibility)
    visibility()
    cleanup(() => { window.cancelAnimationFrame(request); document.removeEventListener('visibilitychange', visibility) })
  }, { flush: 'post' })
  onScopeDispose(stop)
  return { displayed, jump, settle, stop, destination: () => goal ?? displayed.value }
}
