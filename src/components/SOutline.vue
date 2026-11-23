<script setup lang="ts">
import { prefersReducedMotion } from '../internal/reduced-motion'
import { computed, nextTick, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import type { TocItem } from './SFloatingToc.vue'
import { useAnimatedLayout } from '../internal/motion'

const props = withDefaults(defineProps<{
  items: readonly TocItem[]
  active?: string | null
  label?: string
  density?: 'default' | 'compact'
  offset?: number
  scrollRoot?: HTMLElement | null
  contentRoot?: HTMLElement | null
  scrollOnClick?: boolean
  history?: 'push' | 'replace' | false
}>(), { label: 'Table of contents', density: 'default', offset: 0, scrollOnClick: true, history: 'push' })
const emit = defineEmits<{
  'update:active': [id: string | null]
  activeChange: [id: string | null]
  navigateStart: [id: string]
  navigateEnd: [id: string]
}>()
const root = useTemplateRef<HTMLElement>('root')
const local = shallowRef<string | null>(null)
const activeId = computed(() => props.active === undefined ? local.value : props.active)
const minimumLevel = computed(() => Math.min(...props.items.map(item => item.level ?? 2), 6))
const indicator = shallowRef({ top: 0, height: 0 })
const layout = useAnimatedLayout()
let pending: { cancel(): void } | undefined
let landing: { viewport?: HTMLElement; top: number; id: string } | undefined

function target(id: string) {
  const node = root.value?.ownerDocument.getElementById(id)
  if (!node || (props.contentRoot && !props.contentRoot.contains(node)) || (props.scrollRoot && !props.scrollRoot.contains(node))) return
  return node
}

function scroller(node?: HTMLElement) {
  if (props.scrollRoot) return props.scrollRoot
  const view = node?.ownerDocument.defaultView
  for (let parent = node?.parentElement; parent && parent !== node?.ownerDocument.body; parent = parent.parentElement) {
    if (/^(auto|scroll|overlay)$/.test(view?.getComputedStyle(parent).overflowY ?? '')) return parent
  }
}

function publish(id: string | null) {
  if (activeId.value === id) return
  if (props.active === undefined) local.value = id
  emit('update:active', id)
  emit('activeChange', id)
}

function activationTop(node: HTMLElement, viewport: HTMLElement | undefined) {
  const view = node.ownerDocument.defaultView
  const margin = Number.parseFloat(view?.getComputedStyle(node).scrollMarginTop ?? '0') || 0
  const offset = Math.max(0, Number.isFinite(props.offset) ? props.offset : 0)
  const baseline = (viewport?.getBoundingClientRect().top ?? 0) + (viewport?.clientTop ?? 0)
  return node.getBoundingClientRect().top - baseline - offset - margin
}

watch([root, () => props.items, () => props.active, () => props.scrollRoot, () => props.contentRoot, () => props.offset], ([element, items, controlled], _, cleanup) => {
  const document = element?.ownerDocument
  const view = document?.defaultView
  if (!element || !document || !view || controlled !== undefined) return
  const nodes = () => items.flatMap(item => {
    const node = item.disabled ? undefined : target(item.id)
    return node ? [node] : []
  })
  const viewport = scroller(nodes()[0] ?? props.contentRoot ?? element)
  const host = viewport ?? view
  const read = () => {
    if (pending) return
    const candidates = nodes()
    const top = viewport?.scrollTop ?? view.scrollY
    if (landing) {
      const pinned = candidates.find(node => node.id === landing?.id)
      const viewBounds = viewport?.getBoundingClientRect()
      const bounds = pinned?.getBoundingClientRect()
      if (landing.viewport === viewport && Math.abs(landing.top - top) <= 2 && bounds
        && bounds.bottom > (viewBounds?.top ?? 0) && bounds.top < (viewBounds?.bottom ?? view.innerHeight)) {
        publish(landing.id)
        return
      }
      landing = undefined
    }
    const max = Math.max(0, (viewport?.scrollHeight ?? document.documentElement.scrollHeight) - (viewport?.clientHeight ?? view.innerHeight))
    if (max > 2 && top >= max - 2) {
      publish(candidates.at(-1)?.id ?? null)
      return
    }
    const previous = candidates.filter(node => activationTop(node, viewport) <= 3).at(-1)
    publish(previous?.id ?? candidates[0]?.id ?? null)
  }
  let frame = 0
  const schedule = () => {
    if (!frame) frame = view.requestAnimationFrame(() => { frame = 0; read() })
  }
  const resize = new view.ResizeObserver(schedule)
  const observed = props.contentRoot ?? viewport ?? document.body
  resize.observe(observed)
  const mutations = new view.MutationObserver(records => {
    if (records.some(record => !element.contains(record.target))) schedule()
  })
  mutations.observe(observed, { childList: true, subtree: true, attributes: true, attributeFilter: ['id', 'hidden'] })
  host.addEventListener('scroll', schedule, { passive: true })
  view.addEventListener('resize', schedule)
  read()
  cleanup(() => {
    host.removeEventListener('scroll', schedule)
    view.removeEventListener('resize', schedule)
    view.cancelAnimationFrame(frame)
    resize.disconnect()
    mutations.disconnect()
  })
}, { flush: 'post', immediate: true })

function paint() {
  const link = root.value?.querySelector<HTMLElement>('[aria-current="location"]')
  indicator.value = { top: link?.offsetTop ?? 0, height: link?.offsetHeight ?? 0 }
}
watch([activeId, () => props.items, () => props.density], paint, { flush: 'post' })
watch([() => props.items, () => props.density], () => {
  if (root.value) void nextTick(layout(root.value.querySelectorAll<HTMLElement>('li')))
})
watch(root, (node, _, cleanup) => {
  const view = node?.ownerDocument.defaultView
  if (!node || !view) return
  const resize = new view.ResizeObserver(paint)
  resize.observe(node)
  cleanup(() => resize.disconnect())
  paint()
}, { flush: 'post' })

function navigate(id: string) {
  const item = props.items.find(entry => entry.id === id && !entry.disabled)
  const document = root.value?.ownerDocument
  const view = document?.defaultView
  if (!item || !document || !view) return
  pending?.cancel()
  landing = undefined
  publish(id)
  emit('navigateStart', id)
  if (props.history) view.history[props.history === 'replace' ? 'replaceState' : 'pushState'](view.history.state, '', `#${encodeURIComponent(id)}`)
  const node = target(id)
  if (!props.scrollOnClick || !node) {
    emit('navigateEnd', id)
    return
  }
  const viewport = scroller(node)
  const host = viewport ?? view
  const start = viewport?.scrollTop ?? view.scrollY
  const top = Math.max(0, Math.min(start + activationTop(node, viewport), (viewport?.scrollHeight ?? document.documentElement.scrollHeight) - (viewport?.clientHeight ?? view.innerHeight)))
  const recordLanding = () => {
    const offset = viewport?.scrollTop ?? view.scrollY
    if (Math.abs(offset - top) <= 2) landing = { viewport, top: offset, id }
    emit('navigateEnd', id)
  }
  const smooth = Math.abs(top - start) > 2 && !prefersReducedMotion(root.value ?? node)
  if (!smooth) {
    host.scrollTo({ top, behavior: 'instant' })
    recordLanding()
    return
  }
  const listeners = new AbortController()
  function finish() {
    if (pending?.cancel !== finish) return
    pending = undefined
    listeners.abort()
    clearTimeout(deadline)
    recordLanding()
  }
  const deadline = setTimeout(finish, 1400)
  const signal = listeners.signal
  pending = { cancel: finish }
  host.addEventListener('scrollend', finish, { signal })
  host.addEventListener('wheel', finish, { signal, passive: true })
  host.addEventListener('touchstart', finish, { signal, passive: true })
  host.scrollTo({ top, behavior: 'smooth' })
}

function click(item: TocItem, event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  event.preventDefault()
  navigate(item.id)
}
onScopeDispose(() => pending?.cancel())
defineExpose({ navigate })
</script>

<template>
  <nav ref="root" class="sy-outline" :aria-label="label" :data-density="density">
    <span class="sy-outline__indicator" aria-hidden="true" :data-visible="indicator.height > 0 || undefined"
      :style="{ '--sy-outline-top': `${indicator.top}px`, '--sy-outline-height': `${indicator.height}px` }" />
    <ul role="list">
      <li v-for="item in items" :key="item.id">
        <a :href="item.disabled ? undefined : `#${encodeURIComponent(item.id)}`" :aria-disabled="item.disabled || undefined"
          :aria-current="item.id === activeId ? 'location' : undefined" :style="{ '--sy-outline-depth': Math.max(0, (item.level ?? 2) - minimumLevel) }"
          @click="click(item, $event)"><slot name="item" :item="item" :active="item.id === activeId">{{ item.label }}</slot></a>
      </li>
    </ul>
  </nav>
</template>
