<script setup lang="ts" generic="Item extends object">
import { computed, nextTick, ref, shallowRef, useId, watch } from 'vue'
import { moveKanban, type KanbanColumn, type KanbanDestination, type KanbanMove } from '../internal/kanban'
import { treeElementKey } from '../internal/tree-data'
import type { TableKey } from '../types'
import SFocusGroup from './SFocusGroup.vue'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{
  label: string
  columns: readonly KanbanColumn[]
  defaultItems?: readonly Item[]
  getKey: (item: Item) => TableKey
  getColumn: (item: Item) => string
  setColumn: (item: Item, column: string) => Item
  getTitle: (item: Item) => string
  isDisabled?: (item: Item) => boolean
  canMove?: (items: readonly Item[], destination: KanbanDestination) => boolean
  size?: 'sm' | 'md' | 'lg'
  layout?: 'scroll' | 'stack'
  columnWidth?: string
  columnHeight?: string
  direction?: 'ltr' | 'rtl'
  selectionMode?: 'none' | 'single' | 'multiple'
  defaultSelected?: readonly TableKey[]
  draggable?: boolean
  touchDrag?: boolean
  disabled?: boolean
  hideCounts?: boolean
  reduceMotion?: boolean
  emptyText?: string
  moveLabel?: string
  dropText?: string
  announcement?: (items: readonly Item[], column: KanbanColumn, phase: 'grab' | 'target' | 'drop' | 'cancel') => string
}>(), {
  defaultItems: () => [], size: 'md', layout: 'scroll', selectionMode: 'none', defaultSelected: () => [],
  draggable: true, touchDrag: true, emptyText: 'No tasks', moveLabel: 'Move task', dropText: 'Move here',
})

const model = defineModel<readonly Item[]>('items')
const selection = defineModel<readonly TableKey[]>('selected')
const emit = defineEmits<{ activate: [item: Item]; move: [result: KanbanMove<Item>]; selectionChange: [ids: readonly TableKey[]] }>()
const root = ref<HTMLElement | null>(null)
const boardId = `sy-kanban-${useId()}`
const live = ref('')
const items = computed(() => model.value ?? props.defaultItems)
const selected = computed(() => selection.value ?? props.defaultSelected)
const active = shallowRef<TableKey>()
const anchor = shallowRef<TableKey>()
const byKey = computed(() => new Map(items.value.map(item => [props.getKey(item), item])))
const columns = computed(() => props.columns.map(column => ({ column, cards: items.value.filter(item => props.getColumn(item) === column.id) })))
const canSelect = computed(() => props.selectionMode !== 'none')
const allowed = (item: Item) => !props.disabled && !props.isDisabled?.(item)
const activeKey = computed(() => {
  const item = active.value === undefined ? undefined : byKey.value.get(active.value)
  return item && allowed(item) && columns.value.some(entry => entry.column.id === props.getColumn(item)) ? active.value :
    columns.value.flatMap(entry => entry.cards).filter(allowed).map(props.getKey)[0]
})
type Drag = { keys: readonly TableKey[]; origin: TableKey; height: number; mode: 'keyboard' | 'pointer' | 'touch'; target?: KanbanDestination }
const drag = shallowRef<Drag>()
type Touch = { id: number; item: Item; x: number; y: number; node: HTMLElement; moved: boolean }
let contact: Touch | undefined
let blockClickUntil = 0

function nodeId(key: TableKey, column: string) {
  return `${boardId}-card-${encodeURIComponent(column)}:${encodeURIComponent(treeElementKey(key))}`
}

function card(key: TableKey) {
  const item = byKey.value.get(key)
  return item ? root.value?.ownerDocument.getElementById(nodeId(key, props.getColumn(item))) : null
}

async function focusCard(key: TableKey) {
  active.value = key
  await nextTick()
  const node = card(key)
  node?.focus({ preventScroll: true })
  node?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
}

function setSelected(ids: readonly TableKey[]) {
  selection.value = ids
  emit('selectionChange', ids)
}

