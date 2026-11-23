import { computed, getCurrentInstance, onMounted, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useReducedMotion } from './reduced-motion'
import { useTheme } from './theme-context'

export type StreamingTextSpeed = 'natural' | 'fast' | 'instant'
export interface StreamingTextOptions { speed?: StreamingTextSpeed }

const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : undefined
const lowSurrogate = (value: number) => value >= 0xdc00 && value <= 0xdfff
const highSurrogate = (value: number) => value >= 0xd800 && value <= 0xdbff

export function useStreamingText(
  targetText: MaybeRefOrGetter<string>,
  isStreaming: MaybeRefOrGetter<boolean>,
  options: MaybeRefOrGetter<StreamingTextOptions> = {},
) {
  const instance = getCurrentInstance()
  const prefersReduced = useReducedMotion()
  const theme = useTheme()
  const target = computed(() => toValue(targetText))
  const speed = computed(() => toValue(options).speed ?? 'natural')
  const animate = computed(() => toValue(isStreaming) && speed.value !== 'instant' && !prefersReduced.value)
  const streaming = computed(() => highSurrogate(target.value.charCodeAt(target.value.length - 1)) ? target.value.slice(0, -1) : target.value)
  const segments = computed(() => segmenter?.segment(streaming.value))
  const shown = shallowRef(animate.value ? '' : target.value)
  const cadence = computed(() => {
    const token = theme.token('--sy-duration')?.trim() ?? ''
    const duration = /^(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)$/.test(token)
      ? parseFloat(token) * (token.endsWith('ms') ? 1 : 1000) : 170
    const tempo = Number(theme.token('--sy-motion-tempo'))
    return Math.max(4, duration * (Number.isFinite(tempo) && tempo > 0 ? tempo : 1) / (speed.value === 'fast' ? 20 : 10))
  })
  let view: Window | undefined
  let frame: number | undefined
  let time = 0

  function boundary(index: number, forward = false) {
    const text = streaming.value
    if (index <= 0 || index >= text.length) return index
    const part = segments.value?.containing(index)
    if (part && part.index < index) return forward ? part.index + part.segment.length : part.index
    return !segments.value && lowSurrogate(text.charCodeAt(index)) ? index + (forward ? 1 : -1) : index
  }
  function stop() {
    if (frame !== undefined) view?.cancelAnimationFrame(frame)
    frame = undefined
    time = 0
  }
  function schedule() {
    if (!view || frame !== undefined || !animate.value || shown.value.length >= streaming.value.length) return
    frame = view.requestAnimationFrame(tick)
  }
  function tick(now: number) {
    frame = undefined
    if (!animate.value) return
    const elapsed = time ? now - time : cadence.value
    if (elapsed >= cadence.value) {
      time = now
      const remaining = streaming.value.length - shown.value.length
      const step = speed.value === 'fast' ? Math.max(12, Math.ceil(remaining / 24)) : 10
      const count = Math.min(remaining, step * Math.min(4, Math.floor(elapsed / cadence.value)))
      const end = boundary(shown.value.length + count, true)
      shown.value = streaming.value.slice(0, end)
    }
    schedule()
    if (frame === undefined) time = 0
  }
  watch([streaming, animate], ([next, playing]) => {
    if (!playing) {
      shown.value = target.value
      stop()
      return
    }
    if (!next.startsWith(shown.value)) {
      let same = 0
      while (same < next.length && same < shown.value.length && next[same] === shown.value[same]) same++
      shown.value = next.slice(0, boundary(same))
    } else {
      const corrected = boundary(shown.value.length, true)
      if (corrected !== shown.value.length) shown.value = next.slice(0, corrected)
    }
    schedule()
  })
  onMounted(() => {
    view = instance?.proxy?.$el?.ownerDocument?.defaultView ?? globalThis.window
    schedule()
  })
  onScopeDispose(stop)
  return computed(() => animate.value ? shown.value : target.value)
}
