<script setup lang="ts">
import type { TouchGestureEventData } from '@nativescript/core'
import { onBeforeUnmount, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import SNativePressableFeedback from './SNativePressableFeedback.vue'

const props = defineProps<{ label: string; symbol: string; disabled?: boolean; repeat?: boolean }>()
const emit = defineEmits<{ step: [] }>()
const { theme } = useNativeUI()
let timer: ReturnType<typeof setTimeout> | undefined
let active = false
let suppressedUntil = 0

function stop() {
  if (active) suppressedUntil = Date.now() + 280
  active = false
  clearTimeout(timer)
}
function again() {
  if (props.disabled || !props.repeat) { stop(); return }
  active = true
  emit('step')
  timer = setTimeout(again, 105)
}
function touch(event: TouchGestureEventData) {
  if (event.action === 'down') {
    stop()
    suppressedUntil = 0
    if (props.repeat && !props.disabled) timer = setTimeout(again, 410)
  } else if (event.action === 'up' || event.action === 'cancel') stop()
}
function tap() {
  if (!props.disabled && !active && Date.now() >= suppressedUntil) emit('step')
}
watch(() => props.disabled, disabled => { if (disabled) stop() })
onBeforeUnmount(stop)
</script>

<template>
  <SNativePressableFeedback :label="label" :disabled="disabled" :fill="theme.colors.surfaceMuted" :press-fill="theme.colors.accentSoft"
    :padding-inline="0" height="44" width="44" @native-touch="touch" @tap="tap" @unloaded="stop">
    <Label :text="symbol" :color="theme.colors.text" fontSize="19" fontWeight="600" textAlignment="center" verticalAlignment="middle" />
  </SNativePressableFeedback>
</template>
