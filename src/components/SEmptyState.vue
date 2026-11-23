<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  appearance?: 'plain' | 'outline' | 'surface'
  align?: 'start' | 'center'
  tone?: 'neutral' | 'sage' | 'blue' | 'danger'
  fullHeight?: boolean
  heading?: 'strong' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  status?: 'polite' | 'assertive'
}>()
</script>

<template>
  <div
    class="sy-empty-state" :data-size="size" :data-appearance="appearance" :data-align="align"
    :data-tone="tone" :data-full-height="fullHeight || undefined"
  >
    <div v-if="$slots.media" class="sy-empty-state__media"><slot name="media" /></div>
    <div
      v-if="title || description || $slots.title || $slots.default" class="sy-empty-state__copy"
      :aria-live="status" :aria-atomic="status ? true : undefined"
    >
      <component :is="heading ?? 'strong'" v-if="title || $slots.title" class="sy-empty-state__title">
        <slot name="title">{{ title }}</slot>
      </component>
      <p v-if="description || $slots.default" class="sy-empty-state__description"><slot>{{ description }}</slot></p>
    </div>
    <div v-if="$slots.actions || $slots.content" class="sy-empty-state__actions">
      <slot name="actions"><slot name="content" /></slot>
    </div>
  </div>
</template>
