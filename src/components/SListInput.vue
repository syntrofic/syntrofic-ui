<script lang="ts">
export interface ListInputColumn<Item> {
  key: string
  label: string
  width?: string
  read?: (item: Item) => string
  write?: (item: Item, value: string) => Item
}
export interface ListInputChange<Item> { type: 'add' | 'update' | 'remove' | 'move'; item: Item; index: number; from?: number }
</script>

<script setup lang="ts" generic="Item extends object">
import SIcon from './SIcon.vue'
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import SButton from './SButton.vue'
import SEmptyState from './SEmptyState.vue'
import SInput from './SInput.vue'
import SFieldStatus from './SFieldStatus.vue'
import { createAnimator, prefersReducedMotion, useAnimatedLayout } from '../internal/motion'
import { createReorderable } from '../internal/reorderable'
import type { FieldStatus } from '../internal/status-icon'

const props = withDefaults(defineProps<{
  label: string
  description?: string
  itemName?: string
  columns: readonly ListInputColumn<Item>[]
  getItemKey: (item: Item) => string | number
  createItem: () => Item
  status?: FieldStatus
  getItemStatus?: (item: Item, index: number) => FieldStatus | undefined
  getFieldStatus?: (item: Item, column: string, index: number) => FieldStatus | undefined
  reorderable?: boolean
  canReorder?: (item: Item) => boolean
  disabled?: boolean
  loading?: boolean
  maxItems?: number
  labelHidden?: boolean
  required?: boolean
  optional?: boolean
  labels?: Partial<Record<'add' | 'remove' | 'reorder' | 'up' | 'down' | 'done' | 'required' | 'optional' | 'added' | 'removed' | 'moved' | 'empty', string>>
}>(), { itemName: 'item' })
const model = defineModel<readonly Item[]>({ default: () => [] })
const emit = defineEmits<{ change: [items: readonly Item[], change: ListInputChange<Item>] }>()
const id = `sy-list-input-${useId()}`
const list = useTemplateRef<HTMLOListElement>('list')
const addArea = useTemplateRef<HTMLDivElement>('addArea')
const keyboardItem = ref<string>()
const announcement = ref('')
const locked = computed(() => props.disabled || props.loading)
const full = computed(() => props.maxItems !== undefined && model.value.length >= props.maxItems)
const labels = computed(() => ({ add: 'Add', remove: 'Remove', reorder: 'Reorder', up: 'Move up', down: 'Move down', done: 'Done',
  required: 'Required', optional: 'Optional', added: 'Added', removed: 'Removed', moved: 'Moved', empty: 'No records yet', ...props.labels }))
const widths = computed(() => props.columns.map(column => column.width ?? 'minmax(0, 1fr)').join(' '))
const rows = computed(() => model.value.map((item, index) => ({
  item,
  key: keyOf(item),
  status: props.getItemStatus?.(item, index),
  fields: props.columns.map(column => {
    const status = props.getFieldStatus?.(item, column.key, index)
    return { column, status: status && { ...status, variant: status.variant ?? 'attached' } }
  }),
})))
const currentMove = computed(() => rows.value.findIndex(row => row.key === keyboardItem.value))
const capture = useAnimatedLayout()
let pointerMoved = false
let addPointerTop: number | undefined
let addFrame = 0

