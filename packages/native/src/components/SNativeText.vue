<script setup lang="ts">
import { AccessibilityRole } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { nativeTextStyle, useNativeUI } from '../context'

const props = withDefaults(defineProps<{
  text: string
  size?: 'caption' | 'body' | 'title' | 'headline'
  tone?: 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'danger'
  emphasized?: boolean
  heading?: boolean
  wrap?: boolean
}>(), { size: 'body', tone: 'default', wrap: true })
const { theme, fontFamily, direction } = useNativeUI()
const sizes = { caption: 12, body: 15, title: 18, headline: 24 }
const color = computed(() => {
  const palette = theme.value.colors
  if (props.tone === 'default') return palette.text
  if (props.tone === 'muted') return palette.textMuted
  if (props.tone === 'accent') return palette.accentText
  return palette[props.tone]
})
</script>

<template>
  <Label
    :text="text"
    :fontSize="sizes[size]"
    :style="nativeTextStyle(text, fontFamily, emphasized || heading ? '600' : '400')"
    :iosAccessibilityAdjustsFontSize="true"
    :color="color"
    :textWrap="wrap"
    :textAlignment="direction === 'rtl' ? 'right' : 'left'"
    :accessibilityRole="heading ? AccessibilityRole.Header : AccessibilityRole.StaticText"
  />
</template>
