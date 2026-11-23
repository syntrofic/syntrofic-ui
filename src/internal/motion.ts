import { onScopeDispose, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { resolveMotionSpring, solveSpring, type MotionSpring } from './motion-physics'
import { motionTimings, resolveMotionTiming, type MotionRole } from './motion-timing'
import { observeReducedMotion, prefersReducedMotion } from './reduced-motion'

export type { MotionRole }
export type EntryMotion = 'fade' | 'rise' | 'scale'
export interface MotionOptions extends KeyframeAnimationOptions {
  role?: MotionRole
  reducedMotion?: 'finish' | 'fade'
  scaleTempo?: boolean
}

export { prefersReducedMotion } from './reduced-motion'

/** A value greater than one lengthens motion within the current theme. */
export function themeTempo(element?: Element | null) {
  const text = element?.ownerDocument.defaultView?.getComputedStyle(element).getPropertyValue('--sy-motion-tempo')
  const tempo = Number(text)
  return Number.isFinite(tempo) && tempo > 0 ? tempo : 1
}

export function observeBrowserNavigation(view: Window) {
  const navigation = (view as Window & { navigation?: EventTarget }).navigation
  let active = false
  let reset = 0
  function mark(event: Event) {
    if (!('hasUAVisualTransition' in event) || event.hasUAVisualTransition !== true) return
    active = true
    view.cancelAnimationFrame(reset)
    // Keep the signal through the router's DOM commit and one paint.
    reset = view.requestAnimationFrame(() => {
      reset = view.requestAnimationFrame(() => { active = false })
    })
  }
  view.addEventListener('popstate', mark, true)
  navigation?.addEventListener('navigate', mark, true)
  return {
    active: () => active,
    dispose() {
      view.cancelAnimationFrame(reset)
      view.removeEventListener('popstate', mark, true)
      navigation?.removeEventListener('navigate', mark, true)
      active = false
    },
  }
}

/** A channel replaces an active effect on the same element without touching other channels. */
export function createAnimator(element: HTMLElement | SVGElement) {
  const active = new Map<string, Animation>()
  function cancel(channel: string) {
    active.get(channel)?.cancel()
    active.delete(channel)
  }
  function animate(channel: string, frames: Keyframe[], options: MotionOptions = {}) {
    const { role = 'enter', reducedMotion = 'finish', scaleTempo = true, ...timing } = options
    const reduce = prefersReducedMotion(element)
    const previous = active.get(channel)
    const handoff = previous && frames[0] && !reduce ? element.ownerDocument.defaultView?.getComputedStyle(element) : undefined
    const from = handoff ? Object.fromEntries(Object.keys(frames[0]).filter(key =>
      !['offset', 'easing', 'composite'].includes(key) && !key.startsWith('--')).map(key =>
      [key, handoff.getPropertyValue(key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()))]).filter(([, value]) => value)) : {}
    cancel(channel)
    const keyframes = reduce && reducedMotion === 'fade' ? frames.map(frame => ({ opacity: frame.opacity, offset: frame.offset }))
      : frames.length ? [{ ...frames[0], ...from }, ...frames.slice(1)] : frames
    const resolved = reduce
      ? { duration: reducedMotion === 'fade' ? motionTimings.reducedMotionCrossFadeMs : 0, easing: 'linear', delay: 0, iterations: 1 }
      : {}
    const settings = { ...resolveMotionTiming(element, role), ...timing }
    if (!reduce && scaleTempo && typeof settings.duration === 'number') settings.duration *= themeTempo(element)
    const animation = element.animate(keyframes, { ...settings, ...resolved })
    active.set(channel, animation)
    const stop = reduce ? undefined : observeReducedMotion(element, reduced => {
      if (!reduced || animation.playState === 'finished' || animation.playState === 'idle') return
      if (animation.playbackRate === 0 || animation.effect?.getComputedTiming().endTime === Infinity) animation.cancel()
      else animation.finish()
    })
    const release = () => {
      stop?.()
      if (active.get(channel) === animation && timing.fill !== 'forwards' && timing.fill !== 'both') active.delete(channel)
    }
    animation.finished.then(release, release)
    return animation
  }
  return {
    animate,
    cancel,
    dispose() { for (const channel of active.keys()) cancel(channel) },
  }
}

