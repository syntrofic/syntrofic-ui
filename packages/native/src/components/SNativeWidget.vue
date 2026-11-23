<script setup lang="ts">
import { computed } from 'nativescript-vue'
import type { NativeBackgroundTone } from '../material-state'
import SNativeEmptyState from './SNativeEmptyState.vue'
import SNativeReveal from './SNativeReveal.vue'
import SNativeSkeleton from './SNativeSkeleton.vue'
import SNativeSurface from './SNativeSurface.vue'
import SNativeText from './SNativeText.vue'
const props = withDefaults(defineProps<{
  title: string
  description?: string
  state?: 'ready' | 'loading' | 'empty' | 'error'
  emptyLabel?: string
  errorLabel?: string
  retryLabel?: string
  minimumHeight?: number
  tone?: NativeBackgroundTone
}>(), { state: 'ready', tone: 'muted', minimumHeight: 86, emptyLabel: 'No data', errorLabel: 'Could not load data', retryLabel: 'Retry' })
defineEmits<{ retry: [] }>()
defineSlots<{ default(): unknown; tools(): unknown; legend(): unknown; footer(): unknown; loading(): unknown; empty(): unknown; error(): unknown }>()
const ready = computed(() => props.state === 'ready')
</script>

<template>
  <SNativeSurface :tone="tone" :padding="10">
    <GridLayout columns="*,auto" marginBottom="6">
      <StackLayout>
        <SNativeText :text="title" heading size="title" />
        <SNativeText v-if="description" :text="description" size="caption" tone="muted" />
      </StackLayout>
      <GridLayout v-if="$slots.tools" col="1"><slot name="tools" /></GridLayout>
    </GridLayout>
    <slot name="legend" />
    <SNativeReveal :transitionKey="state" :minHeight="minimumHeight">
      <SNativeSurface v-if="ready" :padding="9" :minHeight="minimumHeight"><slot /></SNativeSurface>
      <slot v-else-if="state === 'loading'" name="loading">
        <StackLayout :minHeight="minimumHeight" padding="9"><SNativeSkeleton width="65%" :height="17" /><SNativeSkeleton width="90%" :height="24" marginTop="8" /></StackLayout>
      </slot>
      <slot v-else-if="state === 'empty'" name="empty"><SNativeEmptyState :title="emptyLabel" :minHeight="minimumHeight" /></slot>
      <slot v-else name="error">
        <SNativeEmptyState :title="errorLabel" state="error" :actionLabel="retryLabel" :minHeight="minimumHeight" announce @action="$emit('retry')" />
      </slot>
    </SNativeReveal>
    <GridLayout v-if="$slots.footer" marginTop="6"><slot name="footer" /></GridLayout>
  </SNativeSurface>
</template>
