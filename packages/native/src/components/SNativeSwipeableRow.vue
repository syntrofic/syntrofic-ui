<script setup lang="ts">
import { Utils, isAndroid, type TouchGestureEventData } from '@nativescript/core'
import { computed, onBeforeUnmount, ref, watch } from 'nativescript-vue'
import { useActionMeter } from '../action-motion'
import { useNativeUI } from '../context'
import type { NativeMenuItem } from '../menu-state'
import { lockGestureScroll } from '../scroll-gesture'
import { nativeSwipePosition, nativeSwipeTarget, type NativeSwipeSide } from '../swipe-state'
import SNativeButton from './SNativeButton.vue'
import SNativeMenu from './SNativeMenu.vue'
import SNativeSurface from './SNativeSurface.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  label: string
  start?: readonly NativeMenuItem[]
  end?: readonly NativeMenuItem[]
  actionWidth?: number
  menuLabel?: string
  disabled?: boolean
  swipe?: boolean
}>(), { actionWidth: 78, menuLabel: 'Actions', swipe: true })
const open = defineModel<NativeSwipeSide | null>({ default: null })
const emit = defineEmits<{ action: [item: NativeMenuItem]; change: [side: NativeSwipeSide | null] }>()
const { direction } = useNativeUI()
const rtl = computed(() => direction.value === 'rtl')
const startWidth = computed(() => enabled(props.start) ? (props.start?.length ?? 0) * props.actionWidth : 0)
const endWidth = computed(() => enabled(props.end) ? (props.end?.length ?? 0) * props.actionWidth : 0)
const items = computed(() => [...(props.start ?? []), ...(props.end ?? [])])
const sides = computed(() => [
  { id: 'start', items: props.start, width: startWidth.value, align: rtl.value ? 'right' : 'left' },
  { id: 'end', items: props.end, width: endWidth.value, align: rtl.value ? 'left' : 'right' },
] as const)
const dragged = ref<number>()
const offset = computed(() => dragged.value ?? (open.value === 'start' ? startWidth.value : open.value === 'end' ? -endWidth.value : 0))
const display = useActionMeter(offset, computed(() => dragged.value !== undefined))
let origin: { x: number; y: number; offset: number; last: number; time: number; velocity: number } | undefined
let unlock: (() => void) | undefined
function enabled(list?: readonly NativeMenuItem[]) { return list?.some(item => !item.disabled) }
function update(side: NativeSwipeSide | null) {
  if (open.value === side) return
  open.value = side
  emit('change', side)
}
function action(item: NativeMenuItem) {
  if (props.disabled || item.disabled) return
  emit('action', item)
  update(null)
}
function clear() {
  unlock?.()
  unlock = undefined
  origin = undefined
  dragged.value = undefined
}
function touch(event: TouchGestureEventData) {
  if (!props.swipe || props.disabled || event.action === 'cancel') { clear(); return }
  const x = (isAndroid ? Utils.layout.toDeviceIndependentPixels(event.android.getRawX()) : event.getX()) * (rtl.value ? -1 : 1)
  const y = isAndroid ? Utils.layout.toDeviceIndependentPixels(event.android.getRawY()) : event.getY()
  if (event.action === 'down') {
    clear()
    origin = { x, y, offset: display.value, last: x, time: Date.now(), velocity: 0 }
  } else if (origin && event.action === 'move') {
    const delta = x - origin.x
    if (!unlock) {
      if (Math.abs(delta) < 8 || Math.abs(delta) <= Math.abs(y - origin.y) * 1.2) return
      unlock = lockGestureScroll(event)
    }
    const now = Date.now()
    if (Math.abs(x - origin.last) > .5) {
      origin.velocity = (x - origin.last) / Math.max(1, now - origin.time)
      origin.last = x
      origin.time = now
    }
    dragged.value = nativeSwipePosition(origin.offset + delta, startWidth.value, endWidth.value)
  } else if (origin && event.action === 'up') {
    const current = dragged.value
    const velocity = Date.now() - origin.time < 100 ? origin.velocity : 0
    if (current !== undefined) update(nativeSwipeTarget(current, velocity, startWidth.value, endWidth.value) ?? null)
    clear()
  }
}
watch([startWidth, endWidth, () => props.disabled], ([start, end, blocked]) => {
  if (blocked || open.value === 'start' && !start || open.value === 'end' && !end) { update(null); clear() }
})
onBeforeUnmount(clear)
defineExpose({ close: () => update(null), reveal: (side: NativeSwipeSide) => {
  if (!props.disabled && (side === 'start' ? startWidth.value : endWidth.value)) update(side)
} })
</script>

<template>
  <GridLayout :clipToBounds="true" @unloaded="clear">
    <StackLayout v-for="side in sides" :key="side.id" orientation="horizontal" verticalAlignment="middle"
      :width="side.width" :horizontalAlignment="side.align" :accessibilityHidden="open !== side.id"
      :isUserInteractionEnabled="open === side.id && dragged === undefined">
      <SNativeButton v-for="item in side.items" :key="item.id" :label="item.label" :width="actionWidth - 4" margin="0 2"
        size="sm" :variant="item.tone === 'danger' ? 'danger' : 'secondary'" :disabled="item.disabled || disabled" @tap="action(item)" />
    </StackLayout>
    <GridLayout :translateX="display * (rtl ? -1 : 1)" :columns="rtl ? 'auto,*' : '*,auto'" direction="ltr">
      <SNativeSurface :colSpan="2" :padding="0" />
      <GridLayout :col="rtl ? 1 : 0" minHeight="52" padding="6 10">
        <slot><SNativeText :text="label" emphasized verticalAlignment="middle" /></slot>
        <ContentView v-if="swipe && !disabled" :accessibilityHidden="true" backgroundColor="transparent" @touch="touch" />
      </GridLayout>
      <SNativeMenu v-if="items.length" :col="rtl ? 0 : 1" :label="menuLabel" :items="items" :disabled="disabled" @action="action">
        <template #trigger="{ open: show }">
          <SNativeButton :label="menuLabel" size="sm" variant="ghost" :disabled="disabled" verticalAlignment="middle" @tap="show()" />
        </template>
      </SNativeMenu>
    </GridLayout>
  </GridLayout>
</template>
