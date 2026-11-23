<script lang="ts">
export interface OverflowItem { id: string; label: string }
</script>

<script setup lang="ts" generic="Item extends OverflowItem">
import { computed, nextTick, ref, watch } from 'vue'
import SButton from './SButton.vue'
import SPopover from './SPopover.vue'
import SMenu from './SMenu.vue'
import SMenuItem from './SMenuItem.vue'
import SMotionText from './SMotionText.vue'
import { useOverflow } from '../internal/overflow-layout'
import { useAnimatedLayout } from '../internal/motion'

const props = withDefaults(defineProps<{
  items: readonly Item[]
  label: string
  moreLabel?: string
  gap?: number
  maxRows?: number
  minVisibleItems?: number
  maxVisibleItems?: number
  collapseFrom?: 'start' | 'end'
  presentation?: 'popover' | 'menu' | 'count'
}>(), { moreLabel: 'More', gap: 8, maxRows: 1, minVisibleItems: 0, collapseFrom: 'end', presentation: 'popover' })
const emit = defineEmits<{ 'overflow-change': [items: Item[]]; select: [item: Item] }>()
const { container: root, visibleCount } = useOverflow(() => props.items.length, props)
const open = ref(false)
const hidden = computed(() => props.collapseFrom === 'end'
  ? props.items.slice(visibleCount.value) : props.items.slice(0, Math.max(0, props.items.length - visibleCount.value)))
const hiddenIds = computed(() => new Set(hidden.value.map(item => item.id)))
const ordered = computed(() => props.collapseFrom === 'start' ? [null, ...props.items] : [...props.items, null])
const overlay = computed(() => props.presentation === 'menu' ? SMenu : SPopover)
const indicatorLabel = computed(() => props.moreLabel + ' (' + hidden.value.length + ')')
const capture = useAnimatedLayout()
const controls = 'a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]'
watch(hidden, (items, previous) => {
  const node = root.value
  if (!node) return
  const indicator = node.querySelector<HTMLElement>('[data-overflow-indicator]')
  const focused = node.ownerDocument.activeElement
  const restoring = focused instanceof HTMLElement && node.contains(focused) && focused.closest<HTMLElement>(':is([data-overflow-item], [data-overflow-indicator])')
  const remaining = [...node.querySelectorAll<HTMLElement>(':scope > [data-overflow-item]:not([data-hidden])')]
    .filter(item => !hiddenIds.value.has(item.dataset.overflowItem ?? ''))
  const play = capture(remaining)
  void nextTick(play)
  if (!items.length) open.value = false
  if (restoring && (hiddenIds.value.has(restoring.dataset.overflowItem ?? '') || restoring === indicator && !items.length)) {
    void nextTick(() => {
      const active = node.ownerDocument.activeElement
      if (!node.isConnected || active !== focused && active !== node.ownerDocument.body) return
      const visible = [...node.querySelectorAll<HTMLElement>(':scope > [data-overflow-item]:not([data-hidden])')]
      const closest = props.collapseFrom === 'start' ? visible[0] : visible.at(-1)
      const target = items.length && props.presentation !== 'count' ? indicator?.querySelector<HTMLElement>(controls)
        : closest?.querySelector<HTMLElement>(controls)
      const destination = target ?? node
      destination.focus({ preventScroll: true })
    })
  }
  if (items.length !== previous.length || items.some((item, index) => item !== previous[index])) emit('overflow-change', [...items])
}, { flush: 'sync' })
watch(() => props.presentation, () => { open.value = false })
</script>

<template>
  <ul ref="root" class="sy-overflow-list" role="list" :aria-label="label" tabindex="-1"
    :data-collapse="collapseFrom" :style="{ gap: gap + 'px' }">
    <template v-for="item in ordered" :key="item ? 'item:' + item.id : 'indicator'">
      <li v-if="item" :data-overflow-item="item.id" :inert="hiddenIds.has(item.id)" :data-hidden="hiddenIds.has(item.id) || undefined">
        <slot name="item" :item="item">{{ item.label }}</slot>
      </li>
      <li v-else data-overflow-indicator :inert="!hidden.length" :data-hidden="!hidden.length || undefined">
        <span v-if="presentation === 'count'" class="sy-overflow-list__count" role="status" :aria-label="indicatorLabel">
          <slot name="indicator" :count="hidden.length" :open="false"><SMotionText :value="'+' + hidden.length" motion="roll" /></slot>
        </span>
        <component v-else :is="overlay" v-model:open="open"
          v-bind="presentation === 'menu' ? { menuLabel: label } : { label: indicatorLabel }">
          <template #trigger>
            <SButton variant="secondary" size="sm" :aria-label="indicatorLabel">
              <slot name="indicator" :count="hidden.length" :open="open">{{ moreLabel }}</slot>
            </SButton>
          </template>
          <template v-if="presentation === 'menu'">
            <SMenuItem v-for="entry in hidden" :key="entry.id" :text-value="entry.label" @select="emit('select', entry)">
              <slot name="overflow" :item="entry">{{ entry.label }}</slot>
            </SMenuItem>
          </template>
          <ul v-else class="sy-overflow-list__menu" role="list">
            <li v-for="entry in hidden" :key="entry.id"><slot name="overflow" :item="entry">{{ entry.label }}</slot></li>
          </ul>
        </component>
      </li>
    </template>
  </ul>
</template>
