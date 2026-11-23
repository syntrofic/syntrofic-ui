<script setup lang="ts">
import { AccessibilityRole, isAndroid, Utils, type GridLayout, type TouchGestureEventData } from '@nativescript/core'
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'nativescript-vue'
import { useActionMeter } from '../action-motion'
import type { NativeCollectionNavigation } from '../collection-keys'
import { useNativeUI } from '../context'
import { nativeSplitBounds, nativeSplitPoints, nearestNativeSplitPoint } from '../navigation-state'
import { lockGestureScroll } from '../scroll-gesture'
import SNativePressableFeedback from './SNativePressableFeedback.vue'

const props = withDefaults(defineProps<{
  height?: number
  orientation?: 'vertical' | 'horizontal'
  snapPoints?: readonly number[]
  defaultSnapIndex?: number
  minFirst?: number
  minSecond?: number
  dividerSize?: number
  label?: string
  disabled?: boolean
  animated?: boolean
  startAnimated?: boolean
}>(), {
  height: 420, orientation: 'vertical', snapPoints: () => [.27, .5, .73], defaultSnapIndex: 1,
  minFirst: 70, minSecond: 70, dividerSize: 44, label: 'Resize sections', animated: true,
})
const model = defineModel<number>('snapIndex')
const emit = defineEmits<{ snap: [index: number]; resize: [size: number]; drag: [active: boolean] }>()
defineSlots<{
  first(props: { size: number; ratio: number; dragging: boolean }): unknown
  second(props: { size: number; ratio: number; dragging: boolean }): unknown
  handle(props: { dragging: boolean; ratio: number }): unknown
}>()
const { theme, direction } = useNativeUI()
const host = useTemplateRef<{ nativeView: GridLayout }>('host')
const vertical = computed(() => props.orientation === 'vertical')
const reverse = computed(() => !vertical.value && direction.value === 'rtl')
const extent = ref(vertical.value ? props.height : 0)
const ready = ref(false)
const dragging = ref(false)
const extentModel = computed(() => nativeSplitBounds(extent.value, props.dividerSize, props.minFirst, props.minSecond))
const points = computed(() => nativeSplitPoints(props.snapPoints.length ? props.snapPoints : [.5], extent.value, props.dividerSize, props.minFirst, props.minSecond))
const safe = (index: number) => Math.min(points.value.length - 1, Math.max(0, Number.isFinite(index) ? Math.floor(index) : 0))
const selected = computed(() => safe(model.value ?? props.defaultSnapIndex))
const point = ref(props.startAnimated ? extentModel.value.min : points.value[selected.value] ?? 0)
const direct = computed(() => dragging.value || !props.animated || (!ready.value && !props.startAnimated))
const display = useActionMeter(point, direct)
const first = computed(() => Math.round(display.value * 10) / 10)
const second = computed(() => Math.max(0, extentModel.value.space - first.value))
const ratio = computed(() => first.value / (extentModel.value.space || 1))
const tracks = computed(() => reverse.value ? `*,${props.dividerSize},${first.value}` : `${first.value},${props.dividerSize},*`)
let origin: { coordinate: number; size: number; last: number; time: number; velocity: number; moved: boolean } | undefined
let unlock: (() => void) | undefined
let suppress = 0

