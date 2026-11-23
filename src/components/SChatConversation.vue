<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, useTemplateRef, watch } from 'vue'
import SChatScrollButton from './SChatScrollButton.vue'
import { useReducedMotion } from '../internal/reduced-motion'

const props = withDefaults(defineProps<{
  label?: string
  height?: string
  contentWidth?: string
  follow?: boolean
  initialPosition?: 'start' | 'end'
  threshold?: number
  showJump?: boolean
  jumpLabel?: string
  newMessagesLabel?: string
  compactJump?: boolean
  animateJump?: boolean
  announce?: boolean
  density?: 'compact' | 'balanced' | 'spacious'
  gap?: number | string
  layout?: 'feed' | 'panel'
}>(), {
  label: 'Conversation', height: '25rem', contentWidth: '43rem', follow: true, initialPosition: 'end',
  threshold: 18, showJump: true, jumpLabel: 'Back to latest', animateJump: true, newMessagesLabel: 'New messages',
  density: 'balanced', layout: 'feed',
})
const emit = defineEmits<{ positionChange: [atEnd: boolean]; scroll: [event: Event] }>()
defineSlots<{
  default(): unknown
  header?(): unknown
  composer?(props: { scrollToEnd: () => void; atEnd: boolean }): unknown
  jump(props: { scrollToEnd: () => void; label: string; controls: string; hasNewMessages: boolean }): unknown
}>()

const viewport = useTemplateRef<HTMLDivElement>('viewport')
const reducedMotion = useReducedMotion(viewport)
const body = useTemplateRef<HTMLDivElement>('body')
const jumpControl = useTemplateRef<HTMLDivElement>('jumpControl')
const id = `sy-chat-conversation-${useId()}`
const atEnd = ref(true)
const hasNewMessages = ref(false)
const jumping = ref(false)
const tolerance = computed(() => Number.isFinite(props.threshold) ? Math.max(2, props.threshold) : 18)
const jumpVisible = computed(() => props.showJump && !atEnd.value && !jumping.value)
let following = props.initialPosition === 'end'
let pinned: { node: Element; offset: number } | undefined
let frame: number | undefined
let animation: number | undefined
let writtenTop: number | undefined
let disconnect: (() => void) | undefined

const end = (node: HTMLElement) => Math.max(0, node.scrollHeight - node.clientHeight)
const distance = (node: HTMLElement) => end(node) - Math.max(0, node.scrollTop)

function updatePosition(node: HTMLDivElement) {
  const next = distance(node) <= tolerance.value
  if (next) hasNewMessages.value = false
  if (next !== atEnd.value) {
    atEnd.value = next
    emit('positionChange', next)
  }
}

function rememberAnchor(node: HTMLDivElement) {
  if (!body.value || following && props.follow) {
    pinned = undefined
    return
  }
  const rect = node.getBoundingClientRect()
  const messages = body.value.querySelectorAll('[data-sy-chat-message], [data-chat-anchor]')
  const candidates = messages.length ? messages : body.value.children
  for (const element of candidates) {
    const bounds = element.getBoundingClientRect()
    if (bounds.bottom > rect.top + 1 && bounds.top < rect.bottom) {
      pinned = { node: element, offset: bounds.top - rect.top }
      return
    }
  }
  pinned = undefined
}

function scrollTop(node: HTMLDivElement, value: number) {
  const target = Math.max(0, Math.min(value, end(node)))
  if (Math.abs(node.scrollTop - target) < .5) return
  node.scrollTop = target
  writtenTop = node.scrollTop
}

function contentChanged() {
  const node = viewport.value
  if (!node || jumping.value) return
  if (props.follow && following) scrollTop(node, end(node))
  else if (pinned?.node.isConnected && body.value?.contains(pinned.node)) {
    const offset = pinned.node.getBoundingClientRect().top - node.getBoundingClientRect().top
    scrollTop(node, node.scrollTop + offset - pinned.offset)
  }
  updatePosition(node)
  rememberAnchor(node)
}

function schedule() {
  const win = viewport.value?.ownerDocument.defaultView
  if (!win || frame !== undefined) return
  frame = win.requestAnimationFrame(() => {
    frame = undefined
    contentChanged()
  })
}

function scroll(event: Event) {
  const node = viewport.value
  if (!node) return
  const programmatic = writtenTop !== undefined && Math.abs(writtenTop - node.scrollTop) < 1.5
  writtenTop = undefined
  if (!programmatic && !jumping.value) following = distance(node) <= tolerance.value
  rememberAnchor(node)
  updatePosition(node)
  emit('scroll', event)
}

