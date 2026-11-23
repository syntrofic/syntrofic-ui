<script lang="ts">
export type LogStreamLevel = 'debug' | 'info' | 'warn' | 'warning' | 'error'
export interface LogEntry {
  id: string
  text: string
  level?: LogStreamLevel
  timestamp?: string
  source?: string
  detail?: string | boolean
}
export interface LogMessageEntry extends Omit<LogEntry, 'text'> {
  message: string
  text?: string
}
type Entry = LogEntry | LogMessageEntry
</script>

<script setup lang="ts">
import { computed, nextTick, onScopeDispose, ref, useId, useTemplateRef, watch } from 'vue'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { useCollectionContentMotion } from '../internal/collection-motion'
import { layoutSize, type LayoutSize } from '../internal/layout-spacing'
import { createAnimator, prefersReducedMotion, themeTempo } from '../internal/motion'
import { resolveMotionTiming } from '../internal/motion-timing'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'
import SSkeleton from './SSkeleton.vue'
import SSpinner from './SSpinner.vue'

const props = withDefaults(defineProps<{
  entries: readonly Entry[]
  label?: string
  maxEntries?: number
  maxHeight?: LayoutSize
  hasTimestamps?: boolean
  variant?: 'default' | 'terminal'
  announce?: boolean
  animate?: boolean
  pauseLabel?: string
  followLabel?: string
  jumpLabel?: string
  loading?: boolean
  loadingText?: string
  error?: string
  retry?: () => void
  retryLabel?: string
  emptyText?: string
}>(), {
  label: 'Log stream', maxEntries: 500, hasTimestamps: true, variant: 'default', announce: true, animate: true,
  pauseLabel: 'Pause following', followLabel: 'Follow latest', jumpLabel: 'Jump to latest',
  loadingText: 'Loading logs', retryLabel: 'Retry', emptyText: 'No log entries',
})
const slots = defineSlots<{
  entry?(props: { entry: Entry }): unknown
  detail?(props: { entry: Entry; detail: string | true }): unknown
}>()
const follow = defineModel<boolean>('follow', { default: true })
const frame = useTemplateRef<HTMLDivElement>('frame')
const view = useTemplateRef<HTMLDivElement>('view')
const rows = useTemplateRef<HTMLDivElement>('rows')
const feedback = useTemplateRef<HTMLDivElement>('feedback')
const id = `sy-log-stream-${useId()}`
const atEnd = ref(true)
const visible = computed(() => props.entries.slice(-Math.max(1, Math.floor(props.maxEntries) || 1)))
const state = computed(() => props.loading ? 'loading' : props.error ? 'error' : visible.value.length ? 'ready' : 'empty')
const hasTime = computed(() => props.hasTimestamps && visible.value.some(entry => entry.timestamp != null))
const hasSource = computed(() => visible.value.some(entry => entry.source != null))
const followText = computed(() => follow.value ? props.pauseLabel : atEnd.value ? props.followLabel : props.jumpLabel)
const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']
const threshold = 24
let jumpFrame = 0
let jumpWindow: Window | undefined
const departing = new WeakMap<Element, { top: number; height: number }>()

const end = (node: HTMLElement) => Math.max(0, node.scrollHeight - node.clientHeight)
const distance = (node: HTMLElement) => end(node) - Math.max(0, node.scrollTop)
const expandable = (entry: Entry) => typeof entry.detail === 'string' || entry.detail === true && Boolean(slots.detail)
const message = (entry: Entry) => ('message' in entry ? entry.message : undefined) ?? entry.text ?? ''

function pin() {
  const node = view.value
  if (!node || jumpFrame) return
  if (follow.value && distance(node) > .5) node.scrollTop = end(node)
  atEnd.value = distance(node) <= threshold
}

function cancelJump() {
  if (jumpFrame) jumpWindow?.cancelAnimationFrame(jumpFrame)
  jumpFrame = 0
  jumpWindow = undefined
}

