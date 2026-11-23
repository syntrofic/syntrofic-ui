<script setup lang="ts" generic="Item">
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/vue-virtual'
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef, watch, type ComponentPublicInstance } from 'vue'
import { gridFold } from '../internal/data-grid'
import { treeElementKey } from '../internal/tree-data'
import { validLinkDestination } from '../internal/link-component'
import type { TableKey } from '../types'
import SCheckbox from './SCheckbox.vue'
import SFocusGroup from './SFocusGroup.vue'
import SLink from './SLink.vue'

const props = withDefaults(defineProps<{
  label: string
  items: readonly Item[]
  getKey: (item: Item) => TableKey
  getText: (item: Item) => string
  getDescription?: (item: Item) => string | undefined
  getGroup?: (item: Item) => string | undefined
  getHref?: (item: Item) => string | undefined
  disabledKeys?: readonly TableKey[]
  isDisabled?: (item: Item) => boolean
  selectionMode?: 'none' | 'single' | 'multiple'
  selectionBehavior?: 'toggle' | 'replace'
  defaultSelected?: readonly TableKey[]
  selectionControls?: boolean
  pressable?: boolean
  variant?: 'primary' | 'secondary'
  virtualized?: boolean
  rowHeight?: number
  height?: number
  loading?: boolean
  locale?: string
  emptyText?: string
  loadingText?: string
}>(), {
  selectionMode: 'none', selectionBehavior: 'toggle', selectionControls: true, variant: 'primary',
  rowHeight: 48, height: 280, emptyText: 'No items', loadingText: 'Loading', defaultSelected: () => [], disabledKeys: () => [],
})
const model = defineModel<readonly TableKey[]>('selected')
const emit = defineEmits<{ action: [item: Item, key: TableKey, event: Event] }>()
defineSlots<{
  default(props: { item: Item; selected: boolean; disabled: boolean }): unknown
  action(props: { item: Item; selected: boolean; disabled: boolean }): unknown
  group(props: { name: string }): unknown
  empty(): unknown
  loading(): unknown
  footer(props: { selected: readonly TableKey[]; clear: () => void }): unknown
}>()

type Row = { type: 'item'; key: TableKey; id: string; group?: string; item: Item } | { type: 'heading'; id: string; group: string }
const root = useTemplateRef<HTMLElement>('root')
const view = useTemplateRef<HTMLDivElement>('view')
const id = `sy-list-view-${useId()}`
const selected = computed(() => model.value ?? props.defaultSelected)
const selectedKeys = computed(() => new Set(selected.value))
const disabledKeys = computed(() => new Set(props.disabledKeys))
const active = ref<TableKey>()
const anchored = ref<TableKey>()
const virtualPin = ref<TableKey>()
const controls = computed(() => props.selectionMode !== 'none' && props.selectionControls)
const usableHeight = computed(() => Number.isFinite(props.height) && props.height > 0 ? props.height : 280)
const estimate = computed(() => Number.isFinite(props.rowHeight) && props.rowHeight > 0 ? props.rowHeight : 48)
let search = ''
let searchTimer: ReturnType<typeof setTimeout> | undefined
let focusRequest = 0

const rows = computed<Row[]>(() => {
  const sections = new Map<string | undefined, Item[]>()
  for (const item of props.items) {
    const group = props.getGroup?.(item)
    const members = sections.get(group) ?? []
    members.push(item)
    sections.set(group, members)
  }
  const list: Row[] = []
  for (const [group, items] of sections) {
    if (group !== undefined) list.push({ type: 'heading', id: `${id}-group-${encodeURIComponent(group)}`, group })
    for (const item of items) {
      const key = props.getKey(item)
      list.push({ type: 'item', item, key, id: `${id}-${encodeURIComponent(treeElementKey(key))}`, group })
    }
  }
  return list
})
const available = computed(() => rows.value.filter((row): row is Extract<Row, { type: 'item' }> => row.type === 'item' && !disabled(row.item)))
const activeKey = computed(() => available.value.some(row => row.key === active.value) ? active.value : available.value[0]?.key)
const engine = useVirtualizer<HTMLElement, HTMLElement>(computed(() => {
  const items = rows.value
  const pinned = items.findIndex(row => row.type === 'item' && row.key === virtualPin.value)
  return {
    enabled: props.virtualized,
    getScrollElement: () => view.value,
    count: items.length,
    initialRect: { width: 0, height: usableHeight.value },
    estimateSize: index => items[index]?.type === 'heading' ? 28 : estimate.value,
    getItemKey: index => items[index]?.id ?? index,
    rangeExtractor: range => {
      const indices = defaultRangeExtractor(range)
      return pinned < 0 || indices.includes(pinned) ? indices : [...indices, pinned].sort((a, b) => a - b)
    },
    useAnimationFrameWithResizeObserver: true,
    overscan: 4,
  }
}))
const rendered = computed(() => !props.virtualized ? rows.value.map((row, index) => ({ row, index, top: undefined })) :
  engine.value.getVirtualItems().flatMap(item => rows.value[item.index] ? [{ row: rows.value[item.index], index: item.index, top: item.start }] : []))
