<script setup lang="ts">
import { type GridLayout, type TouchGestureEventData } from '@nativescript/core'
import { computed, shallowRef, useTemplateRef } from 'nativescript-vue'
import type { NativeActionStatus } from '../action-state'
import { useNativeUI } from '../context'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'

const props = withDefaults(defineProps<{
  label: string
  hint?: string
  progress: number
  status?: NativeActionStatus
  accessibilityValue?: string
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  thumb?: boolean
  reversed?: boolean
  minWidth?: number
}>(), { variant: 'primary', minWidth: 188, reversed: undefined })
const emit = defineEmits<{ touch: [event: TouchGestureEventData]; activate: []; width: [width: number] }>()
defineSlots<{ thumb(props: { progress: number; color: string }): unknown; label(props: { progress: number; color: string; label: string }): unknown }>()
const { theme, direction } = useNativeUI()
const control = useTemplateRef<InstanceType<typeof SNativePressableFeedback>>('control')
const width = shallowRef(0)
const knob = 34
const inset = 5
const inReverse = computed(() => props.reversed ?? direction.value === 'rtl')
const track = computed(() => Math.max(0, width.value - (props.thumb ? inset * 2 + knob : 0)))
const move = computed(() => (inReverse.value ? -1 : 1) * track.value * props.progress)
const colors = computed(() => {
  const c = theme.value.colors
  const error = props.status === 'error' || props.variant === 'danger'
  return {
    background: props.variant === 'secondary' && !error ? c.surfaceBlue : c.surfaceMuted,
    fill: error ? c.dangerSoft : c.accentSoft,
    thumb: error ? c.danger : c.accent,
    ink: error ? c.danger : c.text,
    thumbInk: error ? c.dangerOn : c.accentOn,
  }
})

function resized(event: { object: GridLayout }) {
  const next = event.object.getActualSize().width
  if (next > 0 && width.value !== next) {
    width.value = next
    emit('width', next)
  }
}
defineExpose({ focus: () => control.value?.focus() ?? false })
</script>

<template>
  <GridLayout height="48" @layoutChanged="resized">
    <SNativePressableFeedback ref="control" :label="label" :accessibilityHint="hint" :accessibilityValue="accessibilityValue"
      :disabled="disabled" :fill="colors.background" :pressFill="colors.background" :minWidth="minWidth" :minHeight="48" :paddingInline="0"
      @native-touch="emit('touch', $event)" @tap="emit('activate')">
      <GridLayout height="48" margin="-5 0" :clipToBounds="true" :borderRadius="theme.geometry.radiusMd" cornerShape="squircle">
        <GridLayout height="48" :width="width * progress" :horizontalAlignment="inReverse ? 'right' : 'left'" :backgroundColor="colors.fill"
          :borderRadius="theme.geometry.radiusMd" cornerShape="squircle" />
        <ContentView :margin="thumb ? '0 42' : '0 12'" horizontalAlignment="center" verticalAlignment="middle">
          <slot name="label" :progress="progress" :color="colors.ink" :label="label">
            <SNativeMotionText :value="label" :color="colors.ink" :size="14" />
          </slot>
        </ContentView>
        <GridLayout v-if="thumb" :width="knob" :height="34" :margin="inReverse ? '0 5 0 0' : '0 0 0 5'"
          :horizontalAlignment="inReverse ? 'right' : 'left'" verticalAlignment="middle" :translateX="move"
          :borderRadius="theme.geometry.radiusSm" cornerShape="squircle" :backgroundColor="colors.thumb">
          <slot name="thumb" :progress="progress" :color="colors.thumbInk" />
        </GridLayout>
      </GridLayout>
    </SNativePressableFeedback>
  </GridLayout>
</template>
