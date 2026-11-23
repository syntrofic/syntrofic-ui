<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import SSideNavItem from '../components/SSideNavItem.vue'
import { useAnimatedLayout } from './motion'
import type { NavigationItem } from './shell-layout'

const props = defineProps<{
  items: readonly NavigationItem[]
  rail: boolean
  isCurrent: (item: NavigationItem) => boolean
  expandLabel: string
}>()
defineSlots<{
  default?: (scope: { item: NavigationItem; rail: boolean }) => unknown
  rail?: (scope: { item: NavigationItem }) => unknown
  end?: (scope: { item: NavigationItem }) => unknown
  actions?: (scope: { item: NavigationItem }) => unknown
}>()
const emit = defineEmits<{ activate: [item: NavigationItem, event: MouseEvent] }>()
const list = useTemplateRef<HTMLUListElement>('list')
const capture = useAnimatedLayout({ scope: list })
watch(() => props.items.map(item => item.id), () => { void nextTick(capture()) })
</script>

<template>
  <ul ref="list" class="sy-sidebar__list" role="list">
    <SSideNavItem v-for="item in items" :key="item.id" :label="item.label" :href="item.href" :target="item.target"
      :disabled="item.disabled" :current="isCurrent(item)" :rail="rail" :short-label="item.shortLabel"
      :icon="item.icon" :selected-icon="item.selectedIcon" :collapsible="Boolean(item.children?.length)"
      :expand-label="expandLabel" :default-expanded="item.defaultExpanded ?? false" @activate="emit('activate', item, $event)">
      <template #default><slot :item="item" :rail="rail">{{ item.label }}</slot></template>
      <template v-if="$slots.rail" #rail><slot name="rail" :item="item" /></template>
      <template v-if="$slots.end" #end><slot name="end" :item="item" /></template>
      <template v-if="$slots.actions" #actions><slot name="actions" :item="item" /></template>
      <template v-if="item.children?.length" #children>
        <SSidebarItems :items="item.children" :rail="rail" :is-current="isCurrent" :expand-label="expandLabel"
          @activate="(entry, event) => emit('activate', entry, event)">
          <template #default="scope"><slot v-bind="scope">{{ scope.item.label }}</slot></template>
          <template v-if="$slots.rail" #rail="scope"><slot name="rail" v-bind="scope" /></template>
          <template v-if="$slots.end" #end="scope"><slot name="end" v-bind="scope" /></template>
          <template v-if="$slots.actions" #actions="scope"><slot name="actions" v-bind="scope" /></template>
        </SSidebarItems>
      </template>
    </SSideNavItem>
  </ul>
</template>