function choose(item: Item, shift: boolean) {
  if (!canSelect.value || !allowed(item)) return
  const key = props.getKey(item)
  const found = selected.value.includes(key)
  if (props.selectionMode === 'single') setSelected(found ? [] : [key])
  else if (shift && anchor.value !== undefined) {
    const available = columns.value.flatMap(entry => entry.cards).filter(allowed).map(props.getKey)
    const from = available.indexOf(anchor.value)
    const to = available.indexOf(key)
    if (from >= 0 && to >= 0) setSelected([...new Set([...selected.value, ...available.slice(Math.min(from, to), Math.max(from, to) + 1)])])
  } else setSelected(found ? selected.value.filter(id => id !== key) : [...selected.value, key])
  if (!shift) anchor.value = key
}

function scope(column: string) {
  return columns.value.find(entry => entry.column.id === column)
}

function moving(state: Drag) {
  return state.keys.flatMap(key => {
    const item = byKey.value.get(key)
    return item && allowed(item) ? [item] : []
  })
}

function remaining(column: string, state: Drag) {
  return (scope(column)?.cards ?? []).filter(item => !state.keys.includes(props.getKey(item)))
}

function announce(state: Drag, phase: 'grab' | 'target' | 'drop' | 'cancel', destination?: KanbanDestination) {
  const origin = byKey.value.get(state.origin)
  const column = scope(destination?.column ?? (origin ? props.getColumn(origin) : ''))?.column
  if (!column) {
    if (phase === 'cancel') live.value = 'Move cancelled'
    return
  }
  const labels = moving(state)
  live.value = props.announcement?.(labels, column, phase) ?? (
    phase === 'cancel' ? 'Move cancelled' :
      phase === 'grab' ? `${labels.length} task(s) picked up` :
        phase === 'drop' ? `Moved to ${column.title}` : `${column.title}, position ${(destination?.index ?? 0) + 1}`)
}

function permissible(state: Drag, target: KanbanDestination) {
  const column = scope(target.column)?.column
  if (!column || column.disabled) return false
  const source = moving(state)
  if (source.length !== state.keys.length || !source.length) return false
  return props.canMove?.(source, target) ?? true
}

function begin(item: Item, mode: Drag['mode']) {
  if (!props.draggable || !allowed(item)) return
  const key = props.getKey(item)
  const keys = props.selectionMode === 'multiple' && selected.value.includes(key) ?
    selected.value.filter(id => {
      const candidate = byKey.value.get(id)
      return candidate && allowed(candidate)
    }) : [key]
  if (!keys.length) return
  const column = props.getColumn(item)
  const peers = scope(column)?.cards ?? []
  const position = peers.indexOf(item)
  const index = peers.slice(0, Math.max(0, position)).filter(candidate => !keys.includes(props.getKey(candidate))).length
  const state: Drag = { keys, origin: key, mode, height: card(key)?.offsetHeight ?? 48 }
  const initial = { column, index }
  if (mode === 'keyboard' && permissible(state, initial)) state.target = initial
  drag.value = state
  announce(state, 'grab')
  return state
}

function pointTo(target: KanbanDestination, state = drag.value) {
  if (!state || !permissible(state, target)) {
    if (state?.mode !== 'keyboard' && state?.target) drag.value = { ...state, target: undefined }
    return false
  }
  if (state.target?.column !== target.column || state.target.index !== target.index) {
    drag.value = { ...state, target }
    if (state.mode === 'keyboard') announce(state, 'target', target)
  }
  return true
}

function commit(state = drag.value) {
  if (!state || !state.target || !permissible(state, state.target)) return
  const result = moveKanban(items.value, state.keys, state.target, props)
  drag.value = undefined
  if (result) {
    announce(state, 'drop', state.target)
    model.value = result.items
    emit('move', result)
  }
  if (state.mode === 'keyboard') void focusCard(state.origin)
}

function cancel(restore = false) {
  const state = drag.value
  if (!state) return
  announce(state, 'cancel')
  drag.value = undefined
  if (restore) void focusCard(state.origin)
}

function move(keys: readonly TableKey[], target: KanbanDestination) {
  const origin = keys[0]
  if (origin === undefined || !props.draggable) return
  commit({ keys, origin, target, height: 0, mode: 'pointer' })
}

