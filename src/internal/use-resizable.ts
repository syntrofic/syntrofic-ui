import { computed, getCurrentInstance, onMounted, ref, shallowReactive, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { decayRestDistance } from './motion-physics'
import { registerResizePaneState, scheduleCloseSpring } from './resize-pane'
import { observeResize } from './resize-observer'
import { needsResizableBasis, resolveResizableSize, type ResizableSize } from './resizable'
import { bindNativeResizeHandle, type NativeResizeHandleOptions } from './resize-handle-native'

type ResizeAxis = 'horizontal' | 'vertical'
type Container = MaybeRefOrGetter<HTMLElement | null | undefined>
interface ResizeBasis { pixels: number; units: { em: number; rem: number } }

export interface ResizableRegionOptions extends NativeResizeHandleOptions {
  defaultSize?: ResizableSize | string
  minSize?: ResizableSize
  maxSize?: ResizableSize
  collapsible?: boolean
  collapsedSize?: number
  defaultIsCollapsed?: boolean
  isCollapsed?: boolean
  collapsedLabel?: string
  snaps?: readonly number[]
  onSizeChange?: (size: number) => void
  onCollapseChange?: (collapsed: boolean) => void
}

interface ResizableBasisOptions {
  containerRef?: Container
  direction?: ResizeAxis
  autoSaveId?: string
}

export interface ResizableOptions extends ResizableBasisOptions, ResizableRegionOptions {}
export interface MultiResizableOptions<Regions extends Record<string, ResizableRegionOptions>> extends ResizableBasisOptions {
  regions: Regions
}

const defaultUnits = { em: 16, rem: 16 }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))
interface SavedResize { pixels: number; collapsed: boolean }

function readSavedSize(view: Window, key: string): Partial<SavedResize> | undefined {
  try {
    const entry = JSON.parse(view.localStorage.getItem(key) ?? 'null') as Partial<SavedResize> | null
    if (!entry) return
    const pixels = typeof entry.pixels === 'number' && Number.isFinite(entry.pixels) && entry.pixels >= 0 ? entry.pixels : undefined
    const collapsed = typeof entry.collapsed === 'boolean' ? entry.collapsed : undefined
    if (pixels !== undefined || collapsed !== undefined) return { pixels, collapsed }
  } catch { /* Storage can be unavailable in a sandbox or private window. */ }
}

function useResizeBasis(config: () => ResizableBasisOptions) {
  const instance = getCurrentInstance()
  const document = shallowRef<Document>()
  const measurement = shallowRef<ResizeBasis>()
  const requests = shallowReactive(new Set<Readonly<Ref<boolean>>>())
  const needed = computed(() => [...requests].some(request => request.value))
  const container = computed(() => toValue(config().containerRef))
  const scoped = computed(() => config().containerRef !== undefined)
  const owner = computed(() => container.value?.ownerDocument ?? document.value)
  const view = computed(() => owner.value?.defaultView)
  const axis = computed<ResizeAxis>(() => config().direction ?? 'horizontal')
  onMounted(() => { document.value = instance?.proxy?.$el?.ownerDocument ?? globalThis.document })
  watch([owner, scoped, container, axis, needed],
    ([document, hasContainer, element, direction, shouldMeasure], _, cleanup) => {
      measurement.value = undefined
      const view = document?.defaultView
      if (!shouldMeasure || !view || !document || hasContainer && !element) return
      const root = document.documentElement
      const node = element ?? root
      const measure = () => {
        if (element && (!element.isConnected || !element.getClientRects().length)) return
        const style = view.getComputedStyle(node)
        const verticalWriting = /^(vertical|sideways)/.test(style.writingMode)
        const inline = direction === 'horizontal'
        const width = element ? inline !== verticalWriting : inline
        const padding = width ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
          : parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
        const pixels = Math.max(0, (width ? node.clientWidth : node.clientHeight) - (element ? padding || 0 : 0))
        const units = { em: parseFloat(style.fontSize) || 16, rem: parseFloat(view.getComputedStyle(root).fontSize) || 16 }
        const previous = measurement.value
        if (pixels !== previous?.pixels || units.em !== previous.units.em || units.rem !== previous.units.rem) {
          measurement.value = { pixels, units }
        }
      }
      measure()
      let frame = 0
      const schedule = () => {
        if (frame) return
        frame = view.requestAnimationFrame(() => { frame = 0; measure() })
      }
      const stop = element ? observeResize(element, view, schedule) : undefined
      // A media query can change em/rem without resizing the container.
      const watchesViewport = !element || typeof view.ResizeObserver === 'function'
      if (watchesViewport) view.addEventListener('resize', schedule, { passive: true })
      cleanup(() => {
        stop?.()
        if (watchesViewport) view.removeEventListener('resize', schedule)
        view.cancelAnimationFrame(frame)
      })
    }, { flush: 'post' })
  return { measurement, axis, view, requests }
}

