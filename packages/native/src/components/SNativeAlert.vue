<script setup lang="ts">
import { AccessibilityLiveRegion } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { useNativeUI } from '../context'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  tone?: 'info' | 'success' | 'warning' | 'danger'
  live?: 'off' | 'polite' | 'assertive'
}>(), { tone: 'info', live: 'polite' })
const { theme } = useNativeUI()
const surface = computed(() => props.tone === 'info' ? theme.value.colors.surfaceBlue : theme.value.colors[`${props.tone}Soft`])
const region = computed(() => props.live === 'off' ? AccessibilityLiveRegion.None
  : props.live === 'assertive' ? AccessibilityLiveRegion.Assertive : AccessibilityLiveRegion.Polite)
</script>

<template>
  <StackLayout :backgroundColor="surface" :padding="theme.geometry.space3" :borderRadius="theme.geometry.radiusMd" cornerShape="squircle">
    <SNativeText
      :text="title"
      :tone="tone === 'info' ? 'default' : tone"
      :accessibilityLiveRegion="region"
      emphasized
    />
    <SNativeText v-if="description" :text="description" :marginTop="theme.geometry.space1" tone="muted" size="caption" />
    <StackLayout v-if="$slots.default" :marginTop="theme.geometry.space2"><slot /></StackLayout>
  </StackLayout>
</template>
