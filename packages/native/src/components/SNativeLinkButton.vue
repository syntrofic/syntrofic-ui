<script setup lang="ts">
import { AccessibilityRole, Utils } from '@nativescript/core'
import type { NativeButtonOptions } from '../button'
import SNativeButton from './SNativeButton.vue'

const props = withDefaults(defineProps<Omit<NativeButtonOptions, 'accessibilityRole'> & {
  href: string
  navigate?: (href: string) => boolean | void | Promise<boolean | void>
}>(), { variant: 'ghost' })
const emit = defineEmits<{ activate: [href: string]; 'navigation-error': [href: string, error?: unknown] }>()
let navigating = false

async function follow() {
  if (navigating) return
  navigating = true
  const href = props.href
  emit('activate', href)
  try {
    const result = props.navigate ? await props.navigate(href) : await Utils.openUrlAsync(href)
    if (result === false) emit('navigation-error', href)
  } catch (error) {
    emit('navigation-error', href, error)
  } finally {
    navigating = false
  }
}
</script>

<template>
  <SNativeButton
    :label="label"
    :accessibilityLabel="accessibilityLabel"
    :accessibilityRole="AccessibilityRole.Link"
    :disabled="disabled || !href"
    :fullWidth="fullWidth"
    :size="size"
    :variant="variant"
    :loading="loading"
    :loadingLabel="loadingLabel"
    :pressed="pressed"
    @tap="follow"
  >
    <template v-if="$slots.start" #start="slot"><slot name="start" v-bind="slot" /></template>
    <template v-if="$slots.end" #end="slot"><slot name="end" v-bind="slot" /></template>
  </SNativeButton>
</template>
