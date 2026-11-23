<script setup lang="ts">
import type { AnnotationTone } from '../types'
import SInlineLabel from '../internal/SInlineLabel'

withDefaults(defineProps<{ tone?: AnnotationTone; dot?: boolean; label?: string | number }>(), { tone: 'neutral' })
</script>

<template>
  <span class="sy-badge" :data-tone="tone">
    <span v-if="dot" class="sy-badge__dot" aria-hidden="true" />
    <SInlineLabel v-if="$slots.default || label !== undefined && label !== ''" class="sy-badge__label" :text="label" keep-rich-layout>
      <template v-if="$slots.default" #default><slot /></template>
    </SInlineLabel>
  </span>
</template>
