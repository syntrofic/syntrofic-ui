<script setup lang="ts">
import { Primitive } from 'reka-ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  as?: 'button' | 'a' | 'div' | 'span'
  asChild?: boolean
  effect?: 'highlight' | 'ripple' | 'scale' | 'hold' | 'progress' | 'none'
  disabled?: boolean
  pressed?: boolean
  type?: 'button' | 'submit' | 'reset'
  duration?: number
  releaseDuration?: number
  resetDelay?: number
  resetOnComplete?: boolean
  sweep?: 'right' | 'left' | 'up' | 'down'
}>(), { as: 'button', effect: 'highlight', pressed: undefined, type: 'button', resetOnComplete: true, sweep: 'right' })
const emit = defineEmits<{ 'pressed-change': [pressed: boolean]; complete: []; reset: [] }>()
const active = ref(false)
const running = ref(false)
const complete = ref(false)
const visual = computed(() => !props.disabled && (props.pressed ?? active.value))
const duration = computed(() => timing(props.duration, 2000))
const releaseDuration = computed(() => timing(props.releaseDuration, props.effect === 'hold' ? 200 : 300))
let pointer: number | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let release: ReturnType<typeof setTimeout> | undefined

function timing(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(2_147_483_647, Math.max(0, value)) : fallback
}

function clearTimers() {
  if (timer !== undefined) clearTimeout(timer)
  if (release !== undefined) clearTimeout(release)
  timer = release = undefined
}

function reset() {
  clearTimers()
  const hadProgress = running.value || complete.value
  running.value = complete.value = false
  if (hadProgress) emit('reset')
}

function start() {
  if (running.value || complete.value || props.disabled) return
  running.value = true
  timer = setTimeout(() => {
    timer = undefined
    complete.value = true
    running.value = false
    emit('complete')
    if (props.resetOnComplete && complete.value) {
      release = setTimeout(reset, timing(props.resetDelay, props.effect === 'hold' ? 160 : 1500))
    }
  }, duration.value)
}

function feedback(on: boolean) {
  if (active.value === on) return
  active.value = on
  emit('pressed-change', on)
  if (props.effect === 'hold') {
    if (on) start()
    else if (running.value) reset()
  }
}

watch(() => props.disabled, disabled => {
  if (!disabled) return
  pointer = undefined
  feedback(false)
  reset()
})
watch(() => props.effect, reset)
onBeforeUnmount(clearTimers)

function pointerDown(event: PointerEvent) {
  if (props.disabled || !event.isPrimary || event.button !== 0) return
  pointer = event.pointerId
  const host = event.currentTarget as HTMLElement
  const box = host.getBoundingClientRect()
  host.style.setProperty('--sy-press-x', `${event.clientX - box.left}px`)
  host.style.setProperty('--sy-press-y', `${event.clientY - box.top}px`)
  host.style.setProperty('--sy-press-size', `${Math.hypot(box.width, box.height) * 2}px`)
  feedback(true)
}

function endPointer(event: PointerEvent) {
  if (pointer !== event.pointerId) return
  pointer = undefined
  feedback(false)
}

function keyDown(event: KeyboardEvent) {
  if (props.disabled || event.target !== event.currentTarget || ![' ', 'Enter'].includes(event.key)) return
  const host = event.currentTarget as HTMLElement
  host.style.removeProperty('--sy-press-x')
  host.style.removeProperty('--sy-press-y')
  host.style.setProperty('--sy-press-size', `${Math.hypot(host.offsetWidth, host.offsetHeight) * 2}px`)
  feedback(true)
}

function keyUp(event: KeyboardEvent) {
  if (event.target === event.currentTarget && [' ', 'Enter'].includes(event.key)) feedback(false)
}

function stop(event: MouseEvent) {
  if (props.effect === 'progress' && !props.disabled && !running.value && !complete.value) {
    start()
    return
  }
  if (!props.disabled && props.effect !== 'hold' && props.effect !== 'progress') return
  event.preventDefault()
  event.stopImmediatePropagation()
}

defineExpose({ reset })
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    class="sy-pressable-feedback"
    :type="as === 'button' && !asChild ? type : undefined"
    :disabled="as === 'button' && !asChild && disabled || undefined"
    :aria-disabled="disabled || undefined"
    :aria-busy="effect === 'progress' && running || undefined"
    :data-effect="effect"
    :data-pressed="visual || undefined"
    :data-running="running || undefined"
    :data-complete="complete || undefined"
    :data-sweep="sweep"
    :style="{ '--sy-press-duration': `${duration}ms`, '--sy-press-release': `${releaseDuration}ms` }"
    @pointerdown="pointerDown"
    @pointerup="endPointer"
    @pointercancel="endPointer"
    @pointerleave="endPointer"
    @lostpointercapture="endPointer"
    @keydown="keyDown"
    @keyup="keyUp"
    @focusout="feedback(false)"
    @click.capture="stop"
  ><slot :pressed="visual" :running="running" :complete="complete" /></Primitive>
</template>
