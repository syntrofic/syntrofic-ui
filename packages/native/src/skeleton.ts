import { cancelAnimationFrame, requestAnimationFrame } from '@nativescript/core/animation-frame'
import { onBeforeUnmount, ref, watch, type InjectionKey, type Ref } from 'nativescript-vue'

export type NativeSkeletonVariant = 'none' | 'pulse' | 'shimmer'

export const nativeSkeletonGroup: InjectionKey<{
  loading: () => boolean
  variant: () => NativeSkeletonVariant
  phase: Ref<number>
}> = Symbol('Native skeleton group')

export function useSkeletonClock(enabled: () => boolean, duration: () => number) {
  const phase = ref(0)
  let request: number | undefined
  let first: number | undefined

  function tick(time: number) {
    first ??= time
    const period = Number.isFinite(duration()) ? Math.max(120, duration()) : 1350
    phase.value = (Math.max(0, time - first) % period) / period
    request = requestAnimationFrame(tick)
  }

  function stop() {
    if (request !== undefined) cancelAnimationFrame(request)
    request = undefined
    first = undefined
    phase.value = 0
  }

  watch(enabled, running => { if (running) request = requestAnimationFrame(tick); else stop() }, { immediate: true })
  onBeforeUnmount(stop)
  return phase
}
