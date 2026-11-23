<script setup lang="ts">
import { AccessibilityLiveRegion } from '@nativescript/core'
import { provide, ref } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { nativeSkeletonGroup, useSkeletonClock, type NativeSkeletonVariant } from '../skeleton'

const props = withDefaults(defineProps<{
  loading?: boolean
  variant?: NativeSkeletonVariant
  duration?: number
  label?: string
}>(), { loading: true, variant: 'shimmer', duration: 1350 })
const { reducedMotion } = useNativeUI()
const mounted = ref(false)
const phase = useSkeletonClock(() => mounted.value && props.loading && !reducedMotion.value && props.variant !== 'none', () => props.duration)
provide(nativeSkeletonGroup, {
  loading: () => props.loading,
  variant: () => props.variant,
  phase,
})
</script>

<template>
  <StackLayout
    :accessibilityLabel="loading ? label : undefined"
    :accessibilityLiveRegion="label ? AccessibilityLiveRegion.Polite : AccessibilityLiveRegion.None"
    @loaded="mounted = true"
    @unloaded="mounted = false"
  >
    <slot :loading="loading" />
  </StackLayout>
</template>
