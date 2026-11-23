<script setup lang="ts">
import { computed } from 'nativescript-vue'
import { nativeTextStyle, useNativeUI } from '../context'
import { centerNativeText } from '../text-alignment'

const props = withDefaults(defineProps<{
  label?: string
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
  variant?: 'soft' | 'solid' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}>(), { tone: 'neutral', variant: 'soft', size: 'md' })
const { theme, fontFamily, direction } = useNativeUI()
const dimensions = { sm: { height: 20, font: 11, padding: 7 }, md: { height: 26, font: 13, padding: 9 }, lg: { height: 32, font: 15, padding: 11 } }
const size = computed(() => dimensions[props.size])
const palette = computed(() => {
  const colors = theme.value.colors
  const tone = props.tone
  const strong = tone === 'neutral' ? colors.text : colors[tone]
  const muted = tone === 'neutral' ? colors.surfaceMuted : colors[`${tone}Soft`]
  return {
    fill: props.variant === 'outline' ? 'transparent' : props.variant === 'solid' ? strong : muted,
    ink: props.variant === 'solid' ? tone === 'accent' ? colors.accentOn : colors.canvas
      : tone === 'accent' ? colors.accentText : strong,
    border: props.variant === 'outline' ? strong : 'transparent',
  }
})
</script>

<template>
  <GridLayout
    columns="auto,auto,auto"
    direction="ltr"
    :minHeight="size.height"
    :paddingLeft="size.padding"
    :paddingRight="size.padding"
    :borderRadius="99"
    :borderColor="palette.border"
    :borderWidth="1"
    :backgroundColor="palette.fill"
    :horizontalAlignment="direction === 'rtl' ? 'right' : 'left'"
  >
    <GridLayout v-if="$slots.start" :col="direction === 'rtl' ? 2 : 0" verticalAlignment="middle">
      <slot name="start" :color="palette.ink" />
    </GridLayout>
    <GridLayout col="1" verticalAlignment="middle">
      <slot :color="palette.ink">
        <Label :text="label" :style="nativeTextStyle(label ?? '', fontFamily, '600')" :fontSize="size.font" :color="palette.ink"
          :iosAccessibilityAdjustsFontSize="true" verticalAlignment="middle" @loaded="centerNativeText" />
      </slot>
    </GridLayout>
    <GridLayout v-if="$slots.end" :col="direction === 'rtl' ? 0 : 2" verticalAlignment="middle">
      <slot name="end" :color="palette.ink" />
    </GridLayout>
  </GridLayout>
</template>
