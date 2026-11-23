import { computed, ref, watch, type Ref } from 'vue'
import { prefersReducedMotion } from './motion'
import { gestureMotion } from './motion-defaults'
import { createResizeBandMotion, resizeBand } from './resize-motion'
import { resizeHandleState, resizePaneForHandle, resizeReleaseMotion, type ReadDragSize } from './resize-pane'

type Axis = 'horizontal' | 'vertical'

interface ResizeValue {
  axis: Axis
  min: number
  max: number
  value: number
}
interface ResizeGestureOptions extends ResizeValue {
  edge: 'start' | 'end'
  step: number
  disabled?: boolean
  canToggle: boolean
  preserveRaw?: boolean
  readDragSize?: ReadDragSize
  accessibleMaximum?: number
  onResize: (size: number, raw?: number) => void
  onDragging: (value: boolean, event?: PointerEvent, size?: number) => void
  onToggle: () => void
}

export function useResizeMaximum(handle: Readonly<Ref<HTMLElement | null | undefined>>, config: () => ResizeValue & { measuredExtent?: number }) {
  const viewport = ref<number>()
  const usesViewport = computed(() => {
    const { max, measuredExtent } = config()
    return !Number.isFinite(max) && measuredExtent === undefined
  })
  watch([handle, () => handle.value ? config().axis : undefined, () => Boolean(handle.value && usesViewport.value)], ([node, axis, needed], _, cleanup) => {
    viewport.value = undefined
    const view = node?.ownerDocument.defaultView
    if (!needed || !view) return
    const read = () => { viewport.value = axis === 'horizontal' ? view.innerWidth : view.innerHeight }
    read()
    view.addEventListener('resize', read, { passive: true })
    cleanup(() => view.removeEventListener('resize', read))
  }, { flush: 'post', immediate: true })
  return computed(() => {
    const { min, max, value, measuredExtent } = config()
    if (Number.isFinite(max)) return max
    const extent = measuredExtent ?? viewport.value
    return extent === undefined ? undefined : Math.max(extent, value, min)
  })
}

