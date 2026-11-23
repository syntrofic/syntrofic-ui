<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useId, watch, type CSSProperties } from 'vue'
import { isFileFolder, type FileTreeMove, type FileTreeNode, type FileTreeSection } from '../internal/file-tree'
import { flattenTree, moveTree, type TreeDropPosition, type TreeEntry } from '../internal/tree-data'
import SFocusGroup from './SFocusGroup.vue'

const props = withDefaults(defineProps<{
  label: string
  labelledby?: string
  items?: readonly FileTreeNode[]
  sections?: readonly FileTreeSection[]
  defaultExpanded?: readonly string[]
  defaultSelected?: readonly string[]
  selectionMode?: 'none' | 'single' | 'multiple'
  selectionBehavior?: 'toggle' | 'replace'
  size?: 'sm' | 'md' | 'lg'
  guideLines?: boolean | 'hover'
  direction?: 'ltr' | 'rtl'
  locale?: string
  disabled?: boolean
  reduceMotion?: boolean
  draggable?: boolean
  activateBranches?: boolean
  activateOnClick?: boolean
  flushFlat?: boolean
  rowClass?: (item: FileTreeNode) => string | undefined
  rowStyle?: (item: FileTreeNode) => CSSProperties | undefined
  emptyText?: string
  moveLabel?: (items: readonly string[], target: FileTreeNode | null, position?: TreeDropPosition) => string
  canDrop?: (keys: readonly string[], target: FileTreeNode, position: TreeDropPosition) => boolean
}>(), {
  items: () => [], defaultExpanded: () => [], defaultSelected: () => [], selectionMode: 'single',
  selectionBehavior: 'toggle', size: 'md', guideLines: true, emptyText: 'No files',
})

const selectedModel = defineModel<readonly string[]>('selected')
const expandedModel = defineModel<readonly string[]>('expanded')
const emit = defineEmits<{
  activate: [item: FileTreeNode]
  context: [item: FileTreeNode, event: MouseEvent | KeyboardEvent]
  move: [event: FileTreeMove]
  beforeExpand: [item: FileTreeNode, expanded: boolean]
  expand: [item: FileTreeNode, expanded: boolean]
}>()
const root = ref<HTMLElement | null>(null)
const live = ref('')
const id = `sy-file-${useId()}`
const sections = computed(() => props.sections ?? [{ id, items: props.items }])
const data = computed(() => sections.value.map(section => section.items))
const lookup = computed(() => new Map(flattenTree(data.value, node => node.id, node => node.children)
  .map(entry => [entry.item.id, entry])))
const showSpacer = computed(() => !props.flushFlat || [...lookup.value.values()].some(entry => isFileFolder(entry.item)))
const selected = computed(() => selectedModel.value ?? props.defaultSelected)
const expanded = computed(() => expandedModel.value ?? props.defaultExpanded)
const visible = computed(() => flattenTree(data.value, node => node.id, node => node.children,
  item => expanded.value.includes(item.id)))
const bySection = computed(() => sections.value.map((_, index) => visible.value.filter(entry => entry.group === index)))
const enabled = computed(() => visible.value.filter(entry => !entry.item.disabled))
const activeKey = ref<string>()
const selectionAnchor = ref<string>()
const effectiveKey = computed(() => enabled.value.some(entry => entry.item.id === activeKey.value) ? activeKey.value :
  enabled.value.find(entry => selected.value.includes(entry.item.id))?.item.id ?? enabled.value[0]?.item.id)
const scrim = shallowRef<{ keys: readonly string[]; keyboard: boolean; target?: string; position?: TreeDropPosition }>()
const text = ref('')
let typeahead: ReturnType<typeof setTimeout> | undefined

function nodeElement(key: string) {
  return root.value?.ownerDocument.getElementById(`${id}-${key}`)
}