function keyOf(item: Item) {
  const key = props.getItemKey(item)
  return typeof key + ':' + key
}
function notify(next: readonly Item[], change: ListInputChange<Item>) {
  const play = capture(Array.from(list.value?.children ?? []) as HTMLElement[])
  model.value = next
  emit('change', next, change)
  void nextTick(play)
}
function rowControl(index: number, handle = false) {
  const row = list.value?.children[index]
  const selector = handle ? '[data-reorder-handle]' : 'input:not(:disabled), textarea:not(:disabled), [role="combobox"], [data-list-input-control]'
  return row?.querySelector<HTMLElement>(selector) ?? row?.querySelector('button:not(:disabled)') ?? addArea.value?.querySelector('button')
}
function focusControl(index: number, handle = false) {
  void nextTick(() => rowControl(index, handle)?.focus())
}
function holdAddPosition(anchor: HTMLElement, top: number) {
  const doc = anchor.ownerDocument
  const view = doc.defaultView
  if (!view) return
  for (let node = anchor.parentElement; node && node !== doc.scrollingElement; node = node.parentElement) {
    if (!/auto|scroll|overlay/.test(view.getComputedStyle(node).overflowY) || node.clientHeight >= node.scrollHeight) continue
    const distance = anchor.getBoundingClientRect().top - top
    if (Math.abs(distance) < 1) return
    node.scrollBy({ top: distance, behavior: 'instant' })
  }
  view.scrollBy({ top: anchor.getBoundingClientRect().top - top, behavior: 'instant' })
}
function keepFieldVisible(control: HTMLElement) {
  const view = control.ownerDocument.defaultView
  if (!view) return
  let top = 0
  let bottom = view.innerHeight
  for (let node = control.parentElement; node && node !== control.ownerDocument.scrollingElement; node = node.parentElement) {
    if (!/auto|scroll|overlay|hidden|clip/.test(view.getComputedStyle(node).overflowY)) continue
    const box = node.getBoundingClientRect()
    top = Math.max(top, box.top + node.clientTop)
    bottom = Math.min(bottom, box.top + node.clientTop + node.clientHeight)
  }
  const box = control.getBoundingClientRect()
  if (Math.min(bottom, box.bottom) - Math.max(top, box.top) < box.height / 2) control.scrollIntoView({ block: 'nearest', behavior: 'instant' })
}
function recordAddPosition(event: PointerEvent) {
  if (event.isPrimary && event.button === 0) addPointerTop = (event.currentTarget as HTMLElement).getBoundingClientRect().top
}
function add(event: MouseEvent) {
  const top = event.detail > 0 ? addPointerTop : undefined
  addPointerTop = undefined
  if (locked.value || full.value) return
  const item = props.createItem()
  const index = model.value.length
  if (rows.value.some(row => row.key === keyOf(item))) return
  notify([...model.value, item], { type: 'add', item, index })
  announcement.value = `${labels.value.added} ${props.itemName} ${index + 1}`
  void nextTick(() => {
    const control = rowControl(index)
    const anchor = addArea.value?.querySelector('button')
    const row = list.value?.children[index]
    if (row instanceof HTMLElement && typeof row.animate === 'function' && !prefersReducedMotion(row)) {
      createAnimator(row).animate('add', [{ translate: '0 -8px' }, { translate: '0 0' }])
    }
    if (!control || top === undefined || !anchor) { control?.focus(); return }
    control.focus({ preventScroll: true })
    const place = () => {
      holdAddPosition(anchor, top)
      if (control === control.ownerDocument.activeElement) keepFieldVisible(control)
    }
    place()
    cancelAnimationFrame(addFrame)
    addFrame = requestAnimationFrame(() => { if (anchor.isConnected) place() })
  })
}
function remove(key: string) {
  if (locked.value) return
  const index = rows.value.findIndex(row => row.key === key)
  if (index < 0) return
  const next = [...model.value]
  const [item] = next.splice(index, 1)
  notify(next, { type: 'remove', item, index })
  announcement.value = `${labels.value.removed} ${props.itemName} ${index + 1}`
  focusControl(Math.min(index, next.length - 1))
}
function update(key: string, item: Item) {
  if (locked.value || keyOf(item) !== key) return
  const index = rows.value.findIndex(row => row.key === key)
  if (index < 0) return
  const next = [...model.value]
  next[index] = item
  model.value = next
  emit('change', next, { type: 'update', item, index })
}
function move(from: number, to: number, keepFocus: boolean) {
  if (locked.value || !props.reorderable || from < 0 || to < 0 || from === to || to >= model.value.length) return
  const item = model.value[from]
  if (!item || props.canReorder?.(item) === false) return
  const next = [...model.value]
  next.splice(to, 0, ...next.splice(from, 1))
  notify(next, { type: 'move', item, index: to, from })
  announcement.value = `${labels.value.moved} ${props.itemName} ${to + 1} / ${next.length}`
  if (keepFocus) focusControl(to, true)
}
function endReorder() {
  const index = currentMove.value
  keyboardItem.value = undefined
  if (index >= 0) focusControl(index, true)
}
function reorderKey(event: KeyboardEvent) {
  if (keyboardItem.value === undefined || event.altKey || event.ctrlKey || event.metaKey) return
  if (!(event.target instanceof Element) || !event.target.closest('[data-reorder-handle], .sy-list-input__move')) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    endReorder()
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    move(currentMove.value, currentMove.value + (event.key === 'ArrowUp' ? -1 : 1), true)
  } else return
  event.preventDefault()
}

