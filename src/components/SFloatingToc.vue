<script lang="ts">
export interface TocItem {
  id: string
  label: string
  level?: number
  disabled?: boolean
  children?: readonly TocItem[]
}
</script>

<script setup lang="ts">
import { prefersReducedMotion } from '../internal/reduced-motion'
import SInlineLabel from '../internal/SInlineLabel'
import { useLayerCollisionPadding } from '../internal/layer-context'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/vue-virtual'
import { PopoverAnchor, PopoverContent, PopoverRoot } from 'reka-ui'
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { flattenTree } from '../internal/tree-data'

const collisionPadding = useLayerCollisionPadding(10)
const props = withDefaults(defineProps<{
  items: readonly TocItem[]
  label?: string
  triggerLabel?: string
  defaultOpen?: boolean
  triggerMode?: 'hover' | 'press'
  openDelay?: number
  closeDelay?: number
  placement?: 'start' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  position?: 'inline' | 'fixed' | 'sticky'
  barAlign?: 'start' | 'end'
  scrollRoot?: HTMLElement | null
  contentRoot?: HTMLElement | null
  scrollOffset?: number
  offset?: number
  tracking?: boolean
  history?: 'push' | 'replace' | false
  behavior?: ScrollBehavior
  virtual?: boolean
  maxBars?: number
  maxHeight?: number
}>(), {
  label: 'Table of contents', triggerLabel: 'Sections', triggerMode: 'hover', placement: 'end', position: 'fixed',
  openDelay: 180, closeDelay: 250, offset: 7, scrollOffset: 12, tracking: true,
  behavior: 'smooth', maxBars: 9, maxHeight: 288,
})

const emit = defineEmits<{ navigate: [item: TocItem, event: MouseEvent | KeyboardEvent]; activeChange: [id: string | null] }>()
const openModel = defineModel<boolean | undefined>('open', { default: undefined })
const activeModel = defineModel<string | null>('active')
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const pane = ref<HTMLElement | null>(null)
const list = ref<HTMLDivElement | null>(null)
const current = ref<string | null>(null)
const focused = ref<number>()
const requestedFocus = ref<number>()
const id = `sy-toc-${useId()}`
const entries = computed(() => flattenTree([props.items], entry => entry.id, entry => entry.children).map(entry => ({
  ...entry, level: Math.max(1, entry.item.level ?? entry.level),
})))
const active = computed(() => activeModel.value === undefined ? current.value : activeModel.value)
const open = computed(() => openModel.value ?? props.defaultOpen ?? false)
const barEntries = computed(() => {
  const limit = Number.isFinite(props.maxBars) ? Math.max(1, Math.trunc(props.maxBars)) : 9
  if (entries.value.length <= limit) return entries.value
  const index = entries.value.findIndex(entry => entry.item.id === active.value)
  const start = Math.max(0, Math.min(entries.value.length - limit, index - Math.floor(limit / 2)))
  return entries.value.slice(start, start + limit)
})
const side = computed(() => {
  if (props.side) return props.side
  const rtl = root.value?.ownerDocument.defaultView?.getComputedStyle(root.value).direction === 'rtl'
  return (props.placement === 'end') !== rtl ? 'left' : 'right'
})
const engine = useVirtualizer<HTMLDivElement, HTMLAnchorElement>(computed(() => ({
  count: props.virtual ? entries.value.length : 0,
  enabled: props.virtual && open.value,
  getScrollElement: () => list.value,
  estimateSize: () => 32,
  getItemKey: index => entries.value[index]?.item.id ?? index,
  overscan: 4,
  useAnimationFrameWithResizeObserver: true,
  rangeExtractor: range => {
    const visible = defaultRangeExtractor(range)
    for (const index of [focused.value, requestedFocus.value]) {
      if (index !== undefined && index < entries.value.length && !visible.includes(index)) visible.push(index)
    }
    return visible.sort((a, b) => a - b)
  },
})))
const rendered = computed(() => props.virtual ? engine.value.getVirtualItems().map(row => ({
  entry: entries.value[row.index], index: row.index, start: row.start,
})).filter(row => row.entry) : entries.value.map((entry, index) => ({ entry, index, start: undefined })))

