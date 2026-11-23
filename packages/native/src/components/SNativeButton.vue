<script setup lang="ts">
import type { GridLayout } from '@nativescript/core'
import { computed, nextTick, ref, useTemplateRef, watch } from 'nativescript-vue'
import type { NativeButtonOptions } from '../button'
import { nativeTextStyle, useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import { centerNativeText } from '../text-alignment'
import SNativeIcon from './SNativeIcon.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeSpinner from './SNativeSpinner.vue'

const props = withDefaults(defineProps<NativeButtonOptions>(), { variant: 'primary', size: 'md', loadingLabel: 'Loading' })
defineSlots<{
  start(props: { color: string }): unknown
  end(props: { color: string }): unknown
  label(props: { label: string; color: string; size: number }): unknown
  background(props: { pressed: boolean; color: string; radius: number }): unknown
}>()
const emit = defineEmits<{ tap: []; 'accessibility-focus-change': [focused: boolean] }>()
const { theme, direction, fontFamily, reducedMotion } = useNativeUI()
const runMotion = useNativeMotion()
const pressable = useTemplateRef<InstanceType<typeof SNativePressableFeedback>>('pressable')
const labelView = useTemplateRef<{ nativeView: GridLayout }>('labelView')
const spinner = useTemplateRef<{ nativeView: GridLayout }>('spinner')
const spinning = ref(props.loading)
const initialOpacity = props.loading ? 1 : 0
const initialScale = props.loading ? 1 : 0.7
const offset = computed(() => direction.value === 'rtl' ? -11 : 11)
const initialTranslate = props.loading ? offset.value : 0
const dimensions = { sm: { height: 44, text: 14 }, md: { height: 48, text: 15 }, lg: { height: 54, text: 17 } }
const sizeStyle = computed(() => dimensions[props.size])

const palette = computed(() => {
  const c = theme.value.colors
  switch (props.variant) {
    case 'secondary': return { fill: c.accentSoft, press: c.surfaceSage, ink: c.accentText }
    case 'ghost': return { fill: 'transparent', press: c.surfaceMuted, ink: c.text }
    case 'danger': return { fill: c.danger, press: c.dangerHover, ink: c.dangerOn }
    default: return { fill: c.accent, press: c.accentHover, ink: c.accentOn }
  }
})

watch([() => props.loading, offset, reducedMotion], ([loading, sign]) => {
  runMotion(() => {
    const frames = []
    if (loading) spinning.value = true
    if (labelView.value) frames.push({ target: labelView.value.nativeView, translate: { x: loading ? sign : 0, y: 0 } })
    if (spinner.value) {
      const scale = loading ? 1 : 0.7
      frames.push({ target: spinner.value.nativeView, opacity: loading ? 1 : 0, scale: { x: scale, y: scale } })
    }
    return frames
  }, loading ? 'enter' : 'exit', () => {
    if (!loading) spinning.value = false
  })
}, { flush: 'post' })

defineExpose({ focus: () => pressable.value?.focus() ?? false })
</script>

<template>
  <SNativePressableFeedback
    ref="pressable"
    :label="accessibilityLabel ?? label"
    :role="accessibilityRole"
    :accessibilityValue="accessibilityValue"
    :disabled="disabled"
    :busy="loading"
    :busyLabel="loadingLabel"
    :pressed="pressed"
    :fill="palette.fill"
    :pressFill="palette.press"
    :minHeight="sizeStyle.height"
    :radius="sizeStyle.height / 2"
    :horizontalAlignment="fullWidth ? 'stretch' : direction === 'rtl' ? 'right' : 'left'"
    @tap="emit('tap')"
    @accessibility-focus-change="emit('accessibility-focus-change', $event)"
  >
    <template v-if="$slots.background" #background="state"><slot name="background" v-bind="state" /></template>
    <GridLayout horizontalAlignment="center" verticalAlignment="middle">
      <GridLayout ref="labelView" columns="auto,auto,auto" :translateX="initialTranslate" verticalAlignment="middle">
        <ContentView v-if="$slots.start" :col="direction === 'rtl' ? 2 : 0" margin="0 4">
          <slot name="start" :color="palette.ink" />
        </ContentView>
        <ContentView v-if="$slots.label" col="1">
          <slot name="label" :label="label" :color="palette.ink" :size="sizeStyle.text" />
        </ContentView>
        <SNativeIcon v-else-if="icon" col="1" :name="icon" :color="palette.ink" :size="sizeStyle.text + 3" />
        <Label v-else col="1" :text="label" :style="nativeTextStyle(label, fontFamily, '600')" :iosAccessibilityAdjustsFontSize="true"
          :fontSize="sizeStyle.text" :color="palette.ink" :textWrap="true" textAlignment="center" verticalAlignment="middle" @loaded="centerNativeText" />
        <ContentView v-if="$slots.end" :col="direction === 'rtl' ? 0 : 2" margin="0 4">
          <slot name="end" :color="palette.ink" />
        </ContentView>
      </GridLayout>
      <GridLayout
        ref="spinner"
        :horizontalAlignment="direction === 'rtl' ? 'right' : 'left'"
        verticalAlignment="middle"
        :translateX="direction === 'rtl' ? 11 : -11"
        :opacity="initialOpacity"
        :scaleX="initialScale"
        :scaleY="initialScale"
      >
        <SNativeSpinner :active="spinning" :size="15" :color="palette.ink" decorative />
      </GridLayout>
    </GridLayout>
  </SNativePressableFeedback>
</template>
