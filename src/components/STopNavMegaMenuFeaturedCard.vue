<script setup lang="ts">
import { inject } from 'vue'
import { megaMenuSelect } from '../internal/shell-layout'
import SButton from './SButton.vue'
import SSurface from './SSurface.vue'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  actionLabel: string
  href?: string
  target?: string
  closeOnSelect?: boolean
}>(), { closeOnSelect: true })
const emit = defineEmits<{ select: [event: MouseEvent] }>()
const select = inject(megaMenuSelect, undefined)

function activate(event: MouseEvent) {
  emit('select', event)
  select?.(event, props.closeOnSelect)
}
</script>

<template>
  <SSurface tone="sage" class="sy-top-nav-mega-feature">
    <slot name="media" />
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <SButton size="sm" variant="secondary" :href="href" :target="target" @click="activate">{{ actionLabel }}</SButton>
  </SSurface>
</template>