let hover: ReturnType<typeof setTimeout> | undefined
let keyboardOpening = false
let pending: { until: number; top: number; start: number } | undefined
let focusRequest = 0

function setOpen(value: boolean) {
  if (!value) {
    focusRequest++
    requestedFocus.value = undefined
  }
  clearTimeout(hover)
  openModel.value = value
}

function target(id: string) {
  const node = root.value?.ownerDocument.getElementById(id)
  return node && (!props.contentRoot || props.contentRoot.contains(node)) &&
    (!props.scrollRoot || props.scrollRoot.contains(node)) ? node : undefined
}

function selectActive(value: string | null) {
  if (active.value === value && current.value === value) return
  current.value = value
  if (active.value !== value) activeModel.value = value
  emit('activeChange', value)
}

watch([root, () => props.scrollRoot, () => props.contentRoot, entries, () => props.scrollOffset, () => props.tracking],
  ([element, scroller, content, listEntries, offset, tracking], _, onCleanup) => {
    const document = element?.ownerDocument
    const view = document?.defaultView
    if (!view || !document || !tracking) return
    const source = scroller ?? view
    let positions: { id: string; top: number }[] = []
    let frame = 0
    let dirty = true

    const scroll = () => scroller?.scrollTop ?? view.scrollY
    const read = () => {
      if (dirty) {
        const baseline = (scroller?.getBoundingClientRect().top ?? 0) + (scroller?.clientTop ?? 0)
        const top = scroll()
        positions = listEntries.flatMap(({ item }) => {
          const node = item.disabled ? undefined : target(item.id)
          return node ? [{ id: item.id, top: node.getBoundingClientRect().top - baseline + top }] : []
        }).sort((a, b) => a.top - b.top)
        dirty = false
      }
      if (!positions.length) {
        selectActive(null)
        return
      }
      const top = scroll()
      if (pending) {
        const withinScroll = top >= Math.min(pending.start, pending.top) - 2 && top <= Math.max(pending.start, pending.top) + 2
        if (Date.now() < pending.until && withinScroll && Math.abs(top - pending.top) > 2) return
        pending = undefined
      }
      const total = scroller?.scrollHeight ?? document.documentElement.scrollHeight
      const viewport = scroller?.clientHeight ?? view.innerHeight
      if (total > viewport && top + viewport >= total - 2) {
        selectActive(positions[positions.length - 1].id)
        return
      }
      let first = 0
      let last = positions.length - 1
      const edge = top + Math.max(0, offset) + 2
      while (first < last) {
        const middle = Math.ceil((first + last) / 2)
        if (positions[middle].top <= edge) first = middle
        else last = middle - 1
      }
      selectActive(positions[first].id)
    }
    function schedule() {
      if (frame) return
      frame = view!.requestAnimationFrame(() => {
        frame = 0
        read()
      })
    }
    function invalidate() {
      dirty = true
      schedule()
    }
    function interrupt() {
      pending = undefined
      schedule()
    }
    const observed = content ?? scroller ?? document.body
    const resize = new ResizeObserver(invalidate)
    resize.observe(observed)
    if (scroller && observed !== scroller) resize.observe(scroller)
    const mutation = new MutationObserver(records => {
      if (records.some(record => !element?.contains(record.target))) invalidate()
    })
    mutation.observe(observed, { subtree: true, childList: true, attributes: true, attributeFilter: ['id', 'hidden'] })
    source.addEventListener('scroll', schedule, { passive: true })
    source.addEventListener('wheel', interrupt, { passive: true })
    source.addEventListener('touchstart', interrupt, { passive: true })
    view.addEventListener('resize', invalidate)
    read()
    onCleanup(() => {
      resize.disconnect()
      mutation.disconnect()
      view.cancelAnimationFrame(frame)
      source.removeEventListener('scroll', schedule)
      source.removeEventListener('wheel', interrupt)
      source.removeEventListener('touchstart', interrupt)
      view.removeEventListener('resize', invalidate)
    })
  }, { flush: 'post' })

function pointerEnter(event: PointerEvent) {
  if (props.triggerMode !== 'hover' || event.pointerType !== 'mouse') return
  clearTimeout(hover)
  if (!open.value) hover = setTimeout(() => setOpen(true), Math.max(0, props.openDelay))
}

