<script setup lang="ts">
import {
  AccessibilityRole, AccessibilityState, Color,
  type Button, type EventData, type GridLayout, type TouchGestureEventData,
} from '@nativescript/core'
import { computed, onBeforeUnmount, ref, useSlots, useTemplateRef, watch } from 'nativescript-vue'
import { installCollectionKeys, type NativeCollectionNavigation } from '../collection-keys'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'

const props = withDefaults(defineProps<{
  label: string
  role?: AccessibilityRole
  disabled?: boolean
  busy?: boolean
  busyLabel?: string
  accessibilityHint?: string
  accessibilityState?: AccessibilityState
  accessibilityValue?: string
  pressed?: boolean
  fill?: string
  pressFill?: string
  radius?: number
  minHeight?: number
  minWidth?: number
  paddingInline?: number
  paddingBlock?: number
  allowLongPress?: boolean
  navigate?: (key: NativeCollectionNavigation) => boolean
}>(), { role: AccessibilityRole.Button, minHeight: 44, minWidth: 44, paddingInline: 14, paddingBlock: 5 })

const emit = defineEmits<{
  tap: []
  'pressed-change': [pressed: boolean]
  'accessibility-focus-change': [focused: boolean]
  'long-press': []
  'native-touch': [event: TouchGestureEventData]
}>()
const { theme } = useNativeUI()
const slots = useSlots()
const runMotion = useNativeMotion()
const visual = useTemplateRef<{ nativeView: GridLayout }>('visual')
const control = useTemplateRef<{ nativeView: Button }>('control')
const touching = ref(false)
const focused = ref(false)
const format = computed(() => touching.value || props.pressed
  ? props.pressFill ?? theme.value.colors.surfaceMuted
  : focused.value ? theme.value.colors.surfaceSage : props.fill ?? theme.value.colors.surface)
const initialFill = format.value
let removeKeys: (() => void) | undefined
let controlView: Button | undefined

watch(format, color => {
  runMotion(() => visual.value && !slots.background ? [{ target: visual.value.nativeView, backgroundColor: new Color(color) }] : [], 'state')
})
watch(() => props.disabled || props.busy, blocked => { if (blocked) setPressed(false) })

function setPressed(next: boolean) {
  if (touching.value === next) return
  touching.value = next
  emit('pressed-change', next)
}

function touch(event: TouchGestureEventData) {
  if (props.disabled || props.busy) return
  emit('native-touch', event)
  if (event.action === 'down') setPressed(true)
  else if (event.action === 'up' || event.action === 'cancel') setPressed(false)
}

function tap() {
  setPressed(false)
  if (!props.disabled && !props.busy) emit('tap')
}

function held() {
  setPressed(false)
  if (!props.disabled && !props.busy) emit('long-press')
}

function removeListeners() {
  removeKeys?.()
  removeKeys = undefined
  controlView?.off('longPress', held)
}

function updateListeners() {
  removeListeners()
  if (!controlView) return
  if (props.allowLongPress) controlView.on('longPress', held)
  if (props.navigate) removeKeys = installCollectionKeys(controlView, key => props.navigate?.(key) ?? false, value => { focused.value = value })
}
function loaded(event: EventData) {
  controlView = event.object as Button
  updateListeners()
}
function unloaded() {
  removeListeners()
  controlView = undefined
}
watch([() => props.allowLongPress, () => Boolean(props.navigate)], updateListeners)
onBeforeUnmount(unloaded)

defineExpose({ focus: () => control.value?.nativeView.focus() ?? false })
</script>

<template>
  <GridLayout
    :minHeight="minHeight"
    :minWidth="minWidth"
    :opacity="disabled ? 0.55 : 1"
    @unloaded="setPressed(false)"
  >
    <GridLayout
      ref="visual"
      :minHeight="minHeight"
      :backgroundColor="$slots.background ? 'transparent' : initialFill"
      :borderRadius="radius ?? theme.geometry.radiusMd"
      :cornerShape="radius === undefined ? 'squircle' : 'round'"
      :isUserInteractionEnabled="false"
      :accessibilityHidden="true"
    >
      <GridLayout v-if="$slots.background">
        <slot name="background" :pressed="touching || pressed" :color="format" :radius="radius ?? theme.geometry.radiusMd" />
      </GridLayout>
      <!-- A child sizes the grid row even when Android measures it without a height constraint. -->
      <ContentView :height="minHeight" />
      <GridLayout verticalAlignment="middle" :paddingLeft="paddingInline" :paddingRight="paddingInline" :paddingTop="paddingBlock" :paddingBottom="paddingBlock">
        <slot :pressed="touching || pressed" />
      </GridLayout>
    </GridLayout>
    <Button
      ref="control"
      :text="label"
      :isEnabled="!disabled"
      :accessibilityLabel="label"
      :accessibilityRole="role"
      :accessibilityHint="accessibilityHint"
      :accessibilityState="disabled ? AccessibilityState.Disabled : accessibilityState ?? (pressed ? AccessibilityState.Selected : undefined)"
      :accessibilityValue="busy ? busyLabel : accessibilityValue"
      color="transparent"
      backgroundColor="transparent"
      borderWidth="0"
      :minHeight="0"
      :minWidth="0"
      margin="0"
      padding="0"
      androidElevation="0"
      androidDynamicElevationOffset="0"
      @touch="touch"
      @tap="tap"
      @loaded="loaded"
      @unloaded="unloaded"
      @accessibilityFocusChanged="emit('accessibility-focus-change', $event.value === true)"
    />
  </GridLayout>
</template>
