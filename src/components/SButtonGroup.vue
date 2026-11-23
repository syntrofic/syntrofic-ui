<script setup lang="ts">
import { provide } from 'vue'
import { buttonGroup } from '../internal/button-group'
import type { ButtonElevation, ButtonSize, ButtonVariant } from '../types'

const props = withDefaults(defineProps<{
  label?: string
  size?: ButtonSize
  elevation?: ButtonElevation
  joined?: boolean
  variant?: ButtonVariant
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
}>(), { orientation: 'horizontal' })
provide(buttonGroup, props)
</script>

<template>
  <div class="sy-button-group" role="group" :aria-label="label" :data-orientation="orientation"
    :data-elevation="elevation ?? 'none'" :data-joined="joined || undefined">
    <slot />
  </div>
</template>
