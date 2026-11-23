import { useReducedMotion } from '../internal/reduced-motion'
import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'
import type { ChartDatum, ChartValue } from './types'
import { cleanValue, lerp } from './values'

export function mixValue(from: ChartValue, to: ChartValue, t: number): ChartValue {
  if (typeof from === 'number' && typeof to === 'number') return lerp(from, to, t)
  if (from !== null && to !== null && typeof from !== 'number' && typeof to !== 'number') {
    return [lerp(from[0], to[0], t), lerp(from[1], to[1], t)]
  }
  return to
}

export function mixRows(from: readonly ChartDatum[], to: readonly ChartDatum[], t: number): readonly ChartDatum[] {
  if (from.length !== to.length || from.some((row, index) => (row.id ?? row.label) !== (to[index].id ?? to[index].label))) return to
  return to.map((row, index) => ({
    ...row,
    values: Object.fromEntries(Object.entries(row.values).map(([key, value]) =>
      [key, mixValue(cleanValue(from[index].values[key]), cleanValue(value), t)])),
  }))
}

export function useChartMotion<T>(source: Readonly<Ref<T>>, enabled: () => boolean, root: Readonly<Ref<HTMLElement | null>>,
  mix: (from: T, to: T, t: number) => T): Readonly<Ref<T>> {
  const painted = shallowRef(source.value)
  const reduced = useReducedMotion(root)
  let owner: Window | null | undefined
  let frame: number | undefined
  function cancel() {
    if (frame !== undefined) owner?.cancelAnimationFrame(frame)
    frame = undefined
  }
  watch(source, next => {
    cancel()
    owner = root.value?.ownerDocument.defaultView
    if (!owner || !enabled() || reduced.value) {
      painted.value = next
      return
    }
    const view = owner
    const start = view.performance.now()
    const previous = painted.value
    function paint(now: number) {
      const ratio = Math.min(1, Math.max(0, (now - start) / 280))
      painted.value = ratio >= 1 ? next : mix(previous, next, 1 - (1 - ratio) ** 3)
      frame = ratio >= 1 ? undefined : view.requestAnimationFrame(paint)
    }
    frame = view.requestAnimationFrame(paint)
  })
  watch(reduced, value => { if (value) { cancel(); painted.value = source.value } })
  onBeforeUnmount(cancel)
  return painted
}