export function useEntryAnimation(target: Ref<HTMLElement | null>, preset: EntryMotion = 'fade') {
  return watch(target, (element, _, cleanup) => {
    if (!element) return
    const animator = createAnimator(element)
    const transform = preset === 'rise' ? 'translateY(8px)' : preset === 'scale' ? 'scale(.96)' : 'none'
    animator.animate('entry', [{ opacity: 0, transform }, { opacity: 1, transform: 'none' }], { reducedMotion: 'fade' })
    cleanup(animator.dispose)
  }, { flush: 'post', immediate: true })
}

export interface AnimatedLayoutOptions {
  scope?: MaybeRefOrGetter<HTMLElement | null | undefined>
  spring?: MotionSpring
  includePositioned?: boolean
}

interface LayoutOffset {
  x: number
  y: number
}

interface LayoutFlight {
  animation: Animation
  animator: ReturnType<typeof createAnimator>
  duration: number
  samples: readonly LayoutOffset[]
}

interface LayoutSnapshot {
  element: HTMLElement
  box: DOMRect
  scroll: LayoutOffset
  handoff?: { flight: LayoutFlight; elapsed: number; rate: number; startedAt?: number }
}
type LayoutRead = (candidates: readonly HTMLElement[]) => void
export interface LayoutChange {
  measureBefore(): void
  animate(beforeMove?: LayoutRead): boolean
}
interface LayoutBatch {
  snapshots: Map<HTMLElement, LayoutSnapshot>
  changes: Set<HTMLElement>
  callbacks: Set<LayoutRead>
  scheduled: boolean
}

interface LayoutStart {
  at: number
  waiting?: Set<Animation>
}

const pendingLayoutStarts = new WeakMap<Window, LayoutStart>()
const effectStarts = new WeakMap<Animation, LayoutStart>()

function stillWaiting(animation: Animation, start: LayoutStart) {
  return start.waiting?.has(animation) && animation.playState === 'running' && !animation.pending
    && typeof animation.startTime === 'number' && Math.abs(animation.startTime - start.at) < 1
}

function layoutStart(view: Window, moving: boolean): LayoutStart {
  if (moving) return { at: view.performance.now() }
  const pending = pendingLayoutStarts.get(view)
  if (pending) return pending
  // A resolved future start cancels pending play and keeps backwards fill on
  // the first keyframe, even when the browser samples during a long task.
  const waiting = new Set<Animation>()
  const start: LayoutStart = { at: view.performance.now() + 24 * 60 * 60 * 1000, waiting }
  pendingLayoutStarts.set(view, start)
  view.requestAnimationFrame(frameTime => {
    pendingLayoutStarts.delete(view)
    const now = view.performance.now()
    // An earlier frame callback can leave the frame timestamp behind the paint.
    const at = now - frameTime > 8 ? now : frameTime
    for (const animation of waiting) {
      if (stillWaiting(animation, start)) animation.startTime = at
    }
    start.at = at
    start.waiting = undefined
  })
  return start
}

function scheduleLayoutEffect(animation: Animation, start: LayoutStart) {
  animation.startTime = start.at
  effectStarts.set(animation, start)
  if (!start.waiting) return
  start.waiting.add(animation)
  const release = () => { start.waiting?.delete(animation) }
  animation.finished.then(release, release)
}