function pause() {
  cancelJump()
  if (follow.value) follow.value = false
}

function observeScroll() {
  const node = view.value
  if (!node) return
  atEnd.value = distance(node) <= threshold
  if (!jumpFrame && !atEnd.value && follow.value) pause()
}

function wheel(event: WheelEvent) {
  if (jumpFrame || event.deltaY < 0 && (view.value?.scrollTop ?? 0) > 0) pause()
}

function interrupt() { if (jumpFrame) pause() }

function keydown(event: KeyboardEvent) {
  if (event.target === view.value && scrollKeys.includes(event.key)) interrupt()
}

function changeFollow() {
  if (follow.value) { pause(); return }
  const node = view.value
  const window = node?.ownerDocument.defaultView
  if (!node || !window) return
  follow.value = true
  const from = node.scrollTop
  const duration = resolveMotionTiming(node, 'move').duration * themeTempo(node)
  if (distance(node) < 2 || !duration || !props.animate || prefersReducedMotion(node)) {
    node.scrollTop = end(node)
    atEnd.value = true
    return
  }
  jumpWindow = window
  const start = window.performance.now()
  function step(now: number) {
    const progress = !props.animate || prefersReducedMotion(node!) ? 1 : Math.min(1, Math.max(0, (now - start) / duration))
    node!.scrollTop = from + (end(node!) - from) * (1 - (1 - progress) ** 3)
    if (progress < 1) jumpFrame = window!.requestAnimationFrame(step)
    else {
      cancelJump()
      atEnd.value = true
    }
  }
  jumpFrame = window.requestAnimationFrame(step)
}

watch(visible, next => {
  const node = view.value
  const list = rows.value
  if (!node || !list) return
  const remaining = new Set(next.map(entry => entry.id))
  const viewport = node.getBoundingClientRect()
  const listTop = list.getBoundingClientRect().top
  const animate = props.animate && !prefersReducedMotion(node)
  let anchor: { line: Element; top: number } | undefined
  for (const line of list.children) {
    if (!(line instanceof HTMLElement) || line.inert) continue
    const position = line.getBoundingClientRect()
    if (position.bottom <= viewport.top || position.top >= viewport.bottom) continue
    if (remaining.has(line.dataset.logEntry ?? '')) {
      if (!follow.value && !anchor) anchor = { line, top: position.top }
    } else if (animate) departing.set(line, { top: position.top - listTop, height: position.height })
  }
  if (!anchor) return
  const { line, top } = anchor
  void nextTick(() => {
    if (!follow.value && view.value === node && list.contains(line)) node.scrollTop += line.getBoundingClientRect().top - top
  })
})
watch(follow, value => { if (value) pin(); else cancelJump() }, { flush: 'post' })
watch(visible, pin, { flush: 'post' })
watch([view, rows], ([node, content], _, cleanup) => {
  if (!node || !content) return
  const observer = new ResizeObserver(pin)
  observer.observe(node)
  observer.observe(content)
  pin()
  cleanup(() => observer.disconnect())
}, { flush: 'post' })
watch(state, () => {
  const status = feedback.value
  if (status?.contains(status.ownerDocument.activeElement)) view.value?.focus({ preventScroll: true })
})
onScopeDispose(cancelJump)
const noEntries: readonly Entry[] = []
useCollectionContentMotion(frame, () => props.animate ? state.value : '', {
  items: () => props.animate ? visible.value : noEntries,
  content: element => element.querySelector('.sy-log-stream__view'), animateContent: false,
})

function hideFeedback(node: Element) {
  node.setAttribute('inert', '')
  node.setAttribute('aria-hidden', 'true')
}

