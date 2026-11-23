<script setup lang="ts">
import { Color, type GridLayout } from '@nativescript/core'
import { computed, useTemplateRef, watch } from 'nativescript-vue'
import type { NativeCheckState, NativeChoiceKind } from '../control-state'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import { nativeIconGlyphs } from '../icon-glyphs'
import SNativeMotionGlyph from './SNativeMotionGlyph.vue'

const props = defineProps<{ kind: NativeChoiceKind; state: NativeCheckState; invalid?: boolean }>()
const { theme, direction } = useNativeUI()
const runMotion = useNativeMotion()
const well = useTemplateRef<{ nativeView: GridLayout }>('well')
const mark = useTemplateRef<{ nativeView: GridLayout }>('mark')
const on = computed(() => props.state === true || props.state === 'mixed')
const isSwitch = computed(() => props.kind === 'switch')
const offset = computed(() => isSwitch.value ? (on.value ? 8 : -8) * (direction.value === 'rtl' ? -1 : 1) : 0)
const fill = computed(() => {
  const colors = theme.value.colors
  if (on.value) return props.invalid ? colors.danger : colors.accent
  return isSwitch.value ? colors.surfaceMuted : colors.control
})
const stroke = computed(() => props.invalid ? theme.value.colors.danger : on.value ? theme.value.colors.accent : theme.value.colors.borderStrong)
const ink = computed(() => props.invalid ? theme.value.colors.dangerOn : theme.value.colors.accentOn)
const initialFill = fill.value
const initialX = offset.value
const initialScale = on.value || isSwitch.value ? 1 : 0.45
const initialOpacity = on.value || isSwitch.value ? 1 : 0

watch([fill, offset, on], ([color, x, checked]) => {
  runMotion(() => {
    const frames = []
    if (well.value) frames.push({ target: well.value.nativeView, backgroundColor: new Color(color) })
    if (mark.value) {
      const shown = checked || isSwitch.value
      const scale = shown ? 1 : 0.45
      frames.push({ target: mark.value.nativeView, translate: { x, y: 0 }, opacity: shown ? 1 : 0, scale: { x: scale, y: scale } })
    }
    return frames
  }, 'state')
}, { flush: 'post' })
</script>

<template>
  <GridLayout
    ref="well"
    :width="isSwitch ? 38 : 20"
    :height="isSwitch ? 23 : 20"
    :borderRadius="kind === 'checkbox' ? 8 : isSwitch ? 11.5 : 10"
    :cornerShape="kind === 'checkbox' ? 'squircle' : 'round'"
    :backgroundColor="initialFill"
    :borderColor="stroke"
    :borderWidth="1"
    :accessibilityHidden="true"
    horizontalAlignment="center"
    verticalAlignment="middle"
  >
    <GridLayout
      ref="mark"
      :translateX="initialX"
      :scaleX="initialScale"
      :scaleY="initialScale"
      :opacity="initialOpacity"
      :height="isSwitch ? 15 : kind === 'radio' ? 8 : 19"
      :width="isSwitch ? 15 : kind === 'radio' ? 8 : 19"
      :borderRadius="99"
      :backgroundColor="kind === 'checkbox' ? 'transparent' : isSwitch && !on ? theme.colors.borderStrong : ink"
      horizontalAlignment="center"
      verticalAlignment="middle"
    >
      <SNativeMotionGlyph
        v-if="kind === 'checkbox'"
        :text="state === 'mixed' ? nativeIconGlyphs.minus : nativeIconGlyphs.check"
        :size="12"
        :cellWidth="14"
        vector
        :color="ink"
        :numeric="false"
      />
    </GridLayout>
  </GridLayout>
</template>
