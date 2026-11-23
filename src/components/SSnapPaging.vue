<script lang="ts">
export interface SnapPage { id: string; label: string }
</script>

<script setup lang="ts" generic="Page extends SnapPage">
import { computed, nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { prefersReducedMotion, themeTempo } from '../internal/motion'
import { createPanGesture } from '../internal/pan-gesture'
import { rubberBand } from '../internal/motion-physics'
import { movePaging, releasePage } from '../internal/paging-motion'
import SButton from './SButton.vue'
import SPageControl from './SPageControl.vue'

const props = withDefaults(defineProps<{
  pages: readonly Page[]
  label: string
  previousLabel?: string
  nextLabel?: string
  controls?: boolean
  draggable?: boolean
}>(), { previousLabel: 'Previous', nextLabel: 'Next', controls: true, draggable: true })
const page = defineModel<number>({ default: 0 })
const viewport = useTemplateRef<HTMLDivElement>('viewport')
const current = computed(() => Math.max(0, Math.min(props.pages.length - 1, Math.trunc(page.value) || 0)))
let timer: ReturnType<typeof setTimeout> | undefined
let cancelMotion: (() => void) | undefined
let settling: number | undefined
let dragging = false
let startPage = 0
let startPosition = 0
let position = 0
let queuedPage: number | undefined

function centeredPosition(index: number) {
  const node = viewport.value
  const panel = node?.children[index]
  if (!node || !panel) return
  const a = node.getBoundingClientRect()
  const b = panel.getBoundingClientRect()
  const overshoot = Number.parseFloat(node.style.getPropertyValue('--sy-page-overshoot')) || 0
  return node.scrollLeft + (b.left + b.right - a.left - a.right) / 2 - overshoot
}
function paint(node: HTMLDivElement, next: number) {
  const edge = node.clientWidth * Math.max(0, node.children.length - 1)
  const rtl = node.matches(':dir(rtl)')
  const clipped = Math.max(rtl ? -edge : 0, Math.min(rtl ? 0 : edge, next))
  position = next
  node.scrollLeft = clipped
  node.style.setProperty('--sy-page-overshoot', -rubberBand(next - clipped, node.clientWidth) + 'px')
}
function stop(node: HTMLDivElement) {
  cancelMotion?.()
  cancelMotion = undefined
  settling = undefined
  delete node.dataset.controlledScroll
  node.style.removeProperty('--sy-page-overshoot')
}
function travel(index: number, animate: boolean, velocity = 0) {
  const node = viewport.value
  const target = centeredPosition(index)
  if (!node || target === undefined) return
  const from = node.hasAttribute('data-controlled-scroll') ? position : node.scrollLeft
  const view = node.ownerDocument.defaultView
  cancelMotion?.()
  clearTimeout(timer)
  if (!animate || !view || prefersReducedMotion(node) || Math.abs(target - from) <= .5 && Math.abs(velocity) < .05) {
    stop(node)
    node.scrollTo({ left: target, behavior: 'instant' })
    return
  }
  let motion = { position: from, velocity: Math.abs(velocity) >= .225 ? Math.max(-3, Math.min(3, velocity)) : 0 }
  let previous = view.performance.now()
  const tempo = themeTempo(node)
  settling = index
  position = from
  node.dataset.controlledScroll = ''
  let frame = view.requestAnimationFrame(tick)
  cancelMotion = () => view.cancelAnimationFrame(frame)
  function tick(timestamp: number) {
    if (timestamp <= previous) { frame = view!.requestAnimationFrame(tick); return }
    const step = movePaging(motion, target!, (timestamp - previous) / tempo)
    previous = timestamp
    motion = step
    paint(node!, step.position)
    if (step.settled) stop(node!)
    else frame = view!.requestAnimationFrame(tick)
  }
}
function go(index: number) {
  const next = Math.max(0, Math.min(props.pages.length - 1, index))
  if (next === page.value) travel(next, true)
  else page.value = next
}
function sync() {
  const node = viewport.value
  if (!node || !node.children.length) return
  const container = node.getBoundingClientRect()
  const center = (container.left + container.right) / 2
  let nearest = 0
  let best = Infinity
  Array.from(node.children).forEach((child, index) => {
    const rect = child.getBoundingClientRect()
    const distance = Math.abs(center - (rect.left + rect.right) / 2)
    if (distance < best) { best = distance; nearest = index }
  })
  if (page.value !== nearest) page.value = nearest
}
function scroll() {
  if (dragging || settling !== undefined) return
  clearTimeout(timer)
  timer = setTimeout(sync, 130)
}
function key(event: KeyboardEvent) {
  if (event.target !== viewport.value) return
  const rtl = viewport.value?.matches(':dir(rtl)') ? -1 : 1
  const step = event.key === 'ArrowRight' ? rtl : event.key === 'ArrowLeft' ? -rtl : 0
  const target = step ? current.value + step : event.key === 'Home' ? 0 : event.key === 'End' ? props.pages.length - 1 : null
  if (target !== null) { event.preventDefault(); go(target) }
}
function focusin(event: FocusEvent) {
  if (event.target === viewport.value) return
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-snap-page]')
  if (target?.parentElement === viewport.value) go(Number(target.dataset.snapPage))
}
watch(current, index => {
  if (queuedPage === index) { queuedPage = undefined; return }
  if (!dragging) travel(index, true)
}, { flush: 'post' })
watch([viewport, () => props.draggable], ([node, enabled], _, cleanup) => {
  if (!node || !enabled) return
  const detach = createPanGesture(node, {
    axis: 'horizontal',
    shouldStart(event) {
      if (props.pages.length < 2) return false
      return !(event.target instanceof Element && event.target.closest('button, a, input, select, textarea, video, [contenteditable]'))
    },
    onStart() {
      cancelMotion?.()
      cancelMotion = undefined
      settling = undefined
      clearTimeout(timer)
      dragging = true
      startPage = current.value
      startPosition = node.scrollLeft
      node.dataset.controlledScroll = ''
      node.dataset.dragging = ''
    },
    onMove({ x }) { paint(node, startPosition - x) },
    onEnd({ x, velocityX }, _, cancelled) {
      const rtl = node.matches(':dir(rtl)') ? -1 : 1
      const wanted = cancelled ? startPage : releasePage(startPage, -x * rtl / Math.max(1, node.clientWidth), -velocityX * rtl)
      const next = current.value === startPage ? Math.max(0, Math.min(props.pages.length - 1, wanted)) : current.value
      dragging = false
      delete node.dataset.dragging
      if (next !== current.value) { queuedPage = next; page.value = next }
      travel(next, true, cancelled ? 0 : -velocityX)
      void nextTick(() => {
        if (queuedPage !== next) return
        queuedPage = undefined
        if (current.value !== next) travel(current.value, true)
      })
    },
  })
  cleanup(() => { detach(); stop(node); dragging = false; delete node.dataset.dragging })
}, { flush: 'post' })
watch(() => props.pages.map(item => item.id), () => { void nextTick(() => travel(current.value, false)) })
onMounted(() => travel(current.value, false))
onBeforeUnmount(() => { clearTimeout(timer); cancelMotion?.() })
</script>

<template>
  <section class="sy-snap-paging" :aria-label="label">
    <div ref="viewport" class="sy-snap-paging__viewport" role="group" :aria-label="label" :tabindex="pages.length > 1 ? 0 : undefined"
      :data-draggable="draggable && pages.length > 1 || undefined"
      @keydown="key" @scroll.passive="scroll" @focusin="focusin">
      <div v-for="(item, index) in pages" :key="item.id" :data-snap-page="index" role="group" :aria-label="item.label">
        <slot :item="item" :index="index" :active="index === current">{{ item.label }}</slot>
      </div>
    </div>
    <div v-if="controls && pages.length > 1" class="sy-snap-paging__controls">
      <SButton size="sm" variant="secondary" :aria-disabled="current === 0" @click="go(current - 1)">{{ previousLabel }}</SButton>
      <SPageControl :total-pages="pages.length" :model-value="current + 1" :label="label" :page-label="index => pages[index - 1].label" direct-jump
        @update:model-value="go($event - 1)" />
      <SButton size="sm" variant="secondary" :aria-disabled="current === pages.length - 1" @click="go(current + 1)">{{ nextLabel }}</SButton>
    </div>
  </section>
</template>
