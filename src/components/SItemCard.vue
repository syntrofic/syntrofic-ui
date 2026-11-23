<script setup lang="ts">
import { computed, inject, useId } from 'vue'
import SMotionText from './SMotionText.vue'
import { itemCardGroup, type ItemCardVariant } from '../internal/item-card-group'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  status?: string
  href?: string
  target?: string
  rel?: string
  pressable?: boolean
  disabled?: boolean
  current?: boolean
  variant?: ItemCardVariant
  as?: 'article' | 'div' | 'li'
  truncate?: boolean
  reserveStatus?: number
  leadTabindex?: number
  trackFocus?: boolean
}>(), { reserveStatus: 0 })

const emit = defineEmits<{ press: [event: MouseEvent] }>()
const grouped = inject(itemCardGroup, false)
const root = computed(() => props.as ?? (grouped ? 'li' : 'div'))
const lead = computed(() => props.href !== undefined ? 'a' : props.pressable ? 'button' : 'span')
const interactive = computed(() => lead.value !== 'span')
const id = `sy-item-${useId()}`

function activate(event: MouseEvent) {
  if (!interactive.value) return
  if (props.disabled) event.preventDefault()
  else emit('press', event)
}
</script>

<template>
  <component :is="root" class="sy-item-card" :data-variant="variant ?? (grouped ? 'inherit' : 'default')"
    :data-truncate="truncate || undefined" :data-sy-focus-anchor="trackFocus ? '' : undefined">
    <component :is="lead" class="sy-item-card__lead"
      :href="lead === 'a' && !disabled ? href : undefined" :target="lead === 'a' && !disabled ? target : undefined"
      :rel="lead === 'a' && !disabled ? rel : undefined" :role="lead === 'a' && disabled ? 'link' : undefined"
      :type="lead === 'button' ? 'button' : undefined" :disabled="lead === 'button' && disabled ? true : undefined"
      :aria-disabled="interactive && disabled ? true : undefined" :aria-current="interactive && current ? (lead === 'a' ? 'page' : 'true') : undefined"
      :tabindex="interactive && !disabled ? leadTabindex : undefined" :data-sy-focus-target="interactive && trackFocus && !disabled ? '' : undefined"
      :aria-labelledby="interactive ? id : undefined"
      :aria-describedby="interactive && ($slots.description || description !== undefined) ? `${id}-description` : undefined"
      @click="activate">
      <span :id="id" class="sy-item-card__title">
        <span v-if="$slots.icon" class="sy-item-card__icon" aria-hidden="true"><slot name="icon" /></span>
        <span class="sy-item-card__title-text"><slot name="title">{{ title }}</slot></span>
      </span>
      <span v-if="$slots.description || description !== undefined" :id="`${id}-description`" class="sy-item-card__description">
        <slot name="description">{{ description }}</slot>
      </span>
    </component>
    <span v-if="$slots.status || status !== undefined" class="sy-item-card__status"
      :style="{ minInlineSize: reserveStatus > 0 ? `${reserveStatus}ch` : undefined }">
      <slot name="status"><SMotionText :value="status ?? ''" /></slot>
    </span>
    <div v-if="$slots.action" class="sy-item-card__action"><slot name="action" /></div>
    <div v-if="$slots.default" class="sy-item-card__extra"><slot /></div>
  </component>
</template>
