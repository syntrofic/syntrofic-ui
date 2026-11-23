<script setup lang="ts" generic="Item">
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { prefersReducedMotion } from '../internal/motion'

const props = withDefaults(defineProps<{
  data: readonly Item[]
  getRowKey: (item: Item, index: number) => string | number
  estimatedItemSize?: number | ((item: Item, index: number) => number)
  label?: string
  height?: number
  follow?: boolean
  initialPosition?: 'start' | 'end'
  endThreshold?: number
  overscanTop?: number
  overscanBottom?: number
  scrollElement?: HTMLElement | null
}>(), { estimatedItemSize: 100, label: 'Messages', height: 360, follow: true, initialPosition: 'end', endThreshold: 24,
  overscanTop: 840, overscanBottom: 480 })
const host = useTemplateRef<HTMLDivElement>('host')
const own = computed(() => props.scrollElement === undefined)
const viewport = computed(() => own.value ? host.value : props.scrollElement ?? null)
const size = computed(() => Number.isFinite(props.height) ? Math.max(80, props.height) : 360)
const margin = computed(() => {
  if (own.value || !viewport.value || !host.value) return 0
  return Math.max(0, host.value.getBoundingClientRect().top - viewport.value.getBoundingClientRect().top + viewport.value.scrollTop)
})
const keys = computed(() => props.data.map((item, index) => String(props.getRowKey(item, index))))
const pixels = (value: number, fallback: number) => Number.isFinite(value) ? Math.max(0, value) : fallback
function estimate(item: Item, index: number) {
  const height = typeof props.estimatedItemSize === 'function' ? props.estimatedItemSize(item, index) : props.estimatedItemSize
  return Number.isFinite(height) ? Math.max(12, height) : 100
}
const engine = useVirtualizer<HTMLElement, HTMLElement>(computed(() => {
  const data = props.data
  const rowKeys = keys.value
  const estimated = typeof props.estimatedItemSize === 'number' ? Math.max(20, estimate(data[0], 0)) : 100
  const before = Math.ceil(pixels(props.overscanTop, 840) / estimated)
  const after = Math.ceil(pixels(props.overscanBottom, 480) / estimated)
  return {
    enabled: own.value || Boolean(viewport.value),
    count: data.length,
    getScrollElement: () => viewport.value,
    initialRect: { width: 0, height: size.value },
    getItemKey: index => rowKeys[index] ?? index,
    estimateSize: index => estimate(data[index], index),
    rangeExtractor: range => {
      const start = Math.max(0, range.startIndex - before)
      const end = Math.min(data.length, range.endIndex + 1 + after)
      return Array.from({ length: Math.max(0, end - start) }, (_, index) => index + start)
    },
    scrollMargin: margin.value,
    anchorTo: 'end',
    followOnAppend: props.follow,
    scrollEndThreshold: pixels(props.endThreshold, 24),
    useAnimationFrameWithResizeObserver: true,
  }
}))
const rows = computed(() => engine.value.getVirtualItems())
const tail = computed(() => Math.max(0, engine.value.getTotalSize() - ((rows.value.at(-1)?.end ?? margin.value) - margin.value)))
const head = computed(() => Math.max(0, (rows.value[0]?.start ?? margin.value) - margin.value))
const atEnd = computed(() => engine.value.isAtEnd())

function scrollToEnd(smooth = false) {
  if (!viewport.value) return
  engine.value.scrollToEnd({ behavior: smooth && !prefersReducedMotion(viewport.value) ? 'smooth' : 'auto' })
}
function scrollToDistanceFromBottomPx(distance: number) {
  const node = viewport.value
  if (!node || !Number.isFinite(distance)) return
  engine.value.scrollToOffset(Math.max(0, node.scrollHeight - node.clientHeight - Math.max(0, distance)))
}
function anchorToKey(key: number | string) {
  const index = keys.value.indexOf(String(key))
  if (index < 0) return false
  engine.value.scrollToIndex(index, { align: 'start' })
  return true
}
function measure(node: unknown) {
  if (node instanceof HTMLElement) engine.value.measureElement(node)
}
onMounted(() => { if (props.initialPosition === 'end') void nextTick(() => scrollToEnd()) })
watch(viewport, (node, previous) => {
  if (node && !previous && !own.value && props.initialPosition === 'end') void nextTick(() => scrollToEnd())
}, { flush: 'post' })
defineExpose({ scrollToEnd, scrollToDistanceFromBottomPx, anchorToKey, atEnd })
</script>

<template>
  <div ref="host" class="sy-chat-virtualizer" :data-own="own || undefined" :role="own ? 'log' : undefined" :aria-label="own ? label : undefined"
    :aria-live="own ? 'off' : undefined" :tabindex="own ? 0 : undefined" :style="{ '--sy-chat-virtual-height': size + 'px' }">
    <div class="sy-chat-virtualizer__rows" role="list">
      <div v-if="head" :style="{ blockSize: head + 'px' }" aria-hidden="true" />
      <div v-for="row in rows" :key="String(row.key)" :ref="measure" class="sy-chat-virtualizer__row" :data-index="row.index" role="listitem"
        :aria-setsize="data.length" :aria-posinset="row.index + 1">
        <slot :item="data[row.index]" :index="row.index" />
      </div>
      <div v-if="tail" :style="{ blockSize: tail + 'px' }" aria-hidden="true" />
    </div>
  </div>
</template>
