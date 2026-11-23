<script setup lang="ts">
import { type ScrollEventData, type GridLayout, type ScrollView, type TouchGestureEventData } from '@nativescript/core'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'nativescript-vue'
import {
  nativeCarouselLayout, nativeCarouselOffset, nativeCarouselProgress, nativeCarouselVisible, type NativeCarouselLayoutOptions,
} from '../carousel-state'
import { type NativeCollectionKey } from '../collection-state'
import { useNativeUI } from '../context'
import { nativePagerOffset, nativePagerPosition, nearestNativePage } from '../navigation-state'
import type { NativeTabItem } from '../navigation'
import { lockGestureScroll } from '../scroll-gesture'

const props = withDefaults(defineProps<{
  items: readonly NativeTabItem[]
  selected?: NativeCollectionKey
  height?: number
  layoutOptions?: NativeCarouselLayoutOptions
  disabled?: boolean
  swipeEnabled?: boolean
  animated?: boolean
  lazy?: boolean
  keepAlive?: boolean
}>(), { height: 220, swipeEnabled: true, animated: true, lazy: true, keepAlive: true })
const emit = defineEmits<{ progress: [position: number]; change: [key: NativeCollectionKey]; settled: []; interaction: [] }>()
defineSlots<{ default(props: { item: NativeTabItem; selected: boolean }): unknown; placeholder(props: { item: NativeTabItem }): unknown }>()
const { direction, reducedMotion } = useNativeUI()
const frame = useTemplateRef<{ nativeView: GridLayout }>('frame')
const viewport = useTemplateRef<{ nativeView: ScrollView }>('viewport')
const width = ref(0)
const ready = ref(false)
const logicalOffset = ref(0)
const carousel = computed(() => props.layoutOptions && nativeCarouselLayout(width.value, props.items.length, props.layoutOptions))
const itemWidth = computed(() => carousel.value?.item ?? width.value)
const stackWidth = computed(() => carousel.value?.content ?? width.value * Math.max(1, props.items.length))
const visited = shallowRef(new Set<NativeCollectionKey>())
const rtl = computed(() => direction.value === 'rtl')
const physicalItems = computed(() => rtl.value ? [...props.items].reverse() : props.items)
const positions = computed(() => new Map(props.items.map((item, index) => [item.id, index])))
const swipe = computed(() => props.swipeEnabled && !props.disabled)
const allowAnimation = computed(() => props.animated && !reducedMotion.value)
const index = computed(() => {
  const match = props.items.findIndex(item => !item.disabled && Object.is(item.id, props.selected))
  return match < 0 ? nearestNativePage(props.items, 0) : match
})
const position = ref(Math.max(0, index.value))
let target: { index: number; user: boolean } | undefined
let resting: ReturnType<typeof setTimeout> | undefined
let touchStart: { x: number; y: number } | undefined
let unlock: (() => void) | undefined
let previousIndex = index.value
let restoring = false
let travel = 0

