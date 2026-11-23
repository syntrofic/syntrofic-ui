<script setup lang="ts">
import { AccessibilityLiveRegion, AccessibilityRole, AccessibilityState } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { useNativeProgress } from '../feedback-motion'
import { nativeProgressArc } from '../feedback-state'
import type { NativeProgressOptions } from '../feedback'
import { nativeRingImage } from '../progress-ring'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<NativeProgressOptions & {
  diameter?: number
  strokeWidth?: number
  startAngle?: number
  trackColor?: string
  fillColor?: string
}>(), { size: 'md', showValue: true, animated: true })
defineSlots<{ center(props: { text: string; ratio: number }): unknown }>()
const { mode, range, progress, ink, fill, rendered, spoken, phase, active } = useNativeProgress(props, 1800)
const sizes = { sm: [36, 3], md: [58, 5], lg: [88, 7] }
const pending = computed(() => mode.value === 'indeterminate')
const fraction = computed(() => pending.value ? .27 : Math.round(progress.value * 360) / 360)
const arc = computed(() => nativeProgressArc(
  props.diameter ?? sizes[props.size][0], props.strokeWidth ?? sizes[props.size][1], fraction.value, props.startAngle,
))
const image = computed(() => nativeRingImage(arc.value, props.trackColor ?? fill.value, props.fillColor ?? ink.value))
const centerText = computed(() => pending.value ? '…' : rendered.value)
const textSize = computed(() => props.size === 'sm' ? 9 : props.size === 'lg' ? 15 : 12)
</script>

<template>
  <StackLayout :accessible="true" :accessibilityRole="AccessibilityRole.ProgressBar" horizontalAlignment="center"
    :accessibilityLabel="label" :accessibilityValue="spoken"
    :accessibilityState="disabled ? AccessibilityState.Disabled : undefined" :opacity="disabled ? .62 : 1"
    :accessibilityLiveRegion="announce ? AccessibilityLiveRegion.Polite : AccessibilityLiveRegion.None"
    @loaded="active = true" @unloaded="active = false">
    <GridLayout :width="arc.diameter" :height="arc.diameter" horizontalAlignment="center" :accessibilityHidden="true">
      <Image :src="image" :width="arc.diameter" :height="arc.diameter" stretch="aspectFit"
        :rotate="pending ? phase * 360 : 0" :isUserInteractionEnabled="false" />
      <GridLayout v-if="showValue || $slots.center" horizontalAlignment="center" verticalAlignment="middle" :maxWidth="arc.diameter - arc.line * 2">
        <slot name="center" :text="centerText" :ratio="range.ratio">
          <SNativeMotionText :animated="animated" :value="centerText" :size="textSize" :color="fillColor ?? ink" />
        </slot>
      </GridLayout>
    </GridLayout>
    <SNativeText v-if="label" :text="label" emphasized horizontalAlignment="center" marginTop="6" :accessibilityHidden="true" />
  </StackLayout>
</template>