function pointerLeave(event: PointerEvent) {
  if (props.triggerMode !== 'hover' || event.pointerType !== 'mouse') return
  clearTimeout(hover)
  hover = setTimeout(() => {
    if (!pane.value?.contains(pane.value.ownerDocument.activeElement)) setOpen(false)
  }, Math.max(0, props.closeDelay))
}

function close(focusTrigger = false) {
  setOpen(false)
  if (focusTrigger) trigger.value?.focus({ preventScroll: true })
}

function toggle(event: MouseEvent) {
  if (open.value) close()
  else {
    keyboardOpening = event.detail === 0
    setOpen(true)
  }
}

function ready(event: Event) {
  event.preventDefault()
  if (keyboardOpening) {
    keyboardOpening = false
    const index = entries.value.findIndex(entry => entry.item.id === active.value && !entry.item.disabled)
    void focusIndex(index < 0 ? entries.value.findIndex(entry => !entry.item.disabled) : index)
  }
}

async function focusIndex(index: number) {
  if (index < 0) return
  const request = ++focusRequest
  requestedFocus.value = index
  if (props.virtual) engine.value.scrollToIndex(index, { align: 'auto' })
  await nextTick()
  for (let attempt = 0; attempt < 5 && request === focusRequest && open.value; attempt++) {
    const item = list.value?.querySelector<HTMLElement>(`[data-toc-index="${index}"]`)
    if (item) {
      item.focus({ preventScroll: true })
      if (item.ownerDocument.activeElement === item) break
    }
    await new Promise<void>(resolve => { root.value?.ownerDocument.defaultView?.requestAnimationFrame(() => resolve()) ?? resolve() })
  }
  if (request === focusRequest) requestedFocus.value = undefined
}

async function focusHeading(destination: HTMLElement) {
  const owner = destination.ownerDocument
  const wasFocused = owner.activeElement
  await nextTick()
  if (open.value || !destination.isConnected ||
    (owner.activeElement !== owner.body && owner.activeElement !== wasFocused && !root.value?.contains(owner.activeElement))) return
  if (destination.tabIndex < 0 && !destination.hasAttribute('tabindex')) {
    destination.setAttribute('tabindex', '-1')
    destination.addEventListener('blur', () => destination.removeAttribute('tabindex'), { once: true })
  }
  destination.focus({ preventScroll: true })
}

function keyboard(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  const candidates = entries.value.flatMap((entry, index) => entry.item.disabled ? [] : [index])
  const index = (event.target as Element).closest('[data-toc-index]')?.getAttribute('data-toc-index')
  const current = index === null || index === undefined ? -1 : candidates.indexOf(Number(index))
  let next: number | undefined
  if (event.key === 'ArrowDown') next = candidates[Math.min(candidates.length - 1, current + 1)]
  else if (event.key === 'ArrowUp') next = candidates[Math.max(0, current - 1)]
  else if (event.key === 'Home') next = candidates[0]
  else if (event.key === 'End') next = candidates.at(-1)
  else return
  if (next !== undefined) {
    event.preventDefault()
    void focusIndex(next)
  }
}

function outside(event: CustomEvent<{ originalEvent: Event }>) {
  if ((event.detail.originalEvent.target as Node | null) && root.value?.contains(event.detail.originalEvent.target as Node)) {
    event.preventDefault()
  }
}

function action(item: TocItem, event: MouseEvent | KeyboardEvent) {
  if (item.disabled) {
    event.preventDefault()
    return
  }
  if (('button' in event && event.button !== 0) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.defaultPrevented) return
  emit('navigate', item, event)
  if (event.defaultPrevented) return
  const destination = target(item.id)
  if (!destination) return
  event.preventDefault()
  const scroller = props.scrollRoot
  const document = destination.ownerDocument
  const view = document.defaultView
  if (!view) return
  const baseline = (scroller?.getBoundingClientRect().top ?? 0) + (scroller?.clientTop ?? 0)
  const previous = scroller?.scrollTop ?? view.scrollY
  const extent = (scroller?.scrollHeight ?? document.documentElement.scrollHeight) - (scroller?.clientHeight ?? view.innerHeight)
  const top = Math.min(Math.max(0, extent), Math.max(0, previous + destination.getBoundingClientRect().top - baseline - Math.max(0, props.scrollOffset)))
  const behavior = prefersReducedMotion(root.value ?? destination) ? 'instant' : props.behavior
  pending = { start: previous, until: Date.now() + 1250, top }
  const viaKeyboard = event.type === 'keydown' || event.detail === 0
  selectActive(item.id)
  close(!viaKeyboard)
  const scrollViewport = scroller ?? view
  scrollViewport.scrollTo({ top, behavior })
  if (viaKeyboard) void focusHeading(destination)
  const history = props.history
  if (history) view.history[history === 'replace' ? 'replaceState' : 'pushState'](view.history.state, '', `#${encodeURIComponent(item.id)}`)
}

