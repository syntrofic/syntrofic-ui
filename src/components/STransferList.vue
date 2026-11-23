<script lang="ts">
export interface TransferItem {
  id: string
  label: string
  description?: string
  group?: string
  disabled?: boolean
  disabledMessage?: string
  reorderable?: boolean
}
export interface TransferListProps<Item extends TransferItem> {
  items: readonly Item[]
  label?: string
  description?: string
  labelHidden?: boolean
  availableLabel?: string
  selectedLabel?: string
  addLabel?: string
  removeLabel?: string
  addItemLabel?: string
  removeItemLabel?: string
  addAllLabel?: string
  clearLabel?: string
  filterLabel?: string
  filterPlaceholder?: string
  emptyLabel?: string
  selectedEmptyText?: string
  availableEmptyText?: string
  noResultsText?: string
  disabled?: boolean
  searchable?: boolean
  selectionMode?: 'checkbox' | 'direct'
  searchMode?: 'columns' | 'shared'
  hasSelectAll?: boolean
  hasClear?: boolean
  reorderable?: boolean
  canReorder?: (item: Item) => boolean
  reorderLabel?: string
  moveUpLabel?: string
  moveDownLabel?: string
  selectedCountLabel?: (count: number) => string
  loading?: boolean
  loadingText?: string
  pending?: boolean
  error?: string
  retry?: () => void
  retryLabel?: string
  animate?: boolean
}
</script>

<script setup lang="ts" generic="Item extends TransferItem">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import { createReorderable, type ReorderMove } from '../internal/reorderable'
import { useTransferMotion } from '../internal/transfer-motion'
import SButton from './SButton.vue'
import SCheckbox from './SCheckbox.vue'
import SInput from './SInput.vue'
import SMotionText from './SMotionText.vue'
import SSkeleton from './SSkeleton.vue'
import SSpinner from './SSpinner.vue'

type Side = 'available' | 'selected'
type Row = { key: string; title: string; item?: undefined } | { key: string; item: Item; title?: undefined }
const props = withDefaults(defineProps<TransferListProps<Item>>(), {
  availableLabel: 'Available', selectedLabel: 'Selected', addLabel: 'Add selected', removeLabel: 'Remove selected',
  addItemLabel: 'Add', removeItemLabel: 'Remove', addAllLabel: 'Add all', clearLabel: 'Clear',
  filterLabel: 'Filter items', emptyLabel: 'No items', noResultsText: 'No results', searchable: true,
  selectionMode: 'checkbox', searchMode: 'columns', reorderLabel: 'Reorder', moveUpLabel: 'Move up', moveDownLabel: 'Move down',
  selectedCountLabel: (count: number) => `${count} selected`,
  loadingText: 'Loading options', retryLabel: 'Retry', animate: true,
})
const model = defineModel<string[]>({ default: () => [] })
defineSlots<{ item?(props: { item: Item; selected: boolean }): unknown }>()
const id = `sy-transfer-${useId()}`
const root = useTemplateRef<HTMLDivElement>('root')
const lists = useTemplateRef<HTMLUListElement[]>('lists')
const feedback = useTemplateRef<HTMLDivElement>('feedback')
const chosen = ref<string[]>([])
const queries = ref({ available: '', selected: '', shared: '' })
const keyboardItem = ref<string>()
const announcement = ref('')
const locked = computed(() => props.disabled || props.pending || props.loading)
const items = computed(() => new Map(props.items.map(item => [item.id, item])))
const selection = computed(() => new Set(model.value))
const checked = computed(() => new Set(chosen.value))
const selectedList = computed(() => lists.value?.find(list => list.dataset.transferSide === 'selected'))
const activeFeedback = computed(() => props.loading ? 'loading' : props.error ? 'error' : '')
const normalize = (value: string) => value.trim().toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
const termFor = (key: Side) => props.searchable ? normalize(queries.value[props.searchMode === 'shared' ? 'shared' : key]) : ''
const showOrder = computed(() => props.reorderable && !termFor('selected'))
const ordering = computed(() => showOrder.value && !locked.value)
const canOrder = (item: Item) => item.reorderable !== false && props.canReorder?.(item) !== false
const ordered = computed(() => [...selection.value].flatMap(key => {
  const item = items.value.get(key)
  return item ? [item] : []
}))
const movable = computed(() => ordered.value.filter(canOrder).map(item => item.id))
const groups = computed(() => [
  { key: 'available' as const, label: props.availableLabel, action: props.addLabel, actionOne: props.addItemLabel, bulk: props.hasSelectAll && props.addAllLabel,
    items: [...items.value.values()].filter(item => !selection.value.has(item.id)), empty: props.availableEmptyText },
  { key: 'selected' as const, label: props.selectedLabel, action: props.removeLabel, actionOne: props.removeItemLabel, bulk: props.hasClear && props.clearLabel,
    items: ordered.value, empty: props.selectedEmptyText },
].map(group => {
  const term = termFor(group.key)
  const visible = group.items.filter(item => !term || [item.label, item.description, item.group].some(value => value && normalize(value).includes(term)))
  return { ...group, visible, rows: records(visible, group.key === 'available'),
    active: visible.filter(item => !item.disabled && checked.value.has(item.id)).map(item => item.id),
    all: group.items.filter(item => !item.disabled).map(item => item.id),
    empty: term && group.items.length ? props.noResultsText : group.empty ?? props.emptyLabel }
}))

