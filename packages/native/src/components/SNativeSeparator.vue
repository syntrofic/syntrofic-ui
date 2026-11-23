<script setup lang="ts">
import { useNativeUI } from '../context'

withDefaults(defineProps<{ vertical?: boolean; label?: string; thickness?: number }>(), { thickness: 1 })
const { theme } = useNativeUI()
</script>

<template>
  <ContentView
    :width="vertical ? thickness : undefined"
    :height="vertical ? undefined : thickness"
    :backgroundColor="theme.colors.border"
    :accessibilityHidden="!label"
    :accessible="Boolean(label)"
    :accessibilityLabel="label"
    :isUserInteractionEnabled="false"
  />
</template>