function show(index: number) {
  const id = props.items[index]?.id
  if (id === undefined || visited.value.has(id)) return
  visited.value = new Set([...visited.value, id])
}
function publish(next: number) {
  if (position.value !== next) {
    travel = Math.sign(next - position.value)
    position.value = next
  }
  emit('progress', next)
  if (props.lazy && props.keepAlive) {
    show(Math.floor(next))
    show(Math.ceil(next))
  }
}
function pointOf(physical: number) {
  const geometry = carousel.value
  if (!geometry) return nativePagerPosition(physical, width.value, props.items.length, rtl.value)
  const point = nativeCarouselOffset(physical, geometry.max, rtl.value)
  return nativeCarouselProgress(geometry.snap, point, target?.index ?? previousIndex)
}
function offsetOf(next: number) {
  const geometry = carousel.value
  return geometry ? nativeCarouselOffset(geometry.snap[next] ?? 0, geometry.max, rtl.value)
    : nativePagerOffset(next, width.value, props.items.length, rtl.value)
}
function updateOffset(physical: number) {
  const geometry = carousel.value
  if (geometry) logicalOffset.value = nativeCarouselOffset(physical, geometry.max, rtl.value)
}
function move(next: number, smooth: boolean) {
  const view = viewport.value?.nativeView
  if (!view) return
  const enabled = view.isScrollEnabled
  if (!enabled) view.isScrollEnabled = true
  const x = offsetOf(next)
  view.scrollToHorizontalOffset(x, smooth)
  if (!smooth) updateOffset(x)
  if (!enabled) view.isScrollEnabled = false
}
function afterIdle() {
  clearTimeout(resting)
  if (!touchStart) resting = setTimeout(settle, 125)
}
function goTo(key: NativeCollectionKey, animated = true) {
  const next = props.items.findIndex(item => Object.is(item.id, key) && !item.disabled)
  if (next < 0) return
  show(next)
  target = { index: next, user: false }
  previousIndex = next
  if (!ready.value) {
    publish(next)
    return
  }
  if (!animated || !allowAnimation.value) {
    publish(next)
    move(next, false)
  } else move(next, true)
  afterIdle()
}
function settle() {
  const view = viewport.value?.nativeView
  if (!view || touchStart || !ready.value) return
  const point = pointOf(view.horizontalOffset)
  const next = target?.index ?? nearestNativePage(props.items, point, travel)
  if (next < 0) return
  const user = target?.user ?? true
  const finalOffset = offsetOf(next)
  if (Math.abs(view.horizontalOffset - finalOffset) > 1 && !target) {
    target = { index: next, user }
    move(next, allowAnimation.value)
    afterIdle()
    return
  }
  target = undefined
  const item = props.items[next]
  if (Math.abs(view.horizontalOffset - finalOffset) > 1) move(next, false)
  publish(next)
  show(next)
  if (user && item && index.value !== next) emit('change', item.id)
  previousIndex = next
  emit('settled')
}
async function layout() {
  const view = viewport.value?.nativeView
  const measured = frame.value?.nativeView.getActualSize()?.width || view?.getActualSize()?.width
  if (!view || !measured || measured === width.value && ready.value || restoring) return
  restoring = true
  ready.value = false
  width.value = measured
  clearTimeout(resting)
  await nextTick()
  view.content?.requestLayout()
  view.requestLayout()
  const next = Math.max(0, index.value)
  target = { index: next, user: false }
  move(next, false)
  publish(next)
  ready.value = true
  restoring = false
  afterIdle()
}
function scroll(event: ScrollEventData) {
  if (!ready.value) return
  updateOffset(event.scrollX)
  publish(pointOf(event.scrollX))
  afterIdle()
}
function release() {
  touchStart = undefined
  unlock?.()
  unlock = undefined
}
function touch(event: TouchGestureEventData) {
  if (!swipe.value) return
  if (event.action === 'down') {
    release()
    touchStart = { x: event.getX(), y: event.getY() }
    clearTimeout(resting)
    target = undefined
    emit('interaction')
    show(Math.max(0, previousIndex - 1))
    show(Math.min(props.items.length - 1, previousIndex + 1))
  } else if (event.action === 'move' && touchStart && !unlock) {
    const dx = Math.abs(event.getX() - touchStart.x)
    const dy = Math.abs(event.getY() - touchStart.y)
    if (dx > 8 && dx > dy * 1.15) unlock = lockGestureScroll(event)
  } else if (event.action === 'up' || event.action === 'cancel') {
    release()
    afterIdle()
  }
}
function shown(item: NativeTabItem) { return Object.is(props.items[index.value]?.id, item.id) }
function visibleFraction(offset: number) {
  const geometry = carousel.value
  return geometry ? nativeCarouselVisible(geometry.padding + offset * geometry.pitch, geometry.item, logicalOffset.value, width.value) : 0
}
function accessible(item: NativeTabItem) {
  return shown(item) || !item.disabled && visibleFraction(positions.value.get(item.id) ?? 0) >= .92
}
function render(item: NativeTabItem, offset: number) {
  return !props.lazy || shown(item) || props.keepAlive && visited.value.has(item.id) ||
    Math.abs(offset - position.value) <= .95 || visibleFraction(offset) > 0
}
function reset() {
  release()
  clearTimeout(resting)
  ready.value = false
}
watch(index, next => {
  if (next < 0) return
  show(next)
  if (previousIndex === next) return
  goTo(props.items[next].id)
}, { immediate: true })
watch([rtl, () => props.items, () => props.layoutOptions, swipe], () => {
  ready.value = false
  void nextTick(layout)
})
watch(reducedMotion, disabled => {
  if (disabled && target && props.items[target.index]) goTo(props.items[target.index].id, false)
})
onBeforeUnmount(reset)
defineExpose({ goTo })
</script>

<template>
  <GridLayout ref="frame" :height="height" horizontalAlignment="stretch" @layoutChanged="layout" @loaded="layout">
    <ScrollView ref="viewport" horizontalAlignment="stretch" orientation="horizontal" direction="ltr" :height="height" :isScrollEnabled="swipe"
      :scrollBarIndicatorVisible="false" :iosOverflowSafeArea="false"
      @layoutChanged="layout" @scroll="scroll" @touch="touch" @unloaded="reset">
      <StackLayout v-if="width" orientation="horizontal" :width="stackWidth" :height="height"
        :paddingLeft="carousel?.padding ?? 0" :paddingRight="carousel?.padding ?? 0"
        direction="ltr" horizontalAlignment="left">
        <GridLayout v-for="(item, index) in physicalItems" :key="item.id" :width="itemWidth" :height="height" :clipToBounds="true"
          :marginRight="carousel && index < physicalItems.length - 1 ? carousel.gap : 0"
          :accessibilityHidden="!accessible(item)" :isUserInteractionEnabled="accessible(item)" :direction="direction">
          <slot v-if="render(item, positions.get(item.id) ?? 0)" :item="item" :selected="shown(item)" />
          <slot v-else name="placeholder" :item="item" />
        </GridLayout>
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>
