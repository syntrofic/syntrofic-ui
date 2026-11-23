<script setup lang="ts">
import { AccessibilityState, isAndroid, type ScrollEventData, type ScrollView, type TouchGestureEventData } from '@nativescript/core'
import { computed, inject, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'nativescript-vue'
import type { NativeCollectionNavigation } from '../collection-keys'
import { useNativeUI } from '../context'
import { nativeWheelGroup } from '../wheel'
import {
  nativeWheelMetrics, nativeWheelWeight, nativeWheelWindow, nearestNativeWheelItem, stepNativeWheelItem,
  type NativeWheelMotion, type NativeWheelOption, type NativeWheelValue,
} from '../wheel-state'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeText from './SNativeText.vue'
import SNativeWheelMask from './SNativeWheelMask.vue'

const props = withDefaults(defineProps<{
  items: readonly NativeWheelOption[]
  label: string
  name?: string
  defaultValue?: NativeWheelValue
  itemHeight?: number
  visibleCount?: number
  disabled?: boolean
  motion?: NativeWheelMotion
  showIndicator?: boolean
  indicatorColor?: string
  mask?: boolean
  maskColor?: string
  maskHeight?: number
  edgeScale?: number
  edgeOpacity?: number
}>(), { showIndicator: true, edgeScale: .94, edgeOpacity: 1 })
const model = defineModel<NativeWheelValue>()
const emit = defineEmits<{
  change: [value: NativeWheelValue]
  commit: [value: NativeWheelValue]
}>()
defineSlots<{
  item(props: { item: NativeWheelOption; index: number; selected: boolean; distance: number }): unknown
  indicator(props: { height: number }): unknown
  mask(props: { height: number }): unknown
}>()
const { direction, reducedMotion, theme } = useNativeUI()
const group = inject(nativeWheelGroup, undefined)
const activity = Symbol('Wheel')
const scroll = useTemplateRef<{ nativeView: ScrollView }>('scroll')
const value = computed(() => props.name && group ? group.get(props.name) : model.value)
const metrics = computed(() => nativeWheelMetrics(group?.itemHeight() ?? props.itemHeight, group?.visibleCount() ?? props.visibleCount))
const disabled = computed(() => props.disabled || group?.disabled())
const animate = computed(() => !reducedMotion.value && props.motion !== 'none' && (group?.animate() ?? true))
const selectedIndex = computed(() => {
  const index = props.items.findIndex(item => Object.is(item.value, value.value ?? props.defaultValue))
  if (index >= 0 && !props.items[index].disabled) return index
  return nearestNativeWheelItem(props.items, Math.max(0, index))
})
const center = ref(Math.max(0, selectedIndex.value))
const selected = ref(selectedIndex.value)
const renderWindow = computed<{ first: number; end: number }>(previous => {
  const next = props.items.length <= 64 ? { first: 0, end: props.items.length }
    : nativeWheelWindow(props.items.length, center.value, metrics.value.count)
  return previous?.first === next.first && previous.end === next.end ? previous : next
})
const rows = computed(() => {
  const { first, end } = renderWindow.value
  return props.items.slice(first, end).map((item, offset) => ({ item, index: first + offset }))
})
const maskHeight = computed(() => Math.min(metrics.value.padding, Math.max(0, props.maskHeight ?? metrics.value.row * .72)))
let timer: ReturnType<typeof setTimeout> | undefined
let mode: 'external' | 'gesture' | 'target' | undefined
let target = -1
let ready = false
let initialized = false
let touching = false
let moving = false
let changed = false
let deferredSync = false
let travelDirection = 0
let lastValue: NativeWheelValue | undefined

function busy(active: boolean) {
  if (moving === active) return
  moving = active
  group?.activity(activity, active)
}

function updateSelection(index: number) {
  const item = props.items[index]
  if (!item || item.disabled) return
  selected.value = index
  if (Object.is(lastValue, item.value)) return
  lastValue = item.value
  changed = true
  if (props.name && group) group.set(props.name, item.value)
  else model.value = item.value
  emit('change', item.value)
}

function move(index: number, animated: boolean) {
  const view = scroll.value?.nativeView
  if (!view) return
  const enabled = view.isScrollEnabled
  if (!enabled) view.isScrollEnabled = true
  view.scrollToVerticalOffset(Math.max(0, index) * metrics.value.row, animated && enabled)
  if (!enabled) view.isScrollEnabled = false
}

function finish() {
  clearTimeout(timer)
  const committed = changed ? lastValue : undefined
  mode = undefined
  target = -1
  changed = false
  busy(false)
  if (committed !== undefined) emit('commit', committed)
}

function waitForRest() {
  clearTimeout(timer)
  if (!touching) timer = setTimeout(settle, 125)
}

function settle() {
  const view = scroll.value?.nativeView
  if (!view?.isLoaded || touching) return
  const index = mode === 'gesture' ? nearestNativeWheelItem(props.items, view.verticalOffset / metrics.value.row, travelDirection) : target
  if (index < 0) { finish(); return }
  if (mode === 'gesture') {
    updateSelection(index)
    mode = 'target'
    target = index
    if (Math.abs(view.verticalOffset - index * metrics.value.row) > 1) {
      move(index, animate.value)
      waitForRest()
      return
    }
  }
  // A native scroll request may be rounded to a device pixel.
  if (Math.abs(view.verticalOffset - index * metrics.value.row) > 1) move(index, false)
  center.value = index
  finish()
}

function sync() {
  const view = scroll.value?.nativeView
  if (touching) { deferredSync = true; return }
  if (!view?.isLoaded || !view.getActualSize().height) return
  const index = selectedIndex.value
  const offset = Math.max(0, index) * metrics.value.row
  if (offset > view.scrollableHeight + 1) return
  deferredSync = false
  if (!initialized && props.name && group && group.get(props.name) === undefined && index >= 0) {
    group.set(props.name, props.items[index].value, false)
  }
  initialized = true
  ready = true
  clearTimeout(timer)
  busy(false)
  changed = false
  selected.value = index
  lastValue = props.items[index]?.value
  center.value = Math.max(0, index)
  travelDirection = 0
  if (Math.abs(view.verticalOffset - offset) <= 1) { mode = undefined; return }
  mode = 'external'
  target = Math.max(0, index)
  move(index, false)
  waitForRest()
}

function initialize() {
  if (!ready) sync()
}

function scrolled(event: ScrollEventData) {
  if (!ready) return
  const position = Math.max(0, event.scrollY / metrics.value.row)
  if (mode === 'external') {
    waitForRest()
    return
  }
  const previous = center.value
  if (!mode && Math.abs(position - previous) < .035) return
  center.value = position
  if (!mode) {
    if (disabled.value) return
    mode = 'gesture'
    busy(true)
  }
  if (mode === 'gesture') {
    travelDirection = Math.sign(position - previous) || travelDirection
    updateSelection(nearestNativeWheelItem(props.items, position, travelDirection))
  }
  waitForRest()
}

function touch(event: TouchGestureEventData) {
  if (disabled.value) return
  if (event.action === 'down') {
    touching = true
    clearTimeout(timer)
    if (mode === 'external' || mode === 'target') mode = undefined
    if (isAndroid) scroll.value?.nativeView.android?.getParent()?.requestDisallowInterceptTouchEvent(true)
  } else if (event.action === 'up' || event.action === 'cancel') {
    touching = false
    if (isAndroid) scroll.value?.nativeView.android?.getParent()?.requestDisallowInterceptTouchEvent(false)
    if (deferredSync) sync()
    else if (mode || moving) waitForRest()
  }
}

function scrollToIndex(index: number, animated = true) {
  if (disabled.value || !Number.isInteger(index) || !props.items[index] || props.items[index].disabled) return false
  const hadFocus = Object.is(lastValue, props.items[index].value)
  target = index
  mode = 'target'
  if (!hadFocus) busy(true)
  updateSelection(index)
  const visualMotion = animated && animate.value
  if (!visualMotion) center.value = index
  move(index, visualMotion)
  waitForRest()
  return true
}

function scrollToValue(next: NativeWheelValue, animated = true) {
  return scrollToIndex(props.items.findIndex(item => Object.is(item.value, next)), animated)
}

function navigate(key: NativeCollectionNavigation) {
  if (key === 'next' || key === 'previous')
    return scrollToIndex(stepNativeWheelItem(props.items, selected.value, key === 'next' ? 1 : -1))
  if (key === 'first' || key === 'last')
    return scrollToIndex(nearestNativeWheelItem(props.items, key === 'first' ? 0 : props.items.length - 1))
  return false
}

function clear() {
  ready = false
  touching = false
  deferredSync = false
  clearTimeout(timer)
  mode = undefined
  busy(false)
}
onBeforeUnmount(clear)
watch(value, next => {
  if (Object.is(next, lastValue)) return
  void nextTick(sync)
})
watch([() => props.items, metrics, disabled], () => {
  ready = false
  void nextTick(initialize)
})
defineExpose({ scrollToIndex, scrollToValue })

function weight(index: number) {
  return animate.value ? nativeWheelWeight(center.value, index, metrics.value.count) : Number(index === selected.value)
}
function visual(index: number) {
  const emphasis = weight(index)
  return {
    opacity: animate.value ? props.edgeOpacity + (1 - props.edgeOpacity) * emphasis : 1,
    scale: animate.value ? props.edgeScale + (1 - props.edgeScale) * emphasis : 1,
  }
}
</script>

<template>
  <GridLayout :height="metrics.viewport" :clipToBounds="true" :flexGrow="group ? 1 : 0">
    <GridLayout v-if="!group && showIndicator" :height="metrics.row" verticalAlignment="middle"
      :isUserInteractionEnabled="false" :accessibilityHidden="true">
      <slot name="indicator" :height="metrics.row">
        <ContentView :backgroundColor="indicatorColor ?? theme.colors.accentSoft" :borderRadius="theme.geometry.radiusMd" cornerShape="squircle" />
      </slot>
    </GridLayout>
    <ScrollView ref="scroll" :height="metrics.viewport" :isScrollEnabled="!disabled" :direction="direction"
      :scrollBarIndicatorVisible="false" :accessibilityLabel="label"
      @layoutChanged="initialize" @scroll="scrolled" @touch="touch" @unloaded="clear">
      <StackLayout @layoutChanged="initialize">
        <ContentView :height="metrics.padding + renderWindow.first * metrics.row" :accessibilityHidden="true" />
        <SNativePressableFeedback v-for="{ item, index } in rows" :key="item.value"
          :label="item.label" :height="metrics.row" :minHeight="metrics.row" :minWidth="0"
          :accessibilityState="selected === index ? AccessibilityState.Selected : undefined"
          :disabled="disabled || item.disabled" :navigate="navigate" :paddingInline="4"
          fill="transparent" :pressFill="theme.colors.surfaceMuted" @tap="scrollToIndex(index)">
          <GridLayout :scaleX="visual(index).scale" :scaleY="visual(index).scale" :opacity="visual(index).opacity">
            <slot name="item" :item="item" :index="index" :selected="selected === index" :distance="Math.abs(center - index)">
              <SNativeText :text="item.label" textAlignment="center" verticalAlignment="middle"
                :emphasized="selected === index" :color="selected === index ? theme.colors.accentText : theme.colors.textMuted" />
            </slot>
          </GridLayout>
        </SNativePressableFeedback>
        <ContentView :height="metrics.padding + (items.length - renderWindow.end) * metrics.row" :accessibilityHidden="true" />
      </StackLayout>
    </ScrollView>
    <GridLayout v-if="!group && (mask || $slots.mask)" :isUserInteractionEnabled="false" :accessibilityHidden="true">
      <slot name="mask" :height="maskHeight">
        <SNativeWheelMask :size="maskHeight" :color="maskColor ?? theme.colors.canvas" />
      </slot>
    </GridLayout>
  </GridLayout>
</template>