function pointerStart(event: DragEvent, item: Item) {
  if (!event.dataTransfer || !begin(item, 'pointer')) {
    event.preventDefault()
    return
  }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', props.getTitle(item))
}

function dropAt(list: HTMLElement, y: number, state: Drag) {
  const column = list.dataset.kanbanColumn
  if (!column) return
  const peers = remaining(column, state)
  const slot = peers.findIndex(item => {
    const rect = card(props.getKey(item))?.getBoundingClientRect()
    return rect ? y < rect.top + rect.height / 2 : false
  })
  return { column, index: slot < 0 ? peers.length : slot }
}

function dragOver(event: DragEvent) {
  const state = drag.value
  if (!state || state.mode !== 'pointer') return
  const target = dropAt(event.currentTarget as HTMLElement, event.clientY, state)
  if (target && pointTo(target, state)) {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  }
}

function dragLeave(event: DragEvent) {
  const state = drag.value
  const list = event.currentTarget as HTMLElement
  if (state?.mode === 'pointer' && state.target?.column === list.dataset.kanbanColumn &&
    !list.contains(event.relatedTarget as Node | null)) drag.value = { ...state, target: undefined }
}

function drop(event: DragEvent) {
  if (drag.value?.mode !== 'pointer') return
  const target = dropAt(event.currentTarget as HTMLElement, event.clientY, drag.value)
  if (target && pointTo(target)) {
    event.preventDefault()
    commit()
  }
}

function touchStart(event: PointerEvent, item: Item) {
  if (event.pointerType !== 'touch' || !props.touchDrag || !props.draggable || !allowed(item) || !event.isPrimary) return
  contact = { id: event.pointerId, item, x: event.clientX, y: event.clientY, node: event.currentTarget as HTMLElement, moved: false }
}

function touchMove(event: PointerEvent) {
  const session = contact
  if (!session || session.id !== event.pointerId) return
  if (!session.moved) {
    if (Math.hypot(event.clientX - session.x, event.clientY - session.y) < 6) return
    session.moved = Boolean(begin(session.item, 'touch'))
    if (session.moved) session.node.setPointerCapture(event.pointerId)
  }
  const state = drag.value
  if (!state || state.mode !== 'touch') return
  const board = root.value
  const rect = board?.getBoundingClientRect()
  if (board && rect && props.layout === 'scroll') {
    const threshold = Math.min(42, rect.width / 7)
    if (event.clientX > rect.right - threshold) board.scrollBy({ left: 18 })
    else if (event.clientX < rect.left + threshold) board.scrollBy({ left: -18 })
  }
  const list = board?.ownerDocument.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-kanban-column]')
  const target = list && dropAt(list, event.clientY, state)
  if (target) pointTo(target, state)
  else if (state.target) drag.value = { ...state, target: undefined }
}

function touchEnd(event: PointerEvent, accepted: boolean) {
  if (contact?.id !== event.pointerId) return
  const moved = contact.moved
  contact = undefined
  if (!moved) return
  blockClickUntil = Date.now() + 420
  if (accepted && drag.value?.target) commit()
  else cancel()
}

function keyboardDrag(event: KeyboardEvent, item: Item) {
  const state = drag.value
  if (event.key === 'Escape' && state?.mode === 'keyboard') {
    event.preventDefault()
    cancel(true)
    return true
  }
  if (state?.mode !== 'keyboard') return false
  const rtl = (props.direction ?? root.value?.ownerDocument.defaultView?.getComputedStyle(root.value).direction) === 'rtl'
  const current = state.target ?? { column: props.getColumn(item), index: 0 }
  const columnIndex = columns.value.findIndex(entry => entry.column.id === current.column)
  if (event.key === 'Enter' || event.key === ' ') commit(state)
  else if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Home' || event.key === 'End') {
    const length = remaining(current.column, state).length
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? length : current.index + (event.key === 'ArrowUp' ? -1 : 1)
    pointTo({ column: current.column, index: Math.min(length, Math.max(0, index)) }, state)
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const delta = (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1)
    const target = columns.value[columnIndex + delta]?.column
    if (target && pointTo({ column: target.id, index: Math.min(current.index, remaining(target.id, state).length) }, state)) {
      const list = root.value?.ownerDocument.getElementById(`${boardId}-list-${encodeURIComponent(target.id)}`)
      list?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  } else return false
  event.preventDefault()
  return true
}

