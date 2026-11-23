<script setup lang="ts">
import { useId } from 'vue'

withDefaults(defineProps<{
  title: string
  description?: string
  layout?: 'blank' | 'hero'
  heading?: 'h1' | 'h2' | 'h3'
}>(), { layout: 'blank', heading: 'h1' })
const id = useId()
</script>

<template>
  <section class="sy-page-scaffold" :data-layout="layout" :aria-labelledby="id">
    <header>
      <component :is="heading" :id="id">{{ title }}</component>
      <p v-if="description">{{ description }}</p>
      <div v-if="$slots.actions" class="sy-page-scaffold__actions"><slot name="actions" /></div>
    </header>
    <div v-if="$slots.media" class="sy-page-scaffold__media"><slot name="media" /></div>
    <slot />
  </section>
</template>
