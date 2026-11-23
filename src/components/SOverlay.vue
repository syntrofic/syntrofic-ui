<script setup lang="ts">
import { useOverlay, type OverlayOptions } from '../internal/use-overlay'

const props = withDefaults(defineProps<Omit<OverlayOptions, 'open' | 'content'>>(), { scrim: 'dark' })
const open = defineModel<boolean | undefined>('open', { default: undefined })
const { containerRef, containerProps, overlayProps, visible } = useOverlay(() => ({ ...props, open: open.value }))
</script>

<template>
  <div ref="containerRef" v-bind="containerProps">
    <slot />
    <div v-bind="overlayProps">
      <slot name="overlay" :visible="visible" />
    </div>
  </div>
</template>
