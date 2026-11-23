<script setup lang="ts">
import { computed } from 'nativescript-vue'
import type { NativeButtonSize } from '../button'
import type { NativeCollectionNavigation } from '../collection-keys'
import { isSelected, toggleCollectionSelection, type NativeCollectionItem, type NativeCollectionKey } from '../collection-state'
import { useNativeUI } from '../context'
import SNativeToggleButton from './SNativeToggleButton.vue'

const props = withDefaults(defineProps<{
  items: readonly NativeCollectionItem[]
  label?: string
  defaultSelected?: readonly NativeCollectionKey[]
  selectionMode?: 'single' | 'multiple'
  orientation?: 'horizontal' | 'vertical'
  size?: NativeButtonSize
  detached?: boolean
  allowEmpty?: boolean
  fullWidth?: boolean
  disabled?: boolean
}>(), { selectionMode: 'single', orientation: 'horizontal', size: 'md', allowEmpty: true })
const model = defineModel<readonly NativeCollectionKey[]>('selected')
const emit = defineEmits<{ change: [value: NativeCollectionKey[]] }>()
defineSlots<{ start(props: { item: NativeCollectionItem; selected: boolean; color: string }): unknown }>()
const { theme, direction } = useNativeUI()
const children = new Map<NativeCollectionKey, InstanceType<typeof SNativeToggleButton>>()
const selected = computed(() => {
  let allowed = (model.value ?? props.defaultSelected ?? []).filter(key => props.items.some(item => Object.is(item.id, key)))
  if (!allowed.length && !props.allowEmpty) {
    const initial = props.items.find(item => !item.disabled)
    if (initial) allowed = [initial.id]
  }
  return props.selectionMode === 'single' ? allowed.slice(0, 1) : allowed
})
const vertical = computed(() => props.orientation === 'vertical')
const divisions = computed(() => props.items.map(() => props.fullWidth ? '*' : 'auto').join(','))
const gap = computed(() => props.detached ? 4 : 1)

function remember(key: NativeCollectionKey, control: unknown) {
  if (control) children.set(key, control as InstanceType<typeof SNativeToggleButton>)
  else children.delete(key)
}

function select(item: NativeCollectionItem) {
  if (props.disabled || item.disabled) return
  const next = toggleCollectionSelection(selected.value, item.id, props.selectionMode, props.allowEmpty)
  if (selected.value.length === next.length && selected.value.every((key, i) => Object.is(next[i], key))) return
  model.value = next
  emit('change', next)
}

function navigate(key: NativeCollectionNavigation, item: NativeCollectionItem) {
  const enabled = props.items.filter(option => !option.disabled)
  const index = enabled.indexOf(item)
  if (props.disabled || index < 0) return false
  let next: number
  if (key === 'first') next = 0
  else if (key === 'last') next = enabled.length - 1
  else if (vertical.value && (key === 'previous' || key === 'next')) next = index + (key === 'next' ? 1 : -1)
  else if (!vertical.value && (key === 'left' || key === 'right')) next = index + ((key === 'right') !== (direction.value === 'rtl') ? 1 : -1)
  else return false
  return children.get(enabled[(next + enabled.length) % enabled.length].id)?.focus() ?? false
}
</script>

<template>
  <GridLayout :columns="vertical ? '*' : divisions" :rows="vertical ? divisions : 'auto'"
    :horizontalAlignment="fullWidth ? 'stretch' : direction === 'rtl' ? 'right' : 'left'"
    :accessibilityLabel="label"
    :backgroundColor="detached ? 'transparent' : theme.colors.surface"
    :borderRadius="theme.geometry.radiusMd" cornerShape="squircle" :clipToBounds="!detached">
    <SNativeToggleButton v-for="(item, index) in items" :key="item.id" :ref="value => remember(item.id, value)"
      :row="vertical ? index : 0" :col="vertical ? 0 : index"
      :marginLeft="!vertical && index && direction !== 'rtl' ? gap : 0"
      :marginRight="!vertical && index && direction === 'rtl' ? gap : 0"
      :marginTop="vertical && index ? gap : 0"
      :label="item.label" :selected="isSelected(selected, item.id)" :disabled="disabled || item.disabled"
      :size="size" :fullWidth="fullWidth" :radius="detached ? undefined : theme.geometry.radiusSm"
      :variant="detached ? 'solid' : 'ghost'" :navigate="key => navigate(key, item)" @update:selected="select(item)">
      <template v-if="$slots.start" #start="state"><slot name="start" :item="item" v-bind="state" /></template>
    </SNativeToggleButton>
  </GridLayout>
</template>
