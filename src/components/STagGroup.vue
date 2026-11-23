<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue'
import STag from './STag.vue'
import type { TagItem } from '../types'

const props = defineProps<{
  items: readonly TagItem[]
  label: string
  selectable?: boolean
  removable?: boolean
  multiple?: boolean
  removeLabel?: (item: TagItem) => string
}>()
const root = useTemplateRef<HTMLDivElement>('root')
const selected = defineModel<readonly string[]>({ default: () => [] })
const emit = defineEmits<{ remove: [value: string] }>()

function toggle(item: TagItem) {
  const next = new Set(selected.value)
  if (next.has(item.value)) next.delete(item.value)
  else {
    if (!props.multiple) next.clear()
    next.add(item.value)
  }
  selected.value = [...next]
}

async function remove(item: TagItem) {
  const list = root.value
  const index = props.items.indexOf(item)
  const document = list?.ownerDocument
  const focused = document?.activeElement
  const restore = focused && list?.contains(focused)
  emit('remove', item.value)
  await nextTick()
  if (!list || !restore || props.items.some(entry => entry.value === item.value)) return
  const next = props.items[Math.min(index, props.items.length - 1)]
  const tags = Array.from(list.querySelectorAll<HTMLElement>('[data-tag-key]'))
  const target = tags.find(tag => tag.dataset.tagKey === next?.value)?.querySelector<HTMLElement>('button:not(:disabled)')
  const destination = target ?? list
  destination.focus({ preventScroll: true })
}

function navigate(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const element = root.value
  if (!element) return
  const controls = [...element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
  const index = controls.findIndex(button => button === event.target)
  if (index < 0) return
  event.preventDefault()
  const rtl = getComputedStyle(element).direction === 'rtl'
  const step = (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 :
    (index + step + controls.length) % controls.length
  controls[next]?.focus()
}
</script>

<template>
  <div ref="root" class="sy-tag-group" :aria-label="label" tabindex="-1" @keydown="navigate">
    <TransitionGroup name="sy-tags" tag="div" role="list" :aria-label="label" class="sy-tag-group__items">
      <span v-for="item in items" :key="item.value" role="listitem" :data-tag-key="item.value">
        <STag
          :label="item.label"
          :disabled="item.disabled"
          :selected="selected.includes(item.value)"
          :selectable="selectable"
          :removable="removable"
          :remove-label="removeLabel?.(item)"
          @toggle="toggle(item)"
          @remove="remove(item)"
        />
      </span>
    </TransitionGroup>
  </div>
</template>
