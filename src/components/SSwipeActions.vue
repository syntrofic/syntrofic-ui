<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { createPanGesture } from '../internal/pan-gesture'
import { swipeClaim, swipeOpens } from '../internal/swipe'
import SButton from './SButton.vue'

const props = withDefaults(defineProps<{
  label?: string
  closeLabel?: string
  width?: number
  disabled?: boolean
}>(), { label: 'Show actions', closeLabel: 'Hide actions', width: 112 })
const open = defineModel<boolean>('open', { default: false })
const element = useTemplateRef<HTMLDivElement>('front')
const actions = useTemplateRef<HTMLDivElement>('actions')
const distance = ref<number>()
const width = computed(() => Number.isFinite(props.width) ? Math.max(44, props.width) : 112)
const visible = computed(() => open.value && !props.disabled)
const sign = ref(-1)
const offset = computed(() => sign.value * (distance.value ?? (visible.value ? width.value : 0)))
let origin = 0
let wheelTravel = 0
let wheelDone: ReturnType<typeof setTimeout> | undefined
const limit = (value: number) => Math.max(0, Math.min(width.value, value))

function clearWheel() {
  clearTimeout(wheelDone)
  wheelDone = undefined
}

function close() {
  if (actions.value?.contains(actions.value.ownerDocument.activeElement)) element.value?.querySelector('button')?.focus({ preventScroll: true })
  clearWheel()
  distance.value = undefined
  open.value = false
}
function updateDirection() { sign.value = element.value?.matches(':dir(rtl)') ? 1 : -1 }
function begin() {
  clearWheel()
  updateDirection()
  const node = element.value
  const rendered = node?.ownerDocument.defaultView?.getComputedStyle(node).translate
  const position = parseFloat(rendered || '')
  origin = Number.isFinite(position) ? limit(position * sign.value) : visible.value ? width.value : 0
}
function finish(current: number, velocity: number) {
  distance.value = undefined
  if (props.disabled) return
  if (swipeOpens(current, velocity, width.value)) open.value = true
  else close()
}
watch(element, (node, _, cleanup) => {
  if (!node) return
  updateDirection()
  cleanup(createPanGesture(node, {
    axis: 'horizontal', threshold: swipeClaim,
    shouldStart(event) {
      return !props.disabled && !(event.target as Element | null)?.closest?.('a[href], button, input, select, textarea, [contenteditable]')
    },
    onStart: begin,
    onMove: ({ x }) => {
      if (!props.disabled) distance.value = limit(origin + x * sign.value)
    },
    onEnd: ({ velocityX }, _, cancelled) => {
      const current = distance.value
      if (!cancelled && current !== undefined) finish(current, velocityX * sign.value)
      else distance.value = undefined
    },
  }))
}, { flush: 'post' })
watch(() => props.disabled, disabled => {
  if (!disabled) return
  clearWheel()
  distance.value = undefined
})
onBeforeUnmount(clearWheel)

function wheel(event: WheelEvent) {
  if (props.disabled || event.ctrlKey || event.deltaMode !== 0 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
  if (!wheelDone) { begin(); wheelTravel = 0 }
  const delta = -event.deltaX * sign.value
  const next = limit(origin + wheelTravel + delta)
  if (!wheelDone && Math.abs(next - origin) < 1) return
  event.preventDefault()
  wheelTravel = next - origin
  distance.value = next
  clearTimeout(wheelDone)
  wheelDone = setTimeout(() => {
    wheelDone = undefined
    finish(next, 0)
  }, 100)
}
</script>

<template>
  <div class="sy-swipe-actions" :style="{ '--sy-swipe-width': width + 'px', '--sy-swipe-offset': offset + 'px' }"
    :data-dragging="distance !== undefined || undefined" @keydown.esc.stop="close" @wheel="wheel">
    <div ref="actions" class="sy-swipe-actions__tray" :inert="!visible">
      <slot name="actions" :close="close" />
    </div>
    <div ref="front" class="sy-swipe-actions__front">
      <SButton variant="ghost" size="sm" :aria-expanded="visible" :disabled="disabled" @click="visible ? close() : (open = true)">
        {{ visible ? closeLabel : label }}
      </SButton>
      <div><slot /></div>
    </div>
  </div>
</template>