function size() {
  const box = host.value?.nativeView.getActualSize()
  const next = vertical.value ? box?.height : box?.width
  if (!next || Math.abs(next - extent.value) < .5 && ready.value) return
  extent.value = next
  point.value = points.value[selected.value] ?? 0
  ready.value = true
}
function snapTo(index: number) {
  if (!Number.isFinite(index)) return false
  const next = safe(index)
  point.value = points.value[next] ?? 0
  if (next !== selected.value) {
    model.value = next
    emit('snap', next)
  }
  return true
}
function pointer(event: TouchGestureEventData) {
  if (isAndroid) return Utils.layout.toDeviceIndependentPixels(vertical.value ? event.android.getRawY() : event.android.getRawX())
  const screen = event.ios?.touches?.anyObject()?.locationInView(null) as { x: number; y: number } | undefined
  return screen ? screen[vertical.value ? 'y' : 'x'] : vertical.value ? event.getY() : event.getX()
}
function release() {
  if (dragging.value) emit('drag', false)
  dragging.value = false
  origin = undefined
  unlock?.()
  unlock = undefined
}
function touch(event: TouchGestureEventData) {
  if (props.disabled) return
  if (event.action === 'down') {
    release()
    const coordinate = pointer(event)
    origin = { coordinate, last: coordinate, size: first.value, time: Date.now(), velocity: 0, moved: false }
    unlock = lockGestureScroll(event)
    return
  }
  if (!origin) return
  if (event.action === 'move' || event.action === 'up') {
    const coordinate = pointer(event)
    const delta = (coordinate - origin.coordinate) * (reverse.value ? -1 : 1)
    const now = Date.now()
    if (Math.abs(coordinate - origin.last) > .3) {
      origin.velocity = (coordinate - origin.last) * (reverse.value ? -1 : 1) / Math.max(1, now - origin.time)
      origin.last = coordinate
      origin.time = now
    }
    if (!origin.moved && Math.abs(delta) >= 5) {
      origin.moved = true
      dragging.value = true
      emit('drag', true)
    }
    if (origin.moved) {
      const { min, max } = extentModel.value
      point.value = Math.min(max, Math.max(min, origin.size + delta))
    }
    if (event.action === 'up') {
      const moved = origin.moved
      const velocity = now - origin.time > 100 ? 0 : origin.velocity
      const nearest = nearestNativeSplitPoint(points.value, point.value, velocity)
      release()
      if (moved && nearest >= 0) {
        suppress = Date.now() + 350
        snapTo(nearest)
      }
    }
  } else if (event.action === 'cancel') {
    release()
    snapTo(selected.value)
  }
}
function navigate(key: NativeCollectionNavigation) {
  if (props.disabled) return false
  if (key === 'first') return snapTo(0)
  if (key === 'last') return snapTo(points.value.length - 1)
  if (vertical.value && (key === 'next' || key === 'previous')) return snapTo(selected.value + (key === 'next' ? 1 : -1))
  if (!vertical.value && (key === 'left' || key === 'right')) return snapTo(selected.value + ((key === 'right') !== reverse.value ? 1 : -1))
  return false
}
function tap() {
  if (!props.disabled && Date.now() >= suppress) snapTo((selected.value + 1) % points.value.length)
}
watch([selected, points], () => { if (!origin) point.value = points.value[selected.value] ?? 0 })
watch(first, next => emit('resize', next))
watch(() => props.disabled, blocked => { if (blocked) { release(); snapTo(selected.value) } })
watch(vertical, size)
onBeforeUnmount(release)
defineExpose({ snapTo })
</script>

<template>
  <GridLayout ref="host" :height="height" :rows="vertical ? tracks : '*'" :columns="vertical ? '*' : tracks" direction="ltr" @layoutChanged="size">
    <GridLayout :row="0" :col="reverse ? 2 : 0" :clipToBounds="true" :accessibilityHidden="first <= 0"
      :isUserInteractionEnabled="first > 0" :direction="direction">
      <slot name="first" :size="first" :ratio="ratio" :dragging="dragging" />
    </GridLayout>
    <SNativePressableFeedback :row="vertical ? 1 : 0" :col="vertical ? 0 : 1" :label="label"
      :role="AccessibilityRole.Adjustable" :accessibilityValue="`${Math.round(ratio * 100)}%`" :disabled="disabled"
      :minHeight="vertical ? dividerSize : 44" :minWidth="vertical ? 44 : dividerSize"
      :paddingInline="0" fill="transparent" :pressFill="theme.colors.surfaceMuted" :navigate="navigate"
      @native-touch="touch" @tap="tap" @unloaded="release">
      <GridLayout verticalAlignment="middle" horizontalAlignment="center">
        <slot name="handle" :dragging="dragging" :ratio="ratio">
          <ContentView :width="vertical ? 34 : 4" :height="vertical ? 4 : 34" :borderRadius="3"
            :backgroundColor="dragging ? theme.colors.accent : theme.colors.borderStrong" />
        </slot>
      </GridLayout>
    </SNativePressableFeedback>
    <GridLayout :row="vertical ? 2 : 0" :col="vertical || reverse ? 0 : 2" :clipToBounds="true"
      :accessibilityHidden="second <= 0" :isUserInteractionEnabled="second > 0" :direction="direction">
      <slot name="second" :size="second" :ratio="1 - ratio" :dragging="dragging" />
    </GridLayout>
  </GridLayout>
</template>
