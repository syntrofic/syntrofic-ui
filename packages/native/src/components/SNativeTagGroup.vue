<script setup lang="ts">
import { nextTick } from 'nativescript-vue'
import { isSelected, tagRemovalTarget, toggleCollectionSelection, type NativeCollectionKey, type NativeSelectionMode, type NativeTagItem } from '../collection-state'
import { useNativeUI } from '../context'
import SNativeTag from './SNativeTag.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  label?: string
  selectionMode?: NativeSelectionMode
  disabled?: boolean
  removable?: boolean
  emptyText?: string
  removeLabel?: (item: NativeTagItem) => string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'soft' | 'outline'
}>(), { selectionMode: 'none', size: 'md', variant: 'soft' })
const items = defineModel<NativeTagItem[]>('items', { default: () => [] })
const selection = defineModel<NativeCollectionKey[]>('selected', { default: () => [] })
const emit = defineEmits<{ remove: [id: NativeCollectionKey] }>()
const { theme, direction } = useNativeUI()
const tags = new Map<NativeCollectionKey, { focus: () => boolean }>()
const leaving = new Set<NativeCollectionKey>()

function record(id: NativeCollectionKey, element: unknown) {
  if (element && typeof element === 'object' && 'focus' in element) tags.set(id, element as { focus: () => boolean })
  else {
    tags.delete(id)
    leaving.delete(id)
  }
}

function select(item: NativeTagItem) {
  if (props.disabled || item.disabled || leaving.has(item.id)) return
  selection.value = toggleCollectionSelection(selection.value, item.id, props.selectionMode)
}

function remove(id: NativeCollectionKey) {
  leaving.delete(id)
  const index = items.value.findIndex(item => Object.is(item.id, id))
  if (index < 0) return
  items.value = items.value.filter(item => !Object.is(item.id, id))
  if (isSelected(selection.value, id)) selection.value = selection.value.filter(key => !Object.is(key, id))
  emit('remove', id)
  void nextTick(() => {
    const next = tagRemovalTarget(items.value, index, leaving)
    if (next) tags.get(next.id)?.focus()
  })
}
</script>

<template>
  <StackLayout>
    <SNativeText v-if="label" :text="label" heading :marginBottom="theme.geometry.space1" />
    <FlexboxLayout
      v-if="items.length"
      direction="ltr"
      flexWrap="wrap"
      :flexDirection="direction === 'rtl' ? 'row-reverse' : 'row'"
    >
      <SNativeTag
        v-for="item in items"
        :key="item.id"
        :ref="(element: unknown) => record(item.id, element)"
        :label="item.label"
        :disabled="disabled || item.disabled"
        :selected="isSelected(selection, item.id)"
        :selectable="selectionMode !== 'none'"
        :removable="item.removable ?? removable"
        :removeLabel="removeLabel?.(item)"
        :size="size"
        :variant="variant"
        :marginRight="direction === 'rtl' ? 0 : theme.geometry.space1"
        :marginLeft="direction === 'rtl' ? theme.geometry.space1 : 0"
        :marginBottom="theme.geometry.space1"
        @select="select(item)"
        @remove-start="leaving.add(item.id)"
        @remove="remove(item.id)"
      >
        <template v-if="$slots.item" #default="state"><slot name="item" :item="item" v-bind="state" /></template>
      </SNativeTag>
    </FlexboxLayout>
    <slot v-else name="empty"><SNativeText v-if="emptyText" :text="emptyText" tone="muted" /></slot>
  </StackLayout>
</template>