export function createResizeHandleGesture(handle: HTMLElement | (() => HTMLElement | null), config: () => ResizeGestureOptions) {
  const element = typeof handle === 'function' ? handle : () => handle
  const dragging = ref(false)
  let band: ReturnType<typeof createResizeBandMotion> | undefined
  let drag: {
    node: HTMLElement; id: number; coordinate: number; width: number; direction: number; axis: Axis
    pane: ReturnType<typeof resizePaneForHandle>; elastic: boolean; caught: boolean; offset: number; slope: number
    lastPosition: number; samplePosition: number; sampleTime: number; velocity: number
  } | undefined

  function direction(node: HTMLElement | null, { axis, edge }: ResizeGestureOptions) {
    const rtl = axis === 'horizontal' && node && node.ownerDocument.defaultView?.getComputedStyle(node).direction === 'rtl'
    return (edge === 'start' ? 1 : -1) * (rtl ? -1 : 1)
  }
  function coordinate(event: PointerEvent, axis: Axis) { return axis === 'horizontal' ? event.clientX : event.clientY }
  function resize(options: ResizeGestureOptions, next: number, byPointer = false) {
    const size = Math.round(Math.min(Math.max(next, options.min), options.max))
    options.onResize(size, byPointer || options.preserveRaw ? next : undefined)
  }
  function toggle(event?: MouseEvent) {
    const options = config()
    if (!event?.defaultPrevented && !options.disabled && options.canToggle) options.onToggle()
  }
  function pointerDown(event: PointerEvent) {
    const options = config()
    if (event.defaultPrevented || options.disabled || event.button !== 0 || drag) return
    const node = element()
    if (!node) return
    const { axis, readDragSize } = options
    const pane = resizePaneForHandle(node, readDragSize)
    const measured = readDragSize?.(node)
    const shown = measured !== undefined && Number.isFinite(measured) && measured >= 0 ? measured : undefined
    node.setPointerCapture(event.pointerId)
    if (event.isTrusted && node.ownerDocument.activeElement !== node) node.focus({ preventScroll: true })
    const sign = direction(node, options)
    const elastic = Boolean(pane && typeof node.animate === 'function' && !prefersReducedMotion(node))
    const offset = elastic ? band?.shown() ?? 0 : 0
    if (elastic) {
      band ??= createResizeBandMotion(node)
      band.paint(offset, axis, sign)
    } else band?.clear()
    const position = coordinate(event, axis)
    drag = { node, id: event.pointerId, coordinate: position, width: shown ?? options.value + offset, direction: sign,
      axis, pane, elastic, caught: shown !== undefined, offset, slope: 1,
      lastPosition: position, samplePosition: position, sampleTime: event.timeStamp, velocity: 0 }
    dragging.value = true
    options.onDragging(true, event, shown)
  }
  function pointerMove(event: PointerEvent) {
    const current = drag
    const options = config()
    if (!current || current.id !== event.pointerId || options.disabled) return
    const position = coordinate(event, current.axis)
    const elapsed = event.timeStamp - current.sampleTime
    if (position !== current.lastPosition && elapsed >= 4) {
      current.velocity = elapsed <= gestureMotion.pan.endStillnessMs
        ? (position - current.samplePosition) * current.direction * 1000 / elapsed : 0
      current.samplePosition = position
      current.sampleTime = event.timeStamp
    }
    current.lastPosition = position
    const raw = current.width + (position - current.coordinate) * current.direction
    resize(options, raw, true)
    if (!current.elastic || !current.pane) return
    const { minimum, maximum, collapsed, size, isCarrying } = current.pane.state
    // A caught closing pane tracks the pointer through the space below its minimum.
    const carrying = isCarrying()
    const minimumSize = carrying || collapsed.value && size.value === 0 ? 0 : minimum.value
    const stretch = resizeBand(raw, minimumSize, maximum.value, current.caught ? 0 : current.offset)
    current.slope = stretch.slope
    band?.paint(stretch.offset + (carrying ? current.offset : 0), current.axis, current.direction)
  }
  function stop(event?: PointerEvent) {
    const current = drag
    if (!current || event && current.id !== event.pointerId) return
    const released = event?.type === 'pointerup'
    if (released && coordinate(event, current.axis) !== current.lastPosition) pointerMove(event)
    drag = undefined
    dragging.value = false
    const velocity = released && event.timeStamp - current.sampleTime <= gestureMotion.pan.endStillnessMs ? current.velocity : 0
    if (released && current.pane) current.pane.state.prepareRelease(current.pane.pane, velocity)
    if (current.node.hasPointerCapture(current.id)) current.node.releasePointerCapture(current.id)
    config().onDragging(false, event)
    if (event && current.elastic && current.pane) {
      band?.settle(current.axis, current.direction, velocity * current.slope, resizeReleaseMotion(current.pane.pane))
    } else band?.clear()
  }
  function keyboard(event: KeyboardEvent) {
    const options = config()
    if (event.defaultPrevented || options.disabled || drag || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
    const step = options.step * (event.shiftKey ? 3 : 1)
    const previous = options.axis === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
    const next = options.axis === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
    if (event.shiftKey && event.key !== previous && event.key !== next) return
    const state = resizeHandleState(options.readDragSize)
    let target: number | undefined
    switch (event.key) {
      case previous:
      case next: {
        const sign = (event.key === previous ? -1 : 1) * direction(element(), options)
        target = state ? state.step(sign, step, event.shiftKey ? 2 : 1) : options.value + step * sign
        break
      }
      case 'Home': if (!state?.collapsed.value) target = state?.minimum.value ?? options.min; break
      case 'End': target = options.accessibleMaximum; break
      case 'Enter':
        if (!options.canToggle) return
        toggle()
        break
      default: return
    }
    event.preventDefault()
    if (target !== undefined) resize(options, target)
  }
  function dispose() {
    stop()
    band?.clear()
    band = undefined
  }
  return { dragging, pointerDown, pointerMove, stop, toggle, keyboard, dispose }
}