function keys(event: KeyboardEvent, item: Item) {
  if (event.defaultPrevented || event.isComposing || !allowed(item)) return
  const target = event.target as HTMLElement
  if (target.closest('button, input, a[href], [contenteditable]:not([contenteditable="false"])') &&
    !target.closest('.sy-kanban__drag-handle')) return
  if (keyboardDrag(event, item)) return
  const id = props.getKey(item)
  const columnId = props.getColumn(item)
  const columnIndex = columns.value.findIndex(entry => entry.column.id === columnId)
  const row = scope(columnId)?.cards.filter(allowed) ?? []
  const index = row.findIndex(item => props.getKey(item) === id)
  const rtl = (props.direction ?? root.value?.ownerDocument.defaultView?.getComputedStyle(root.value).direction) === 'rtl'
  let next: Item | undefined
  switch (event.key) {
    case 'ArrowUp': next = row[index - 1]; break
    case 'ArrowDown': next = row[index + 1]; break
    case 'Home': next = row[0]; break
    case 'End': next = row.at(-1); break
    case 'ArrowLeft':
    case 'ArrowRight': {
      const direction = (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1)
      const adjacent = columns.value[columnIndex + direction]?.cards.filter(allowed)
      next = adjacent?.[Math.max(0, Math.min(index, adjacent.length - 1))]
      break
    }
    case 'Enter':
      if (event.metaKey || event.ctrlKey || target.closest('.sy-kanban__drag-handle')) begin(item, 'keyboard')
      else emit('activate', item)
      break
    case ' ':
      if (target.closest('.sy-kanban__drag-handle')) begin(item, 'keyboard')
      else choose(item, event.shiftKey)
      break
    default: return
  }
  if (next) void focusCard(props.getKey(next))
  event.preventDefault()
}

function click(item: Item, event: MouseEvent) {
  if (!allowed(item) || event.detail > 1 || Date.now() < blockClickUntil ||
    (event.target as Element).closest('button, input, a[href], [contenteditable]:not([contenteditable="false"])')) return
  void focusCard(props.getKey(item))
  if (canSelect.value) choose(item, event.shiftKey)
  else emit('activate', item)
}

function handle(item: Item) {
  if (Date.now() < blockClickUntil) return
  if (drag.value?.mode === 'keyboard') commit()
  else begin(item, 'keyboard')
}

function indicator(column: string) {
  const state = drag.value
  if (!state?.target || state.target.column !== column) return
  const peers = remaining(column, state)
  const next = peers[state.target.index]
  return { before: next ? props.getKey(next) : null, height: state.height }
}

type RenderEntry = { kind: 'card'; key: string; item: Item } |
  { kind: 'drop'; key: string; height: number } |
  { kind: 'empty'; key: string }

function renderItems(column: string, cards: readonly Item[]): RenderEntry[] {
  const placement = indicator(column)
  const content: RenderEntry[] = []
  for (const item of cards) {
    const key = props.getKey(item)
    if (placement?.before === key) content.push({ kind: 'drop', key: 'drop', height: placement.height })
    content.push({ kind: 'card', key: `card:${treeElementKey(key)}`, item })
  }
  if (placement?.before === null) content.push({ kind: 'drop', key: 'drop', height: placement.height })
  if (!content.length) content.push({ kind: 'empty', key: 'empty' })
  return content
}

watch([items, () => props.disabled, () => props.draggable], () => {
  if (drag.value && (!props.draggable || props.disabled || moving(drag.value).length !== drag.value.keys.length)) cancel()
})
defineExpose({ move, focusCard })
</script>