function pressDown(event: KeyboardEvent) {
  if (open.value) {
    const index = entries.value.findIndex(entry => !entry.item.disabled && entry.item.id === active.value)
    void focusIndex(index >= 0 ? index : entries.value.findIndex(entry => !entry.item.disabled))
  } else {
    keyboardOpening = true
    setOpen(true)
  }
  event.preventDefault()
}

onBeforeUnmount(() => clearTimeout(hover))
</script>

<template>
  <div
    ref="root" class="sy-floating-toc" :data-position="position" :data-placement="placement" :data-bar-align="barAlign ?? placement"
    @pointerenter="pointerEnter" @pointerleave="pointerLeave"
  >
    <PopoverRoot :open="open" :modal="false" @update:open="setOpen">
      <PopoverAnchor as-child>
        <button
          ref="trigger" type="button" class="sy-floating-toc__trigger" :aria-label="triggerLabel"
          :aria-controls="open ? id : undefined" :aria-expanded="open" aria-haspopup="dialog"
          @click="toggle" @keydown.down="pressDown" @keydown.esc="close()"
        >
          <slot name="trigger" :active="active" :open="open">
            <span class="sy-floating-toc__bars" aria-hidden="true">
              <span
                v-for="{ item, level } in barEntries" :key="item.id" :data-active="active === item.id || undefined"
                class="sy-floating-toc__bar" :style="{ '--sy-toc-level': level - 1 }"
              />
            </span>
            <span v-if="!entries.length" aria-hidden="true">{{ triggerLabel }}</span>
          </slot>
        </button>
      </PopoverAnchor>
      <PopoverContent
        :id="id" class="sy-floating-toc__panel" :side="side" align="center" :side-offset="offset"
        :collision-padding="collisionPadding" :aria-label="label"
        @open-auto-focus="ready" @close-auto-focus.prevent
        @pointer-down-outside="outside" @focus-outside="outside"
        @escape-key-down.prevent="close(true)"
      >
        <nav ref="pane" class="sy-floating-toc__content" :aria-label="label">
          <slot name="heading"><strong>{{ label }}</strong></slot>
          <div ref="list" class="sy-floating-toc__list" :style="{ maxBlockSize: `${Math.max(64, maxHeight)}px` }"
            @keydown="keyboard" @focusout="!list?.contains($event.relatedTarget as Node | null) && (focused = undefined)">
            <div class="sy-floating-toc__items" :data-virtual="virtual || undefined" :style="{ height: virtual ? `${engine.getTotalSize()}px` : undefined }">
              <a
                v-for="{ entry, index, start } in rendered" :key="entry.item.id" class="sy-floating-toc__link"
                :data-toc-index="index" :data-index="index" :href="entry.item.disabled ? undefined : `#${encodeURIComponent(entry.item.id)}`"
                :aria-disabled="entry.item.disabled || undefined" :aria-current="entry.item.id === active ? 'location' : undefined"
                :tabindex="entry.item.disabled ? -1 : undefined"
                :style="{ '--sy-toc-level': entry.level - 1, translate: virtual ? `0 ${start}px` : undefined }"
                @focus="focused = index" @click="action(entry.item, $event)" @keydown.enter="action(entry.item, $event)"
              >
                <SInlineLabel class="sy-floating-toc__label" :text="entry.item.label" keep-rich-layout>
                  <template v-if="$slots.item" #default><slot name="item" :item="entry.item" :level="entry.level" :active="entry.item.id === active" /></template>
                </SInlineLabel>
              </a>
            </div>
          </div>
        </nav>
      </PopoverContent>
    </PopoverRoot>
  </div>
</template>
