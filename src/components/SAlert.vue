<script setup lang="ts">
import type { BadgeTone } from '../types'
withDefaults(defineProps<{
  tone?: BadgeTone
  title?: string
  description?: string
  announcement?: 'polite' | 'assertive'
}>(), { tone: 'neutral' })
</script>

<template>
  <div class="sy-alert" :data-tone="tone" :role="announcement === 'assertive' ? 'alert' : announcement === 'polite' ? 'status' : undefined">
    <div class="sy-alert__copy">
      <strong v-if="title || $slots.title"><slot name="title">{{ title }}</slot></strong>
      <p v-if="description || $slots.default"><slot>{{ description }}</slot></p>
    </div>
    <div v-if="$slots.actions" class="sy-alert__actions"><slot name="actions" /></div>
  </div>
</template>
