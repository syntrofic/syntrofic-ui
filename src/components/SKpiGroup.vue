<script setup lang="ts">
import { useId } from 'vue'

withDefaults(defineProps<{
  title?: string
  label?: string
  description?: string
  heading?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  orientation?: 'horizontal' | 'vertical'
  dividers?: boolean
  responsive?: boolean
}>(), { heading: 'h3', orientation: 'horizontal', responsive: true })

const id = `sy-kpi-group-${useId()}`
</script>

<template>
  <section class="sy-kpi-group" :data-orientation="orientation" :data-responsive="responsive || undefined"
    :aria-label="label" :aria-labelledby="!label && (title || $slots.title) ? id : undefined"
    :aria-describedby="description || $slots.description ? `${id}-description` : undefined">
    <div v-if="title || description || $slots.title || $slots.description || $slots.actions" class="sy-kpi-group__header">
      <div>
        <component :is="heading" v-if="title || $slots.title" :id="id" class="sy-kpi-group__title">
          <slot name="title">{{ title }}</slot>
        </component>
        <p v-if="description || $slots.description" :id="`${id}-description`" class="sy-kpi-group__description">
          <slot name="description">{{ description }}</slot>
        </p>
      </div>
      <div v-if="$slots.actions" class="sy-kpi-group__actions"><slot name="actions" /></div>
    </div>
    <div class="sy-kpi-group__items" :data-dividers="dividers || undefined"><slot /></div>
  </section>
</template>
