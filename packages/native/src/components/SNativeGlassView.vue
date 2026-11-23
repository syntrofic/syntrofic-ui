<script setup lang="ts">
import type { EventData, View } from '@nativescript/core'
import { computed, onBeforeUnmount, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { createNativeMaterial, useNativeMaterialSupport } from '../material'
import { glassEffect, surfaceColor, type NativeBackgroundTone, type NativeGlassEffect } from '../material-state'

const props = withDefaults(defineProps<{
  effect?: NativeGlassEffect
  tone?: NativeBackgroundTone
  tint?: string
  fallbackColor?: string
  forceSolid?: boolean
  active?: boolean
  radius?: number
  padding?: number
}>(), { effect: 'regular', tone: 'base', active: true })
const { theme, reducedMotion } = useNativeUI()
const { liquid, blur, opaque } = useNativeMaterialSupport()
const mode = computed(() => glassEffect(props.effect, props.active, props.forceSolid, { liquid, blur, opaque: opaque.value }))
const radius = computed(() => props.radius ?? theme.value.geometry.radiusMd)
const fill = computed(() => mode.value === 'solid' ? props.fallbackColor ?? surfaceColor(theme.value.colors, props.tone) : 'transparent')
let view: ReturnType<typeof createNativeMaterial>

function update(animate = true) {
  view?.update(mode.value, theme.value.appearance, radius.value, props.tint,
    animate && !opaque.value && !reducedMotion.value ? theme.value.motion.duration : 0)
}

function loaded(event: EventData) {
  if (liquid || blur) view = createNativeMaterial(event.object as View)
  update(false)
}

function unload() {
  view?.dispose()
  view = undefined
}

watch([mode, radius, () => props.tint, () => theme.value.appearance], () => update(), { flush: 'post' })
onBeforeUnmount(unload)
</script>

<template>
  <GridLayout :borderRadius="radius">
    <GridLayout :borderRadius="radius" :backgroundColor="fill" :accessibilityHidden="true" :isUserInteractionEnabled="false" @loaded="loaded" @unloaded="unload" />
    <StackLayout v-if="$slots.default" :padding="padding"><slot :effect="mode" /></StackLayout>
  </GridLayout>
</template>
