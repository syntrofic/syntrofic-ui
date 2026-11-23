import { cancelAnimationFrame, requestAnimationFrame } from '@nativescript/core/animation-frame'
import { onBeforeUnmount, shallowRef, watch, type Ref } from 'nativescript-vue'
import { useNativeUI } from './context'

export function useActionMeter(source: Readonly<Ref<number>>, direct: Readonly<Ref<boolean>>) {
  const { reducedMotion, theme } = useNativeUI()
  const visible = shallowRef(source.value)
  let frame: number | undefined

  function cancel() {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
  }

  watch([source, direct, reducedMotion], ([value, immediate, reduced]) => {
    cancel()
    const initial = visible.value
    if (reduced || immediate || Math.abs(value - initial) < .001) {
      visible.value = value
      return
    }
    const duration = Math.max(1, theme.value.motion.motionReplace)
    let start: number | undefined
    function tick(time: number) {
      start ??= time
      const elapsed = Math.min(1, (time - start) / duration)
      visible.value = initial + (value - initial) * (1 - (1 - elapsed) ** 3)
      frame = elapsed < 1 ? requestAnimationFrame(tick) : undefined
    }
    frame = requestAnimationFrame(tick)
  })
  onBeforeUnmount(cancel)
  return visible
}
