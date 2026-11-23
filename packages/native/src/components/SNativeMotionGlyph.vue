<script setup lang="ts">
import type { Label } from '@nativescript/core'
import { useTemplateRef, watch } from 'nativescript-vue'
import { nativeTextStyle, useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import { centerNativeText } from '../text-alignment'
import { nativeGraphemeWidth } from '../text-platform'
import { nativeIconFont } from '../icon-glyphs'

const props = withDefaults(defineProps<{ text: string; size: number; color: string; numeric: boolean; animated?: boolean; cellWidth?: number; vector?: boolean }>(), { animated: true })
const { fontFamily } = useNativeUI()
const runMotion = useNativeMotion()
const active = useTemplateRef<{ nativeView: Label }>('active')
const outgoing = useTemplateRef<{ nativeView: Label }>('outgoing')
const initial = props.text

watch(() => props.text, text => {
  runMotion(() => {
    const next = active.value?.nativeView
    const previous = outgoing.value?.nativeView
    if (!next || !previous || next.text === text) return []
    if (props.animated === false) {
      previous.opacity = 0
      next.text = text
      next.translateY = 0
      return []
    }
    const step = Math.max(next.getActualSize()?.height ?? 0, props.size * 1.4)
    previous.text = next.text
    previous.opacity = 1
    previous.translateY = 0
    next.text = text
    next.translateY = step
    return [
      { target: previous, translate: { x: 0, y: -step }, opacity: 0 },
      { target: next, translate: { x: 0, y: 0 } },
    ]
  }, 'replace')
}, { flush: 'post' })
</script>

<template>
  <GridLayout :clipToBounds="true" :height="Math.ceil(size * 1.55)" :width="cellWidth ?? nativeGraphemeWidth(text, size, numeric)">
    <Label
      ref="outgoing"
      :fontSize="size"
      :style="nativeTextStyle(text, vector ? nativeIconFont : fontFamily)"
      :iosAccessibilityAdjustsFontSize="true"
      :color="color"
      :opacity="0"
      verticalAlignment="middle"
      horizontalAlignment="center"
      :accessibilityHidden="true"
      @loaded="centerNativeText"
    />
    <Label
      ref="active"
      :text="initial"
      :fontSize="size"
      :style="nativeTextStyle(text, vector ? nativeIconFont : fontFamily)"
      :iosAccessibilityAdjustsFontSize="true"
      :color="color"
      verticalAlignment="middle"
      horizontalAlignment="center"
      :accessibilityHidden="true"
      @loaded="centerNativeText"
    />
  </GridLayout>
</template>
