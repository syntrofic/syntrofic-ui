import { computed, onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { createAnimator, prefersReducedMotion } from './motion'
import { decayRestDistance, rubberBandClamp, rubberBandSlope, rubberBandUnclamp, solveSpring } from './motion-physics'
import { createPanGesture } from './pan-gesture'

export interface DragToSnapOptions {
  points: readonly number[]
  initial?: number
  axis?: 'horizontal' | 'vertical'
  onChange?: (point: number) => void
  onSettle?: (point: number) => void
  flickThreshold?: number
  keepPosition?: boolean
}

const ordered = (points: readonly number[]) => [...new Set(points.filter(Number.isFinite))].sort((a, b) => a - b)
function drawnOffset(element: HTMLElement) {
  const shown = element.ownerDocument.defaultView?.getComputedStyle(element).translate
  const [x = 0, y = 0] = (shown ?? '').split(/\s+/).map(value => parseFloat(value) || 0)
  return { x, y }
}

/** Settle a drag target at declared pixel offsets. The caller owns touch-action and keyboard controls. */
export function createDragToSnapPoints(element: HTMLElement, options: DragToSnapOptions) {
  const points = ordered(options.points)
  if (!points.length) throw new RangeError('At least one finite snap point is required')
  const vertical = options.axis === 'vertical'
  const min = points[0]
  const max = points[points.length - 1]
  const elasticDimension = 64.8
  const elasticCoefficient = .36
  const origin = options.keepPosition ? drawnOffset(element) : { x: 0, y: 0 }
  const transform = (offset: number) => vertical ? `${origin.x}px ${offset}px` : `${offset}px ${origin.y}px`
  const original = element.style.translate
  const animator = createAnimator(element)
  const closest = (offset: number) => points.reduce((nearest, point) =>
    Math.abs(point - offset) < Math.abs(nearest - offset) ? point : nearest, points[0])
  let position = options.keepPosition ? vertical ? origin.y : origin.x : closest(options.initial ?? 0)
  let settled = closest(position)
  let start = position
  let dragOrigin = position
  let dragging = false
  let disposed = false
  let playing = false
  let operation = 0

  function paint(offset: number) {
    position = offset
    element.style.translate = transform(offset)
  }

  function stop() {
    operation++
    if (!playing) return
    const drawn = drawnOffset(element)
    animator.cancel('snap')
    playing = false
    paint(vertical ? drawn.y : drawn.x)
  }

  function moveTo(offset: number, velocity = 0, pointer?: string) {
    if (disposed) return
    stop()
    const to = closest(Number.isFinite(offset) ? offset : settled)
    const from = position
    const reduced = prefersReducedMotion(element)
    const changed = to !== settled
    settled = to
    paint(to)
    const run = operation
    const finish = () => {
      if (run !== operation) return
      playing = false
      options.onSettle?.(to)
    }
    if (!reduced && Math.abs(to - from) > .5) {
      const sequence = springFrames(from, to, velocity).map(value => ({ translate: transform(value) }))
      playing = true
      const animation = animator.animate('snap', sequence, { duration: (sequence.length - 1) * (1000 / 60), easing: 'linear' })
      void animation.finished.then(finish, () => { if (run === operation) playing = false })
    } else if (reduced && options.onSettle && Math.abs(to - from) > .5 &&
      (pointer === 'touch' || element.ownerDocument.defaultView?.matchMedia('(pointer: coarse)').matches)) {
      playing = true
      const fading = animator.animate('snap', [{ opacity: .55 }, { opacity: 1 }], { reducedMotion: 'fade', duration: 80 })
      void fading.finished.then(finish, () => {})
    } else finish()
    if (changed) options.onChange?.(to)
  }

  paint(position)
  const destroyGesture = createPanGesture(element, {
    axis: options.axis ?? 'horizontal',
    onStart: () => {
      stop()
      dragOrigin = position
      start = rubberBandUnclamp(position, min, max, elasticDimension, elasticCoefficient)
      dragging = true
    },
    onMove: ({ x, y }) => {
      if (dragging) paint(rubberBandClamp(start + (vertical ? y : x), min, max, elasticDimension, elasticCoefficient))
    },
    onEnd: ({ x, y, velocityX, velocityY }, event, cancelled) => {
      if (!dragging) return
      dragging = false
      const raw = start + (vertical ? y : x)
      const overflow = raw - Math.max(min, Math.min(max, raw))
      const slope = overflow ? rubberBandSlope(overflow, elasticDimension, elasticCoefficient) : 1
      const velocity = (vertical ? velocityY : velocityX) * slope
      if (cancelled) { moveTo(settled, 0, event.pointerType); return }
      if (options.flickThreshold === undefined) {
        moveTo(position + decayRestDistance(velocity * 1000, .991), velocity, event.pointerType)
        return
      }
      const direction = Math.sign(velocity)
      let target = position
      if (Math.abs(velocity * 1000) >= options.flickThreshold) {
        if (Math.sign(position - dragOrigin) === -direction) target = dragOrigin
        else if (direction > 0) target = points.find(point => point > position) ?? max
        else if (direction < 0) target = points.reduce((previous, point) => point < position ? point : previous, min)
      }
      moveTo(target, velocity, event.pointerType)
    },
  })

  return {
    get point() { return settled },
    snapTo: (offset: number) => { dragging = false; moveTo(offset) },
    dispose(restore = true) {
      if (disposed) return
      stop()
      disposed = true
      destroyGesture()
      animator.dispose()
      if (restore) element.style.translate = original
    },
  }
}

export interface DragToSnapPointsOptions {
  axis: 'x' | 'y'
  snapPoints: readonly number[]
  flickThreshold?: number
  onSettle?: (index: number) => void
}

export function useDragToSnapPoints(target: MaybeRefOrGetter<HTMLElement | null | undefined>, options: MaybeRefOrGetter<DragToSnapPointsOptions>) {
  const config = computed(() => toValue(options))
  const points = computed(() => ordered(config.value.snapPoints))
  let control: ReturnType<typeof createDragToSnapPoints> | undefined
  let element: HTMLElement | undefined
  let original = ''
  let signature = ''
  const threshold = computed(() => Number.isFinite(config.value.flickThreshold) ? Math.max(0, config.value.flickThreshold!) : 1008)
  function refresh() {
    const node = toValue(target) ?? undefined
    const { axis } = config.value
    const speed = threshold.value
    const snapPoints = points.value
    const nextSignature = `${axis}:${speed}:${snapPoints.join(',')}`
    if (element === node && signature === nextSignature) return
    control?.dispose(false)
    control = undefined
    signature = nextSignature
    if (element && element !== node) element.style.translate = original
    if (element !== node) {
      element = node ?? undefined
      original = element?.style.translate ?? ''
    }
    if (element && snapPoints.length) {
      control = createDragToSnapPoints(element, {
        axis: axis === 'y' ? 'vertical' : 'horizontal', points: snapPoints, flickThreshold: speed, keepPosition: true,
        onSettle: point => config.value.onSettle?.(snapPoints.indexOf(point)),
      })
    }
  }
  watch([() => toValue(target), () => config.value.axis, () => points.value.join(','), threshold], refresh, { flush: 'post', immediate: true })
  function settleTo(index: number) {
    refresh()
    if (Number.isSafeInteger(index) && index >= 0 && index < points.value.length) control?.snapTo(points.value[index])
  }
  onScopeDispose(() => { control?.dispose(false); if (element) element.style.translate = original })
  return { settleTo }
}

function springFrames(from: number, to: number, velocity: number) {
  const sample = solveSpring({ from, to, velocity: Math.max(-2000, Math.min(2000, velocity * 1000)) })
  const frames = [from]
  for (let index = 1; index < 60; index++) {
    const current = sample(index / 60)
    if (Math.abs(current.value - to) < .25 && Math.abs(current.velocity) < 3) break
    frames.push(current.value)
  }
  frames.push(to)
  return frames
}
