<script setup lang="ts">
import { AccessibilityState, isAndroid, Utils, type TouchGestureEventData } from '@nativescript/core'
import { computed, onBeforeUnmount, ref, watch } from 'nativescript-vue'
import { editNativeAgendaEvent, type NativeAgendaBlock, type NativeAgendaEvent } from '../agenda-state'
import { useNativeUI } from '../context'
import { lockGestureScroll } from '../scroll-gesture'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeText from './SNativeText.vue'

const props = defineProps<{
  block: NativeAgendaBlock
  height: number
  scale: number
  dayWidth: number
  multipleDays?: boolean
  selected?: boolean
  editable?: boolean
  increment: number
}>()
const emit = defineEmits<{ select: [event: NativeAgendaEvent]; edit: [event: NativeAgendaEvent] }>()
const { theme, direction } = useNativeUI()
const blocked = computed(() => props.block.event.disabled)
const shift = ref({ x: 0, y: 0 })
const stretch = ref(0)
let active: { x: number; y: number; kind: 'move' | 'end' } | undefined
let unlock: (() => void) | undefined
let ignoreTapUntil = 0

function point(event: TouchGestureEventData) {
  if (isAndroid) return {
    x: Utils.layout.toDeviceIndependentPixels(event.android.getRawX()),
    y: Utils.layout.toDeviceIndependentPixels(event.android.getRawY()),
  }
  const screen = event.ios?.touches?.anyObject()?.locationInView(null) as { x: number; y: number } | undefined
  return screen ?? { x: event.getX(), y: event.getY() }
}
function release() {
  unlock?.()
  unlock = undefined
  active = undefined
  shift.value = { x: 0, y: 0 }
  stretch.value = 0
}
function touch(event: TouchGestureEventData) {
  if (!props.editable || blocked.value) return
  if (event.action === 'down') {
    const origin = point(event)
    const kind = props.height >= 34 && event.getY() >= props.height - 9 ? 'end' : 'move'
    if (active) release()
    active = { ...origin, kind }
    unlock = lockGestureScroll(event)
  } else if (active && event.action === 'move') {
    const next = point(event)
    const x = props.multipleDays ? next.x - active.x : 0
    const y = next.y - active.y
    if (active.kind === 'move') shift.value = { x, y }
    else stretch.value = Math.max(20 - props.height, y)
  } else if (active && event.action === 'up') {
    const next = point(event)
    const x = props.multipleDays ? next.x - active.x : 0
    const y = next.y - active.y
    if (Math.abs(x) + Math.abs(y) >= 10) {
      ignoreTapUntil = Date.now() + 250
      const changed = editNativeAgendaEvent(props.block.event, {
        kind: active.kind, minutes: y / props.scale,
        days: active.kind === 'move' ? Math.round(x / props.dayWidth) * (direction.value === 'rtl' ? -1 : 1) : 0,
        increment: props.increment,
      })
      if (changed) emit('edit', changed)
    }
    release()
  } else if (event.action === 'cancel') release()
}
function select() {
  if (Date.now() >= ignoreTapUntil) emit('select', props.block.event)
}
onBeforeUnmount(release)
watch([() => props.editable, blocked], ([editable, disabled]) => {
  if (!editable || disabled) release()
})
</script>

<template>
  <GridLayout :height="height" :translateX="shift.x" :translateY="shift.y" :zIndex="shift.x || shift.y || stretch ? 4 : 0">
    <SNativePressableFeedback :label="block.event.title" :accessibilityHint="block.event.description"
      :accessibilityState="selected ? AccessibilityState.Selected : undefined" :disabled="blocked"
      :fill="selected ? theme.colors.accentSoft : theme.colors.surfaceBlue" :pressFill="theme.colors.surfaceSage"
      :minHeight="0" :minWidth="0" :height="height + stretch" :padding-inline="5" verticalAlignment="top"
      @native-touch="touch" @tap="select">
      <GridLayout :clipToBounds="true">
        <slot :event="block.event" :block="block" :selected="selected">
          <SNativeText :text="block.event.title" :size="height < 33 ? 'caption' : 'body'" emphasized verticalAlignment="top" />
        </slot>
        <ContentView v-if="editable && !blocked && height >= 34" :width="16" height="2" verticalAlignment="bottom"
          horizontalAlignment="center" :backgroundColor="theme.colors.borderStrong" :borderRadius="1" />
      </GridLayout>
    </SNativePressableFeedback>
  </GridLayout>
</template>
