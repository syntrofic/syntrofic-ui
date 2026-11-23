<script setup lang="ts">
import type { GridLayout } from '@nativescript/core'
import { computed, inject, ref, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import { nativeSkeletonGroup, useSkeletonClock, type NativeSkeletonVariant } from '../skeleton'

const props = withDefaults(defineProps<{
  loading?: boolean
  width?: number | string
  height?: number
  radius?: number
  shape?: 'rounded' | 'pill' | 'circle'
  variant?: NativeSkeletonVariant
  duration?: number
  color?: string
  highlight?: string
}>(), { loading: undefined, height: 16, shape: 'rounded', duration: 1350 })
const group = inject(nativeSkeletonGroup, undefined)
const { theme, reducedMotion, direction } = useNativeUI()
const runMotion = useNativeMotion()
const mounted = ref(false)
const overlay = useTemplateRef<{ nativeView: GridLayout }>('overlay')
const measured = ref(0)
const loading = computed(() => props.loading ?? group?.loading() ?? true)
const variant = computed(() => props.variant ?? group?.variant() ?? 'shimmer')
const animated = computed(() => loading.value && !reducedMotion.value && variant.value !== 'none')
const phase = group?.phase ?? useSkeletonClock(() => mounted.value && animated.value, () => props.duration)
const initialOpacity = loading.value ? 1 : 0
const radius = computed(() => props.radius ?? (props.shape === 'rounded' ? theme.value.geometry.radiusSm : 999))
const base = computed(() => props.color ?? theme.value.colors.surfaceMuted)
const shine = computed(() => props.highlight ?? theme.value.colors.surfaceSage)
const pulse = computed(() => animated.value && variant.value === 'pulse' ? 0.74 + (1 - Math.cos(phase.value * 2 * Math.PI)) * 0.13 : 1)
const travel = computed(() => {
  const progress = phase.value ** 2 * (3 - 2 * phase.value)
  return (direction.value === 'rtl' ? -1 : 1) * (progress * 2 - 1) * measured.value
})

function measure() {
  measured.value = overlay.value?.nativeView.getActualSize()?.width ?? 0
}

watch(loading, visible => {
  runMotion(() => {
    const target = overlay.value?.nativeView
    if (!target) return []
    return [{ target, opacity: visible ? 1 : 0, translate: { x: 0, y: visible ? 0 : -5 } }]
  }, visible ? 'enter' : 'exit')
}, { flush: 'post' })
</script>

<template>
  <GridLayout
    :width="width ?? (shape === 'circle' ? height : undefined)"
    :minHeight="height"
    @loaded="mounted = true"
    @unloaded="mounted = false"
  >
    <StackLayout
      v-if="$slots.default"
      :opacity="loading ? 0 : 1"
      :accessibilityHidden="loading"
      :isUserInteractionEnabled="!loading"
    ><slot /></StackLayout>
    <GridLayout
      ref="overlay"
      :clipToBounds="true"
      :borderRadius="radius"
      :opacity="initialOpacity"
      :isUserInteractionEnabled="false"
      :accessibilityHidden="true"
      @layoutChanged="measure"
    >
      <GridLayout :backgroundColor="base" :borderRadius="radius" :opacity="pulse">
        <ContentView
          v-if="variant === 'shimmer' && !reducedMotion"
          :backgroundImage="`linear-gradient(90deg, transparent 22%, ${shine} 50%, transparent 78%)`"
          :translateX="travel"
        />
      </GridLayout>
    </GridLayout>
  </GridLayout>
</template>
