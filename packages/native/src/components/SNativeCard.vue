<script setup lang="ts">
import { useNativeUI } from '../context'
import type { NativeSurfaceMaterial } from '../theme'
import SNativeSurface from './SNativeSurface.vue'
import SNativeText from './SNativeText.vue'

withDefaults(defineProps<{ title?: string; description?: string; tone?: 'base' | 'subtle' | 'muted' | 'sage' | 'blue'; padding?: number; material?: NativeSurfaceMaterial }>(), { tone: 'subtle' })
const { theme } = useNativeUI()
</script>

<template>
  <SNativeSurface :tone="tone" :padding="padding ?? theme.geometry.space2" :radius="theme.geometry.radiusLg" :material="material">
    <template v-if="$slots.background" #background="state"><slot name="background" v-bind="state" /></template>
    <StackLayout v-if="$slots.media" :marginBottom="theme.geometry.space2">
      <slot name="media" />
    </StackLayout>
    <StackLayout v-if="$slots.header || title || description" :marginBottom="$slots.default || $slots.footer ? theme.geometry.space1 : 0">
      <slot name="header">
        <SNativeText v-if="title" :text="title" size="title" heading />
        <SNativeText v-if="description" :text="description" tone="muted" />
      </slot>
    </StackLayout>
    <slot />
    <StackLayout v-if="$slots.footer" :marginTop="$slots.default ? theme.geometry.space1 : 0">
      <slot name="footer" />
    </StackLayout>
  </SNativeSurface>
</template>
