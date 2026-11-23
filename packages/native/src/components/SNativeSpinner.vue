<script setup lang="ts">
import { AccessibilityRole } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { useNativeUI } from '../context'
import SNativeIcon from './SNativeIcon.vue'

const props = withDefaults(defineProps<{
  active?: boolean
  label?: string
  size?: number
  color?: string
  decorative?: boolean
}>(), { active: true, label: 'Loading', size: 20 })
const { theme, reducedMotion } = useNativeUI()
const ink = computed(() => props.color ?? theme.value.colors.accent)
</script>

<template>
  <GridLayout
    :width="size"
    :height="size"
    :accessibilityHidden="decorative || !active"
    :accessible="!decorative && active"
    :accessibilityLabel="label"
    :accessibilityRole="AccessibilityRole.ProgressBar"
    :isUserInteractionEnabled="false"
  >
    <ActivityIndicator
      v-if="!reducedMotion"
      :busy="active"
      :color="ink"
      :accessibilityHidden="true"
      :width="size"
      :height="size"
    />
    <SNativeIcon
      v-else
      name="more-horizontal"
      :size="Math.max(1, size - 4)"
      :opacity="active ? 1 : 0"
      :color="ink"
      :accessibilityHidden="true"
      horizontalAlignment="center"
      verticalAlignment="middle"
    />
  </GridLayout>
</template>
