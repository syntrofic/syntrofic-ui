<script setup lang="ts">
import { computed, nextTick, provide, useTemplateRef, watch } from 'vue'
import { breadcrumbSeparator } from '../internal/breadcrumb-context'
import { useAnimatedLayout } from '../internal/motion'
import SBreadcrumbItem from './SBreadcrumbItem.vue'
import type { BreadcrumbItem } from '../types'

const props = withDefaults(defineProps<{
  items?: readonly BreadcrumbItem[]; label?: string; separator?: string; variant?: 'default' | 'supporting'
}>(), { label: 'Breadcrumbs', separator: '/' })
const emit = defineEmits<{ activate: [item: BreadcrumbItem, event: MouseEvent]; action: [item: BreadcrumbItem, id: string] }>()
provide(breadcrumbSeparator, computed(() => props.separator))
const path = useTemplateRef<HTMLOListElement>('path')
const capture = useAnimatedLayout({ scope: path })
const authoredCurrent = computed(() => props.items?.some(item => item.current !== undefined) ?? false)
watch([() => props.items?.map(item => [item.id, item.label, item.icon, item.current]), () => props.separator, () => props.variant], () => {
  void nextTick(capture())
})
</script>

<template>
  <nav class="sy-crumbs" :data-variant="variant" :aria-label="label">
    <ol ref="path" class="sy-crumbs__path" role="list">
      <slot>
        <SBreadcrumbItem v-for="(item, index) in items" :key="item.id" v-bind="item"
          :current="authoredCurrent ? item.current : index === items!.length - 1"
          @activate="emit('activate', item, $event)" @action="emit('action', item, $event)">
          <template v-if="$slots.separator" #separator><slot name="separator" /></template>
          <template v-if="$slots.item" #default><slot name="item" :item="item" /></template>
        </SBreadcrumbItem>
      </slot>
    </ol>
  </nav>
</template>
