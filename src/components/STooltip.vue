<script setup lang="ts">
import { useLayerCollisionPadding } from '../internal/layer-context'
import { TooltipContent, TooltipProvider, TooltipRoot, TooltipTrigger } from 'reka-ui'

withDefaults(defineProps<{
  text?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delay?: number
  disabled?: boolean
  defaultOpen?: boolean
}>(), { side: 'top', align: 'center', delay: 340 })
const open = defineModel<boolean | undefined>('open', { default: undefined })
const collisionPadding = useLayerCollisionPadding(10)
</script>

<template>
  <TooltipProvider :delay-duration="delay">
    <TooltipRoot :open="open" :default-open="defaultOpen" :disabled="disabled" @update:open="open = $event">
      <TooltipTrigger as-child><slot name="trigger" /></TooltipTrigger>
      <TooltipContent class="sy-tooltip" :side="side" :align="align" :side-offset="6" :collision-padding="collisionPadding"
        :aria-label="$slots.default ? undefined : text">
        <slot>{{ text }}</slot>
      </TooltipContent>
    </TooltipRoot>
  </TooltipProvider>
</template>