async function focusKey(key: string) {
  activeKey.value = key
  await nextTick()
  nodeElement(key)?.focus({ preventScroll: true })
  nodeElement(key)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function toggleFolder(item: FileTreeNode, force?: boolean) {
  if (props.disabled || item.disabled || !isFileFolder(item)) return
  const next = force ?? !expanded.value.includes(item.id)
  if (next === expanded.value.includes(item.id)) return
  emit('beforeExpand', item, next)
  if (!next && activeKey.value && activeKey.value !== item.id && descends(activeKey.value, item.id)) void focusKey(item.id)
  expandedModel.value = next ? [...new Set([...expanded.value, item.id])] : expanded.value.filter(key => key !== item.id)
  emit('expand', item, next)
}

function descends(key: string, ancestor: string) {
  let cursor = lookup.value.get(key)?.parent
  while (typeof cursor === 'string') {
    if (cursor === ancestor) return true
    cursor = lookup.value.get(cursor)?.parent
  }
  return false
}

function select(item: FileTreeNode, event: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'shiftKey'>) {
  if (props.disabled || item.disabled || props.selectionMode === 'none') return
  const key = item.id
  const modifier = event.ctrlKey || event.metaKey
  const replace = props.selectionBehavior === 'replace' && !modifier
  if (props.selectionMode === 'single') {
    selectedModel.value = selected.value.includes(key) && !replace ? [] : [key]
  } else if (event.shiftKey && selectionAnchor.value) {
    const previous = enabled.value.findIndex(entry => entry.item.id === selectionAnchor.value)
    const current = enabled.value.findIndex(entry => entry.item.id === key)
    if (previous >= 0 && current >= 0) {
      const indices = enabled.value.slice(Math.min(previous, current), Math.max(previous, current) + 1)
      selectedModel.value = [...new Set([...(replace ? [] : selected.value), ...indices.map(entry => entry.item.id)])]
    }
  } else if (replace) {
    selectedModel.value = [key]
  } else {
    selectedModel.value = selected.value.includes(key) ? selected.value.filter(id => id !== key) : [...selected.value, key]
  }
  if (!event.shiftKey) selectionAnchor.value = key
}

function activate(item: FileTreeNode) {
  if (props.disabled || item.disabled) return
  if (isFileFolder(item) && !props.activateBranches) toggleFolder(item)
  else emit('activate', item)
}

function click(entry: TreeEntry<FileTreeNode>, event: MouseEvent) {
  if (entry.item.disabled || props.disabled || event.defaultPrevented || event.detail > 1 ||
    (event.target as Element).closest('.sy-file-tree__toggle, .sy-file-tree__actions')) return
  void focusKey(entry.item.id)
  select(entry.item, event)
  if (props.activateOnClick && (!isFileFolder(entry.item) || props.activateBranches)
    && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) activate(entry.item)
}

function focused(event: FocusEvent) {
  const row = (event.target as Element).closest<HTMLElement>('[data-tree-id]')
  if (row && root.value?.contains(row)) activeKey.value = row.dataset.treeId
}

function ensureFocusAfterCollapse() {
  const element = root.value?.ownerDocument.activeElement
  const key = (element?.closest<HTMLElement>('[data-tree-id]'))?.dataset.treeId
  if (!key || !root.value?.contains(element ?? null) || enabled.value.some(entry => entry.item.id === key)) return
  const parent = lookup.value.get(key)?.parent
  const replacement = typeof parent === 'string' && enabled.value.find(entry => entry.item.id === parent) || enabled.value[0]
  if (replacement) void focusKey(replacement.item.id)
  else root.value?.focus({ preventScroll: true })
}

watch(visible, ensureFocusAfterCollapse)

function dragKeys(item: FileTreeNode) {
  const targets = selected.value.includes(item.id) ? selected.value : [item.id]
  return targets.filter(key => lookup.value.has(key) && !lookup.value.get(key)?.item.disabled)
}

function announced(keys: readonly string[], target: FileTreeNode | null, position?: TreeDropPosition) {
  live.value = props.moveLabel?.(keys, target, position) ??
    (target ? `Move ${keys.length} item(s) ${position} ${target.label}` : `Moving ${keys.length} item(s)`)
}

function startDrag(event: DragEvent, item: FileTreeNode) {
  if (props.disabled || item.disabled || !props.draggable || !event.dataTransfer) {
    event.preventDefault()
    return
  }
  const keys = dragKeys(item)
  scrim.value = { keys, keyboard: false }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', keys.map(key => lookup.value.get(key)?.item.label ?? key).join('\n'))
}

function validTarget(keys: readonly string[], target: FileTreeNode, position: TreeDropPosition) {
  return Boolean(keys.length && !target.disabled && !keys.includes(target.id) && !keys.some(key => descends(target.id, key)) &&
    (position !== 'inside' || isFileFolder(target)) && (props.canDrop?.(keys, target, position) ?? true))
}

function over(event: DragEvent, item: FileTreeNode) {
  const moving = scrim.value
  if (!moving || moving.keyboard) return
  const node = event.currentTarget as HTMLElement
  const rect = node.getBoundingClientRect()
  const share = (event.clientY - rect.top) / Math.max(1, rect.height)
  const position = isFileFolder(item) && share >= .26 && share <= .74 ? 'inside' : share < .5 ? 'before' : 'after'
  if (!validTarget(moving.keys, item, position)) {
    if (moving.target !== undefined) scrim.value = { keys: moving.keys, keyboard: false }
    return
  }
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  if (moving.target !== item.id || moving.position !== position) scrim.value = { ...moving, target: item.id, position }
}

function leave(event: DragEvent, item: FileTreeNode) {
  if ((event.currentTarget as Element).contains(event.relatedTarget as Node | null)) return
  if (scrim.value?.target === item.id && !scrim.value.keyboard) {
    scrim.value = { keys: scrim.value.keys, keyboard: false }
  }
}

function commitMove(item: FileTreeNode, position: TreeDropPosition) {
  const moving = scrim.value
  if (!moving || !validTarget(moving.keys, item, position)) return
  const move = moveTree(data.value, moving.keys, item.id, position, entry => entry.id,
    entry => entry.children, (entry, children) => ({ ...entry, children }))
  if (!move) return
  if (position === 'inside') toggleFolder(item, true)
  announced(moving.keys, item, position)
  scrim.value = undefined
  const next = sections.value.map((section, index) => ({ ...section, items: move.forest[index] }))
  emit('move', { keys: move.moved.map(String), target: item, position, items: next.flatMap(section => section.items), sections: next })
  if (moving.keyboard) void focusKey(String(move.moved[0]))
}

function drop(event: DragEvent, item: FileTreeNode) {
  const moving = scrim.value
  if (!moving || moving.target !== item.id || !moving.position) return
  event.preventDefault()
  commitMove(item, moving.position)
}

function positionTarget(item: FileTreeNode, position: TreeDropPosition) {
  const moving = scrim.value
  if (!moving?.keyboard || !validTarget(moving.keys, item, position)) return
  scrim.value = { ...moving, target: item.id, position }
  announced(moving.keys, item, position)
  void focusKey(item.id)
}

function moveCursor(item: FileTreeNode, offset: -1 | 1) {
  const current = enabled.value.findIndex(entry => entry.item.id === item.id)
  const moving = scrim.value
  if (moving?.keyboard) {
    for (let index = current + offset; index >= 0 && index < enabled.value.length; index += offset) {
      const next = enabled.value[index].item
      const position = offset > 0 ? 'after' : 'before'
      if (validTarget(moving.keys, next, position)) {
        positionTarget(next, position)
        return
      }
    }
    return
  }
  const next = enabled.value[current + offset]
  if (next) void focusKey(next.item.id)
}

function keyboard(event: KeyboardEvent, entry: TreeEntry<FileTreeNode>) {
  const item = entry.item
  const target = event.target as HTMLElement
  if (props.disabled || item.disabled || event.defaultPrevented || event.isComposing) return
  if (target.closest('.sy-file-tree__actions')) {
    if (event.key === 'Escape') {
      event.preventDefault()
      void focusKey(item.id)
    }
    return
  }
  const rtl = (props.direction ?? root.value?.ownerDocument.defaultView?.getComputedStyle(target).direction) === 'rtl'
  const enter = rtl ? 'ArrowLeft' : 'ArrowRight'
  const exit = rtl ? 'ArrowRight' : 'ArrowLeft'
  const moving = scrim.value?.keyboard
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    moveCursor(item, event.key === 'ArrowDown' ? 1 : -1)
  } else if (event.key === enter) {
    if (moving) positionTarget(item, 'inside')
    else if (isFileFolder(item)) {
      if (!expanded.value.includes(item.id)) toggleFolder(item, true)
      else {
        const first = enabled.value.find(child => child.parent === item.id)
        if (first) void focusKey(first.item.id)
      }
    }
  } else if (event.key === exit) {
    if (moving) positionTarget(item, 'before')
    else if (isFileFolder(item) && expanded.value.includes(item.id)) toggleFolder(item, false)
    else if (typeof entry.parent === 'string' && !lookup.value.get(entry.parent)?.item.disabled) void focusKey(entry.parent)
  } else if (event.key === 'Home' || event.key === 'End') {
    const entry = event.key === 'Home' ? enabled.value[0] : enabled.value.at(-1)
    if (entry && !moving) void focusKey(entry.item.id)
  } else if (event.key === 'Escape' && moving) {
    const first = scrim.value?.keys[0]
    scrim.value = undefined
    if (first) void focusKey(first)
  } else if (event.key === 'Enter') {
    if (moving && scrim.value?.position) commitMove(item, scrim.value.position)
    else if (props.draggable && (event.ctrlKey || event.metaKey)) {
      const keys = dragKeys(item)
      scrim.value = { keys, keyboard: true }
      announced(keys, null)
    } else if (!moving) activate(item)
  } else if (event.key === ' ') {
    if (!moving) select(item, event)
  } else if (event.key.toLowerCase() === 'a' && (event.metaKey || event.ctrlKey) && props.selectionMode === 'multiple' && !moving) {
    selectedModel.value = [...new Set([...selected.value, ...enabled.value.map(entry => entry.item.id)])]
  } else if (event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey) {
    emit('context', item, event)
  } else if (event.key === 'F2') {
    nodeElement(item.id)?.querySelector<HTMLElement>('.sy-file-tree__actions :is(button, a, input, [tabindex])')?.focus()
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && !moving) {
    clearTimeout(typeahead)
    text.value += event.key.toLocaleLowerCase(props.locale)
    const index = enabled.value.findIndex(entry => entry.item.id === item.id)
    const sequence = [...enabled.value.slice(index + 1), ...enabled.value.slice(0, index + 1)]
    const match = sequence.find(entry => entry.item.label.toLocaleLowerCase(props.locale).startsWith(text.value))
    if (match) void focusKey(match.item.id)
    typeahead = setTimeout(() => { text.value = '' }, 560)
  } else return
  event.preventDefault()
}

