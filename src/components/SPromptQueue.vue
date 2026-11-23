<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'
import type { QueuedPrompt } from '../chat/types'
import SButton from './SButton.vue'

const props = withDefaults(defineProps<{
  label?: string
  disabled?: boolean
  reorderable?: boolean
  editLabel?: string
  removeLabel?: string
  upLabel?: string
  downLabel?: string
  dragLabel?: string
  formatAttachments?: (count: number) => string
}>(), {
  label: 'Queued prompts', reorderable: true, editLabel: 'Edit', removeLabel: 'Remove',
  upLabel: 'Move up', downLabel: 'Move down', dragLabel: 'Drag to reorder',
})
const items = defineModel<QueuedPrompt[]>({ default: () => [] })
const emit = defineEmits<{
  edit: [item: QueuedPrompt]
  remove: [item: QueuedPrompt]
  reorder: [items: QueuedPrompt[]]
}>()
defineSlots<{
  title(props: { count: number }): unknown
  item(props: { item: QueuedPrompt; index: number }): unknown
  actions(props: { item: QueuedPrompt; edit: () => void; remove: () => void }): unknown
}>()
const list = useTemplateRef<HTMLDivElement>('list')
const dragging = ref<string>()
const target = ref<string>()

function focusRow(id: string | undefined, action: string) {
  if (id === undefined) return
  void nextTick(() => {
    const control = Array.from(list.value?.querySelectorAll<HTMLElement>('li[data-prompt-id]') ?? [])
      .find(element => element.dataset.promptId === id)
    const button = Array.from(control?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
      .find(button => button.dataset.promptAction === action)
    const focus = button ?? control
    focus?.focus({ preventScroll: true })
  })
}

function move(from: number, to: number, action?: string) {
  if (!props.reorderable || props.disabled || from === to || from < 0 || to < 0 || to >= items.value.length) return
  const updated = [...items.value]
  const [item] = updated.splice(from, 1)
  updated.splice(to, 0, item)
  items.value = updated
  emit('reorder', updated)
  if (action) focusRow(item.id, action)
}

function remove(item: QueuedPrompt, index: number) {
  if (props.disabled) return
  const next = items.value[index + 1] ?? items.value[index - 1]
  items.value = items.value.filter(candidate => candidate.id !== item.id)
  emit('remove', item)
  focusRow(next?.id, 'remove')
}

function start(event: DragEvent, item: QueuedPrompt) {
  if (props.disabled || !props.reorderable || !event.dataTransfer) return
  event.dataTransfer.setData('text/plain', item.id)
  event.dataTransfer.effectAllowed = 'move'
  dragging.value = item.id
}

function over(event: DragEvent, item: QueuedPrompt) {
  if (dragging.value === undefined || props.disabled || !props.reorderable) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  target.value = item.id
}

function end() {
  dragging.value = undefined
  target.value = undefined
}

function drop(event: DragEvent, to: number) {
  if (dragging.value === undefined) return
  event.preventDefault()
  move(items.value.findIndex(item => item.id === dragging.value), to)
  end()
}
</script>

<template>
  <div ref="list" class="sy-prompt-queue" role="group" :aria-label="label">
    <div class="sy-prompt-queue__title"><slot name="title" :count="items.length">{{ label }}</slot></div>
    <TransitionGroup tag="ol" name="sy-prompt-queue-row" role="list" class="sy-prompt-queue__list">
      <li v-for="(item, index) in items" :key="item.id" :data-prompt-id="item.id" tabindex="-1"
        :data-target="target === item.id && dragging !== item.id || undefined" :data-dragging="dragging === item.id || undefined"
        @dragover="over($event, item)" @drop="drop($event, index)">
        <span v-if="reorderable && !disabled" class="sy-prompt-queue__handle" draggable="true" :title="dragLabel"
          aria-hidden="true" @dragstart="start($event, item)" @dragend="end" />
        <slot name="item" :item="item" :index="index">
          <span class="sy-prompt-queue__item-text">
            <span v-if="item.text">{{ item.text }}</span>
            <small v-if="item.files.length">{{ formatAttachments?.(item.files.length) ?? (item.files.length === 1 ? '1 attachment' : `${item.files.length} attachments`) }}</small>
          </span>
        </slot>
        <span class="sy-prompt-queue__actions">
          <slot name="actions" :item="item" :edit="() => !disabled && emit('edit', item)" :remove="() => remove(item, index)">
            <template v-if="reorderable">
              <SButton size="sm" variant="ghost" data-prompt-action="up" :aria-label="upLabel" :disabled="disabled || index === 0"
                @click="move(index, index - 1, 'up')">{{ upLabel }}</SButton>
              <SButton size="sm" variant="ghost" data-prompt-action="down" :aria-label="downLabel" :disabled="disabled || index === items.length - 1"
                @click="move(index, index + 1, 'down')">{{ downLabel }}</SButton>
            </template>
            <SButton size="sm" variant="ghost" data-prompt-action="edit" :disabled="disabled" @click="emit('edit', item)">{{ editLabel }}</SButton>
            <SButton size="sm" variant="ghost" data-prompt-action="remove" :disabled="disabled" @click="remove(item, index)">{{ removeLabel }}</SButton>
          </slot>
        </span>
      </li>
    </TransitionGroup>
  </div>
</template>
