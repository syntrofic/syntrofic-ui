<script setup lang="ts">
import { useId } from 'vue'
import SButton from './SButton.vue'
import type { PromptSuggestionInfo } from '../chat/types'

withDefaults(defineProps<{
  items: readonly PromptSuggestionInfo[]
  title?: string
  description?: string
  label?: string
  variant?: 'compact' | 'cards'
  disabled?: boolean
}>(), { variant: 'compact' })

defineSlots<{
  header(): unknown
  title(): unknown
  description(): unknown
  start(props: { item: PromptSuggestionInfo }): unknown
  itemTitle(props: { item: PromptSuggestionInfo }): unknown
  itemDescription(props: { item: PromptSuggestionInfo }): unknown
  meta(props: { item: PromptSuggestionInfo }): unknown
  tags(props: { item: PromptSuggestionInfo }): unknown
  itemFooter(props: { item: PromptSuggestionInfo }): unknown
  footer(): unknown
}>()
const emit = defineEmits<{ select: [item: PromptSuggestionInfo] }>()
const titleId = `sy-prompt-suggestion-${useId()}`
</script>

<template>
  <section class="sy-prompt-suggestion" :data-variant="variant"
    :aria-label="label || ($slots.header ? title || 'Suggested prompts' : !title && !$slots.title ? 'Suggested prompts' : undefined)"
    :aria-labelledby="!label && !$slots.header && (title || $slots.title) ? titleId : undefined">
    <header v-if="title || description || $slots.header || $slots.title || $slots.description" class="sy-prompt-suggestion__header">
      <slot name="header">
        <h3 v-if="title || $slots.title" :id="titleId"><slot name="title">{{ title }}</slot></h3>
        <p v-if="description || $slots.description"><slot name="description">{{ description }}</slot></p>
      </slot>
    </header>
    <ul class="sy-prompt-suggestion__items" role="list">
      <li v-for="item in items" :key="item.id">
        <SButton :variant="variant === 'cards' ? 'secondary' : 'ghost'" size="sm" :disabled="disabled || item.disabled"
          :aria-label="item.accessibleLabel" @click="emit('select', item)">
          <span class="sy-prompt-suggestion__content">
            <span class="sy-prompt-suggestion__lead">
              <slot name="start" :item="item" />
              <span class="sy-prompt-suggestion__title"><slot name="itemTitle" :item="item">{{ item.title }}</slot></span>
              <span v-if="item.meta || $slots.meta" class="sy-prompt-suggestion__meta"><slot name="meta" :item="item">{{ item.meta }}</slot></span>
            </span>
            <span v-if="variant === 'cards' && (item.description || $slots.itemDescription)" class="sy-prompt-suggestion__description">
              <slot name="itemDescription" :item="item">{{ item.description }}</slot>
            </span>
            <span v-if="variant === 'cards' && (item.tags?.length || $slots.tags)" class="sy-prompt-suggestion__tags">
              <slot name="tags" :item="item"><span v-for="tag in item.tags" :key="tag">{{ tag }}</span></slot>
            </span>
            <span v-if="$slots.itemFooter" class="sy-prompt-suggestion__item-footer"><slot name="itemFooter" :item="item" /></span>
          </span>
        </SButton>
      </li>
    </ul>
    <slot name="footer" />
  </section>
</template>