onBeforeUnmount(() => clearTimeout(typeahead))
</script>

<template>
  <div
    ref="root" class="sy-file-tree" role="tree" :aria-label="label" :aria-labelledby="labelledby" :dir="direction" :aria-disabled="disabled || undefined"
    :aria-multiselectable="selectionMode === 'multiple' || undefined" :tabindex="!disabled && !effectiveKey ? 0 : undefined"
    :data-size="size" :data-guides="guideLines" :data-reduced="reduceMotion || undefined"
    @focusin="focused"
  >
    <SFocusGroup>
      <div v-for="(section, index) in sections" :key="section.id" class="sy-file-tree__section" role="group" :aria-label="section.label">
        <div v-if="section.label" class="sy-file-tree__section-label" aria-hidden="true">
          <slot name="section" :section="section">{{ section.label }}</slot>
        </div>
        <TransitionGroup name="sy-file-row" tag="div" :css="!reduceMotion" class="sy-file-tree__rows"
          @before-leave="element => { element.setAttribute('inert', ''); element.setAttribute('aria-hidden', 'true') }">
          <div
            v-for="entry in bySection[index]" :id="`${id}-${entry.item.id}`" :key="entry.item.id" role="treeitem" data-sy-focus-target
            class="sy-file-tree__row" :class="rowClass?.(entry.item)" :data-tree-id="entry.item.id" :aria-label="entry.item.label"
            :data-drop="scrim?.target === entry.item.id ? scrim.position : undefined"
            :data-dragging="scrim?.keys.includes(entry.item.id) || undefined"
            :aria-level="entry.level" :aria-posinset="entry.position" :aria-setsize="entry.size"
            :draggable="draggable && !disabled && !entry.item.disabled"
            :aria-disabled="entry.item.disabled || disabled || undefined"
            :aria-selected="selectionMode === 'none' ? undefined : selected.includes(entry.item.id)"
            :aria-expanded="isFileFolder(entry.item) ? expanded.includes(entry.item.id) : undefined"
            :tabindex="!disabled && effectiveKey === entry.item.id ? 0 : -1"
            :style="{ '--sy-file-level': entry.level - 1, ...rowStyle?.(entry.item) }"
            @click="click(entry, $event)" @dblclick="!activateOnClick && !($event.target as Element).closest('.sy-file-tree__toggle, .sy-file-tree__actions, [data-sy-tree-link]') && activate(entry.item)"
            @keydown="keyboard($event, entry)" @contextmenu="emit('context', entry.item, $event)"
            @dragstart="startDrag($event, entry.item)" @dragover="over($event, entry.item)"
            @dragleave="leave($event, entry.item)" @drop="drop($event, entry.item)" @dragend="scrim = undefined"
          >
            <span class="sy-file-tree__indent" aria-hidden="true" />
            <button v-if="isFileFolder(entry.item)" tabindex="-1" type="button" class="sy-file-tree__toggle"
              :disabled="disabled || entry.item.disabled" aria-hidden="true" @mousedown.prevent @click="toggleFolder(entry.item)">
              <slot name="indicator" :item="entry.item" :expanded="expanded.includes(entry.item.id)"><span /></slot>
            </button>
            <span v-else-if="showSpacer" class="sy-file-tree__spacer" aria-hidden="true" />
            <div class="sy-file-tree__label">
              <slot name="icon" :item="entry.item" :expanded="expanded.includes(entry.item.id)" />
              <slot name="label" :item="entry.item" :selected="selected.includes(entry.item.id)"><span>{{ entry.item.label }}</span></slot>
            </div>
            <div v-if="entry.item.description || $slots.details" class="sy-file-tree__details">
              <slot name="details" :item="entry.item">{{ entry.item.description }}</slot>
            </div>
            <div v-if="$slots.actions" class="sy-file-tree__actions"><slot name="actions" :item="entry.item" /></div>
          </div>
        </TransitionGroup>
      </div>
    </SFocusGroup>
    <div v-if="!visible.length" class="sy-file-tree__empty"><slot name="empty">{{ emptyText }}</slot></div>
    <span class="sy-visually-hidden" role="status">{{ live }}</span>
  </div>
</template>
