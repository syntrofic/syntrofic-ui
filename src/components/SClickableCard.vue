<script setup lang="ts">
import { useInteractiveRole } from '../internal/element-behavior'
import { usePressFeedback } from '../internal/press-feedback'
import SCard from './SCard.vue'
import type { CardAppearance } from './SCard.vue'
import SLink from './SLink.vue'

const props = defineProps<CardAppearance & { label: string; href?: string; target?: string; rel?: string; disabled?: boolean }>()
const emit = defineEmits<{ activate: [event: MouseEvent] }>()
const control = useInteractiveRole(() => ({ tag: 'button', href: props.href, onActivate: true, disabled: props.disabled }))
const semantic = control.semantic
const pressable = usePressFeedback()
</script>

<template>
  <SCard class="sy-action-card" :data-disabled="disabled || undefined" :variant="variant" :elevation="elevation"
    :width="width" :height="height" :max-width="maxWidth" :min-height="minHeight" :padding="padding">
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <SLink v-if="href && (semantic === 'link' || disabled)" class="sy-action-card__control" :href="href" :target="target" :rel="rel"
      :disabled="disabled" :aria-label="label" v-bind="pressable"
      @click="emit('activate', $event)" />
    <button v-else-if="semantic === 'button'" type="button" class="sy-action-card__control" v-bind="{ ...control, ...pressable }"
      :aria-label="label" :disabled="disabled" @click="!disabled && emit('activate', $event)" />
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </SCard>
</template>