/** Start layout content effects on the same clock as their accompanying glide. */
export function startLayoutCompanion(element: HTMLElement, animation: Animation, anchor?: Animation | null) {
  const view = element.ownerDocument.defaultView
  if (!view) return animation
  const start = anchor ? effectStarts.get(anchor) : undefined
  if (anchor && start && stillWaiting(anchor, start)) scheduleLayoutEffect(animation, start)
  else if (anchor && typeof anchor.startTime === 'number' && anchor.playState === 'running') {
    scheduleLayoutEffect(animation, { at: anchor.startTime })
  } else if (anchor?.playState === 'paused' && typeof anchor.currentTime === 'number' && anchor.currentTime > 0) {
    scheduleLayoutEffect(animation, { at: view.performance.now() - anchor.currentTime })
  } else scheduleLayoutEffect(animation, layoutStart(view, false))
  return animation
}

const layoutFlights = new WeakMap<HTMLElement, LayoutFlight>()
const restOffset: LayoutOffset = { x: 0, y: 0 }

function layoutOffsetAt(flight: LayoutFlight, elapsed: number): LayoutOffset {
  if (elapsed >= flight.duration) return restOffset
  const index = Math.max(0, elapsed) / flight.duration * (flight.samples.length - 1)
  const left = Math.floor(index)
  const from = flight.samples[left]
  const to = flight.samples[Math.min(left + 1, flight.samples.length - 1)]
  return { x: from.x + (to.x - from.x) * (index - left), y: from.y + (to.y - from.y) * (index - left) }
}

export function glideOf(element: HTMLElement) {
  return layoutFlights.get(element)?.animation ?? null
}

export function landLayoutGlide(element: HTMLElement) {
  layoutFlights.get(element)?.animator.dispose()
  layoutFlights.delete(element)
}

function hasLayout(element: HTMLElement, includePositioned = false) {
  const view = element.ownerDocument.defaultView
  if (!view || typeof element.animate !== 'function') return false
  const style = view.getComputedStyle(element)
  const visible = style.display !== 'none' && style.visibility !== 'hidden'
  if (!visible || includePositioned) return visible
  return !['absolute', 'fixed'].includes(style.position)
    && !((element.tagName === 'DIALOG' && view.CSS.supports('selector(:modal)') && element.matches(':modal'))
      || (element.hasAttribute('popover') && view.CSS.supports('selector(:popover-open)') && element.matches(':popover-open')))
}

export function childLayout(element: Element): HTMLElement[] {
  if (element.ownerDocument.defaultView?.getComputedStyle(element).display === 'contents') {
    return [...element.children].flatMap(childLayout)
  }
  return element instanceof HTMLElement && hasLayout(element) ? [element] : []
}

function layoutScroll(element: HTMLElement) {
  const document = element.ownerDocument
  const view = document.defaultView
  let x = 0
  let y = 0
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const position = view?.getComputedStyle(node).position
    if (position === 'fixed' || position === 'sticky') return { x, y }
    if (node !== element && node !== document.scrollingElement && (node.scrollLeft || node.scrollTop)) {
      const rect = node.getBoundingClientRect()
      x += node.scrollLeft * (node.offsetWidth ? rect.width / node.offsetWidth : 1)
      y += node.scrollTop * (node.offsetHeight ? rect.height / node.offsetHeight : 1)
    }
  }
  return { x: x + (view?.scrollX ?? 0), y: y + (view?.scrollY ?? 0) }
}

