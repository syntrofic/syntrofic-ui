<script setup lang="ts">
import { useReducedMotion } from '../internal/reduced-motion'
import { computed, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import { holoLimit, neutralHoloMotion, stepHolo, type HoloMotion, type HoloSpring } from '../internal/holo-motion'

const props = withDefaults(defineProps<{
  src?: string
  alt?: string
  background?: string
  textureSrc?: string
  textureSize?: string
  textureOpacity?: number
  shineOpacity?: number
  width?: string
  aspect?: number | string
  radius?: string
  perspective?: number
  inset?: boolean
  interactive?: boolean
  disabled?: boolean
  activateOnHover?: boolean
  tiltOnTouch?: boolean
  maxTilt?: number
  hoverScale?: number
  parallaxStrength?: number
  spring?: HoloSpring
  settleSpring?: HoloSpring
}>(), {
  alt: '', width: '18rem', aspect: '3 / 4', perspective: 780,
  interactive: true, tiltOnTouch: true, shineOpacity: .55, textureOpacity: .18,
  maxTilt: 8, hoverScale: 1.025, parallaxStrength: 4,
})

const root = ref<HTMLElement | null>(null)
const mounted = ref(false)
const reduced = useReducedMotion(root)
const engaged = ref(false)
const settling = ref(false)
const enabled = computed(() => mounted.value && props.interactive && !props.disabled && !reduced.value)
const active = computed(() => mounted.value && !reduced.value && (settling.value || (enabled.value && (!props.activateOnHover || engaged.value))))
const touch = computed(() => enabled.value && props.tiltOnTouch && !props.activateOnHover)
const style = computed<CSSProperties>(() => ({
  '--sy-holo-width': props.width,
  '--sy-holo-aspect': props.aspect,
  '--sy-holo-radius': props.radius,
  '--sy-holo-perspective': `${holoLimit(props.perspective, 140, 4000, 780)}px`,
  '--sy-holo-face': props.background,
  '--sy-holo-texture': props.textureSrc ? `url(${JSON.stringify(props.textureSrc)})` : undefined,
  '--sy-holo-texture-size': props.textureSize,
  '--sy-holo-texture-opacity': holoLimit(props.textureOpacity, 0, 1, .18),
  '--sy-holo-shine-opacity': holoLimit(props.shineOpacity, 0, 1, .55),
}))

let view: Window | null | undefined
let frame = 0
let lastTime = 0
let pointer: number | undefined
let value: HoloMotion = { ...neutralHoloMotion }
let velocity: HoloMotion = { ...neutralHoloMotion }
let target: Readonly<HoloMotion> = neutralHoloMotion

function paint() {
  const node = root.value
  if (!node) return
  const tilt = holoLimit(props.maxTilt, 0, 28, 8)
  const zoom = holoLimit(props.hoverScale, 1, 1.15, 1.025)
  const drift = holoLimit(props.parallaxStrength, 0, 24, 4)
  const level = Math.max(0, Math.min(1, value.intensity))
  node.style.setProperty('--sy-holo-rx', `${value.y * -tilt}deg`)
  node.style.setProperty('--sy-holo-ry', `${value.x * tilt}deg`)
  node.style.setProperty('--sy-holo-scale', String(1 + (zoom - 1) * level))
  node.style.setProperty('--sy-holo-light', String(level))
  node.style.setProperty('--sy-holo-x', `${50 + 50 * value.x}%`)
  node.style.setProperty('--sy-holo-y', `${50 + 50 * value.y}%`)
  node.style.setProperty('--sy-holo-drift-x', `${-value.x * drift}px`)
  node.style.setProperty('--sy-holo-drift-y', `${-value.y * drift}px`)
}

function tick(now: number) {
  frame = 0
  if (reduced.value || (!enabled.value && !settling.value)) return
  const following = target.intensity > 0
  const seconds = lastTime ? Math.min(.045, Math.max(.001, (now - lastTime) / 1000)) : 1 / 60
  const atRest = stepHolo(value, velocity, target, seconds, following ? props.spring : props.settleSpring, following)
  lastTime = now
  if (atRest) {
    value = { ...target }
    velocity = { ...neutralHoloMotion }
    lastTime = 0
    if (!following) settling.value = false
  }
  paint()
  if (!atRest && view) frame = view.requestAnimationFrame(tick)
}

function startFrame() {
  if (!frame && view) frame = view.requestAnimationFrame(tick)
}

function focusAt(x: number, y: number) {
  if (!enabled.value) return
  engaged.value = true
  settling.value = false
  target = { x: holoLimit(x, 0, 1, .5) * 2 - 1, y: holoLimit(y, 0, 1, .5) * 2 - 1, intensity: 1 }
  startFrame()
}

function settle() {
  engaged.value = false
  settling.value = frame !== 0 || value.intensity > 0
  target = neutralHoloMotion
  if (settling.value) startFrame()
}

function track(event: PointerEvent) {
  if (!enabled.value || (event.pointerType === 'mouse' ? pointer !== undefined : event.pointerId !== pointer)) return
  const bounds = root.value?.getBoundingClientRect()
  if (bounds && bounds.width && bounds.height) focusAt((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height)
}

function press(event: PointerEvent) {
  if (event.pointerType === 'mouse' || !touch.value || pointer !== undefined || !event.isPrimary ||
    (event.target as Element).closest('button, a, input, textarea, select, [contenteditable="true"]')) return
  pointer = event.pointerId
  root.value?.setPointerCapture(event.pointerId)
  track(event)
}

function release(event: PointerEvent) {
  if (pointer !== event.pointerId) return
  pointer = undefined
  settle()
}

function leave(event: PointerEvent) {
  if (event.pointerType === 'mouse' && pointer === undefined) settle()
}

watch([enabled, reduced], ([next, prefersReduced]) => {
  if (next) return
  if (pointer !== undefined && root.value?.hasPointerCapture(pointer)) root.value.releasePointerCapture(pointer)
  pointer = undefined
  if (!prefersReduced) {
    settle()
    return
  }
  if (frame) view?.cancelAnimationFrame(frame)
  frame = 0
  lastTime = 0
  value = { ...neutralHoloMotion }
  velocity = { ...neutralHoloMotion }
  target = neutralHoloMotion
  engaged.value = false
  settling.value = false
  paint()
})
onMounted(() => {
  view = root.value?.ownerDocument.defaultView
  mounted.value = true
})
onBeforeUnmount(() => {
  if (frame) view?.cancelAnimationFrame(frame)
})
defineExpose({ focusAt, settle })
</script>

<template>
  <div
    ref="root" class="sy-holo-card"
    :data-active="active" :data-engaged="engaged || undefined" :data-tilt-on-touch="touch || undefined"
    :data-static="!enabled || undefined" :style="style"
    @pointerenter="event => { if (event.pointerType === 'mouse') track(event) }"
    @pointermove="track" @pointerleave="leave" @pointerdown="press"
    @pointerup="release" @pointercancel="release" @lostpointercapture="release"
  >
    <div class="sy-holo-card__rotator">
      <div class="sy-holo-card__surface">
        <slot name="art"><img v-if="src" class="sy-holo-card__art" :src="src" :alt="alt" draggable="false" /></slot>
        <div v-if="textureSrc || $slots.texture" class="sy-holo-card__texture" aria-hidden="true"><slot name="texture" /></div>
        <div v-if="inset" class="sy-holo-card__inset" aria-hidden="true" />
        <div v-if="active && (shineOpacity > 0 || $slots.shine)" class="sy-holo-card__shine" aria-hidden="true"><slot name="shine" /></div>
        <div v-if="$slots.default" class="sy-holo-card__copy"><slot :engaged="engaged" :active="active" /></div>
      </div>
    </div>
  </div>
</template>
