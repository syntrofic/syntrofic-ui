<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import SButton from '../components/SButton.vue'
import SIcon from '../components/SIcon.vue'
import { prefersReducedMotion } from './motion'
import { rubberBandClamp } from './motion-physics'
import { createPanGesture } from './pan-gesture'
import { readSwipe, swipeClaim, swipeConfirmation, swipeOpens, type ItemSwipe, type SwipeAction, type SwipeSide } from './swipe'

const props = withDefaults(defineProps<{ swipe: ItemSwipe; itemKey?: string | number; disabled?: boolean; as?: 'div' | 'li' }>(), { as: 'div' })
const frame = useTemplateRef<HTMLElement>('frame')
const front = useTemplateRef<HTMLDivElement>('front')
const sides = ['leading', 'trailing'] as const
const spec = computed(() => readSwipe(props.swipe))
const open = ref<SwipeSide>()
const offset = ref<number>()
const departing = ref<number>()
const confirmed = ref(false)
const direction = ref(1)
const actionSize = ref(68)
const paint = computed(() => (departing.value ?? offset.value ?? (open.value ? sign(open.value) * length(open.value) : 0)) * direction.value)
const visible = computed(() => departing.value !== undefined ? sideFor(departing.value) : offset.value !== undefined ? sideFor(offset.value) : open.value)
let origin = 0
let wheelEnd: ReturnType<typeof setTimeout> | undefined
let commit: ReturnType<typeof setTimeout> | undefined
let suppressClick = false
function sign(side: SwipeSide) { return side === 'leading' ? 1 : -1 }
function sideFor(distance: number): SwipeSide { return distance >= 0 ? 'leading' : 'trailing' }
function length(side: SwipeSide) { return spec.value[side].length * actionSize.value }
function close() {
  if (frame.value?.ownerDocument.activeElement?.closest('.sy-item-swipe__actions') && frame.value.contains(frame.value.ownerDocument.activeElement)) {
    front.value?.querySelector<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]')?.focus({ preventScroll: true })
  }
  open.value = undefined
  offset.value = undefined
  confirmed.value = false
}
function cancelCommit() {
  clearTimeout(commit)
  commit = undefined
  departing.value = undefined
}
function reset() {
  close()
  cancelCommit()
  clearTimeout(wheelEnd)
  wheelEnd = undefined
}
watch(() => JSON.stringify([props.itemKey, spec.value.swipeBehavior, ...sides.map(side => spec.value[side].map(action => action.id))]), reset)
watch(() => props.disabled, blocked => { if (blocked) reset() })
onBeforeUnmount(() => { clearTimeout(wheelEnd); clearTimeout(commit) })

function begin() {
  const root = frame.value
  if (!root) return
  direction.value = root.matches(':dir(rtl)') ? -1 : 1
  const actionCount = Math.max(1, ...sides.map(side => spec.value[side].length))
  actionSize.value = Math.max(44, Math.min(68, root.clientWidth / actionCount))
  const painted = front.value && root.ownerDocument.defaultView?.getComputedStyle(front.value).translate
  const position = parseFloat(painted || '')
  origin = Number.isFinite(position) ? position * direction.value : open.value ? sign(open.value) * length(open.value) : 0
}
function fullSwipe(side: SwipeSide, distance: number) {
  const width = length(side)
  const list = spec.value[side]
  const action = list.at(-1)
  const allowed = list.length === 1 || spec.value.swipeBehavior !== 'commit' && open.value === side
  const { destination, threshold } = swipeConfirmation(frame.value?.clientWidth ?? 180, width)
  return action && allowed && !action.disabled && Math.abs(distance) >= threshold ? { action, destination } : undefined
}
function move(distance: number) {
  const at = origin + distance
  const side = sideFor(at)
  const confirmation = fullSwipe(side, at)
  confirmed.value = Boolean(confirmation)
  if (!length(side)) { offset.value = 0; return }
  if (confirmation) { offset.value = sign(side) * confirmation.destination; return }
  offset.value = sign(side) * rubberBandClamp(Math.abs(at), 0, length(side), Math.max(40, (frame.value?.clientWidth ?? 180) * .6))
}
function fire(side: SwipeSide, action?: SwipeAction, slide = false) {
  if (!action || action.disabled || props.disabled || departing.value !== undefined) return
  const leave = slide || action.remove
  const invoke = () => {
    commit = undefined
    action.onActivate({ id: action.id, itemKey: props.itemKey })
    if (!action.remove) departing.value = undefined
  }
  if (leave) {
    departing.value = sign(side) * (frame.value?.clientWidth ?? 180)
    commit = setTimeout(invoke, frame.value && prefersReducedMotion(frame.value) ? 0 : 180)
  }
  close()
  if (!leave) invoke()
}
function finish(distance: number, velocity: number, cancelled = false) {
  offset.value = undefined
  confirmed.value = false
  if (cancelled || props.disabled) return
  const total = origin + distance
  const side = sideFor(total)
  const width = length(side)
  if (!width) { close(); return }
  const commitOnly = spec.value.swipeBehavior === 'commit'
  const confirmation = fullSwipe(side, total)
  if (confirmation) {
    fire(side, confirmation.action, commitOnly)
    return
  }
  if (commitOnly || !swipeOpens(Math.abs(total), velocity * sign(side), width)) close()
  else open.value = side
}

