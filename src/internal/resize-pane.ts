import { nextTick, type Ref } from 'vue'
import { prefersReducedMotion } from './motion'
import { resizeSpringTiming, type ResizeSpringTiming } from './resize-motion'

export type ReadDragSize = (handle: HTMLElement) => number | undefined
interface ResizePaneState {
  dragging: Readonly<Ref<boolean>>
  collapsed: Readonly<Ref<boolean>>
  minimum: Readonly<Ref<number>>
  maximum: Readonly<Ref<number>>
  measuredExtent: Readonly<Ref<number | undefined>>
  collapsedLabel: Readonly<Ref<string | undefined>>
  step(direction: number, pixels: number, count: number): number | undefined
  isCarrying(): boolean
  size: Readonly<Ref<number>>
  prepareRelease(pane: HTMLElement, velocity: number): void
}
const paneStates = new WeakMap<ReadDragSize, ResizePaneState>()
const boundPanes = new WeakMap<HTMLElement, ResizePaneState>()
const releaseMotions = new WeakMap<HTMLElement, ResizeSpringTiming>()

export function resizePaneState(config: { readDragSize?: ReadDragSize } | undefined) {
  return resizeHandleState(config?.readDragSize)
}

export function registerResizePaneState(reader: ReadDragSize, state: ResizePaneState) { paneStates.set(reader, state) }

export function resizeHandleState(reader?: ReadDragSize) { return reader && paneStates.get(reader) }

export function attachResizePane(pane: HTMLElement, state: ResizePaneState) {
  boundPanes.set(pane, state)
  return () => { if (boundPanes.get(pane) === state) boundPanes.delete(pane) }
}

export function resizePaneForHandle(handle: HTMLElement, reader?: ReadDragSize) {
  const state = resizeHandleState(reader)
  if (!state) return
  const controls = handle.getAttribute('aria-controls')
  const pane = controls && handle.ownerDocument.getElementById(controls)
  if (pane && boundPanes.get(pane) === state) return { pane, state }
}

export function resizeReleaseMotion(node: HTMLElement) { return releaseMotions.get(node) }

export function scheduleCloseSpring(pane: HTMLElement, from: number, velocity: number) {
  if (from < .5 || prefersReducedMotion(pane)) return
  const timing = resizeSpringTiming(pane, from, Math.min(0, velocity), 0, from)
  const layout = pane.closest<HTMLElement>('.sy-layout')
  releaseMotions.set(pane, timing)
  if (layout) releaseMotions.set(layout, timing)
  void nextTick(() => {
    if (releaseMotions.get(pane) === timing) releaseMotions.delete(pane)
    if (layout && releaseMotions.get(layout) === timing) releaseMotions.delete(layout)
  })
}
