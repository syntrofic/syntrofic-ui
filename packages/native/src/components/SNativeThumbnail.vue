<script setup lang="ts">
import { AccessibilityRole } from '@nativescript/core'
import { computed, nextTick, useTemplateRef } from 'nativescript-vue'
import { useNativeUI } from '../context'
import SNativeCloseButton from './SNativeCloseButton.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeSpinner from './SNativeSpinner.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  src?: string
  label: string
  size?: number
  actionable?: boolean
  removable?: boolean
  disabled?: boolean
  loading?: boolean
  loadingLabel?: string
  removeLabel?: string
}>(), { size: 100, loadingLabel: 'Loading', removeLabel: 'Remove' })
const emit = defineEmits<{ tap: []; remove: [] }>()
const { theme, direction } = useNativeUI()
const width = computed(() => Number.isFinite(props.size) ? Math.max(44, props.size) : 100)
const pressable = useTemplateRef<InstanceType<typeof SNativePressableFeedback>>('pressable')
async function remove() {
  emit('remove')
  await nextTick()
  pressable.value?.focus()
}
</script>

<template>
  <GridLayout :width="width" :height="width" :borderRadius="theme.geometry.radiusSm" :backgroundColor="theme.colors.surfaceMuted">
    <Image v-if="src" :src="src" stretch="aspectFill" loadMode="async" :width="width" :height="width"
      :accessible="!actionable" :accessibilityHidden="actionable" :accessibilityLabel="label" :accessibilityRole="AccessibilityRole.Image" />
    <SNativeText v-else-if="!loading" :text="label" tone="muted" horizontalAlignment="center" verticalAlignment="middle" />
    <SNativePressableFeedback v-if="actionable" ref="pressable" :label="label" fill="transparent"
      :pressFill="theme.colors.control" :disabled="disabled" :busy="loading" :busyLabel="loadingLabel"
      :minHeight="width" :minWidth="width" @tap="emit('tap')" />
    <SNativeSpinner v-else-if="loading" :label="loadingLabel" horizontalAlignment="center" verticalAlignment="middle" />
    <SNativeCloseButton v-if="removable" :label="removeLabel" :disabled="disabled" verticalAlignment="top"
      :horizontalAlignment="direction === 'rtl' ? 'left' : 'right'" :backgroundColor="theme.colors.canvas"
      :borderRadius="theme.geometry.radiusPill" @tap="remove" />
  </GridLayout>
</template>
