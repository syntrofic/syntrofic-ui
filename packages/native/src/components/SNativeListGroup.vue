<script setup lang="ts">
import { isSelected, toggleCollectionSelection, type NativeCollectionItem, type NativeCollectionKey, type NativeSelectionMode } from '../collection-state'
import { useNativeUI } from '../context'
import SNativeListItem from './SNativeListItem.vue'
import SNativeSeparator from './SNativeSeparator.vue'
import SNativeSurface from './SNativeSurface.vue'
import SNativeText from './SNativeText.vue'

type Row = NativeCollectionItem & { meta?: string; interactive?: boolean }
const props = withDefaults(defineProps<{
  items?: readonly Row[]
  label?: string
  selectionMode?: NativeSelectionMode
  tone?: 'plain' | 'base' | 'muted' | 'sage' | 'blue'
  separators?: boolean
  disabled?: boolean
}>(), { selectionMode: 'none', tone: 'plain' })
const selected = defineModel<NativeCollectionKey[]>('selected', { default: () => [] })
const emit = defineEmits<{ activate: [item: Row] }>()
const { theme } = useNativeUI()

function activate(item: Row) {
  if (props.disabled || item.disabled) return
  if (props.selectionMode !== 'none')
    selected.value = toggleCollectionSelection(selected.value, item.id, props.selectionMode)
  emit('activate', item)
}
</script>

<template>
  <SNativeSurface :tone="tone" :padding="tone === 'plain' ? 0 : theme.geometry.space1">
    <SNativeText v-if="label" :text="label" heading :marginBottom="theme.geometry.space1" />
    <slot>
      <StackLayout v-for="(item, index) in items" :key="item.id">
        <SNativeSeparator v-if="separators && index" :marginLeft="theme.geometry.space2" :marginRight="theme.geometry.space2" />
        <SNativeListItem
          :label="item.label"
          :description="item.description"
          :meta="item.meta"
          :interactive="item.interactive || selectionMode !== 'none'"
          :selected="isSelected(selected, item.id)"
          :disabled="disabled || item.disabled"
          @activate="activate(item)"
        >
          <template v-if="$slots.prefix" #prefix><slot name="prefix" :item="item" /></template>
          <template v-if="$slots.item" #default><slot name="item" :item="item" :selected="isSelected(selected, item.id)" /></template>
          <template v-if="$slots.suffix" #suffix="state"><slot name="suffix" :item="item" v-bind="state" /></template>
        </SNativeListItem>
      </StackLayout>
    </slot>
  </SNativeSurface>
</template>