watch(list, (node, _, cleanup) => {
  if (!node) return
  cleanup(createReorderable(node, {
    handle: '[data-reorder-handle]:not([aria-disabled="true"])',
    onMove({ key, target, placement, input }) {
      if (input === 'pointer') pointerMoved = true
      const from = rows.value.findIndex(row => row.key === key)
      const relative = rows.value.findIndex(row => row.key === target)
      if (relative < 0) return
      move(from, relative + Number(placement === 'after') - Number(from < relative), input === 'keyboard')
    },
  }))
}, { flush: 'post' })
watch([currentMove, locked], ([index, disabled]) => { if (index < 0 || disabled) keyboardItem.value = undefined })
onBeforeUnmount(() => { if (addFrame) cancelAnimationFrame(addFrame) })
</script>

<template>
  <div class="sy-list-input" role="group" :aria-labelledby="`${id}-label`"
    :aria-describedby="[description && `${id}-description`, status && `${id}-status`].filter(Boolean).join(' ') || undefined"
    :aria-busy="loading || undefined" :aria-disabled="disabled || undefined" :aria-invalid="status?.type === 'error' || undefined"
    :style="{ '--sy-list-input-columns': widths }" @keydown="reorderKey">
    <div :id="`${id}-label`" class="sy-list-input__label" :class="{ 'sy-visually-hidden': labelHidden }">
      {{ label }} <small v-if="required || optional">{{ required ? labels.required : labels.optional }}</small>
    </div>
    <p v-if="description" :id="`${id}-description`" class="sy-list-input__description">{{ description }}</p>
    <slot v-if="rows.length === 0" name="empty">
      <SEmptyState size="sm" align="center" :title="labels.empty" />
    </slot>
    <ol ref="list" class="sy-list-input__rows" @pointerdown="pointerMoved = false">
      <li v-for="(row, index) in rows" :key="row.key" class="sy-list-input__row" :data-reorder-key="row.key"
        :data-reordering="keyboardItem === row.key || undefined">
        <div v-for="{ column, status: fieldStatus } in row.fields" :key="column.key" class="sy-list-input__cell">
          <span class="sy-list-input__column-label" aria-hidden="true">{{ column.label }}</span>
          <slot name="field" :item="row.item" :index="index" :column="column" :disabled="locked" :loading="loading" :label-hidden="true"
            :label="`${column.label} · ${index + 1}`" :size="'md' as const" :status="fieldStatus"
            :status-variant="fieldStatus?.variant ?? 'attached'" :update="(item: Item) => update(row.key, item)">
            <SInput v-if="column.read && column.write" :model-value="column.read(row.item)" :aria-label="`${column.label} · ${index + 1}`"
              :disabled="locked" :status="fieldStatus"
              @update:model-value="update(row.key, column.write(row.item, $event ?? ''))" />
            <span v-else>{{ column.read?.(row.item) }}</span>
          </slot>
        </div>
        <div class="sy-list-input__actions">
          <SButton size="md" variant="ghost" :disabled="locked" :aria-label="`${labels.remove} ${itemName} ${index + 1}`" @click="remove(row.key)">
            <SIcon name="close" />
          </SButton>
          <SButton v-if="reorderable && canReorder?.(row.item) !== false" size="md" variant="ghost" data-reorder-handle
            :aria-disabled="locked || undefined" :aria-label="`${labels.reorder} ${itemName} ${index + 1}`" :aria-pressed="keyboardItem === row.key"
            :aria-controls="keyboardItem === row.key ? `${id}-move` : undefined"
            @click="!locked && (!$event.detail || !pointerMoved) && (keyboardItem = keyboardItem === row.key ? undefined : row.key)">
            <span aria-hidden="true">☰</span>
          </SButton>
          <div v-if="keyboardItem === row.key" :id="`${id}-move`" class="sy-list-input__move" role="group" :aria-label="labels.reorder">
            <SButton size="sm" variant="secondary" :disabled="index === 0" @click="move(index, index - 1, true)">{{ labels.up }}</SButton>
            <SButton size="sm" variant="secondary" :disabled="index === rows.length - 1" @click="move(index, index + 1, true)">{{ labels.down }}</SButton>
            <SButton size="sm" variant="ghost" @click="endReorder">{{ labels.done }}</SButton>
          </div>
        </div>
        <SFieldStatus v-if="row.status" class="sy-list-input__row-status" v-bind="row.status" :variant="row.status.variant ?? 'detached'" />
      </li>
    </ol>
    <div ref="addArea" class="sy-list-input__add"><SButton size="md" variant="secondary" :disabled="locked || full"
      @pointerdown="recordAddPosition" @pointercancel="addPointerTop = undefined" @click="add">{{ labels.add }} {{ itemName }}</SButton></div>
    <SFieldStatus v-if="status" v-bind="status" :id="`${id}-status`" :variant="status.variant ?? 'detached'" />
    <span class="sy-visually-hidden" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
