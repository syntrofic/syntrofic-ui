<script setup lang="ts">
import { computed, inject } from 'vue'
import { listDensityContext, type ListDensity } from '../internal/list-context'
import SItem from './SItem.vue'
import SLink from './SLink.vue'
import type { ItemSwipe } from '../internal/swipe'

const props = withDefaults(defineProps<{
  label: string; description?: string; as?: string; href?: string; target?: string; interactive?: boolean; selected?: boolean; disabled?: boolean
  density?: ListDensity
  highlighted?: boolean
  swipe?: ItemSwipe
  itemKey?: string | number
}>(), { selected: undefined })
const inheritedDensity = inject(listDensityContext, null)
const tag = computed(() => props.as ?? (inheritedDensity ? 'li' : undefined))
const rowDensity = computed(() => props.density ?? inheritedDensity?.value)
const emit = defineEmits<{ activate: [event: MouseEvent] }>()
</script>

<template>
  <SItem :as="tag" :label="label" :description="description" :density="rowDensity" :swipe="swipe" :item-key="itemKey"
    :selected="selected" :highlighted="highlighted" :disabled="disabled" class="sy-list-item">
    <template v-if="$slots.marker" #marker><slot name="marker" /></template>
    <template v-if="$slots.start" #start><slot name="start" /></template>
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <template v-if="$slots.description" #description><slot name="description" /></template>
    <template v-if="$slots.end" #end><slot name="end" /></template>
    <SLink v-if="href && !disabled" class="sy-list-item__control" :href="href" :target="target" :aria-label="label"
      :aria-current="selected ? 'page' : undefined" @click="emit('activate', $event)" />
    <button v-else-if="interactive || href" type="button" class="sy-list-item__control" :role="href ? 'link' : undefined" :aria-label="label"
      :disabled="disabled" :aria-pressed="href ? undefined : selected" @click="emit('activate', $event)" />
  </SItem>
</template>
