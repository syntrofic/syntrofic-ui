<script setup lang="ts">
import { inject, onScopeDispose, watchPostEffect } from 'vue'
import { avatarStatusContext } from '../internal/avatar-context'

const props = withDefaults(defineProps<{ variant?: 'success' | 'neutral' | 'error'; label?: string }>(), { variant: 'success' })
const report = inject(avatarStatusContext, null)
if (report) {
  const key = Symbol()
  watchPostEffect(() => report(key, props.label))
  onScopeDispose(() => report(key))
}
</script>

<template>
  <span class="sy-avatar-status" :data-variant="variant" :data-icon="Boolean($slots.default) || undefined"
    :role="!report && label ? 'img' : undefined" :aria-label="!report ? label : undefined" :aria-hidden="report || !label ? true : undefined"><slot /></span>
</template>
