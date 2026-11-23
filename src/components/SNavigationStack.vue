<script lang="ts">
export type { NavigationScreen } from '../internal/navigation-stack'
</script>

<script setup lang="ts" generic="Screen extends NavigationScreen">
import { computed, nextTick, onBeforeUnmount, provide, ref, useTemplateRef, watch, type ComponentPublicInstance } from 'vue'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'
import { createPanGesture } from '../internal/pan-gesture'
import { gestureMotion } from '../internal/motion-defaults'
import { motionSprings, rubberBand, solveSpring } from '../internal/motion-physics'
import { createAnimator, observeBrowserNavigation, prefersReducedMotion, themeTempo, useAnimatedLayout } from '../internal/motion'
import { navigationStackKey, type NavigationScreen } from '../internal/navigation-stack'

const props = withDefaults(defineProps<{
  backLabel?: string
  swipeBack?: boolean | 'edge'
  label?: string
  height?: string
}>(), { swipeBack: true })
const screens = defineModel<Screen[]>({ required: true })
const active = computed(() => screens.value.at(-1))
const previous = computed(() => screens.value.at(-2))
const depth = computed(() => Math.max(0, screens.value.length - 1))
const backTitle = computed<string | undefined>(last => previous.value ? previous.value.backTitle ?? props.backLabel ?? previous.value.title : last)
const bar = useTemplateRef<HTMLElement>('bar')
const viewport = useTemplateRef<HTMLElement>('viewport')
const captureBar = useAnimatedLayout({ scope: bar, spring: motionSprings.navigationBarElements })
const direction = ref('forward')
const drag = ref(0)
const tracking = ref(false)
const revealed = ref<string>()
const progress = ref(0)
const scrolled = ref(false)
const largeTitlePassed = ref(false)
const browserAnimating = ref(false)
const roles = new Map<string, HTMLElement>()
const openers = new Map<string, HTMLElement>()
const offsets = new Map<string, number>()
const running = new Map<HTMLElement, ReturnType<typeof createAnimator>>()
let revision = 0
let dragVelocity = 0
let dragOrigin = 0
let pendingOpener: { id: string; control: HTMLElement } | undefined
let sizeMotion: ReturnType<typeof createAnimator> | undefined
let browserNavigation: ReturnType<typeof observeBrowserNavigation> | undefined
let leaving: { id: string; from: number; width: number; velocity: number } | undefined
const flow = () => viewport.value?.matches(':dir(rtl)') ? -1 : 1

function register(id: string, node: Element | ComponentPublicInstance | null) {
  if (node instanceof HTMLElement) roles.set(id, node)
  else roles.delete(id)
}
function translation(node: HTMLElement | undefined) {
  if (!node) return 0
  const style = node.ownerDocument.defaultView?.getComputedStyle(node)
  return Number.parseFloat(style?.translate ?? '') || 0
}
function animate(node: HTMLElement | undefined, from: number, to: number, velocity = 0) {
  if (!node) return Promise.resolve()
  running.get(node)?.dispose()
  running.delete(node)
  if (prefersReducedMotion(node) || typeof node.animate !== 'function') return Promise.resolve()
  const tempo = themeTempo(node)
  const spring = solveSpring({ from, to, velocity: velocity * tempo, spring: motionSprings.navigation })
  const duration = Math.min(.8, spring.settleTime(.7))
  if (duration <= 0) return Promise.resolve()
  const animator = createAnimator(node)
  running.set(node, animator)
  const count = Math.max(2, Math.ceil(duration * 75))
  const frames = Array.from({ length: count }, (_, index) => ({
    translate: `${index === count - 1 ? to : spring.value(duration * index / (count - 1))}px 0`,
  }))
  const animation = animator.animate('navigation', frames, { role: 'move', duration: duration * tempo * 1000, easing: 'linear', scaleTempo: false })
  return animation.finished.then(() => {}, () => {}).finally(() => {
    if (running.get(node) === animator) running.delete(node)
  })
}
function underlay(width: number, at = progress.value) { return -flow() * width * .25 * (1 - at) }