watch(front, (node, _, cleanup) => {
  if (!node) return
  cleanup(createPanGesture(node, {
    axis: 'horizontal', threshold: swipeClaim,
    shouldStart(event) {
      suppressClick = false
      const interactive = (event.target as Element | null)?.closest?.('a[href], button, input, select, textarea, [contenteditable]')
      return !props.disabled && departing.value === undefined && event.pointerType !== 'mouse' && !interactive
    },
    onStart: begin,
    onMove({ x }) { move(x * direction.value) },
    onEnd({ x, velocityX }, _, cancelled) {
      suppressClick = !cancelled
      finish(x * direction.value, velocityX * direction.value, cancelled)
    },
  }))
}, { flush: 'post' })
function wheel(event: WheelEvent) {
  if (props.disabled || departing.value !== undefined || event.ctrlKey || event.deltaMode !== 0 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
  if (!wheelEnd) { begin(); wheelDistance = 0 }
  wheelDistance -= event.deltaX * direction.value
  if (!length(sideFor(origin + wheelDistance))) return
  event.preventDefault()
  move(wheelDistance)
  clearTimeout(wheelEnd)
  wheelEnd = setTimeout(() => {
    wheelEnd = undefined
    finish(wheelDistance, 0)
  }, 100)
}
let wheelDistance = 0
function click(event: MouseEvent) {
  if (!suppressClick || !event.isTrusted || event.detail <= 0) return
  suppressClick = false
  event.preventDefault()
  event.stopPropagation()
}
</script>

<template>
  <component :is="as" ref="frame" :role="as === 'li' ? 'listitem' : undefined" class="sy-item-swipe" :style="{ '--sy-item-swipe-offset': paint + 'px', '--sy-item-swipe-size': actionSize + 'px' }"
    :data-dragging="offset !== undefined || undefined" :data-open="open" :data-departing="departing !== undefined || undefined" :data-confirmed="confirmed || undefined"
    @keydown.esc="close" @wheel="wheel">
    <div v-for="side in sides" :key="side" class="sy-item-swipe__actions" :data-side="side"
      :data-visible="visible === side || undefined" :data-variant="spec[side].at(-1)?.variant" :inert="open !== side || spec.swipeBehavior === 'commit'">
      <SButton v-for="action in spec[side]" :key="action.id" size="sm" :variant="action.variant ?? 'primary'"
        :aria-label="action.label" :disabled="disabled || action.disabled" @click="fire(side, action)">
        <SIcon v-if="action.icon" :icon="action.icon" size="sm" />
        {{ action.label }}
      </SButton>
    </div>
    <div ref="front" class="sy-item-swipe__front" @click.capture="click"><slot /></div>
  </component>
</template>
