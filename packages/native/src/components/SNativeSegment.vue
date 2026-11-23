<script setup lang="ts">
import { computed } from 'nativescript-vue'
import { activeCollectionItem, type NativeCollectionKey } from '../collection-state'
import type { NativePagedTabsOptions, NativeTabItem } from '../navigation'
import SNativeTabRail from './SNativeTabRail.vue'

const props = withDefaults(defineProps<{
  items: readonly NativeTabItem[]
  label: string
  defaultSelected?: NativeCollectionKey
  disabled?: boolean
  scrollable?: boolean
  scrollAlign?: NativePagedTabsOptions['scrollAlign']
  equalWidth?: boolean
  separators?: boolean
  size?: NativePagedTabsOptions['size']
}>(), { size: 'sm', equalWidth: true })
const model = defineModel<NativeCollectionKey>()
const emit = defineEmits<{ change: [key: NativeCollectionKey] }>()
const selected = computed(() => activeCollectionItem(props.items, model.value ?? props.defaultSelected)?.id)
const position = computed(() => props.items.findIndex(item => Object.is(item.id, selected.value)))
function select(id: NativeCollectionKey) {
  if (Object.is(id, selected.value)) return
  model.value = id
  emit('change', id)
}
</script>

<template>
  <SNativeTabRail v-bind="props" :selected="selected" :position="position" @select="select">
    <template v-if="$slots.item" #trigger="part"><slot name="item" v-bind="part" /></template>
  </SNativeTabRail>
</template>