function readScroll(node?: HTMLElement) {
  const top = node?.scrollTop ?? 0
  const title = node?.querySelector<HTMLElement>(':scope > .sy-navigation-stack__large-title')
  scrolled.value = top > 10
  largeTitlePassed.value = Boolean(title && top >= title.offsetTop + title.offsetHeight)
}
function restoreScroll(id?: string) {
  const screen = id ? roles.get(id) : undefined
  if (screen && id) screen.scrollTop = offsets.get(id) ?? 0
  return screen
}

function push(screen: Screen, opener?: HTMLElement) {
  if (screens.value.some(item => item.id === screen.id)) return
  pendingOpener = opener ? { id: screen.id, control: opener } : undefined
  screens.value = [...screens.value, screen]
}
function back() {
  if (screens.value.length > 1) screens.value = screens.value.slice(0, -1)
}
function popToRoot() {
  if (depth.value) screens.value = screens.value.slice(0, 1)
}
provide(navigationStackKey, { push, back, popToRoot, depth })

watch(() => screens.value.map(screen => screen.id), (ids, oldIds) => {
  const id = ids.at(-1)
  const last = oldIds.at(-1)
  const ancestor = id === undefined ? -1 : oldIds.indexOf(id)
  const opener = id !== last && ancestor >= 0 ? openers.get(oldIds[ancestor + 1]) : undefined
  for (const removed of oldIds) {
    if (ids.includes(removed)) continue
    offsets.delete(removed)
    openers.delete(removed)
  }
  if (id === last) return
  const current = ++revision
  const backwards = ancestor >= 0
  direction.value = backwards ? 'back' : 'forward'
  const alreadyAnimated = Boolean(browserNavigation?.active())
  browserAnimating.value = alreadyAnimated
  const moveBar = alreadyAnimated ? undefined : captureBar()
  const container = viewport.value
  const width = container?.clientWidth ?? 0
  const height = container?.getBoundingClientRect().height ?? 0
  sizeMotion?.dispose()
  const previousNode = last ? roles.get(last) : undefined
  const arriving = id ? roles.get(id) : undefined
  const enteredFrom = backwards
    ? arriving && (tracking.value || id === revealed.value) ? translation(arriving) : underlay(width, 0)
    : flow() * width
  const leftFrom = tracking.value ? drag.value : translation(previousNode)
  const release = tracking.value ? dragVelocity : 0
  const formerParent = last === undefined ? -1 : ids.indexOf(last)
  const firstNewChild = formerParent < 0 ? undefined : ids[formerParent + 1]
  const trigger = pendingOpener?.id === firstNewChild ? pendingOpener?.control : previousNode?.ownerDocument.activeElement
  pendingOpener = undefined
  if (last && previousNode && formerParent >= 0) offsets.set(last, previousNode.scrollTop)
  if (firstNewChild && trigger instanceof HTMLElement && previousNode?.contains(trigger)) openers.set(firstNewChild, trigger)
  leaving = !alreadyAnimated && backwards && last ? { id: last, from: leftFrom, width, velocity: release } : undefined
  revealed.value = !alreadyAnimated && !backwards && last && screens.value.some(item => item.id === last) ? last : undefined
  if (alreadyAnimated) {
    captureBar.dispose()
    for (const animator of running.values()) animator.dispose()
    running.clear()
  }
  tracking.value = false
  drag.value = 0
  progress.value = 0
  void nextTick(() => {
    if (current !== revision) return
    const next = restoreScroll(id)
    readScroll(next)
    if (next?.contains(opener ?? null)) opener?.focus({ preventScroll: true })
    if (next && !next.contains(next.ownerDocument.activeElement)) next.focus({ preventScroll: true })
    if (alreadyAnimated) {
      container?.ownerDocument.defaultView?.requestAnimationFrame(() => {
        if (current === revision) browserAnimating.value = false
      })
      return
    }
    moveBar?.()
    const targetHeight = container?.offsetHeight ?? 0
    if (container && !prefersReducedMotion(container) && typeof container.animate === 'function' && height && targetHeight && Math.abs(height - targetHeight) > 1) {
      sizeMotion = createAnimator(container)
      sizeMotion.animate('navigation-size', [{ blockSize: `${height}px` }, { blockSize: `${targetHeight}px` }], { role: 'move' })
    }
    const move = backwards || !revealed.value ? Promise.resolve() : animate(previousNode, leftFrom, underlay(width, 0))
    const arrive = animate(next, enteredFrom, 0, backwards ? release * .25 : 0)
    void Promise.all([move, arrive]).then(() => { if (current === revision) revealed.value = undefined })
  })
}, { flush: 'pre' })

