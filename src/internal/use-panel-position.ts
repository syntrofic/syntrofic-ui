import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Ref } from 'vue'
import type { PanelSide, PanelSnapPoint, SheetOptions } from './panel'
import { prefersReducedMotion, themeTempo } from './motion'
import { resolveMotionSpring, rubberBand, solveSpring } from './motion-physics'
import { subscribeKeyboardInset } from './keyboard-inset'

interface Stop {
  point: PanelSnapPoint | null
  extent: number
}

interface Drag {
  id: number
  origin: number
  extent: number
  offset: number
  previousPosition: number
  previousTime: number
  velocity: number
}

export interface PanelDragContact {
  id: number
  position: number
  time: number
}

const widths = { sm: 288, md: 392, lg: 540, full: Infinity }
const heights = { sm: 288, md: 424, lg: 640, full: Infinity }
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const releaseFlick = 1000
const projectionMinimum = 250
const projectionTime = .1
const stopTolerance = 1
const viewportDefault = { width: 0, height: 0, top: 0, bottom: 0, rem: 16 }

function resolvePoint(point: PanelSnapPoint, available: number, viewport: typeof viewportDefault, relativeNumber = true) {
  if (typeof point === 'number') return relativeNumber && point <= 1 ? point * available : point
  const scalar = Number.parseFloat(point)
  if (point.endsWith('%')) return scalar * available / 100
  if (point.endsWith('vh')) return scalar * viewport.height / 100
  if (point.endsWith('vw')) return scalar * viewport.width / 100
  if (point.endsWith('rem')) return scalar * viewport.rem
  return scalar
}

function releasedStop(stops: readonly Stop[], displayed: number, velocity: number, previous: number, sequential: boolean) {
  const original = stops[previous].extent
  const heading = Math.sign(velocity)
  const projected = displayed + (Math.abs(velocity) >= projectionMinimum && heading * (displayed - original) >= 0
    ? velocity * projectionTime : 0)
  let index = stops.reduce((nearest, stop, index) => Math.abs(stop.extent - projected) < Math.abs(stops[nearest].extent - projected)
    ? index : nearest, previous)
  if (Math.abs(velocity) >= releaseFlick && heading * (displayed - original) >= 0) {
    const eligible = stops.map((stop, index) => ({ ...stop, index }))
      .filter(stop => heading * (stop.extent - displayed) > stopTolerance)
    if (heading < 0) eligible.reverse()
    const target = eligible.find(stop => heading * (stop.extent - projected) >= 0) ?? eligible.at(-1)
    if (target) index = target.index
  }
  return sequential ? clamp(index, previous - 1, previous + 1) : index
}

