<script setup lang="ts">
import { provide, useId } from 'vue'
import { itemCardGroup, type ItemCardVariant } from '../internal/item-card-group'

withDefaults(defineProps<{
  title?: string
  description?: string
  label?: string
  heading?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  layout?: 'list' | 'grid'
  columns?: 2 | 3
  variant?: Exclude<ItemCardVariant, 'inherit'>
  dividers?: boolean
}>(), { heading: 'h3', layout: 'list', columns: 2, variant: 'default' })

provide(itemCardGroup, true)
const id = `sy-item-group-${useId()}`
</script>

<template>
  <section class="sy-item-card-group" :data-layout="layout" :data-variant="variant"
    :aria-label="label" :aria-labelledby="!label && (title || $slots.title) ? id : undefined"
    :aria-describedby="description || $slots.description ? `${id}-description` : undefined">
    <div v-if="title || description || $slots.title || $slots.description || $slots.actions" class="sy-item-card-group__header">
      <div>
        <component :is="heading" v-if="title || $slots.title" :id="id" class="sy-item-card-group__title">
          <slot name="title">{{ title }}</slot>
        </component>
        <p v-if="description || $slots.description" :id="`${id}-description`" class="sy-item-card-group__description">
          <slot name="description">{{ description }}</slot>
        </p>
      </div>
      <div v-if="$slots.actions" class="sy-item-card-group__actions"><slot name="actions" /></div>
    </div>
    <ul class="sy-item-card-group__items" :data-columns="columns" :data-dividers="dividers || undefined" role="list">
      <slot />
    </ul>
    <div v-if="$slots.footer" class="sy-item-card-group__footer"><slot name="footer" /></div>
  </section>
</template>