function leave(node: Element, done: () => void) {
  if (!(node instanceof HTMLElement)) { done(); return }
  const motion = leaving?.id === node.dataset.screen ? leaving : undefined
  if (!motion) { done(); return }
  leaving = undefined
  node.dataset.navigationLeaving = ''
  node.inert = true
  node.setAttribute('aria-hidden', 'true')
  void animate(node, motion.from, flow() * motion.width, motion.velocity).then(done)
}

function handleScroll(event: Event, id: string) {
  if (id === active.value?.id && event.currentTarget instanceof HTMLElement) readScroll(event.currentTarget)
}

watch(viewport, (node, _, cleanup) => {
  if (!node) return
  const view = node.ownerDocument.defaultView
  let dragged = false
  const resetClick = () => { dragged = false }
  function suppressClick(event: MouseEvent) {
    if (!dragged || !event.detail) return
    event.preventDefault()
    event.stopImmediatePropagation()
    resetClick()
  }
  node.addEventListener('pointerdown', resetClick, true)
  node.addEventListener('click', suppressClick, true)
  cleanup(() => {
    node.removeEventListener('pointerdown', resetClick, true)
    node.removeEventListener('click', suppressClick, true)
  })
  if (view) {
    const observer = observeBrowserNavigation(view)
    browserNavigation = observer
    cleanup(() => {
      observer.dispose()
      browserNavigation = undefined
    })
  }
  function restore(width: number, velocity: number) {
    const offset = drag.value
    const behind = previous.value?.id
    const hiddenFrom = underlay(width)
    const current = ++revision
    tracking.value = false
    drag.value = 0
    progress.value = 0
    revealed.value = behind
    void nextTick(() => {
      if (current !== revision) return
      const front = active.value ? roles.get(active.value.id) : undefined
      const rear = behind ? roles.get(behind) : undefined
      void Promise.all([animate(front, offset, 0, velocity), animate(rear, hiddenFrom, underlay(width, 0), velocity * .25)])
        .then(() => { if (current === revision) revealed.value = undefined })
    })
  }
  cleanup(createPanGesture(node, {
    axis: 'horizontal',
    shouldStart(event) {
      if (!props.swipeBack || !depth.value || event.altKey || event.shiftKey || event.metaKey || event.ctrlKey) return false
      const target = event.target
      if (!(target instanceof Element) || target.closest('.sy-navigation-stack__viewport') !== node) return false
      if (target.closest('input,textarea,select,label,video,[role="slider"],[contenteditable],[draggable="true"],.sy-swipe-actions,.sy-scrollable-area')) return false
      if (event.pointerType === 'mouse' && target.closest('button,a[href],[role="button"]')) return false
      if (event.pointerType === 'mouse' && view?.getComputedStyle(target).userSelect !== 'none' &&
        Array.from(target.childNodes).some(child => child.nodeType === 3 && child.textContent?.trim())) return false
      const edge = gestureMotion.screenEdgePan.inset
      if (event.pointerType === 'touch' && view) {
        const standalone = view.matchMedia('(display-mode: standalone)').matches ||
          (view.navigator as Navigator & { standalone?: boolean }).standalone
        if (!standalone && (event.clientX <= edge || event.clientX >= view.innerWidth - edge)) return false
      }
      if (props.swipeBack !== 'edge') return true
      const rect = node.getBoundingClientRect()
      return (flow() > 0 ? event.clientX - rect.left : rect.right - event.clientX) <= edge
    },
    onStart() {
      revision++
      dragged = true
      const front = active.value && roles.get(active.value.id)
      dragOrigin = translation(front)
      const rear = previous.value?.id
      for (const screen of [active.value, previous.value]) {
        const element = screen && roles.get(screen.id)
        if (element) { running.get(element)?.dispose(); running.delete(element) }
      }
      revealed.value = undefined
      dragVelocity = 0
      tracking.value = true
      void nextTick(() => { if (tracking.value) restoreScroll(rear) })
    },
    onMove({ x }) {
      const offset = Math.max(0, (x + dragOrigin) * flow())
      const width = node.clientWidth
      drag.value = flow() * (offset < width ? offset : width + rubberBand(offset - width, width))
      progress.value = Math.min(1, offset / Math.max(1, width))
    },
    onEnd({ x, velocityX }, _, cancelled) {
      const width = node.clientWidth
      dragVelocity = cancelled ? 0 : Math.max(-3000, Math.min(3000, velocityX * 1000))
      const { releaseTravel, releaseVelocity } = gestureMotion.screenEdgePan
      if (!cancelled && (x * flow() > width * .35 || x * flow() > releaseTravel && velocityX * flow() > releaseVelocity)) {
        const screen = active.value?.id
        back()
        void nextTick(() => { if (tracking.value && active.value?.id === screen) restore(width, dragVelocity) })
        return
      }
      restore(width, dragVelocity)
    },
  }))
}, { flush: 'post' })
onBeforeUnmount(() => {
  revision++
  sizeMotion?.dispose()
  for (const animator of running.values()) animator.dispose()
  running.clear()
})
defineExpose({ push, back, popToRoot, depth })
</script>

