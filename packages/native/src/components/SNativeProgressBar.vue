<script setup lang="ts">
import { AccessibilityLiveRegion, AccessibilityRole, AccessibilityState, type EventData, type GridLayout } from '@nativescript/core'
import { computed, ref } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { useNativeProgress } from '../feedback-motion'
import type { NativeProgressOptions } from '../feedback'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<NativeProgressOptions & { trackColor?: string; fillColor?: string; fillGradient?: string }>(), {
  size: 'md', showValue: true, animated: true,
})
defineSlots<{ value(props: { text: string; ratio: number }): unknown }>()
const { direction } = useNativeUI()
const { mode, range, progress, ink, fill, spoken, phase, active } = useNativeProgress(props)
const thicknesses = { sm: 5, md: 8, lg: 12 }
const thickness = computed(() => thicknesses[props.size])
const track = ref(0)
const movingWidth = computed(() => track.value * .29)
const segmentWidth = computed(() => mode.value === 'indeterminate' ? movingWidth.value : track.value * progress.value)
const alignment = computed(() => direction.value === 'rtl' ? 'right' : 'left')
const offset = computed(() => {
  if (mode.value !== 'indeterminate') return 0
  const position = phase.value * (track.value + movingWidth.value) - movingWidth.value
  return direction.value === 'rtl' ? -position : position
})

function measure(event: EventData) {
  track.value = (event.object as GridLayout).getActualSize()?.width ?? 0
}
</script>

<template>
  <StackLayout :accessible="true" :accessibilityRole="AccessibilityRole.ProgressBar"
    :accessibilityLabel="label" :accessibilityValue="spoken"
    :accessibilityState="disabled ? AccessibilityState.Disabled : undefined" :opacity="disabled ? .62 : 1"
    :accessibilityLiveRegion="announce ? AccessibilityLiveRegion.Polite : AccessibilityLiveRegion.None"
    @loaded="active = true" @unloaded="active = false">
    <GridLayout v-if="label || showValue" columns="*,auto" minHeight="25" marginBottom="5" :accessibilityHidden="true">
      <SNativeText v-if="label" :text="label" emphasized verticalAlignment="middle" />
      <GridLayout v-if="showValue" col="1" verticalAlignment="middle">
        <slot name="value" :text="spoken" :ratio="range.ratio">
          <SNativeMotionText :animated="animated" :value="spoken" :size="13" :color="fillColor ?? ink" />
        </slot>
      </GridLayout>
    </GridLayout>
    <GridLayout :height="thickness" :borderRadius="thickness / 2" :backgroundColor="trackColor ?? fill"
      :clipToBounds="true" :accessibilityHidden="true" @layoutChanged="measure">
      <GridLayout :height="thickness" :width="segmentWidth" :horizontalAlignment="alignment"
        :translateX="offset" :borderRadius="thickness / 2" :backgroundColor="fillColor ?? ink" :backgroundImage="fillGradient" />
    </GridLayout>
  </StackLayout>
</template>
