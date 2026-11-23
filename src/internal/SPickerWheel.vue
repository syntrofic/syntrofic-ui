<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { prefersReducedMotion, themeTempo } from './motion'
import { pickerMotion, rubberBandClamp, solveDecay, solveSpring } from './motion-physics'
import { createPanGesture } from './pan-gesture'
import { playHaptic } from './haptics'

const props = defineProps<{
  label: string
  options: readonly { id: string; label: string; disabled?: boolean }[]
  modelValue?: string
  haptics?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; 'motion': [moving: boolean] }>()
const root = useTemplateRef('root')
const id = useId()
const row = pickerMotion.rowHeight
const selected = computed(() => props.options.findIndex(option => option.id === props.modelValue))
const position = shallowRef(0)
const active = shallowRef(false)
const center = computed(() => Math.round(position.value / row))
const rendered = computed(() => props.options.slice(Math.max(0, center.value - 4), center.value + 5)
  .map((option, offset) => ({ option, index: Math.max(0, center.value - 4) + offset })))
let frame = 0
let frameView: Window | null | undefined
let hapticTravel = false
let blockClick = false
let clickTimer: ReturnType<typeof setTimeout> | undefined

function stop() {
  frameView?.cancelAnimationFrame(frame)
  frame = 0
  active.value = false
  hapticTravel = false
}
function nearest(to: number, direction = 0) {
  let chosen = -1
  let best = Infinity
  for (const [index, option] of props.options.entries()) {
    if (option.disabled) continue
    const distance = Math.abs(index - to)
    if (distance < best || distance === best && direction > 0) { chosen = index; best = distance }
  }
  return chosen
}
function spin(index: number, velocity = 0, release = false) {
  const node = root.value
  const target = props.options[index]
  const view = node?.ownerDocument.defaultView
  if (!node || !view || !target || target.disabled) return
  const tactile = release && hapticTravel
  stop()
  const from = position.value
  const to = index * row
  const distance = to - from
  function land() {
    stop()
    position.value = to
    if (target.id !== props.modelValue) emit('update:modelValue', target.id)
  }
  if (Math.abs(distance) < .5 || prefersReducedMotion(node)) { land(); return }
  const tempo = themeTempo(node)
  const spring = solveSpring({ from, to, velocity: release ? velocity * 1000 : 0, spring: pickerMotion.edgeSpring })
  const outside = from < 0 || from > (props.options.length - 1) * row
  const coastRate = Math.abs(velocity) >= pickerMotion.minimumSpeed && Math.sign(velocity) === Math.sign(distance)
    ? Math.abs(velocity / distance) * 1000 : pickerMotion.snapRate
  const coastTime = Math.min(1.1, Math.log(Math.abs(distance) * 2) / coastRate)
  const seconds = (release ? outside ? Math.min(1.1, spring.settleTime(.5)) : coastTime : pickerMotion.tapDurationMs / 1000) * tempo
  const started = view.performance.now()
  frameView = view
  active.value = true
  hapticTravel = tactile
  function advance(now: number) {
    const elapsed = (now - started) / 1000
    if (elapsed >= seconds) { land(); return }
    const p = elapsed / seconds
    position.value = release ? outside ? spring.value(elapsed / tempo) : to - distance * Math.exp(-coastRate * elapsed / tempo)
      : from + distance * p ** 2 * (3 - 2 * p)
    frame = view!.requestAnimationFrame(advance)
  }
  frame = view.requestAnimationFrame(advance)
}
function step(direction: number) {
  const current = Math.max(-1, Math.min(props.options.length, center.value))
  for (let next = current + direction; next >= 0 && next < props.options.length; next += direction) {
    if (!props.options[next].disabled) { spin(next); return }
  }
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') step(event.key === 'ArrowDown' ? 1 : -1)
  else if (event.key === 'Home' || event.key === 'End') spin(nearest(event.key === 'Home' ? 0 : props.options.length - 1))
  else return
  event.preventDefault()
}
function onWheel(event: WheelEvent) {
  if (event.deltaY) step(Math.sign(event.deltaY))
}
function click(index: number) {
  if (!blockClick) spin(index)
}
watch([selected, () => props.options], () => {
  stop()
  position.value = Math.max(0, selected.value) * row
}, { immediate: true })
watch(active, moving => emit('motion', moving))
watch(center, (next, previous) => {
  const node = root.value
  if (node && props.haptics && hapticTravel && next !== previous && props.options[next] && !props.options[next].disabled) {
    playHaptic('selection', node)
  }
}, { flush: 'sync' })
watch(root, (node, _, cleanup) => {
  if (!node) return
  let from = 0
  const detach = createPanGesture(node, {
    axis: 'vertical', threshold: 5, shouldStart: () => selected.value >= 0,
    onStart(_, event) { stop(); from = position.value; active.value = true; hapticTravel = event.pointerType === 'touch' },
    onMove({ y }) {
      position.value = rubberBandClamp(from - y, 0, Math.max(0, props.options.length - 1) * row, pickerMotion.rubberBandDimension)
    },
    onEnd({ velocityY }, _, cancelled) {
      if (cancelled) hapticTravel = false
      const velocity = cancelled ? 0 : -velocityY
      const offset = position.value
      const projected = Math.abs(velocity) < pickerMotion.minimumSpeed ? offset : solveDecay({ from: offset, velocity: velocity * 1000 }).rest
      const target = cancelled ? selected.value : nearest(projected / row, velocity)
      spin(target, velocity, true)
      blockClick = true
      clearTimeout(clickTimer)
      clickTimer = setTimeout(() => { blockClick = false }, 40)
    },
  })
  cleanup(() => { detach(); clearTimeout(clickTimer); stop() })
}, { flush: 'post' })
</script>

<template>
  <div ref="root" class="sy-picker-wheel" role="listbox" tabindex="0" :aria-label="label"
    :data-spinning="active || undefined" :aria-activedescendant="selected >= 0 ? id + '-' + selected : undefined"
    :style="{ '--sy-wheel-row': row + 'px', '--sy-wheel-height': pickerMotion.height + 'px' }" @keydown="onKey" @wheel.prevent="onWheel">
    <div v-for="{ option, index } in rendered" :id="id + '-' + index" :key="option.id" class="sy-picker-wheel__option" role="option"
      :aria-posinset="index + 1" :aria-setsize="options.length" :aria-disabled="option.disabled || undefined"
      :aria-selected="index === selected" :style="{ '--sy-wheel-offset': (index * row - position) + 'px' }" @click="click(index)">
      {{ option.label }}
    </div>
    <div v-if="selected >= 0 && !rendered.some(entry => entry.index === selected)" :id="id + '-' + selected" class="sy-visually-hidden"
      role="option" aria-selected="true" :aria-posinset="selected + 1" :aria-setsize="options.length">{{ options[selected].label }}</div>
  </div>
</template>
