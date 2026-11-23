<script setup lang="ts">
import { useTemplateRef } from 'nativescript-vue'
import type { NativeCollectionKey } from '../collection-state'
import type { NativePagedTabsOptions } from '../navigation'
import SNativePagedTabs from './SNativePagedTabs.vue'

const props = withDefaults(defineProps<NativePagedTabsOptions & { compactWidth?: number }>(), {
  animated: true, swipeEnabled: true, lazy: true, keepAlive: true,
})
const value = defineModel<NativeCollectionKey>()
const emit = defineEmits<{ change: [key: NativeCollectionKey]; progress: [position: number]; settled: [] }>()
const tabs = useTemplateRef<InstanceType<typeof SNativePagedTabs>>('tabs')
defineExpose({ goTo: (key: NativeCollectionKey, animated = true) => tabs.value?.goTo(key, animated) })
</script>

<template>
  <SNativePagedTabs ref="tabs" v-bind="props" v-model="value" variant="morph"
    @change="emit('change', $event)" @progress="emit('progress', $event)" @settled="emit('settled')">
    <template #default="page"><slot v-bind="page" /></template>
    <template v-if="$slots.trigger" #trigger="part"><slot name="trigger" v-bind="part" /></template>
    <template v-if="$slots.placeholder" #placeholder="page"><slot name="placeholder" v-bind="page" /></template>
  </SNativePagedTabs>
</template>
