<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { contentUrl } from '../internal/content-url'
import type { TableKey } from '../types'
import type { ChatThread } from '../chat/types'
import SFocusGroup from './SFocusGroup.vue'
import SItemCard from './SItemCard.vue'
import SItemCardGroup from './SItemCardGroup.vue'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{
  items: readonly ChatThread[]
  label?: string
  emptyText?: string
  defaultSelected?: TableKey | null
  compact?: boolean
  locale?: string
  unreadLabel?: (count: number) => string
}>(), { label: 'Conversations', emptyText: 'No conversations', defaultSelected: null, compact: true, locale: 'en' })
const selected = defineModel<TableKey | null>('selected')
const emit = defineEmits<{ select: [thread: ChatThread, event: MouseEvent] }>()
defineSlots<{
  empty(): unknown
  title(props: { thread: ChatThread; selected: boolean }): unknown
  preview(props: { thread: ChatThread }): unknown
  meta(props: { thread: ChatThread }): unknown
  action(props: { thread: ChatThread; selected: boolean }): unknown
}>()
const root = useTemplateRef<HTMLElement>('root')
const focused = ref<TableKey>()
const current = computed(() => selected.value === undefined ? props.defaultSelected : selected.value)
const groups = computed(() => {
  const list = new Map<string | undefined, ChatThread[]>()
  for (const item of props.items) {
    const group = list.get(item.group) ?? []
    group.push(item)
    list.set(item.group, group)
  }
  return [...list]
})
const available = computed(() => groups.value.flatMap(([, list]) => list.filter(item => !item.disabled)))
const tabbable = computed(() => {
  if (available.value.some(item => item.id === focused.value)) return focused.value
  return available.value.find(item => item.id === current.value)?.id ?? available.value[0]?.id
})
const format = computed(() => new Intl.NumberFormat(props.locale, { maximumFractionDigits: 0 }))
const unread = (item: ChatThread) => Number.isFinite(item.unread) ? Math.max(0, Math.trunc(item.unread ?? 0)) : 0

function activate(thread: ChatThread, event: MouseEvent) {
  if (thread.disabled || event.defaultPrevented) return
  selected.value = thread.id
  emit('select', thread, event)
}

function navigate(event: KeyboardEvent) {
  const origin = event.target
  if (!(origin instanceof HTMLElement) || !origin.matches('.sy-item-card__lead')) return
  const rows = Array.from(root.value?.querySelectorAll<HTMLElement>('.sy-item-card__lead[data-sy-focus-target]') ?? [])
  const current = rows.indexOf(origin)
  if (current < 0) return
  let index = current
  if (event.key === 'ArrowUp') index = Math.max(0, current - 1)
  else if (event.key === 'ArrowDown') index = Math.min(rows.length - 1, current + 1)
  else if (event.key === 'Home') index = 0
  else if (event.key === 'End') index = rows.length - 1
  else return
  event.preventDefault()
  rows[index]?.focus()
}
</script>

<template>
  <nav ref="root" class="sy-chat-list-view" :data-compact="compact || undefined" :aria-label="label" @keydown="navigate">
    <SFocusGroup class="sy-chat-list-view__groups">
      <SItemCardGroup v-for="([name, members], index) in groups" :key="name ?? index" :title="name"
        :label="name ? undefined : label" variant="transparent" :dividers="false" class="sy-chat-list-view__group">
        <SItemCard v-for="thread in members" :key="thread.id" :title="thread.title" :description="thread.preview"
          :href="contentUrl(thread.href)" pressable track-focus truncate :current="current === thread.id"
          :lead-tabindex="tabbable === thread.id ? 0 : -1" :disabled="thread.disabled"
          :data-current="current === thread.id || undefined" :data-unread="unread(thread) > 0 || undefined"
          @focusin="focused = thread.id" @press="activate(thread, $event)">
          <template #title>
            <slot name="title" :thread="thread" :selected="current === thread.id"><SMotionText :value="thread.title" /></slot>
          </template>
          <template v-if="thread.preview !== undefined || $slots.preview" #description>
            <slot name="preview" :thread="thread"><SMotionText :value="thread.preview ?? ''" /></slot>
          </template>
          <template v-if="thread.time || thread.datetime || thread.unread !== undefined || $slots.meta" #status>
            <span class="sy-chat-list-view__meta">
              <slot name="meta" :thread="thread">
                <time v-if="thread.time || thread.datetime" :datetime="thread.datetime"><SMotionText :value="thread.time ?? thread.datetime ?? ''" motion="roll" /></time>
                <span v-if="thread.unread !== undefined" class="sy-chat-list-view__unread">
                  <Transition name="sy-chat-control">
                    <span v-if="unread(thread) > 0">
                      <span class="sy-visually-hidden">{{ unreadLabel?.(unread(thread)) ?? `${unread(thread)} unread` }}</span>
                      <span aria-hidden="true"><SMotionText :value="format.format(unread(thread))" motion="roll" /></span>
                    </span>
                  </Transition>
                </span>
              </slot>
            </span>
          </template>
          <template v-if="$slots.action" #action><slot name="action" :thread="thread" :selected="current === thread.id" /></template>
        </SItemCard>
      </SItemCardGroup>
      <div v-if="!items.length" class="sy-chat-list-view__empty">
        <slot name="empty">{{ emptyText }}</slot>
      </div>
    </SFocusGroup>
  </nav>
</template>
