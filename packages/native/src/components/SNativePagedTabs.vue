<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'nativescript-vue'
import { activeCollectionItem, type NativeCollectionKey } from '../collection-state'
import type { NativePagedTabsOptions, NativeTabItem } from '../navigation'
import SNativePager from './SNativePager.vue'
import SNativeTabRail from './SNativeTabRail.vue'

const props = withDefaults(defineProps<NativePagedTabsOptions & {
  variant?: 'filled' | 'line' | 'morph'
  compactWidth?: number
}>(), { variant: 'filled', tabPlacement: 'top', lazy: true, keepAlive: true, swipeEnabled: true, animated: true })
const model = defineModel<NativeCollectionKey>()
const emit = defineEmits<{ change: [key: NativeCollectionKey]; progress: [position: number]; settled: [] }>()
defineSlots<{
  default(props: { item: NativeTabItem; selected: boolean }): unknown
  placeholder(props: { item: NativeTabItem }): unknown
  trigger(props: { item: NativeTabItem; selected: boolean; progress: number }): unknown
}>()
const pager = useTemplateRef<InstanceType<typeof SNativePager>>('pager')
const selected = computed(() => activeCollectionItem(props.items, model.value ?? props.defaultSelected)?.id)
const position = ref(props.items.findIndex(item => Object.is(item.id, selected.value)))
function choose(key: NativeCollectionKey) {
  if (props.disabled || Object.is(selected.value, key) || !props.items.some(item => Object.is(item.id, key) && !item.disabled)) return false
  model.value = key
  emit('change', key)
  return true
}
function goTo(key: NativeCollectionKey, animated = true) {
  if (choose(key)) pager.value?.goTo(key, animated)
}
function progress(next: number) {
  position.value = selected.value === undefined ? -1 : next
  emit('progress', position.value)
}
watch(selected, key => { if (key === undefined) position.value = -1 })
defineExpose({ goTo })
</script>

<template>
  <GridLayout rows="auto,auto">
    <SNativeTabRail :row="tabPlacement === 'top' ? 0 : 1" :items="items" :label="label" :selected="selected" :position="position"
      :variant="variant" :scrollable="scrollable" :scrollAlign="scrollAlign" :equalWidth="equalWidth" :size="size"
      :separators="separators" :disabled="disabled" :compactWidth="compactWidth" tracking
      @select="goTo">
      <template v-if="$slots.trigger" #trigger="trigger"><slot name="trigger" v-bind="trigger" /></template>
    </SNativeTabRail>
    <SNativePager ref="pager" :row="tabPlacement === 'top' ? 1 : 0" :items="items" :selected="selected" :height="pagerHeight"
      :marginTop="tabPlacement === 'top' ? 6 : 0" :marginBottom="tabPlacement === 'bottom' ? 6 : 0"
      :disabled="disabled" :swipeEnabled="swipeEnabled" :animated="animated" :lazy="lazy" :keepAlive="keepAlive"
      @change="choose" @progress="progress" @settled="emit('settled')">
      <template #default="page"><slot v-bind="page" /></template>
      <template v-if="$slots.placeholder" #placeholder="page"><slot name="placeholder" v-bind="page" /></template>
    </SNativePager>
  </GridLayout>
</template>