<template>
  <div
    ref="root" class="sy-kanban" :data-size="size" :data-layout="layout" :aria-label="label" role="region" :dir="direction"
    :data-reduced="reduceMotion || undefined" :aria-disabled="disabled || undefined"
    :style="{ '--sy-kanban-column-width': columnWidth, '--sy-kanban-column-height': columnHeight }"
  >
    <div class="sy-kanban__columns">
      <section
        v-for="{ column, cards } in columns" :key="column.id" class="sy-kanban__column" :data-tone="column.tone ?? 'neutral'"
        :data-drop-column="drag?.target?.column === column.id || undefined" :aria-label="column.title"
      >
        <header class="sy-kanban__heading">
          <slot name="indicator" :column="column" />
          <h3><slot name="column-title" :column="column">{{ column.title }}</slot></h3>
          <span v-if="!hideCounts" class="sy-kanban__count" :aria-label="String(cards.length)"><SMotionText :value="String(cards.length)" motion="roll" /></span>
          <div v-if="$slots['column-actions']" class="sy-kanban__column-actions"><slot name="column-actions" :column="column" /></div>
        </header>
        <SFocusGroup class="sy-kanban__body">
          <TransitionGroup
            :id="`${boardId}-list-${encodeURIComponent(column.id)}`" tag="div" class="sy-kanban__list" :css="!reduceMotion"
            name="sy-kanban-item" role="grid" :aria-label="column.title" :aria-multiselectable="selectionMode === 'multiple' || undefined"
            :data-kanban-column="column.id"
            @dragover="dragOver" @dragleave="dragLeave" @drop="drop"
            @before-leave="node => { node.setAttribute('inert', ''); node.setAttribute('aria-hidden', 'true') }"
          >
            <template v-for="entry in renderItems(column.id, cards)" :key="entry.key">
              <div v-if="entry.kind === 'drop'" class="sy-kanban__drop" aria-hidden="true"
                :style="{ '--sy-kanban-drop-height': `${entry.height}px` }">
                <slot name="drop" :column="column" :destination="drag!.target">{{ dropText }}</slot>
              </div>
              <div v-else-if="entry.kind === 'empty'" class="sy-kanban__empty" role="row">
                <div role="gridcell"><slot name="empty" :column="column">{{ emptyText }}</slot></div>
              </div>
              <div
                v-else :id="nodeId(getKey(entry.item), column.id)" class="sy-kanban__card"
                role="row" :aria-label="getTitle(entry.item)" data-sy-focus-target
                :aria-selected="canSelect ? selected.includes(getKey(entry.item)) : undefined"
                :aria-disabled="!allowed(entry.item) || undefined"
                :aria-keyshortcuts="draggable && allowed(entry.item) ? 'Control+Enter Meta+Enter' : undefined"
                :data-moving="drag?.keys.includes(getKey(entry.item)) || undefined" :data-draggable="draggable && allowed(entry.item) || undefined"
                :tabindex="activeKey === getKey(entry.item) ? 0 : -1" :draggable="draggable && allowed(entry.item)"
                @focus="active = getKey(entry.item)" @click="click(entry.item, $event)" @keydown="keys($event, entry.item)"
                @dblclick="allowed(entry.item) && canSelect && emit('activate', entry.item)"
                @dragstart="pointerStart($event, entry.item)" @dragend="drag?.mode === 'pointer' && cancel()"
              >
                <div class="sy-kanban__card-content" role="gridcell">
                  <slot name="card" :item="entry.item" :column="column" :selected="selected.includes(getKey(entry.item))"
                    :dragging="drag?.keys.includes(getKey(entry.item)) ?? false">
                    <span>{{ getTitle(entry.item) }}</span>
                  </slot>
                  <button
                    v-if="draggable" type="button" class="sy-kanban__drag-handle" :tabindex="activeKey === getKey(entry.item) ? 0 : -1"
                    :aria-label="`${moveLabel} ${getTitle(entry.item)}`" :disabled="!allowed(entry.item)"
                    :data-touch="touchDrag || undefined"
                    @click.stop="handle(entry.item)" @pointerdown="touchStart($event, entry.item)" @pointermove="touchMove"
                    @pointerup="touchEnd($event, true)" @pointercancel="touchEnd($event, false)" @lostpointercapture="touchEnd($event, false)"
                  >{{ moveLabel }}</button>
                </div>
              </div>
            </template>
          </TransitionGroup>
          <div v-if="$slots['column-footer']" class="sy-kanban__footer"><slot name="column-footer" :column="column" /></div>
        </SFocusGroup>
      </section>
    </div>
    <span class="sy-visually-hidden" role="status">{{ live }}</span>
  </div>
</template>