/** Capture before a layout mutation, then play after its DOM commit. */
export function createAnimatedLayout(options: AnimatedLayoutOptions = {}) {
  const animations = new Map<HTMLElement, LayoutFlight>()
  let batch: LayoutBatch | undefined
  function read(element: HTMLElement): LayoutSnapshot {
    const box = element.getBoundingClientRect()
    const flight = layoutFlights.get(element)
    const animation = flight?.animation
    const time = animation?.currentTime
    let handoff: LayoutSnapshot['handoff']
    if (flight && animation && typeof time === 'number' && time < flight.duration) {
      const start = effectStarts.get(animation)
      const running = animation.playState === 'running' && animation.playbackRate > 0 && (!start || !stillWaiting(animation, start))
      handoff = { flight, elapsed: Math.max(0, time), rate: animation.playbackRate > 0 ? animation.playbackRate : 1,
        startedAt: running && typeof animation.startTime === 'number' ? animation.startTime : undefined }
    }
    return { element, box, scroll: layoutScroll(element), handoff }
  }
  function play(before: readonly LayoutSnapshot[], beforeMove?: LayoutRead) {
    const moving = new Set<Window>()
    for (const { element } of before) {
      const view = element.ownerDocument.defaultView
      const animation = glideOf(element)
      if (!view || !animation || animation.playState !== 'running') continue
      const start = effectStarts.get(animation)
      if (!start || !stillWaiting(animation, start)) moving.add(view)
    }
    for (const { element } of before) landLayoutGlide(element)
    const displacements = before.filter(({ element }) => element.isConnected && !prefersReducedMotion(element))
      .map(entry => {
        const after = entry.element.getBoundingClientRect()
        const scroll = layoutScroll(entry.element)
        return { ...entry, after, dx: entry.box.left - after.left + entry.scroll.x - scroll.x,
          dy: entry.box.top - after.top + entry.scroll.y - scroll.y, scaleX: entry.element.offsetWidth, scaleY: entry.element.offsetHeight }
      })
      .filter(({ box, after }) => (box.width || box.height) && (after.width || after.height))
    const measured = new Map(displacements.map(entry => [entry.element, entry]))
    beforeMove?.(displacements.map(entry => entry.element))
    const starts = new Map<Window, LayoutStart>()
    for (const { element, after, dx: distanceX, dy: distanceY, handoff, scaleX, scaleY } of displacements) {
      const view = element.ownerDocument.defaultView
      if (!view) continue
      let parent = element.parentElement
      while (parent && !measured.has(parent)) parent = parent.parentElement
      const ancestor = parent ? measured.get(parent) : undefined
      const dx = distanceX - (ancestor?.dx ?? 0)
      const dy = distanceY - (ancestor?.dy ?? 0)
      if (!handoff && Math.abs(dx) + Math.abs(dy) < .5) continue
      const ratioX = scaleX ? after.width / scaleX : 1
      const ratioY = scaleY ? after.height / scaleY : 1
      const tempo = themeTempo(element)
      const spring = resolveMotionSpring(element, options.spring)

      // The delta contains the old glide as it was drawn at capture. Apply a
      // spring only to the new layout delta and carry the old curve on its own clock.
      const held = handoff ? layoutOffsetAt(handoff.flight, handoff.elapsed) : restOffset
      const x = solveSpring({ spring, from: dx / (ratioX || 1) - held.x, to: 0 })
      const y = solveSpring({ spring, from: dy / (ratioY || 1) - held.y, to: 0 })
      const seconds = Math.min(1.2, Math.max(.05, x.settleTime(.3), y.settleTime(.3)))
      let start = starts.get(view)
      if (!start) starts.set(view, start = layoutStart(view, moving.has(view)))
      const at = start.waiting ? view.performance.now() : start.at
      const elapsed = handoff?.startedAt === undefined ? handoff?.elapsed ?? 0
        : Math.max(handoff.elapsed, (at - handoff.startedAt) * handoff.rate)
      const remainder = handoff ? (handoff.flight.duration - elapsed) / handoff.rate : 0
      const travel = seconds * tempo * 1000
      const duration = Math.max(travel, remainder)
      const count = Math.max(2, Math.min(120, Math.ceil(duration * .09)))
      const samples = Array.from({ length: count }, (_, index) => {
        if (index === count - 1) return restOffset
        const time = duration * index / (count - 1)
        const carried = handoff ? layoutOffsetAt(handoff.flight, elapsed + time * handoff.rate) : restOffset
        const springTime = time / (tempo * 1000)
        return { x: carried.x + (time < travel ? x.value(springTime) : 0), y: carried.y + (time < travel ? y.value(springTime) : 0) }
      })
      if (samples.every(({ x, y }) => Math.abs(x) + Math.abs(y) < .5)) continue
      const animator = createAnimator(element)
      const keyframes = samples.map(({ x, y }) => ({ translate: `${x}px ${y}px` }))
      const animation = animator.animate('layout', keyframes, { role: 'move', duration,
        scaleTempo: false, easing: 'linear', composite: 'add', fill: 'backwards' })
      scheduleLayoutEffect(animation, start)
      const flight = { animation, animator, samples, duration }
      animations.set(element, flight)
      layoutFlights.set(element, flight)
      const release = () => {
        if (animations.get(element) === flight) animations.delete(element)
        if (layoutFlights.get(element) === flight) layoutFlights.delete(element)
      }
      animation.finished.then(release, release)
    }
  }
  function capture(elements?: Iterable<HTMLElement>) {
    const scope = toValue(options.scope)
    const candidates = elements ?? (scope ? [...scope.children].flatMap(childLayout) : [])
    const before = [...new Set(candidates)].filter(element => hasLayout(element, elements && options.includePositioned)).map(read)
    let played = false
    return () => {
      if (played) return
      played = true
      play(before)
    }
  }

  function neighbors(element: HTMLElement) {
    const scope = toValue(options.scope)
    if (scope && !scope.contains(element)) return []
    const siblings: HTMLElement[] = []
    for (let current: HTMLElement | null = element; current && current !== scope; current = current.parentElement) {
      const parent: HTMLElement | null = current.parentElement
      if (!parent || parent === element.ownerDocument.body && !scope) break
      siblings.push(...[...parent.children].filter(child => child !== current).flatMap(childLayout))
    }
    return siblings
  }

  function report(target: LayoutTarget): LayoutChange {
    return {
      measureBefore() {
        const element = toValue(target)
        const scope = toValue(options.scope)
        if (!element?.isConnected || scope && (element === scope || !scope.contains(element))) return
        if (!batch) {
          const next: LayoutBatch = { snapshots: new Map(), changes: new Set(), callbacks: new Set(), scheduled: false }
          batch = next
          element.ownerDocument.defaultView?.requestAnimationFrame(() => { if (batch === next && !next.scheduled) batch = undefined })
        }
        if (batch.changes.has(element)) return
        batch.changes.add(element)
        for (const sibling of neighbors(element)) {
          if (!batch.snapshots.has(sibling)) batch.snapshots.set(sibling, read(sibling))
        }
      },
      animate(beforeMove) {
        const element = toValue(target)
        const pending = batch
        if (!pending || !element || !pending.changes.delete(element)) return false
        if (beforeMove) pending.callbacks.add(beforeMove)
        if (!pending.scheduled) {
          pending.scheduled = true
          queueMicrotask(() => {
            if (batch !== pending) return
            batch = undefined
            play([...pending.snapshots.values()], candidates => pending.callbacks.forEach(callback => callback(candidates)))
          })
        }
        return true
      },
    }
  }

  function dispose() {
    batch = undefined
    for (const [element, flight] of animations) {
      if (layoutFlights.get(element) === flight) landLayoutGlide(element)
      else flight.animator.dispose()
    }
    animations.clear()
  }
  return Object.assign(capture, { around: (element: HTMLElement) => capture(neighbors(element)), dispose, report })
}

type LayoutTarget = MaybeRefOrGetter<HTMLElement | null | undefined>
export type AnimatedLayout = ReturnType<typeof createAnimatedLayout>
const missingChange: LayoutChange = { measureBefore() {}, animate: () => false }

export function reportLayoutChange(layout: AnimatedLayout | undefined | null, target: LayoutTarget): LayoutChange {
  return layout?.report(target) ?? missingChange
}

export function useAnimatedLayout(options?: AnimatedLayoutOptions) {
  const layout = createAnimatedLayout(options)
  onScopeDispose(layout.dispose)
  return layout
}