function records(list: readonly Item[], grouped: boolean): Row[] {
  if (!grouped) return list.map(item => ({ key: `item-${item.id}`, item }))
  const buckets = new Map<string, Item[]>()
  for (const item of list) {
    const name = item.group ?? ''
    const bucket = buckets.get(name)
    if (bucket) bucket.push(item)
    else buckets.set(name, [item])
  }
  return [...buckets].flatMap(([title, bucket]) => [
    ...(title ? [{ key: `group-${title}`, title }] : []), ...bucket.map(item => ({ key: `item-${item.id}`, item })),
  ])
}

function check(key: string, value: boolean) {
  if (locked.value) return
  chosen.value = value ? [...new Set([...chosen.value, key])] : chosen.value.filter(id => id !== key)
}
function pane(side: Side) { return lists.value?.find(list => list.dataset.transferSide === side) }
function returnToPane(side: Side, index: number) {
  void nextTick(() => {
    const list = pane(side)
    const buttons = list?.querySelectorAll<HTMLElement>('[data-transfer-action]:not([data-unavailable])')
    const option = buttons?.[Math.min(index, (buttons?.length ?? 0) - 1)]
    const input = root.value?.querySelector<HTMLElement>(`[data-transfer-search="${props.searchMode === 'shared' ? 'shared' : side}"]`)
    const target = option ?? input ?? list
    target?.focus({ preventScroll: true })
    option?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  })
}
function transfer(ids: readonly string[], side: Side, focus?: HTMLElement) {
  if (locked.value) return
  const add = side === 'available'
  const permitted = ids.filter(key => items.value.has(key) && !items.value.get(key)?.disabled && selection.value.has(key) !== add)
  if (!permitted.length) return
  const index = focus ? [...(pane(side)?.querySelectorAll('[data-transfer-action]:not([data-unavailable])') ?? [])].indexOf(focus) : -1
  const changed = new Set(permitted)
  const next = add ? [...new Set([...model.value, ...permitted])] : model.value.filter(key => !changed.has(key))
  model.value = next
  chosen.value = chosen.value.filter(key => !changed.has(key))
  announcement.value = props.selectedCountLabel(next.length)
  if (index >= 0) returnToPane(side, index)
}
function focusHandle(key: string) {
  void nextTick(() => {
    const row = [...(selectedList.value?.children ?? [])].find(node => (node as HTMLElement).dataset.transferId === key)
    row?.querySelector<HTMLElement>('[data-reorder-handle]')?.focus({ preventScroll: true })
  })
}
function reorder({ key, target, placement, input }: ReorderMove) {
  if (!ordering.value) return
  const order = [...movable.value]
  if (!order.includes(key) || !order.includes(target) || target === key) return
  const before = [...order]
  order.splice(order.indexOf(key), 1)
  order.splice(order.indexOf(target) + Number(placement === 'after'), 0, key)
  if (before.every((value, index) => value === order[index])) return
  const slots = new Set(before)
  let index = 0
  model.value = [...selection.value].map(value => slots.has(value) ? order[index++] : value)
  announcement.value = `${items.value.get(key)?.label} ${order.indexOf(key) + 1} / ${order.length}`
  if (input === 'keyboard') focusHandle(key)
}
function moveBy(key: string, delta: number) {
  const target = movable.value[movable.value.indexOf(key) + delta]
  if (target) reorder({ key, target, placement: delta < 0 ? 'before' : 'after', input: 'keyboard' })
}
function reorderKeys(event: KeyboardEvent) {
  const key = keyboardItem.value
  if (!key || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return
  if (!(event.target instanceof Element) || event.target.closest('[data-transfer-id]')?.getAttribute('data-transfer-id') !== key) return
  if (event.key === 'Escape') { keyboardItem.value = undefined; focusHandle(key) }
  else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') moveBy(key, event.key === 'ArrowUp' ? -1 : 1)
  else return
  event.preventDefault()
  event.stopPropagation()
}
let dragged = false
watch([selectedList, ordering], ([list, active], _, cleanup) => {
  if (!list || !active) return
  cleanup(createReorderable(list, { scrollRoot: list, onMove: move => { dragged = move.input === 'pointer'; reorder(move) } }))
}, { flush: 'post' })
watch([ordering, movable], ([active, keys]) => { if (!active || !keys.includes(keyboardItem.value ?? '')) keyboardItem.value = undefined })
watch(() => props.items, () => { chosen.value = chosen.value.filter(key => items.value.has(key)) })
watch(activeFeedback, () => {
  const notice = feedback.value
  if (notice?.contains(notice.ownerDocument.activeElement)) root.value?.focus({ preventScroll: true })
})
useTransferMotion(root, () => groups.value, () => props.animate)
function hide(element: Element) { element.setAttribute('inert', ''); element.setAttribute('aria-hidden', 'true') }
</script>

<template>
  <div ref="root" class="sy-transfer-list" :data-animated="animate || undefined" tabindex="-1" :role="label ? 'group' : undefined"
    :aria-labelledby="label ? `${id}-label` : undefined" :aria-describedby="description ? `${id}-description` : undefined"
    :aria-busy="loading || pending || undefined" :aria-disabled="disabled || undefined">
    <div v-if="label || description" class="sy-transfer-list__heading">
      <strong v-if="label" :id="`${id}-label`" :class="{ 'sy-visually-hidden': labelHidden }">{{ label }}</strong>
      <p v-if="description" :id="`${id}-description`">{{ description }}</p>
    </div>
    <SInput v-if="searchable && searchMode === 'shared'" v-model="queries.shared" class="sy-transfer-list__search"
      :aria-label="filterLabel" data-transfer-search="shared" :placeholder="filterPlaceholder ?? filterLabel" :disabled="disabled" :readonly="loading || pending" />
    <div class="sy-transfer-list__panes">
      <section v-for="group in groups" :key="group.key" class="sy-transfer-list__column" :aria-label="group.label">
        <header class="sy-transfer-list__header">
          <h3>{{ group.label }} <span aria-hidden="true">(<SMotionText v-if="animate" :value="String(group.items.length)" motion="roll" /><template v-else>{{ group.items.length }}</template>)</span></h3>
          <SButton v-if="group.bulk" size="sm" variant="ghost" :aria-disabled="locked || !group.all.length || undefined"
            @click="transfer(group.all, group.key)">{{ group.bulk }}</SButton>
        </header>
        <SInput v-if="searchable && searchMode === 'columns'" v-model="queries[group.key]" :data-transfer-search="group.key"
          :aria-label="`${filterLabel} · ${group.label}`" :placeholder="filterPlaceholder ?? filterLabel" :disabled="disabled" :readonly="loading || pending" />
        <ul ref="lists" role="list" tabindex="-1" :aria-label="group.label" :data-transfer-side="group.key" @keydown="reorderKeys" @pointerdown="dragged = false">
          <TransitionGroup name="sy-transfer-row" :css="animate" @leave="(_element, done) => done()">
            <li v-for="row in group.rows" :key="row.key" :class="row.item ? 'sy-transfer-list__row' : 'sy-transfer-list__group'"
              :data-transfer-id="row.item?.id" :data-reorder-key="row.item && group.key === 'selected' && ordering && canOrder(row.item) ? row.item.id : undefined"
              :data-reordering="row.item && keyboardItem === row.item.id || undefined">
              <template v-if="row.item">
                <div class="sy-transfer-list__option">
                  <SCheckbox v-if="selectionMode === 'checkbox'" :model-value="checked.has(row.item.id)" :disabled="locked || row.item.disabled"
                    :aria-label="row.item.label" @update:model-value="check(row.item.id, $event === true)">
                    <slot name="item" :item="row.item" :selected="group.key === 'selected'">{{ row.item.label }}</slot>
                  </SCheckbox>
                  <span v-else class="sy-transfer-list__item-label"><slot name="item" :item="row.item" :selected="group.key === 'selected'">{{ row.item.label }}</slot></span>
                  <small v-if="row.item.description">{{ row.item.description }}</small>
                  <small v-if="row.item.disabled && row.item.disabledMessage" :id="`${id}-${group.key}-reason-${group.rows.indexOf(row)}`">{{ row.item.disabledMessage }}</small>
                </div>
                <div v-if="selectionMode === 'direct' || group.key === 'selected' && showOrder" class="sy-transfer-list__actions">
                  <SButton v-if="selectionMode === 'direct'" size="sm" variant="secondary" data-transfer-action
                    :data-unavailable="row.item.disabled || undefined" :aria-disabled="locked || row.item.disabled || undefined"
                    :aria-label="`${group.actionOne} ${row.item.label}`"
                    :aria-describedby="row.item.disabled && row.item.disabledMessage ? `${id}-${group.key}-reason-${group.rows.indexOf(row)}` : undefined"
                    @click="transfer([row.item.id], group.key, $event.currentTarget as HTMLElement)"><span aria-hidden="true">{{ group.key === 'available' ? '+' : '−' }}</span></SButton>
                  <template v-if="group.key === 'selected' && showOrder && canOrder(row.item)">
                    <SButton size="sm" variant="ghost" data-reorder-handle :aria-label="`${reorderLabel} ${row.item.label}`"
                      :aria-disabled="!ordering || undefined" aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" :aria-pressed="keyboardItem === row.item.id"
                      @click="ordering && (!$event.detail || !dragged) && (keyboardItem = keyboardItem === row.item.id ? undefined : row.item.id)"><span aria-hidden="true">☰</span></SButton>
                    <template v-if="keyboardItem === row.item.id">
                      <SButton size="sm" variant="ghost" :aria-disabled="movable[0] === row.item.id || undefined" :aria-label="moveUpLabel" @click="moveBy(row.item.id, -1)"><span aria-hidden="true">↑</span></SButton>
                      <SButton size="sm" variant="ghost" :aria-disabled="movable.at(-1) === row.item.id || undefined" :aria-label="moveDownLabel" @click="moveBy(row.item.id, 1)"><span aria-hidden="true">↓</span></SButton>
                    </template>
                  </template>
                </div>
              </template>
              <span v-else>{{ row.title }}</span>
            </li>
            <li v-if="!group.visible.length" key="empty" class="sy-transfer-list__empty">
              <div v-if="loading && !items.size" class="sy-transfer-list__skeleton" aria-hidden="true">
                <SSkeleton v-for="(size, index) in ['70%', '85%', '63%']" :key="size" shape="line" :width="size" height=".65rem" :index="index" :animated="animate" />
              </div>
              <template v-else>{{ group.empty }}</template>
            </li>
          </TransitionGroup>
        </ul>
        <SButton v-if="selectionMode === 'checkbox'" size="sm" variant="secondary" :aria-disabled="locked || !group.active.length || undefined"
          @click="transfer(group.active, group.key)">{{ group.action }}</SButton>
      </section>
    </div>
    <Transition name="sy-transfer-row" :css="animate" @before-leave="hide">
      <div v-if="activeFeedback" :key="activeFeedback" ref="feedback" class="sy-transfer-list__feedback">
        <SSpinner v-if="loading" :label="loadingText" size="sm" show-label />
        <template v-else><span role="alert">{{ error }}</span><SButton v-if="retry" size="sm" variant="secondary" @click="retry">{{ retryLabel }}</SButton></template>
      </div>
    </Transition>
    <span class="sy-visually-hidden" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