export function usePanelPosition(
  props: SheetOptions,
  anchor: Readonly<Ref<HTMLElement | null>>,
  side: Readonly<Ref<PanelSide>>,
  intrinsicHeight: Readonly<Ref<number | undefined>>,
  open: Ref<boolean>,
  snapPoint: Ref<PanelSnapPoint | null | undefined>,
  close: () => void,
) {
  const viewport = shallowRef(viewportDefault)
  const activeDrag = shallowRef<Drag>()
  const draggedExtent = ref<number>()
  const dragOffset = ref(0)
  const settling = ref(false)
  const wasDragged = ref(false)
  let springFrame = 0
  let keyboardInset = 0

  const vertical = computed(() => side.value === 'top' || side.value === 'bottom')
  const sign = computed(() => side.value === 'left' || side.value === 'top' ? -1 : 1)
  const dismissible = computed(() => props.dismissOnDrag ?? (!props.purpose || props.purpose === 'info'))
  const available = computed(() => Math.max(0, (
    vertical.value ? viewport.value.height : viewport.value.width
  ) - (props.detached ? 24 : 0)))
  const maximum = computed(() => {
    const room = available.value
    const height = vertical.value ? props.height : undefined
    if (height === 'tall') return room
    if (height === 'hug' || height === 'capped') {
      const limit = height === 'hug' ? room : room * .6
      return Math.min(limit, intrinsicHeight.value ?? limit)
    }
    const length = height ?? props.extent
    const limit = length === undefined ? 0 : resolvePoint(length, room, viewport.value, false)
    return Math.min(room, Number.isFinite(limit) && limit > 0 ? limit : (vertical.value ? heights : widths)[props.size ?? 'md'])
  })
  const minimum = computed(() => Math.min(vertical.value && props.height ? 64 : 120, maximum.value))
  const stops = computed<Stop[]>(() => {
    const mapped = (props.snapPoints ?? []).map(point => ({
      point,
      extent: clamp(resolvePoint(point, available.value, viewport.value), minimum.value, maximum.value),
    })).filter(stop => Number.isFinite(stop.extent) && stop.extent < maximum.value)
    const byExtent = new Map(mapped.map(stop => [Math.round(stop.extent), stop]))
    const ordered: Stop[] = [...byExtent.values()].sort((a, b) => a.extent - b.extent)
    ordered.push({ point: null, extent: maximum.value })
    return ordered
  })
  const current = computed(() => {
    const point = snapPoint.value === undefined ? props.initialSnapPoint : snapPoint.value
    if (point === undefined) return stops.value[0]
    if (point === null) return stops.value[stops.value.length - 1]
    const target = clamp(resolvePoint(point, available.value, viewport.value), minimum.value, maximum.value)
    return stops.value.reduce((nearest, stop) => Math.abs(stop.extent - target) < Math.abs(nearest.extent - target) ? stop : nearest)
  })
  const canResize = computed(() => stops.value.length > 1)
  const activeExtent = computed(() => draggedExtent.value ?? current.value.extent)
  const peek = computed(() => vertical.value && props.height && canResize.value && stops.value[0].extent <= maximum.value * .25
    ? stops.value[0] : undefined)
  const peeking = computed(() => !!peek.value && current.value === peek.value && !activeDrag.value)
  // Below the lowest working stop, keep its layout and slide the panel out of view.
  const workingFloor = computed(() => peek.value ? stops.value[1].extent : 0)
  const drawExtent = computed(() => Math.max(workingFloor.value, activeExtent.value))
  const slideOffset = computed(() => dragOffset.value + drawExtent.value - activeExtent.value)
  const scrim = computed(() => {
    if (!peek.value) return 1
    const span = workingFloor.value - peek.value.extent
    return 1 - .78 * clamp((workingFloor.value - activeExtent.value + dragOffset.value) / span, 0, 1)
  })

  function syncViewport() {
    const doc = anchor.value?.ownerDocument
    const win = doc?.defaultView
    if (!doc || !win) return
    const visual = win.visualViewport
    const top = visual?.offsetTop ?? 0
    const visualHeight = visual?.height ?? win.innerHeight
    const height = keyboardInset ? Math.min(visualHeight, Math.max(0, doc.documentElement.clientHeight - keyboardInset - top)) : visualHeight
    viewport.value = {
      width: Math.min(doc.documentElement.clientWidth, visual?.width ?? win.innerWidth),
      height, top, bottom: Math.max(0, win.innerHeight - height - top),
      rem: Number.parseFloat(win.getComputedStyle(doc.documentElement).fontSize) || 16,
    }
  }

  let cleanup: (() => void) | undefined
  onMounted(() => {
    syncViewport()
    const win = anchor.value?.ownerDocument.defaultView
    win?.addEventListener('resize', syncViewport)
    win?.visualViewport?.addEventListener('resize', syncViewport)
    win?.visualViewport?.addEventListener('scroll', syncViewport)
    const stopKeyboard = win && subscribeKeyboardInset(win, inset => {
      if (keyboardInset === inset) return
      keyboardInset = inset
      syncViewport()
    })
    cleanup = () => {
      stopKeyboard?.()
      win?.removeEventListener('resize', syncViewport)
      win?.visualViewport?.removeEventListener('resize', syncViewport)
      win?.visualViewport?.removeEventListener('scroll', syncViewport)
    }
  })
  onBeforeUnmount(() => { stopSpring(); cleanup?.() })

  function stopSpring() {
    if (springFrame) anchor.value?.ownerDocument.defaultView?.cancelAnimationFrame(springFrame)
    springFrame = 0
    settling.value = false
  }

  function resetPosition() {
    stopSpring()
    activeDrag.value = undefined
    draggedExtent.value = undefined
    dragOffset.value = 0
  }
  watch(open, visible => {
    activeDrag.value = undefined
    if (visible) resetPosition()
    else stopSpring()
  })
  function settle(velocity: number) {
    stopSpring()
    const node = anchor.value
    const view = node?.ownerDocument.defaultView
    if (!node || !view || prefersReducedMotion(node)) { resetPosition(); return }
    const from = draggedExtent.value ?? current.value.extent
    const offset = dragOffset.value
    const tempo = themeTempo(node)
    const spring = resolveMotionSpring(node, Math.abs(velocity) >= releaseFlick ? 'sheetReleaseFast' : 'sheetDetent')
    const target = current.value.extent
    const extent = solveSpring({ from, to: target, velocity: offset > 0 ? 0 : velocity * tempo, spring })
    const slide = solveSpring({ from: offset, to: 0, velocity: offset > 0 ? -velocity * tempo : 0, spring })
    const duration = Math.min(1.2, Math.max(extent.settleTime(.35), slide.settleTime(.35)))
    if (duration === 0) { resetPosition(); return }
    const start = view.performance.now()
    settling.value = true
    const tick = (now: number) => {
      const elapsed = (now - start) / (1000 * tempo)
      if (elapsed >= duration || !open.value) { resetPosition(); return }
      if (current.value.extent !== target) { settle(0); return }
      draggedExtent.value = clamp(extent.value(elapsed), stops.value[0].extent, maximum.value)
      dragOffset.value = Math.max(0, slide.value(elapsed))
      springFrame = view.requestAnimationFrame(tick)
    }
    springFrame = view.requestAnimationFrame(tick)
  }

  function pointerContact(event: PointerEvent): PanelDragContact {
    return { id: event.pointerId, position: vertical.value ? event.clientY : event.clientX, time: event.timeStamp }
  }

  function beginDrag({ id, position, time }: PanelDragContact) {
    if (!props.draggable || !open.value || activeDrag.value || (!canResize.value && !dismissible.value)) return false
    wasDragged.value = false
    stopSpring()
    activeDrag.value = {
      id, origin: position, extent: activeExtent.value, offset: dragOffset.value,
      previousPosition: position, previousTime: time, velocity: 0,
    }
    return true
  }

  function updateDrag({ id, position, time }: PanelDragContact) {
    const drag = activeDrag.value
    if (!drag || id !== drag.id) return
    const delta = (position - drag.origin) * sign.value
    const elapsed = Math.max(1, time - drag.previousTime)
    drag.velocity = (position - drag.previousPosition) * sign.value / elapsed
    drag.previousTime = time
    drag.previousPosition = position
    if (Math.abs(delta) < 5 && !wasDragged.value) return
    wasDragged.value = true
    if (canResize.value) {
      const extent = drag.extent - drag.offset - delta
      const lowest = stops.value[0].extent
      draggedExtent.value = clamp(extent, lowest, maximum.value)
      const overflow = Math.max(0, lowest - extent)
      dragOffset.value = dismissible.value ? overflow : rubberBand(overflow, lowest)
    } else {
      dragOffset.value = Math.max(0, drag.offset + delta)
    }
  }

  function dismissFromDrag() {
    close()
    void nextTick(() => {
      if (open.value) resetPosition()
    })
  }

  function finishDrag({ id, position, time }: PanelDragContact) {
    const drag = activeDrag.value
    if (!drag || id !== drag.id) return
    activeDrag.value = undefined
    if (!wasDragged.value) {
      if (draggedExtent.value !== undefined) settle(0)
      return
    }

    const delta = (position - drag.origin) * sign.value
    const velocity = time - drag.previousTime < 90 ? drag.velocity : 0
    const mayDismiss = dismissible.value
    if (!canResize.value) {
      const threshold = Math.min(112, drag.extent * .32)
      if (mayDismiss && (delta >= threshold || (delta > 35 && velocity > .6))) dismissFromDrag()
      else dragOffset.value = 0
      return
    }

    const choices = mayDismiss ? [{ extent: 0, point: null }, ...stops.value] : stops.value
    const speed = clamp(-velocity * 1000, -4000, 4000)
    const index = releasedStop(choices, drag.extent - drag.offset - delta, speed, choices.indexOf(current.value), props.sequential === true)
    if (mayDismiss && index === 0) { dismissFromDrag(); return }
    snapPoint.value = choices[index].point
    void nextTick(() => { if (open.value && !activeDrag.value) settle(speed) })
  }

  function abortDrag(id: number) {
    if (activeDrag.value?.id !== id) return
    activeDrag.value = undefined
    if (canResize.value) settle(0)
    else resetPosition()
  }

  function startDrag(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || !beginDrag(pointerContact(event))) return
    const handle = event.currentTarget as HTMLElement
    handle.setPointerCapture(event.pointerId)
  }
  const moveDrag = (event: PointerEvent) => updateDrag(pointerContact(event))
  const endDrag = (event: PointerEvent) => finishDrag(pointerContact(event))
  const cancelDrag = (event: PointerEvent) => abortDrag(event.pointerId)
  const bodyDrag = {
    begin: beginDrag, update: updateDrag, finish: finishDrag, cancel: abortDrag,
    canExpand: () => activeExtent.value < maximum.value - stopTolerance,
  }

  function activateHandle(event: MouseEvent) {
    if (event.detail > 0 && wasDragged.value) return
    if (!canResize.value) return
    const next = (stops.value.indexOf(current.value) + 1) % stops.value.length
    snapPoint.value = stops.value[next].point
  }

  function moveHandle(event: KeyboardEvent) {
    if (!canResize.value) return
    const keys = vertical.value ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight']
    const direction = event.key === keys[0] ? sign.value : event.key === keys[1] ? -sign.value : 0
    if (!direction && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const endpoint = event.key === 'Home' ? 0 : stops.value.length - 1
    const index = direction ? clamp(stops.value.indexOf(current.value) + direction, 0, stops.value.length - 1) : endpoint
    snapPoint.value = stops.value[index].point
  }

  const style = computed(() => ({
    '--sy-panel-extent': drawExtent.value ? `${drawExtent.value}px` : undefined,
    '--sy-panel-max-height': viewport.value.height ? `${viewport.value.height}px` : undefined,
    '--sy-panel-drag-x': !vertical.value && slideOffset.value ? `${slideOffset.value * sign.value}px` : undefined,
    '--sy-panel-drag-y': vertical.value && slideOffset.value ? `${slideOffset.value * sign.value}px` : undefined,
  }))
  const layerStyle = computed(() => ({
    '--sy-panel-viewport-top': `${viewport.value.top}px`,
    '--sy-panel-viewport-bottom': `${viewport.value.bottom}px`,
    '--sy-panel-scrim-strength': scrim.value,
  }))

  return { activeDrag, canResize, dismissible, peeking, slideOffset, settling, style, layerStyle,
    startDrag, moveDrag, endDrag, cancelDrag, activateHandle, moveHandle, bodyDrag }
}
