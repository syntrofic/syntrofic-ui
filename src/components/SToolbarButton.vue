<script setup lang="ts">
import { computed, inject } from 'vue'
import { ToolbarButton } from 'reka-ui'
import { toolbarContext } from '../internal/toolbar-context'
import type { ButtonSize, ButtonVariant } from '../types'
import SButton from './SButton.vue'

const props = withDefaults(defineProps<{
  asChild?: boolean
  disabled?: boolean
  loading?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
  iconOnly?: boolean
}>(), { variant: 'ghost' })
const toolbar = inject(toolbarContext, null)
const inactive = computed(() => props.disabled || toolbar?.disabled.value)
</script>

<template>
  <ToolbarButton as-child :disabled="inactive" data-sy-toolbar-button>
    <slot v-if="asChild" />
    <SButton v-else :size="size" :variant="variant" :disabled="inactive" :loading="loading" :icon-only="iconOnly">
      <template v-if="$slots.start" #start><slot name="start" /></template>
      <slot />
      <template v-if="$slots.end" #end><slot name="end" /></template>
    </SButton>
  </ToolbarButton>
</template>
