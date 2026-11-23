<script lang="ts">
import type { CSSProperties } from 'vue'
import type { FileTreeNode } from '../internal/file-tree'

export interface TreeListItem extends FileTreeNode {
  children?: readonly TreeListItem[]
  expanded?: boolean
  selected?: boolean
  icon?: string
  href?: string
  target?: string
  rowClass?: string
  rowStyle?: CSSProperties
}
</script>

<script setup lang="ts">
import { computed, nextTick, useId, useTemplateRef } from 'vue'
import { contentUrl } from '../internal/content-url'
import { flattenTree } from '../internal/tree-data'
import SFileTree from './SFileTree.vue'
import SIcon from './SIcon.vue'
import SLink from './SLink.vue'

const props = withDefaults(defineProps<{
  items: readonly TreeListItem[]
  label?: string
  density?: 'compact' | 'balanced' | 'spacious'
  variant?: 'lineGuides' | 'noGuides'
  selectionMode?: 'none' | 'single' | 'multiple'
  animatedLayout?: () => void | (() => void)
  direction?: 'ltr' | 'rtl'
  disabled?: boolean
  activateBranches?: boolean
  activateOnClick?: boolean
  emptyText?: string
}>(), { label: 'Tree', density: 'balanced', variant: 'lineGuides', selectionMode: 'single' })
const emit = defineEmits<{ activate: [item: TreeListItem]; expand: [item: TreeListItem, opened: boolean] }>()
defineSlots<{
  header?(): unknown
  start?(scope: { item: TreeListItem; expanded: boolean }): unknown
  label?(scope: { item: TreeListItem; selected: boolean }): unknown
  end?(scope: { item: TreeListItem }): unknown
}>()
const expanded = defineModel<readonly string[]>('expanded')
const selected = defineModel<readonly string[]>('selected')
const root = useTemplateRef<HTMLElement>('root')
const id = `sy-tree-heading-${useId()}`
const entries = computed(() => flattenTree([props.items], item => item.id, item => item.children).map(entry => entry.item))
const initialExpanded = computed(() => entries.value.filter(item => item.expanded).map(item => item.id))
const initialSelected = computed(() => entries.value.filter(item => item.selected).map(item => item.id))
let playLayout: void | (() => void)

function activate(row: FileTreeNode) {
  const item = row as TreeListItem
  const link = [...root.value?.querySelectorAll<HTMLAnchorElement>('[data-sy-tree-link]') ?? []].find(element => element.dataset.syTreeLink === item.id)
  if (link) link.click()
  else emit('activate', item)
}

function follow(item: TreeListItem, event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (props.selectionMode === 'single') selected.value = [item.id]
  emit('activate', item)
}

function captureLayout() {
  playLayout = props.animatedLayout?.()
}

function expansion(item: FileTreeNode, value: boolean) {
  const play = playLayout
  playLayout = undefined
  emit('expand', item as TreeListItem, value)
  if (play) void nextTick(play)
}
</script>

<template>
  <div ref="root" class="sy-tree-list">
    <div v-if="$slots.header" :id="id" class="sy-tree-list__header"><slot name="header" /></div>
    <SFileTree v-model:expanded="expanded" v-model:selected="selected" :items="items" :label="label" :labelledby="$slots.header ? id : undefined"
      :default-expanded="initialExpanded" :default-selected="initialSelected" :selection-mode="selectionMode" flush-flat :direction="direction"
      :size="density === 'compact' ? 'sm' : density === 'spacious' ? 'lg' : 'md'" :guide-lines="variant === 'lineGuides'"
      :disabled="disabled" :activate-branches="activateBranches" :activate-on-click="activateOnClick" :empty-text="emptyText"
      :row-class="row => (row as TreeListItem).rowClass" :row-style="row => (row as TreeListItem).rowStyle"
      @activate="activate" @before-expand="captureLayout" @expand="expansion">
      <template #icon="{ item, expanded: open }">
        <slot name="start" :item="item as TreeListItem" :expanded="open"><SIcon v-if="(item as TreeListItem).icon" :icon="(item as TreeListItem).icon" size="sm" /></slot>
      </template>
      <template #label="{ item, selected: current }">
        <slot name="label" :item="item as TreeListItem" :selected="current">
          <SLink v-if="!disabled && !item.disabled && contentUrl((item as TreeListItem).href)" :href="contentUrl((item as TreeListItem).href)"
            :target="(item as TreeListItem).target" class="sy-tree-list__link" :data-sy-tree-link="item.id" tabindex="-1"
            @click.stop="follow(item as TreeListItem, $event)">{{ item.label }}</SLink>
          <span v-else>{{ item.label }}</span>
        </slot>
      </template>
      <template v-if="$slots.end" #actions="{ item }"><slot name="end" :item="item as TreeListItem" /></template>
    </SFileTree>
  </div>
</template>