function cancelJump() {
  if (animation === undefined) return
  const node = viewport.value
  node?.ownerDocument.defaultView?.cancelAnimationFrame(animation)
  animation = undefined
  jumping.value = false
  if (node) {
    following = distance(node) <= tolerance.value
    rememberAnchor(node)
    updatePosition(node)
  }
}

function scrollToEnd(animate = props.animateJump) {
  const node = viewport.value
  const win = node?.ownerDocument.defaultView
  if (!node || !win) return
  cancelJump()
  if (jumpControl.value?.contains(node.ownerDocument.activeElement)) node.focus({ preventScroll: true })
  following = true
  pinned = undefined
  const origin = node.scrollTop
  if (!animate || reducedMotion.value || distance(node) < 2) {
    scrollTop(node, end(node))
    updatePosition(node)
    return
  }
  jumping.value = true
  const start = win.performance.now()
  function step(time: number) {
    if (!node || !win) return
    const ratio = Math.min(1, Math.max(0, (time - start) / 290))
    scrollTop(node, origin + (end(node) - origin) * (1 - (1 - ratio) ** 3))
    updatePosition(node)
    if (ratio < 1) animation = win.requestAnimationFrame(step)
    else {
      animation = undefined
      jumping.value = false
      writtenTop = node.scrollTop
    }
  }
  animation = win.requestAnimationFrame(step)
}

function handleKey(event: KeyboardEvent) {
  if (['Home', 'End', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' '].includes(event.key)) cancelJump()
}

onMounted(() => {
  const node = viewport.value
  const content = body.value
  const win = node?.ownerDocument.defaultView
  if (!node || !content || !win) return
  const resize = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(schedule) : undefined
  resize?.observe(node)
  resize?.observe(content)
  const mutation = new win.MutationObserver(records => {
    if (!following && props.compactJump && records.some(record => record.target === content && [...record.addedNodes].some(node => (
      node instanceof Element && node.nextElementSibling?.matches('.sy-chat-conversation__anchor')
    )))) hasNewMessages.value = true
    schedule()
  })
  mutation.observe(content, { childList: true, subtree: true, characterData: true })
  content.addEventListener('load', schedule, true)
  win.addEventListener('resize', schedule)
  disconnect = () => {
    resize?.disconnect()
    mutation.disconnect()
    win.removeEventListener('resize', schedule)
    content.removeEventListener('load', schedule, true)
    if (frame !== undefined) win.cancelAnimationFrame(frame)
    if (animation !== undefined) win.cancelAnimationFrame(animation)
  }
  if (props.initialPosition === 'end') scrollTop(node, end(node))
  contentChanged()
})
watch(() => [props.follow, props.threshold], schedule)
watch(reducedMotion, reduced => {
  if (reduced && animation !== undefined) scrollToEnd(false)
})
onBeforeUnmount(() => disconnect?.())
defineExpose({ scrollToEnd, atEnd, viewport })
</script>

<template>
  <div class="sy-chat-conversation" :data-at-end="atEnd || undefined" :data-density="density" :data-layout="layout"
    :style="{ '--sy-chat-height': height, '--sy-chat-content-width': contentWidth,
      '--sy-chat-message-gap': typeof gap === 'number' ? Math.max(0, gap) + 'px' : gap }">
    <div v-if="$slots.header" class="sy-chat-conversation__header"><slot name="header" /></div>
    <div class="sy-chat-conversation__frame">
      <div :id="id" ref="viewport" role="log" class="sy-chat-conversation__viewport" :aria-label="label"
        :aria-live="announce ? 'polite' : 'off'" aria-relevant="additions" tabindex="0"
        @scroll.passive="scroll" @wheel.passive="cancelJump" @pointerdown="cancelJump" @keydown="handleKey">
        <div ref="body" class="sy-chat-conversation__content"><slot /><span class="sy-chat-conversation__anchor" aria-hidden="true" /></div>
      </div>
      <Transition name="sy-chat-control">
        <div v-show="jumpVisible" ref="jumpControl" class="sy-chat-conversation__jump" :inert="!jumpVisible" :aria-hidden="!jumpVisible || undefined">
          <slot name="jump" :scroll-to-end="() => scrollToEnd()" :label="jumpLabel" :controls="id" :has-new-messages="hasNewMessages">
            <SChatScrollButton :accessible-label="jumpLabel" :label="compactJump ? (hasNewMessages ? newMessagesLabel : undefined) : jumpLabel"
              :controls="id" @click="scrollToEnd()" />
          </slot>
        </div>
      </Transition>
    </div>
    <div v-if="$slots.composer" class="sy-chat-conversation__composer">
      <slot name="composer" :scroll-to-end="() => scrollToEnd()" :at-end="atEnd" />
    </div>
  </div>
</template>
