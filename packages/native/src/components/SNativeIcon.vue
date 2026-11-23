<script lang="ts">
export type NativeIconSize = 'xsm' | 'sm' | 'md' | 'lg'
export type NativeIconTone = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'accent' | 'info' | 'success' | 'error' | 'warning' | 'inherit'
</script>

<script setup lang="ts">
import { AccessibilityRole } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { nativeTextStyle, useNativeUI } from '../context'
import { useNativeIconGlyph } from '../icon-registry'
import { centerNativeText } from '../text-alignment'

const props = withDefaults(defineProps<{
  name: string
  label?: string
  size?: number | NativeIconSize
  color?: string
  variant?: string
  glyph?: string
  mirror?: boolean
}>(), { size: 19, mirror: undefined })
const { theme, fontFamily, direction } = useNativeUI()
const resolve = useNativeIconGlyph()
const sizes: Record<NativeIconSize, number> = { xsm: 13, sm: 16, md: 19, lg: 24 }
const numericSize = computed(() => typeof props.size === 'number' ? Number.isFinite(props.size) ? Math.max(1, props.size) : sizes.md : sizes[props.size])
const artwork = computed(() => props.glyph === undefined ? resolve(props.name, direction.value === 'rtl', props.variant) : { glyph: props.glyph })
const glyph = computed(() => artwork.value?.glyph ?? '')
const textStyle = computed(() => artwork.value?.fontFamily
  ? { fontFamily: artwork.value.fontFamily, fontWeight: '400' as const } : nativeTextStyle(glyph.value, fontFamily.value, '600'))
const scaleX = computed(() => (props.mirror === undefined ? artwork.value?.mirror : props.mirror && direction.value === 'rtl') ? -1 : 1)
const paint = computed(() => {
  const palette = theme.value.colors
  const colors: Record<Exclude<NativeIconTone, 'inherit'>, string> = {
    primary: palette.text, secondary: palette.textMuted, tertiary: palette.textMuted, disabled: palette.borderStrong,
    accent: palette.accentText, info: palette.focus, success: palette.success, error: palette.danger, warning: palette.warning,
  }
  if (props.color === 'inherit') return undefined
  return props.color && Object.hasOwn(colors, props.color) ? colors[props.color as keyof typeof colors] : props.color ?? palette.text
})
</script>

<template>
  <Label :text="glyph" :fontSize="numericSize" :color="paint" :style="textStyle" :scaleX="scaleX"
    :width="numericSize + 4" :height="numericSize + 4" textAlignment="center" verticalAlignment="middle" @loaded="centerNativeText"
    :accessible="Boolean(label)" :accessibilityLabel="label" :accessibilityHidden="!label" :accessibilityRole="AccessibilityRole.Image" />
</template>
