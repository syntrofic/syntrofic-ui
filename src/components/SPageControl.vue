<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { createPanGesture } from '../internal/pan-gesture'

const props = withDefaults(defineProps<{
  totalPages: number
  label?: string
  hidesForSinglePage?: boolean
  directJump?: boolean
  pageLabel?: (page: number, total: number) => string
}>(), { label: 'Page indicators', pageLabel: (page: number, total: number) => `Page ${page} of ${total}` })
const model = defineModel<number>({ default: 1 })
const root = useTemplateRef<HTMLDivElement>('root')
const scrubStart = ref<number>()
const windowSize = 10
const total = computed(() => Number.isFinite(props.totalPages) ? Math.max(0, Math.trunc(props.totalPages)) : 0)
const current = computed(() => clamp(Number.isFinite(model.value) ? Math.trunc(model.value) : 1))
const first = computed(() => Math.max(1, Math.min(total.value - windowSize + 1, current.value - Math.floor(windowSize / 2))))
const visible = computed(() => Array.from({ length: Math.min(windowSize, total.value) }, (_, index) => (scrubStart.value ?? first.value) + index))
let dragged = false

function clamp(page: number) {
  return Math.max(1, Math.min(total.value, page))
}
function go(page: number, focus = false) {
  if (total.value === 0) return
  const next = clamp(page)
  if (next !== current.value) model.value = next
  if (focus) void nextTick(() => root.value?.querySelector<HTMLElement>(`[data-page="${next}"]`)?.focus({ preventScroll: true }))
}
function choose(event: MouseEvent, page: number) {
  if (event.detail > 0 && dragged) return
  go(props.directJump || event.detail === 0 ? page : current.value + Math.sign(page - current.value), true)
}
function keyboard(event: KeyboardEvent) {
  const step = root.value?.matches(':dir(rtl)') ? -1 : 1
  const targets: Record<string, number> = {
    ArrowLeft: current.value - step, ArrowRight: current.value + step,
    ArrowUp: current.value - 1, ArrowDown: current.value + 1, Home: 1, End: total.value,
  }
  const target = targets[event.key]
  if (typeof target !== 'number') return
  event.preventDefault()
  go(target, true)
}

watch(root, (node, _, cleanup) => {
  if (!node) return
  cleanup(createPanGesture(node, {
    axis: 'horizontal',
    threshold: 5,
    shouldStart() { dragged = false; return true },
    onStart() { scrubStart.value = first.value; dragged = true },
    onMove(_, event) {
      const nearest = [...node.querySelectorAll<HTMLButtonElement>('button[data-page]')].reduce<{ page: number; gap: number } | undefined>((best, button) => {
        const box = button.getBoundingClientRect()
        const gap = Math.abs(event.clientX - (box.left + box.right) / 2)
        return !best || gap < best.gap ? { page: Number(button.dataset.page), gap } : best
      }, undefined)
      if (nearest) go(nearest.page)
    },
    onEnd(_, event) {
      const restoreFocus = event.pointerType === 'mouse' && node.contains(node.ownerDocument.activeElement)
      scrubStart.value = undefined
      if (restoreFocus) go(current.value, true)
    },
  }))
}, { flush: 'post' })
</script>

<template>
  <div v-if="total > (hidesForSinglePage ? 1 : 0)" ref="root" class="sy-page-control" role="group" :aria-label="label"
    :data-scrubbing="scrubStart !== undefined || undefined" @keydown="keyboard">
    <button v-for="(page, index) in visible" :key="page" type="button" :data-page="page" :tabindex="current === page ? 0 : -1"
      :data-edge="(index === 0 && page > 1) || (index === visible.length - 1 && page < total) || undefined"
      :aria-label="pageLabel(page, total)" :aria-current="current === page ? 'page' : undefined" @click="choose($event, page)" />
  </div>
</template>