function leaveRow(element: Element, done: () => void) {
  if (element.contains(element.ownerDocument.activeElement)) view.value?.focus({ preventScroll: true })
  const box = departing.get(element)
  departing.delete(element)
  if (!box || !(element instanceof HTMLElement) || typeof element.animate !== 'function') { done(); return }
  hideFeedback(element)
  Object.assign(element.style, { position: 'absolute', insetInline: '0', insetBlockStart: `${box.top}px`, blockSize: `${box.height}px`, margin: '0', pointerEvents: 'none' })
  const exit = createAnimator(element).animate('exit', [{ opacity: 1 }, { opacity: 0 }], { role: 'exit' })
  void exit.finished.then(done, done)
}
</script>

<template>
  <section class="sy-log-stream" :aria-label="label" :data-variant="variant" :data-state="state" :data-time="hasTime || undefined"
    :data-source="hasSource || undefined" :data-animated="animate || undefined" :style="{ '--sy-log-height': layoutSize(maxHeight) }">
    <div ref="frame" class="sy-log-stream__frame">
      <div :id="id" ref="view" role="log" tabindex="0" :aria-label="label" :aria-busy="loading || undefined"
        :aria-live="announce && follow ? 'polite' : 'off'" aria-relevant="additions" class="sy-log-stream__view"
        @scroll.passive="observeScroll" @wheel.passive="wheel" @pointerdown.passive="interrupt" @keydown="keydown">
        <div ref="rows" class="sy-log-stream__rows">
          <TransitionGroup name="sy-log-row" :css="animate" @leave="leaveRow">
            <div v-for="entry in visible" :key="entry.id" class="sy-log-stream__entry" :data-log-entry="entry.id" :data-level="entry.level">
              <slot name="entry" :entry="entry">
                <component :is="expandable(entry) ? CollapsibleRoot : 'div'" @update:open="(open: boolean) => { if (open) pause() }">
                  <component :is="expandable(entry) ? CollapsibleTrigger : 'div'" class="sy-log-stream__line">
                    <span class="sy-log-stream__time" :aria-hidden="!hasTime || undefined">{{ entry.timestamp }}</span>
                    <span class="sy-log-stream__level">{{ entry.level }}</span>
                    <span class="sy-log-stream__source" :aria-hidden="!hasSource || undefined" :title="entry.source">{{ entry.source }}</span>
                    <span class="sy-log-stream__message">{{ message(entry) }}</span>
                    <span v-if="expandable(entry)" class="sy-disclosure__arrow" aria-hidden="true"></span>
                  </component>
                  <CollapsibleContent v-if="expandable(entry)" class="sy-disclosure__content sy-log-stream__detail">
                    <slot name="detail" :entry="entry" :detail="entry.detail as string | true">
                      <pre v-if="typeof entry.detail === 'string'">{{ entry.detail }}</pre>
                    </slot>
                  </CollapsibleContent>
                </component>
              </slot>
            </div>
          </TransitionGroup>
        </div>
      </div>
      <Transition name="sy-log-feedback" :css="animate" @before-leave="hideFeedback">
        <div v-if="state !== 'ready'" :key="state" ref="feedback" class="sy-log-stream__state" :data-cover="!visible.length || undefined">
          <template v-if="loading">
            <div v-if="!visible.length" class="sy-log-stream__skeleton" aria-hidden="true">
              <SSkeleton v-for="(length, index) in ['72%', '89%', '64%']" :key="length" shape="line"
                :width="length" height=".7rem" :index="index" :animated="animate" />
            </div>
            <SSpinner :label="loadingText" show-label size="sm" />
          </template>
          <template v-else-if="error">
            <span role="alert">{{ error }}</span>
            <SButton v-if="retry" size="sm" variant="secondary" @click="retry">{{ retryLabel }}</SButton>
          </template>
          <span v-else role="status">{{ emptyText }}</span>
        </div>
      </Transition>
    </div>
    <SButton size="sm" variant="secondary" :aria-pressed="follow" :aria-controls="id" @click="changeFollow">
      <SMotionText v-if="animate" :value="followText" wrap />
      <template v-else>{{ followText }}</template>
    </SButton>
  </section>
</template>
