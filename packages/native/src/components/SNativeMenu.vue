<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'nativescript-vue'
import type { NativeCollectionNavigation } from '../collection-keys'
import { toggleCollectionSelection, type NativeCollectionKey, type NativeSelectionMode } from '../collection-state'
import { useNativeUI } from '../context'
import type { NativeMenuItem, NativeMenuSection } from '../menu-state'
import type { NativeDialogCloseReason, NativeRestoreFocus } from '../modal'
import type { NativePopoverOptions, NativePopoverPresentation, NativePopoverWidth } from '../popover-state'
import type { NativeSheetDetent } from '../sheet-state'
import SNativeButton from './SNativeButton.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeMenuItems from './SNativeMenuItems.vue'
import SNativePopover from './SNativePopover.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeReveal from './SNativeReveal.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  label: string
  title?: string
  items?: readonly NativeMenuItem[]
  sections?: readonly NativeMenuSection[]
  disabled?: boolean
  selectionMode?: NativeSelectionMode
  disallowEmptySelection?: boolean
  closeOnSelect?: boolean
  presentation?: NativePopoverPresentation
  width?: NativePopoverWidth
  detents?: readonly NativeSheetDetent[]
  overlay?: NativePopoverOptions
  activation?: 'press' | 'long-press' | 'both'
  indicator?: 'check' | 'dot' | 'none'
  stretchTrigger?: boolean
  backLabel?: string
  emptyText?: string
}>(), {
  selectionMode: 'none', presentation: 'popover', width: 220, activation: 'press', backLabel: 'Back',
  closeOnSelect: undefined,
})
const emit = defineEmits<{
  action: [item: NativeMenuItem]
  change: [selection: NativeCollectionKey[]]
  opened: []
  closed: [reason: NativeDialogCloseReason]
  error: [error: unknown]
}>()
const open = defineModel<boolean>('open', { default: false })
const selected = defineModel<NativeCollectionKey[]>('selected', { default: () => [] })
const popover = useTemplateRef<InstanceType<typeof SNativePopover>>('popover')
const trigger = useTemplateRef<InstanceType<typeof SNativePressableFeedback>>('trigger')
const list = useTemplateRef<InstanceType<typeof SNativeMenuItems>>('list')
const { theme } = useNativeUI()
const trail = shallowRef<NativeMenuItem[]>([])
const parent = computed(() => trail.value.at(-1))
const primary = computed(() => props.sections?.length ? props.sections
  : [{ id: 'root', items: props.items ?? [] }])
const groups = computed<readonly NativeMenuSection[]>(() => parent.value
  ? [{ id: parent.value.id, items: parent.value.children ?? [] }] : primary.value)
const mark = computed(() => props.indicator ?? (props.selectionMode !== 'none' || groups.value.some(group =>
  group.selectionMode && group.selectionMode !== 'none',
) ? 'check' : 'none'))

function show(focus: NativeRestoreFocus = () => trigger.value?.focus()) {
  popover.value?.show(focus)
}

function close(reason?: NativeDialogCloseReason) {
  popover.value?.close(reason)
}

function moveBack() {
  const previous = parent.value
  if (!previous) return false
  trail.value = trail.value.slice(0, -1)
  void nextTick(() => list.value?.focus(previous.id))
  return true
}

function keyboardBack() {
  if (!moveBack()) close('back')
}

function onTriggerKey(key: NativeCollectionNavigation) {
  if (!['first', 'last', 'next', 'previous'].includes(key)) return false
  show()
  return true
}

function choose(item: NativeMenuItem, group: NativeMenuSection) {
  if (props.disabled || group.disabled || item.disabled) return
  if (item.children?.length) {
    trail.value = [...trail.value, item]
    void nextTick(() => list.value?.focus())
    return
  }
  const mode = item.action ? 'none' : group.selectionMode ?? props.selectionMode
  if (mode !== 'none') {
    const scope = group.selectionMode ? new Set(group.items.map(item => item.id)) : undefined
    const local = scope ? selected.value.filter(key => scope.has(key)) : selected.value
    const result = toggleCollectionSelection(local, item.id, mode, !props.disallowEmptySelection)
    const selection = scope ? [...selected.value.filter(key => !scope.has(key)), ...result] : result
    selected.value = selection
    emit('change', selection)
  } else emit('action', item)
  if (item.closeOnSelect ?? props.closeOnSelect ?? mode !== 'multiple') close('confirm')
}

function settled(reason: NativeDialogCloseReason) {
  trail.value = []
  emit('closed', reason)
}

defineExpose({ show, close })
</script>

<template>
  <SNativePopover
    ref="popover"
    v-model:open="open"
    v-bind="overlay"
    :presentation="presentation"
    :width="width"
    :title="title"
    :disabled="disabled"
    :detents="detents"
    :stretchTrigger="stretchTrigger"
    :initialFocus="() => list?.focus()"
    :beforeClose="reason => reason !== 'back' || !moveBack()"
    @opened="emit('opened')"
    @closed="settled"
    @error="emit('error', $event)"
  >
    <template #trigger="controls">
      <slot name="trigger" v-bind="controls" :navigate="onTriggerKey">
        <SNativePressableFeedback
          ref="trigger"
          :label="label"
          :pressed="open"
          :disabled="disabled"
          :fill="theme.colors.accentSoft"
          :allowLongPress="activation !== 'press'"
          :navigate="onTriggerKey"
          @tap="activation !== 'long-press' && show()"
          @long-press="show()"
        >
          <SNativeText :text="label" emphasized />
        </SNativePressableFeedback>
      </slot>
    </template>
    <SNativeReveal :transitionKey="parent?.id">
      <SNativeButton v-if="parent" :label="backLabel" variant="ghost" size="sm" @tap="moveBack" />
      <SNativeMenuItems
        ref="list"
        :groups="groups"
        :selected="selected"
        :selectionMode="selectionMode"
        :indicator="mark"
        @activate="choose"
        @back="keyboardBack"
      >
        <template v-if="$slots.item" #default="{ item, selected: picked }"><slot name="item" :item="item" :selected="picked" /></template>
      </SNativeMenuItems>
      <slot v-if="groups.every(group => !group.items.length)" name="empty">
        <SNativeDescription v-if="emptyText" :text="emptyText" padding="8" />
      </slot>
    </SNativeReveal>
    <template v-if="$slots.footer" #footer="{ close: dismiss }"><slot name="footer" :close="dismiss" /></template>
  </SNativePopover>
</template>
