<script lang="ts">
export type NativePresence = 'online' | 'away' | 'busy' | 'offline'
</script>

<script setup lang="ts">
import { AccessibilityRole } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { useNativeUI } from '../context'

const props = withDefaults(defineProps<{ presence: NativePresence; size?: number; label?: string }>(), { size: 12 })
const { theme } = useNativeUI()
const diameter = computed(() => Number.isFinite(props.size) ? Math.max(4, props.size) : 12)
const tone = computed(() => ({ online: theme.value.colors.success, away: theme.value.colors.warning,
  busy: theme.value.colors.danger, offline: theme.value.colors.borderStrong })[props.presence])
</script>

<template>
  <GridLayout :width="diameter" :height="diameter" :borderRadius="diameter / 2" :backgroundColor="tone"
    :borderWidth="2" :borderColor="theme.colors.canvas" :accessible="Boolean(label)" :accessibilityLabel="label"
    :accessibilityHidden="!label" :accessibilityRole="AccessibilityRole.Image">
    <GridLayout v-if="presence === 'offline'" :width="diameter * .32" :height="diameter * .32" :borderRadius="diameter * .16"
      :backgroundColor="theme.colors.canvas" horizontalAlignment="center" verticalAlignment="middle" :accessibilityHidden="true" />
    <GridLayout v-else-if="presence === 'busy'" :width="diameter * .42" :height="1.5" :backgroundColor="theme.colors.canvas"
      horizontalAlignment="center" verticalAlignment="middle" :accessibilityHidden="true" />
  </GridLayout>
</template>