function useResizeRegion(settings: () => ResizableRegionOptions, basis: ReturnType<typeof useResizeBasis>, name: () => string | undefined) {
  const selected = ref<number>()
  const actualClosed = ref(Boolean(settings().defaultIsCollapsed))
  const resolved = basis.measurement
  const pixels = computed(() => resolved.value?.pixels ?? 1200)
  const length = (value: ResizableSize | string | undefined, fallback: number) =>
    resolveResizableSize(value, pixels.value, resolved.value?.units ?? defaultUnits) ?? fallback
  const max = computed(() => length(settings().maxSize, Infinity))
  const min = computed(() => Math.min(max.value, length(settings().minSize, 50)))
  const threshold = computed(() => Math.max(0, settings().collapsedSize ?? 40))
  const bounded = (value: number) => clamp(value, min.value, max.value)
  const stops = computed(() => [...new Set((settings().snaps ?? []).filter(Number.isFinite).map(bounded))].sort((a, b) => a - b))
  const expanded = computed(() => snap(selected.value ?? length(settings().defaultSize, 250)))
  const isCollapsed = computed(() => Boolean(settings().collapsible && (settings().isCollapsed ?? actualClosed.value)))
  const pending = shallowRef<{ raw: number; pixels: number }>()
  const active = ref(false)
  let caught = false
  let carrying = false
  let release: { pane: HTMLElement; velocity: number } | undefined
  const size = computed(() => pending.value?.pixels ?? (isCollapsed.value ? 0 : expanded.value))
  const storageKey = computed(() => name() ? `syntrofic:resizable:${name()}` : undefined)
  const loaded = ref(false)
  const ready = ref(false)
  const edited = ref(false)
  let saved: Partial<SavedResize> | undefined
  const relativeDefault = computed(() => selected.value === undefined && needsResizableBasis(settings().defaultSize))
  const relativeBounds = computed(() => needsResizableBasis(settings().minSize) || needsResizableBasis(settings().maxSize))
  basis.requests.add(computed(() => loaded.value && (relativeDefault.value || relativeBounds.value)))
  const boundPending = computed(() => relativeBounds.value && !resolved.value)

  watch([basis.view, storageKey], ([view, key], previous) => {
    if ((loaded.value || previous?.[1] !== undefined) && previous?.[1] !== key) {
      loaded.value = false
      ready.value = false
      edited.value = false
      saved = undefined
      selected.value = undefined
      actualClosed.value = Boolean(settings().defaultIsCollapsed)
    }
    if (!view || loaded.value) return
    saved = key ? readSavedSize(view, key) : undefined
    selected.value ??= saved?.pixels
    if (saved?.collapsed !== undefined && !edited.value) actualClosed.value = saved.collapsed
    loaded.value = true
  }, { flush: 'sync', immediate: true })
  watch([loaded, relativeDefault, boundPending, resolved], () => {
    if (!loaded.value || ready.value || boundPending.value || relativeDefault.value && !resolved.value) return
    selected.value = snap(selected.value ?? length(settings().defaultSize, 250))
    ready.value = true
  }, { flush: 'post', immediate: true })
  function persist() {
    const view = basis.view.value
    const key = storageKey.value
    if (!view || !key || !ready.value || boundPending.value || active.value) return
    const pixels = expanded.value
    const collapsed = isCollapsed.value
    if (!edited.value && (saved?.pixels === undefined || saved.pixels === pixels)) return
    if (saved?.pixels === pixels && saved.collapsed === collapsed) return
    try {
      const next = { pixels, collapsed }
      view.localStorage.setItem(key, JSON.stringify(next))
      saved = next
    } catch { /* Keep the in-memory state. */ }
  }
  watch([min, max, stops], () => {
    if (ready.value && !boundPending.value && !active.value && selected.value !== undefined) selected.value = snap(selected.value)
  }, { flush: 'sync' })
  watch(isCollapsed, () => { if (ready.value) edited.value = true }, { flush: 'sync' })
  watch([expanded, isCollapsed, resolved, storageKey, ready, edited, active], persist, { flush: 'post' })
  watch(size, value => { if (ready.value) settings().onSizeChange?.(value) }, { flush: 'sync' })

  function setCollapsed(next: boolean) {
    if (!settings().collapsible || isCollapsed.value === next) return
    edited.value = true
    if (settings().isCollapsed === undefined) actualClosed.value = next
    settings().onCollapseChange?.(next)
  }
  function snap(raw: number) {
    const size = bounded(raw)
    let nearest = size
    let distance = Infinity
    for (const stop of stops.value) {
      const gap = Math.abs(size - stop)
      if (gap < distance) { nearest = stop; distance = gap }
    }
    return nearest
  }
  function resize(raw: number) {
    if (!Number.isFinite(raw) || raw < 0) return
    const next = snap(raw)
    if (!ready.value || next !== expanded.value) edited.value = true
    selected.value = ready.value ? next : raw
    setCollapsed(false)
  }
  function step(direction: number, pixels: number, count: number) {
    if (isCollapsed.value) return direction > 0 ? Math.max(min.value + pixels, threshold.value) : undefined
    if (!stops.value.length) return expanded.value + pixels * direction
    const ahead = direction > 0 ? stops.value.filter(stop => stop > expanded.value)
      : stops.value.filter(stop => stop < expanded.value).reverse()
    return ahead[Math.min(count, ahead.length) - 1]
  }
  function onResize(value: number, raw = value) {
    if (!Number.isFinite(raw)) return
    if (!active.value) {
      if (settings().collapsible && raw < threshold.value) setCollapsed(true)
      else resize(Math.max(0, raw))
      return
    }
    if (carrying && pending.value) {
      const previous = pending.value.raw
      if (stops.value.some(stop => previous < stop && raw >= stop || previous > stop && raw <= stop)) carrying = false
    }
    const preview = carrying ? clamp(raw, 0, max.value) : isCollapsed.value && raw < threshold.value ? 0 : snap(raw)
    pending.value = { raw, pixels: preview }
  }
  function readDragSize(handle: HTMLElement) {
    const id = handle.getAttribute('aria-controls')
    const pane = id && handle.ownerDocument.getElementById(id)
    const view = pane && pane.ownerDocument.defaultView
    if (!view || !pane) return
    const horizontal = basis.axis.value === 'horizontal'
    const logical = horizontal ? 'inlineSize' : 'blockSize'
    const physical = horizontal ? 'width' : 'height'
    const style = view.getComputedStyle(pane)
    const shown = parseFloat(style[logical])
    if (!Number.isFinite(shown) || Math.abs(shown - size.value) < .5) return
    const sizing = pane.getAnimations().some(animation => animation.playState !== 'finished'
      && (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame[logical] || frame[physical]))
    if (sizing) return shown
  }
  function onDragging(dragging: boolean, event?: PointerEvent, shown?: number) {
    active.value = dragging
    if (dragging) {
      caught = shown !== undefined
      carrying = caught
      if (shown !== undefined) pending.value = { raw: shown, pixels: shown }
      return
    }
    const handoff = pending.value
    const released = release
    release = undefined
    if (handoff) {
      const lifted = event?.type === 'pointerup'
      const rest = released ? handoff.raw + decayRestDistance(released.velocity, .986) : handoff.raw
      if (lifted && settings().collapsible && Math.min(handoff.raw, rest) < threshold.value) {
        setCollapsed(true)
        pending.value = undefined
        if (released) scheduleCloseSpring(released.pane, handoff.pixels, released.velocity)
      } else if (lifted || !isCollapsed.value || handoff.pixels > 0 && !caught) {
        resize(lifted ? Math.max(0, handoff.raw) : handoff.pixels)
      }
    }
    pending.value = undefined
    caught = false
    carrying = false
    // A handle can unmount before its post-flush storage watcher runs.
    if (!event) persist()
  }
  function collapse() { setCollapsed(true) }
  function expand() { setCollapsed(false) }
  function toggle() { setCollapsed(!isCollapsed.value) }
  const props = computed(() => ({
    axis: basis.axis.value, value: size.value, min: settings().collapsible ? 0 : min.value, max: max.value,
    canToggle: settings().collapsible ?? false, preserveRaw: true, readDragSize, onResize, onDragging, onToggle: toggle,
  }))
  registerResizePaneState(readDragSize, { dragging: active, collapsed: isCollapsed, minimum: min, maximum: max, step, size,
    measuredExtent: computed(() => relativeBounds.value ? resolved.value?.pixels : undefined),
    collapsedLabel: computed(() => settings().collapsedLabel),
    isCarrying: () => carrying,
    prepareRelease: (pane, velocity) => { release = { pane, velocity } } })
  bindNativeResizeHandle(settings, props)
  return { size, isCollapsed, collapse, expand, resize, props }
}

export type ResizableControl = ReturnType<typeof useResizeRegion>
export type MultiResizableControl<Regions extends Record<string, ResizableRegionOptions>> = { [Name in keyof Regions]: ResizableControl }

export function useResizable<Regions extends Record<string, ResizableRegionOptions>>(
  options: MaybeRefOrGetter<MultiResizableOptions<Regions>>,
): MultiResizableControl<Regions>
export function useResizable(options?: MaybeRefOrGetter<ResizableOptions>): ResizableControl
export function useResizable(options: MaybeRefOrGetter<ResizableOptions | MultiResizableOptions<Record<string, ResizableRegionOptions>>> = {}) {
  const config = () => toValue(options)
  const basis = useResizeBasis(config)
  const initial = config()
  if (!('regions' in initial)) return useResizeRegion(() => config() as ResizableOptions, basis, () => config().autoSaveId)
  return Object.fromEntries(Object.keys(initial.regions).map(name => {
    const region = () => (config() as typeof initial).regions[name] ?? {}
    const key = () => config().autoSaveId && config().autoSaveId + ':' + name
    return [name, useResizeRegion(region, basis, key)]
  }))
}
