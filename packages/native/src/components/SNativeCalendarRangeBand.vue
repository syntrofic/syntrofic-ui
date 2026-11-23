<script setup lang="ts">
import type { GridLayout } from '@nativescript/core'
import { computed, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { useNativeMotion } from '../motion'
import type { nativeRangePosition } from '../range-state'

const props = defineProps<{ position?: ReturnType<typeof nativeRangePosition>; column: number }>()
const { theme, direction } = useNativeUI()
const target = useTemplateRef<{ nativeView: GridLayout }>('target')
const motion = useNativeMotion()
const visible = computed(() => Boolean(props.position))
const initialOpacity = visible.value ? 1 : 0
const initialScale = visible.value ? 1 : .84
const left = computed(() => props.column === 0 || props.position === 'single' || props.position === (direction.value === 'rtl' ? 'end' : 'start'))
const right = computed(() => props.column === 6 || props.position === 'single' || props.position === (direction.value === 'rtl' ? 'start' : 'end'))
watch(visible, shown => {
  motion(() => {
    const view = target.value?.nativeView
    if (!view) return []
    return [{ target: view, opacity: shown ? 1 : 0, scale: { x: shown ? 1 : .84, y: 1 } }]
  }, shown ? 'enter' : 'exit')
})
</script>

<template>
  <GridLayout ref="target" :opacity="initialOpacity" :scaleX="initialScale" :backgroundColor="theme.colors.accentSoft"
    :borderTopLeftRadius="left ? theme.geometry.radiusMd : 0" :borderBottomLeftRadius="left ? theme.geometry.radiusMd : 0"
    :borderTopRightRadius="right ? theme.geometry.radiusMd : 0" :borderBottomRightRadius="right ? theme.geometry.radiusMd : 0"
    :isUserInteractionEnabled="false" :accessibilityHidden="true" />
</template>
