import { cancelAnimationFrame, requestAnimationFrame } from '@nativescript/core/animation-frame'
import { computed, onBeforeUnmount, ref, watch } from 'nativescript-vue'
import { useActionMeter } from './action-motion'
import { useNativeUI } from './context'
import { nativeFeedbackFormatter, type NativeProgressOptions } from './feedback'
import { nativeProgressRange } from './feedback-state'

export function useNativeProgress(props: NativeProgressOptions, duration = 1600) {
  const { theme, reducedMotion } = useNativeUI()
  const mode = computed(() => props.state ?? 'determinate')
  const range = computed(() => {
    const current = nativeProgressRange(props.value ?? 0, props.min, props.max)
    return mode.value === 'complete' ? { ...current, value: current.max, ratio: 1 } : current
  })
  const ratio = computed(() => range.value.ratio)
  const progress = useActionMeter(ratio, computed(() => props.animated === false || mode.value === 'indeterminate'))
  const ink = computed(() => {
    const colors = theme.value.colors
    const tone = props.tone ?? (mode.value === 'error' ? 'danger' : mode.value === 'complete' ? 'success' : 'accent')
    return tone === 'neutral' ? colors.textMuted : colors[tone]
  })
  const fill = computed(() => {
    const colors = theme.value.colors
    return mode.value === 'error' ? colors.dangerSoft : mode.value === 'complete' ? colors.successSoft : colors.border
  })
  const formatter = computed(() => nativeFeedbackFormatter(props.locale, props.formatOptions ?? { style: 'percent' }))
  const rendered = computed(() => {
    const { value, ratio } = range.value
    if (mode.value === 'indeterminate') return props.waitingLabel ?? 'In progress'
    return props.formatValue?.(value, ratio) ?? formatter.value.format(
      !props.formatOptions || props.formatOptions.style === 'percent' ? ratio : value,
    )
  })
  const spoken = computed(() => {
    if (mode.value === 'error') return [props.errorLabel ?? 'Failed', rendered.value].join(' ')
    if (mode.value === 'complete') return [props.completeLabel ?? 'Completed', rendered.value].join(' ')
    return rendered.value
  })
  const active = ref(false)
  const phase = ref(.5)
  let frame: number | undefined
  function stop() {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
  }
  watch([active, mode, reducedMotion, () => props.animated], ([mounted, state, reduced, animate]) => {
    stop()
    phase.value = .5
    if (!mounted || state !== 'indeterminate' || reduced || animate === false) return
    let origin: number | undefined
    function advance(now: number) {
      origin ??= now
      const cycle = (now - origin) % duration / duration
      phase.value = cycle * cycle * (3 - 2 * cycle)
      frame = requestAnimationFrame(advance)
    }
    frame = requestAnimationFrame(advance)
  }, { immediate: true })
  onBeforeUnmount(stop)

  return { range, mode, progress, ink, fill, rendered, spoken, phase, active }
}