watch(() => rows.value.length, (count, previous) => {
  if (!props.virtualized || count > 0 && previous > 0) return
  focusRequest++
  virtualPin.value = undefined
  active.value = undefined
  if (view.value) view.value.scrollTop = 0
  engine.value.scrollToOffset(0)
}, { flush: 'post' })

function disabled(item: Item) { return props.loading || disabledKeys.value.has(props.getKey(item)) || Boolean(props.isDisabled?.(item)) }

function measure(node: Element | ComponentPublicInstance | null) {
  if (props.virtualized && node instanceof HTMLElement) engine.value.measureElement(node)
}

async function focus(key: TableKey) {
  const row = rows.value.find(entry => entry.type === 'item' && entry.key === key)
  if (!row) return
  const request = ++focusRequest
  if (props.virtualized) engine.value.scrollToIndex(rows.value.indexOf(row), { align: 'auto' })
  virtualPin.value = key
  active.value = key
  await nextTick()
  if (request !== focusRequest) return
  root.value?.ownerDocument.getElementById(row.id)?.focus({ preventScroll: props.virtualized })
}

function setSelection(item: Item, event: Pick<MouseEvent, 'shiftKey' | 'ctrlKey' | 'metaKey'>, explicit?: boolean) {
  if (props.selectionMode === 'none' || disabled(item)) return
  const key = props.getKey(item)
  const next = new Set(selected.value)
  if (props.selectionMode === 'single' || (props.selectionBehavior === 'replace' && explicit === undefined && !event.ctrlKey && !event.metaKey && !event.shiftKey)) {
    model.value = explicit === false || (props.selectionBehavior === 'toggle' && next.has(key) && !explicit) ? [] : [key]
  } else {
    const index = available.value.findIndex(row => row.key === key)
    const start = available.value.findIndex(row => row.key === anchored.value)
    const keys = event.shiftKey && start >= 0 ? available.value.slice(Math.min(start, index), Math.max(start, index) + 1).map(row => row.key) : [key]
    const pick = explicit ?? (event.shiftKey || !next.has(key))
    for (const value of keys) {
      if (pick) next.add(value)
      else next.delete(value)
    }
    model.value = [...next]
  }
  if (!event.shiftKey) anchored.value = key
}

function activate(row: Extract<Row, { type: 'item' }>, event: Event) {
  const href = props.getHref?.(row.item)
  if (disabled(row.item) || !validLinkDestination(href)) return
  emit('action', row.item, row.key, event)
  if (event.defaultPrevented) return
  const anchor = root.value?.ownerDocument.getElementById(`${row.id}-link`) as HTMLAnchorElement | null
  if (href && anchor && !(event.target instanceof Node && anchor.contains(event.target))) anchor.click()
}

function click(row: Extract<Row, { type: 'item' }>, event: MouseEvent) {
  if (event.defaultPrevented || event.detail > 1 || disabled(row.item) ||
    (event.target as Element).closest('.sy-list-view__right, a[href], input, button')) return
  void focus(row.key)
  if (props.selectionMode !== 'none') setSelection(row.item, event)
  else if (props.pressable || props.getHref?.(row.item)) activate(row, event)
}
function doubleClick(row: Extract<Row, { type: 'item' }>, event: MouseEvent) {
  if (props.selectionMode === 'none' || (event.target as Element).closest('button, a, input')) return
  if (props.pressable || props.getHref?.(row.item)) activate(row, event)
}

