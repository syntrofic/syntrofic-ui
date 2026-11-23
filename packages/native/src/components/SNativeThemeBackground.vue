<script setup lang="ts">
import { computed } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { surfaceColor, type NativeBackgroundTone, type NativeGlassEffect } from '../material-state'
import type { NativeSurfaceMaterial } from '../theme'
import SNativeGlassView from './SNativeGlassView.vue'

const props = withDefaults(defineProps<{
  material?: NativeSurfaceMaterial
  tone?: NativeBackgroundTone
  effect?: NativeGlassEffect
  fallbackColor?: string
  radius?: number
  enabled?: boolean
  always?: boolean
  forceSolid?: boolean
}>(), { tone: 'base', enabled: true })
const { theme, material } = useNativeUI()
const selected = computed(() => props.material ?? material.value)
const color = computed(() => props.fallbackColor ?? surfaceColor(theme.value.colors, props.tone))
const radius = computed(() => props.radius ?? theme.value.geometry.radiusMd)
</script>

<template>
  <GridLayout
    v-if="enabled && (always || selected === 'glass' || $slots.default)"
    :borderRadius="radius"
    :accessibilityHidden="true"
    :isUserInteractionEnabled="false"
    horizontalAlignment="stretch"
    verticalAlignment="stretch"
  >
    <slot :material="selected" :color="color" :radius="radius">
      <SNativeGlassView v-if="selected === 'glass'" :effect="effect" :radius="radius" :fallbackColor="color" :forceSolid="forceSolid" />
      <GridLayout v-else :backgroundColor="color" :borderRadius="radius" />
    </slot>
  </GridLayout>
</template>
