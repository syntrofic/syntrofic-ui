<script setup lang="ts">
import { isAndroid, type EventData, type PropertyChangeData, type Slider } from '@nativescript/core'
import { useTemplateRef, watch } from 'nativescript-vue'

const props = defineProps<{
  label: string
  valueText: string
  hint?: string
  position: number
  lower: number
  upper: number
  vertical: boolean
  reverse: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ adjust: [position: number]; focus: [focused: boolean] }>()
const slider = useTemplateRef<{ nativeView: Slider }>('slider')
let updating = false

type FocusListener = { onFocusChange: (view: unknown, focused: boolean) => void }
type KeyListener = { onKey: (view: unknown, code: number, event: { getAction: () => number }) => boolean }
const platform = globalThis as typeof globalThis & {
  android?: {
    view: {
      View: {
        OnFocusChangeListener: new (listener: FocusListener) => FocusListener
        OnKeyListener: new (listener: KeyListener) => KeyListener
      }
      KeyEvent: { KEYCODE_DPAD_UP: number; KEYCODE_DPAD_DOWN: number; ACTION_DOWN: number }
    }
  }
}

function keyboard(_: unknown, code: number, event: { getAction: () => number }) {
  const key = platform.android?.view.KeyEvent
  if (!key || !props.vertical || props.disabled) return false
  const up = code === key.KEYCODE_DPAD_UP
  if (!up && code !== key.KEYCODE_DPAD_DOWN) return false
  if (event.getAction() === key.ACTION_DOWN)
    emit('adjust', props.position + (up === props.reverse ? 1 : -1))
  return true
}

function sync(view = slider.value?.nativeView) {
  if (!view?.isLoaded) return
  updating = true
  try {
    view.minValue = props.lower
    view.maxValue = props.upper
    view.value = props.position
    if (isAndroid) view.android?.setKeyProgressIncrement(1)
  } finally {
    updating = false
  }
}

function loaded(event: EventData) {
  const view = event.object as Slider
  if (isAndroid) {
    const widget = view.android
    const type = platform.android?.view.View
    if (type) {
      widget.setOnFocusChangeListener(new type.OnFocusChangeListener({ onFocusChange: (_, focused) => emit('focus', focused) }))
      widget.setOnKeyListener(new type.OnKeyListener({ onKey: keyboard }))
    }
    widget.getBackground()?.setAlpha(0)
    widget.getThumb()?.setAlpha(0)
    widget.getProgressDrawable()?.setAlpha(0)
  }
  sync(view)
}

function adjust(event: PropertyChangeData) {
  if (updating || props.disabled || typeof event.value !== 'number') return
  const position = Math.round(event.value)
  if (position !== props.position) emit('adjust', position)
}

watch([() => props.position, () => props.lower, () => props.upper], () => sync(), { flush: 'post' })
</script>

<template>
  <Slider
    ref="slider"
    :isEnabled="!disabled"
    :accessibilityLabel="label"
    :accessibilityValue="valueText"
    :accessibilityHint="hint"
    :accessibilityStep="1"
    :accessible="true"
    color="transparent"
    backgroundColor="transparent"
    :direction="!vertical && reverse ? 'rtl' : 'ltr'"
    @loaded="loaded"
    @unloaded="emit('focus', false)"
    @valueChange="adjust"
  />
</template>
