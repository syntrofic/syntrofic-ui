<script setup lang="ts">
import { computed } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { surfaceColor, type NativeBackgroundTone } from '../material-state'
import type { NativeSurfaceMaterial } from '../theme'
import SNativeThemeBackground from './SNativeThemeBackground.vue'

const props = withDefaults(defineProps<{
  tone?: NativeBackgroundTone
  padding?: number
  radius?: number
  material?: NativeSurfaceMaterial
  orientation?: 'vertical' | 'horizontal'
}>(), { tone: 'base' })
const { theme, material } = useNativeUI()
const fill = computed(() => surfaceColor(theme.value.colors, props.tone))
const style = computed(() => props.material ?? material.value)
const corner = computed(() => props.radius ?? theme.value.geometry.radiusMd)
</script>

<template>
  <GridLayout :backgroundColor="$slots.background || style === 'glass' ? 'transparent' : fill" :borderRadius="corner" cornerShape="squircle">
    <SNativeThemeBackground
      v-if="$slots.background || style === 'glass' && tone !== 'plain'"
      :material="style"
      :fallbackColor="fill"
      :radius="corner"
    >
      <template v-if="$slots.background" #default="state"><slot name="background" v-bind="state" /></template>
    </SNativeThemeBackground>
    <StackLayout :padding="padding ?? theme.geometry.space2" :orientation="orientation ?? 'vertical'">
      <slot />
    </StackLayout>
  </GridLayout>
</template>
