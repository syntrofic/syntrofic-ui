<script lang="ts">
export interface MetadataEntry {
  id: string
  label: string
  value: string | number
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUpdate, useId, useTemplateRef, watch } from 'vue'
import { useAnimatedLayout } from '../internal/motion'
import SButton from './SButton.vue'
import SMetadataListItem from './SMetadataListItem.vue'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{
  items?: readonly MetadataEntry[]
  title?: string
  label?: string
  limit?: number
  layout?: 'inline' | 'stacked'
  orientation?: 'vertical' | 'horizontal'
  columns?: 'single' | 'multi' | number
  labelWidth?: number | string
  expandLabel?: string
  collapseLabel?: string
}>(), { items: () => [], orientation: 'vertical', columns: 'single', expandLabel: 'Show more', collapseLabel: 'Show less' })
const expanded = defineModel<boolean>('expanded', { default: false })
const limit = computed(() => props.orientation === 'horizontal' ? props.items.length : Math.max(0, Math.trunc(props.limit ?? props.items.length)))
const visible = computed(() => expanded.value ? props.items : props.items.slice(0, limit.value))
const layout = computed(() => props.layout ?? (props.orientation === 'horizontal' || props.columns !== 'single' && props.columns !== 1 ? 'stacked' : 'inline'))
const columns = computed(() => typeof props.columns === 'number' && Number.isFinite(props.columns)
  ? Math.max(1, Math.trunc(props.columns)) : props.columns === 'multi' ? 'auto-fit' : 1)
const width = computed(() => typeof props.labelWidth === 'number' ? Math.max(0, props.labelWidth) + 'px' : props.labelWidth)
const root = useTemplateRef<HTMLElement>('root')
const list = useTemplateRef<HTMLDListElement>('list')
const id = 'sy-metadata-' + useId()
const capture = useAnimatedLayout()
let measurements = new Map<Element, { x: number; y: number; width: number }>()
onBeforeUpdate(() => {
  measurements = new Map()
  if (!list.value) return
  const parent = list.value.getBoundingClientRect()
  for (const element of list.value.children) {
    const row = element.getBoundingClientRect()
    measurements.set(element, { x: row.left - parent.left, y: row.top - parent.top, width: row.width })
  }
})
watch([visible, layout, columns], () => {
  const button = root.value?.querySelector<HTMLElement>('.sy-metadata__toggle')
  if (button) void nextTick(capture([button]))
})

function holdEntry(element: Element) {
  if (!(element instanceof HTMLElement)) return
  const row = measurements.get(element)
  if (row) {
    element.style.setProperty('--sy-meta-x', row.x + 'px')
    element.style.setProperty('--sy-meta-y', row.y + 'px')
    element.style.setProperty('--sy-meta-width', row.width + 'px')
  }
  if (element.contains(element.ownerDocument.activeElement)) {
    const toggle = root.value?.querySelector<HTMLElement>('.sy-metadata__toggle') ?? root.value
    toggle?.focus({ preventScroll: true })
  }
  element.inert = true
}
function releaseEntry(element: Element) {
  if (!(element instanceof HTMLElement)) return
  for (const property of ['--sy-meta-x', '--sy-meta-y', '--sy-meta-width']) element.style.removeProperty(property)
  element.inert = false
}
</script>

<template>
  <section ref="root" class="sy-metadata" :data-layout="layout" :data-orientation="orientation" :data-columns="columns"
    :aria-label="label" :aria-labelledby="!label && title && !$slots.title ? id + '-title' : undefined" tabindex="-1"
    :style="{ '--sy-meta-columns': columns, '--sy-meta-label-width': width }">
    <slot name="title"><h3 v-if="title" :id="id + '-title'">{{ title }}</h3></slot>
    <dl :id="id" ref="list">
      <TransitionGroup name="sy-metadata-entry" @before-leave="holdEntry" @leave-cancelled="releaseEntry">
        <SMetadataListItem v-for="entry in visible" :key="entry.id" :label="entry.label" :value="entry.value">
          <template v-if="$slots.label" #label><slot name="label" :item="entry" /></template>
          <template v-if="$slots.value" #default><slot name="value" :item="entry" /></template>
        </SMetadataListItem>
      </TransitionGroup>
      <slot />
    </dl>
    <SButton v-if="items.length > limit" size="sm" variant="ghost" class="sy-metadata__toggle" :aria-expanded="expanded"
      :aria-controls="id" @click="expanded = !expanded">
      <SMotionText :value="expanded ? collapseLabel : expandLabel" />
    </SButton>
  </section>
</template>