function keyboard(row: Extract<Row, { type: 'item' }>, event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing || disabled(row.item)) return
  const node = event.currentTarget as HTMLElement
  if (event.target !== node) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); void focus(row.key) }
    return
  }
  const index = available.value.findIndex(entry => entry.key === row.key)
  const last = available.value.length - 1
  let target = index
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && props.selectionMode === 'multiple') {
    model.value = [...new Set([...selected.value, ...available.value.map(entry => entry.key)])]
  } else if (event.key === 'ArrowDown') target = Math.min(last, index + 1)
  else if (event.key === 'ArrowUp') target = Math.max(0, index - 1)
  else if (event.key === 'PageDown') target = Math.min(last, index + Math.max(1, Math.floor(usableHeight.value / estimate.value)))
  else if (event.key === 'PageUp') target = Math.max(0, index - Math.max(1, Math.floor(usableHeight.value / estimate.value)))
  else if (event.key === 'Home') target = 0
  else if (event.key === 'End') target = last
  else if (event.key === 'F2') {
    node.querySelector<HTMLElement>('.sy-list-view__right :is(button, a[href], input):not(:disabled)')?.focus()
  } else if (event.key === ' ' || event.key === 'Enter') {
    if (event.key === 'Enter' && (props.pressable || props.getHref?.(row.item))) activate(row, event)
    else if (props.selectionMode !== 'none') setSelection(row.item, event)
    else if (props.pressable || props.getHref?.(row.item)) activate(row, event)
  } else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
    clearTimeout(searchTimer)
    search += gridFold(event.key, props.locale)
    const query = search.split('').every(letter => letter === search[0]) ? search[0] : search
    const offset = search.length === 1 || query.length === 1 ? 1 : 0
    for (let step = offset; step <= last + offset; step++) {
      const at = (index + step) % available.value.length
      if (gridFold(props.getText(available.value[at].item), props.locale).startsWith(query)) { target = at; break }
    }
    searchTimer = setTimeout(() => { search = '' }, 540)
  } else return
  event.preventDefault()
  if (target === index || !available.value[target]) return
  if (event.shiftKey && props.selectionMode === 'multiple') setSelection(available.value[target].item, event)
  void focus(available.value[target].key)
}
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <section ref="root" class="sy-list-view" :data-variant="variant" :data-virtual="virtualized || undefined">
    <SFocusGroup>
      <div ref="view" class="sy-list-view__viewport" :style="{ blockSize: virtualized ? `${usableHeight}px` : undefined }"
        @focusout="!view?.contains($event.relatedTarget as Node | null) && (virtualPin = undefined)">
        <div class="sy-list-view__rows" role="grid" :aria-label="label" :aria-rowcount="rows.length"
          :aria-colcount="1" :aria-multiselectable="selectionMode === 'multiple' || undefined" :aria-busy="loading || undefined"
          :style="{ blockSize: virtualized && rows.length ? `${engine.getTotalSize()}px` : undefined }">
          <div v-for="{ row, index, top } in rendered" :id="row.id" :key="row.id" :ref="measure" role="row"
            :style="{ insetBlockStart: top === undefined ? undefined : `${top}px` }"
            :data-index="index" :aria-rowindex="index + 1" :class="row.type === 'heading' ? 'sy-list-view__heading' : 'sy-list-view__row'"
            :aria-label="row.type === 'item' ? getText(row.item) : undefined"
            :aria-disabled="row.type === 'item' && disabled(row.item) || undefined"
            :aria-describedby="row.type === 'item' && row.group !== undefined && !virtualized ? `${id}-group-${encodeURIComponent(row.group)}` : undefined"
            :aria-selected="row.type === 'item' && selectionMode !== 'none' ? selectedKeys.has(row.key) : undefined"
            :data-sy-focus-target="row.type === 'item' && !disabled(row.item) ? '' : undefined"
            :data-pressable="row.type === 'item' && (pressable || controls || getHref?.(row.item)) ? '' : undefined"
            :tabindex="row.type === 'item' && !disabled(row.item) ? (activeKey === row.key ? 0 : -1) : undefined"
            @focus="row.type === 'item' && (active = virtualPin = row.key)"
            @click="row.type === 'item' && click(row, $event)"
            @dblclick="row.type === 'item' && doubleClick(row, $event)"
            @keydown="row.type === 'item' && keyboard(row, $event)">
            <div v-if="row.type === 'heading'" role="columnheader" class="sy-list-view__group-text"><slot name="group" :name="row.group">{{ row.group }}</slot></div>
            <div v-else role="gridcell" class="sy-list-view__cell">
              <SCheckbox v-if="controls" :aria-label="getText(row.item)" :model-value="selectedKeys.has(row.key)" :disabled="disabled(row.item)"
                :tabindex="-1" @update:model-value="setSelection(row.item, { shiftKey: false, ctrlKey: false, metaKey: false }, Boolean($event))" />
              <div class="sy-list-view__text">
                <slot :item="row.item" :selected="selectedKeys.has(row.key)" :disabled="disabled(row.item)">
                  <SLink v-if="getHref?.(row.item) && !disabled(row.item)" :id="`${row.id}-link`" class="sy-list-view__title" :href="getHref(row.item)"
                    tabindex="-1" @click="activate(row, $event)">{{ getText(row.item) }}</SLink>
                  <span v-else class="sy-list-view__title">{{ getText(row.item) }}</span>
                  <span v-if="getDescription?.(row.item)" class="sy-list-view__description">{{ getDescription(row.item) }}</span>
                </slot>
              </div>
              <div v-if="$slots.action" :inert="disabled(row.item)" class="sy-list-view__right">
                <slot name="action" :item="row.item" :selected="selectedKeys.has(row.key)" :disabled="disabled(row.item)" />
              </div>
            </div>
          </div>
        </div>
        <div v-if="loading || !rows.length" class="sy-list-view__message" :role="loading ? 'status' : undefined">
          <slot v-if="loading" name="loading">{{ loadingText }}</slot>
          <slot v-else name="empty">{{ emptyText }}</slot>
        </div>
      </div>
    </SFocusGroup>
    <slot name="footer" :selected="selected" :clear="() => { model = [] }" />
  </section>
</template>
