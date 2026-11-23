<script setup lang="ts">
import { AccessibilityRole, Utils, isAndroid, type Button, type GridLayout, type TouchGestureEventData } from '@nativescript/core'
import { computed, nextTick, onBeforeUnmount, useTemplateRef, watch } from 'nativescript-vue'
import { useActionMeter } from '../action-motion'
import { useNativeUI } from '../context'
import { nativeFlipFrame, nativeFlipSwipe } from '../display-state'
import { lockGestureScroll } from '../scroll-gesture'
import SNativeButton from './SNativeButton.vue'

const props = withDefaults(defineProps<{
  height?: number
  axis?: 'horizontal' | 'vertical'
  flipLabel?: string
  frontLabel?: string
  backLabel?: string
  trigger?: 'button' | 'surface' | 'manual'
  swipe?: boolean
  swipeArea?: number
  disabled?: boolean
  animated?: boolean
}>(), {
  height: 146, axis: 'horizontal', swipeArea: 48, flipLabel: 'Flip card', trigger: 'button', animated: true,
})
const flipped = defineModel<boolean>({ default: false })
const emit = defineEmits<{ flip: [flipped: boolean] }>()
defineSlots<{
  front(): unknown
  back(): unknown
  trigger(props: { flipped: boolean; disabled: boolean; toggle: () => void }): unknown
}>()
const { direction } = useNativeUI()
const horizontal = computed(() => props.axis === 'horizontal')
const progress = useActionMeter(computed(() => Number(flipped.value)), computed(() => !props.animated))
const frame = computed(() => nativeFlipFrame(progress.value, horizontal.value && direction.value === 'rtl'))
const rotationX = computed(() => horizontal.value ? 0 : frame.value.angle)
const rotationY = computed(() => horizontal.value ? frame.value.angle : 0)
const swipeHeight = computed(() => Math.min(props.height, Math.max(24, props.swipeArea)))
const perspective = computed(() => Math.max(480, props.height * 4))
const visibleLabel = computed(() => frame.value.back ? props.backLabel : props.frontLabel)
const frontFace = useTemplateRef<{ nativeView: GridLayout }>('frontFace')
const backFace = useTemplateRef<{ nativeView: GridLayout }>('backFace')
const flipButton = useTemplateRef<InstanceType<typeof SNativeButton>>('flipButton')
const surfaceButton = useTemplateRef<{ nativeView: Button }>('surfaceButton')
const ready = computed(() => progress.value === 0 || progress.value === 1)

function set(next: boolean) {
  if (props.disabled || flipped.value === next) return
  flipped.value = next
  emit('flip', next)
}
function toggle() { set(!flipped.value) }
let origin: { x: number; y: number } | undefined
let releaseScroll: (() => void) | undefined
let lastSwipe = 0
function release() {
  origin = undefined
  releaseScroll?.()
  releaseScroll = undefined
}
function point(event: TouchGestureEventData) {
  if (isAndroid) return {
    x: Utils.layout.toDeviceIndependentPixels(event.android.getRawX()),
    y: Utils.layout.toDeviceIndependentPixels(event.android.getRawY()),
  }
  const location = event.ios?.touches?.anyObject()?.locationInView(null) as { x: number; y: number } | undefined
  return location ?? { x: event.getX(), y: event.getY() }
}
function touch(event: TouchGestureEventData) {
  if (!props.swipe || props.disabled || event.action === 'cancel' || event.getPointerCount() > 1) { release(); return }
  const current = point(event)
  if (event.action === 'down') {
    release()
    origin = current
    return
  }
  if (!origin) return
  const dx = current.x - origin.x
  const dy = current.y - origin.y
  if (event.action === 'move' && !releaseScroll) {
    const along = Math.abs(horizontal.value ? dx : dy)
    const across = Math.abs(horizontal.value ? dy : dx)
    if (along >= 10 && along > across * 1.25) releaseScroll = lockGestureScroll(event)
  } else if (event.action === 'up') {
    const next = nativeFlipSwipe(dx, dy, horizontal.value, direction.value === 'rtl')
    release()
    if (next !== undefined) {
      lastSwipe = Date.now()
      set(next)
    }
  }
}
onBeforeUnmount(release)
watch(() => frame.value.back, next => {
  if (!isAndroid) return
  const leaving = next ? frontFace.value : backFace.value
  if (leaving?.nativeView.android?.findFocus()) {
    void nextTick(() => flipButton.value?.focus() || surfaceButton.value?.nativeView.focus())
  }
})
defineExpose({ front: () => set(false), back: () => set(true), toggle })
</script>

<template>
  <StackLayout>
    <GridLayout :height="height" :clipToBounds="true" @unloaded="release">
      <GridLayout ref="frontFace" :rotateX="rotationX" :rotateY="rotationY" :perspective="perspective"
        :visibility="frame.back ? 'hidden' : 'visible'" :accessibilityHidden="frame.back"
        :isUserInteractionEnabled="!frame.back && ready">
        <slot name="front" />
      </GridLayout>
      <GridLayout ref="backFace" :rotateX="rotationX" :rotateY="rotationY" :perspective="perspective"
        :visibility="frame.back ? 'visible' : 'hidden'" :accessibilityHidden="!frame.back"
        :isUserInteractionEnabled="frame.back && ready">
        <slot name="back" />
      </GridLayout>
      <ContentView v-if="swipe && (trigger !== 'surface' || $slots.trigger)" :height="swipeHeight" verticalAlignment="top"
        :accessibilityHidden="true" :isUserInteractionEnabled="!disabled && ready" backgroundColor="transparent" @touch="touch" />
      <Button v-if="trigger === 'surface' && !$slots.trigger" ref="surfaceButton" :text="flipLabel" :accessibilityLabel="flipLabel"
        :accessibilityRole="AccessibilityRole.Button" :accessibilityValue="visibleLabel" :isEnabled="!disabled"
        color="transparent" backgroundColor="transparent" margin="0" padding="0" androidElevation="0"
        androidDynamicElevationOffset="0" borderWidth="0" @touch="touch" @tap="Date.now() - lastSwipe > 300 && toggle()" />
    </GridLayout>
    <slot name="trigger" :flipped="flipped" :disabled="disabled" :toggle="toggle">
      <SNativeButton v-if="trigger === 'button'" ref="flipButton" :label="flipLabel" :accessibilityValue="visibleLabel"
        :disabled="disabled" :pressed="flipped" variant="ghost" size="sm" marginTop="5" @tap="toggle" />
    </slot>
  </StackLayout>
</template>