<template>
  <div class="sy-navigation-stack" :data-direction="direction" :data-browser-motion="browserAnimating || undefined"
    :role="label ? 'region' : undefined" :aria-label="label">
    <header v-if="active" ref="bar" :data-scrolled="scrolled || undefined">
      <Transition name="sy-navigation-back" :css="!browserAnimating">
        <SButton v-show="depth" class="sy-navigation-stack__back" size="sm" variant="ghost" :inert="!depth || undefined" @click="back">
          <template #start><span class="sy-navigation-stack__chevron" aria-hidden="true" /></template>
          <SMotionText :value="backTitle || 'Back'" :animate="!browserAnimating" />
        </SButton>
      </Transition>
      <h2 :data-hidden="active.titleDisplayMode === 'large' && !largeTitlePassed || undefined" :aria-hidden="active.titleDisplayMode === 'large' || undefined">
        <SMotionText :value="active.title" :animate="!browserAnimating" />
      </h2>
      <div v-if="$slots.end" class="sy-navigation-stack__end"><slot name="end" :screen="active" :back="back" :pop-to-root="popToRoot" :depth="depth" /></div>
    </header>
    <div v-if="active" ref="viewport" class="sy-navigation-stack__viewport" :data-swipe="swipeBack && depth > 0 || undefined"
      :data-tracking="tracking || undefined" :style="{ '--sy-navigation-drag': `${drag}px`,
        '--sy-navigation-reveal': progress, '--sy-navigation-height': height }">
      <TransitionGroup :css="false" @leave="leave">
        <section v-for="screen in screens" v-show="screen.id === active.id || screen.id === revealed || tracking && screen.id === previous?.id"
          :key="screen.id" :ref="node => register(screen.id, node)" :data-screen="screen.id"
          :data-navigation-layer="screen.id === active.id ? 'active' : 'underlay'" :inert="screen.id !== active.id || undefined"
          :aria-hidden="screen.id !== active.id || undefined" tabindex="-1" :aria-label="screen.title" @scroll.passive="handleScroll($event, screen.id)">
          <h2 v-if="screen.titleDisplayMode === 'large'" class="sy-navigation-stack__large-title">
            <SMotionText :value="screen.title" :animate="!browserAnimating" wrap />
          </h2>
          <slot :screen="screen" :push="push" :back="back" :pop-to-root="popToRoot" :depth="depth" />
        </section>
      </TransitionGroup>
    </div>
    <slot v-else name="empty" :push="push" />
  </div>
</template>
