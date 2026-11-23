import { nextTick, onMounted, onScopeDispose, shallowRef, toValue, watch, type ComponentPublicInstance, type MaybeRefOrGetter, type VNodeChild } from 'vue'
import { noteOutsidePress } from './backdrop-press'
import { useAnnounce } from './interaction'
import { useLayer, type LayerAlignment, type LayerPlacement, type LayerRenderProps } from './layer'
import { previewCorridor } from './hover-preview'

export interface TooltipOptions {
  placement?: LayerPlacement
  alignment?: LayerAlignment
  delay?: number
  hideDelay?: number
  focusTrigger?: 'auto' | 'always' | 'never'
  touchTrigger?: 'auto' | 'tap' | 'none'
  isEnabled?: boolean
  isOpen?: boolean
  isDefaultOpen?: boolean
  onShow?: () => void
  onHide?: () => void
}
export interface HoverCardOptions extends TooltipOptions { label?: string }

type TooltipRef = Element | ComponentPublicInstance | null
const action = 'a[href], button, input, summary, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="switch"]'
const controls = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

function useHoverSurface(options: MaybeRefOrGetter<HoverCardOptions>, preview: boolean) {
  const config = () => toValue(options)
  const trigger = shallowRef<HTMLElement | null>(null)
  let requestedHide = false
  const layer = useLayer({ onShow: () => config().onShow?.(), onHide: () => {
    const requested = requestedHide
    requestedHide = false
    if (!requested) config().onHide?.()
  } })
  const announce = useAnnounce(trigger)
  let timer: ReturnType<typeof setTimeout> | undefined
  let hovered = false
  let focused = false
  let held = false
  let touchFocus = 0
  let suppressFocus = false
  let corridor: AbortController | undefined
  const hideDelay = () => config().hideDelay ?? (preview ? 200 : 0)

  function setVisible(visible: boolean, reason: 'hover' | 'focus' | 'command') {
    const { isEnabled, isOpen, onShow, onHide } = config()
    if (visible && isEnabled === false) return
    if (isOpen === undefined) {
      if (visible) layer.show()
      else layer.hide()
    } else if (visible !== isOpen) {
      if (visible && reason !== 'hover') onShow?.()
      if (!visible) { requestedHide = true; onHide?.() }
    }
  }
  function schedule(visible: boolean, reason: 'hover' | 'focus', delay = 0) {
    clearTimeout(timer)
    if (delay > 0 && Number.isFinite(delay)) timer = setTimeout(() => setVisible(visible, reason), delay)
    else setVisible(visible, reason)
  }
  function hide() {
    clearTimeout(timer)
    corridor?.abort()
    held = hovered = focused = false
    setVisible(false, 'command')
  }
  function show() {
    if (config().isEnabled === false) return
    clearTimeout(timer)
    held = true
    setVisible(true, 'command')
    if (config().isOpen !== undefined) return
    void nextTick(() => {
      const text = trigger.value?.ownerDocument.getElementById(layer.id)?.textContent?.trim()
      if (!preview && text && held && layer.open.value) announce(text)
    })
  }
  function closeAfterLeave(reason: 'hover' | 'focus') {
    if (!held && !hovered && !focused) schedule(false, reason, hideDelay())
  }
  const getPanel = () => trigger.value?.ownerDocument.getElementById(layer.id)
  function contains(target: EventTarget | null | undefined, element: HTMLElement | null | undefined) {
    return target instanceof Node && Boolean(element?.contains(target))
  }
  function returnFocus() {
    suppressFocus = true
    try { trigger.value?.focus({ preventScroll: true }) } finally { suppressFocus = false }
  }
  function firstControl(panel = getPanel()) {
    return Array.from(panel?.querySelectorAll<HTMLElement>(controls) ?? []).find(item => item.tabIndex >= 0
      && !item.matches(':disabled') && !item.closest('[inert], [hidden], [aria-hidden="true"]') && item.getClientRects().length)
  }
  function protectPointer(event: PointerEvent, from: HTMLElement, to?: HTMLElement | null) {
    if (!preview || !to || !layer.open.value) return
    corridor?.abort()
    const bridge = previewCorridor(from.getBoundingClientRect(), to.getBoundingClientRect(), { x: event.clientX, y: event.clientY })
    const listeners = new AbortController()
    corridor = listeners
    from.ownerDocument.addEventListener('pointermove', move => {
      if (move.pointerType === 'touch') return
      if (contains(move.target, from) || contains(move.target, to)) {
        clearTimeout(timer)
        listeners.abort()
      } else {
        closeAfterLeave('hover')
        if (!bridge({ x: move.clientX, y: move.clientY })) listeners.abort()
      }
    }, { capture: true, passive: true, signal: listeners.signal })
  }
  function interactionRef(node: TooltipRef) {
    const element = node && '$el' in node ? node.$el as Element | null : node
    trigger.value = element?.nodeType === 1 ? element as HTMLElement : null
  }
  function ref(node: TooltipRef) { layer.ref(node); interactionRef(node) }

  watch(trigger, (element, _, cleanup) => {
    if (!element) return
    const abort = new AbortController()
    const opts = { signal: abort.signal }
    let tap: PointerEvent | undefined
    element.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch' || config().isEnabled === false) return
      corridor?.abort()
      hovered = true
      schedule(true, 'hover', config().delay ?? (preview ? 300 : 200))
    }, opts)
    element.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch') return
      hovered = contains(event.relatedTarget, getPanel())
      closeAfterLeave('hover')
      if (!hovered) protectPointer(event, element, getPanel())
    }, opts)
    element.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return
      touchFocus = Date.now() + 500
      tap = event
    }, opts)
    element.addEventListener('pointermove', event => {
      if (tap?.pointerId === event.pointerId && Math.hypot(tap.clientX - event.clientX, tap.clientY - event.clientY) > 8) tap = undefined
    }, opts)
    element.addEventListener('pointercancel', event => { if (tap?.pointerId === event.pointerId) tap = undefined }, opts)
    element.addEventListener('pointerup', event => {
      if (tap?.pointerId !== event.pointerId) return
      tap = undefined
      const mode = config().touchTrigger ?? 'auto'
      const target = event.target instanceof Element ? event.target.closest(action) : null
      if (mode === 'none' || (mode === 'auto' && target && target.getAttribute('aria-disabled') !== 'true')) return
      if (held && layer.open.value) hide()
      else show()
    }, opts)
    element.addEventListener('focusin', event => {
      const mode = config().focusTrigger ?? 'auto'
      if (suppressFocus || Date.now() < touchFocus || mode === 'never' || mode === 'auto' && event.target !== element && element.tabIndex < 0) return
      focused = true
      schedule(true, 'focus')
    }, opts)
    element.addEventListener('focusout', event => {
      if (contains(event.relatedTarget, element) || preview && contains(event.relatedTarget, getPanel())) return
      focused = false
      held = false
      closeAfterLeave('focus')
    }, opts)
    if (preview) element.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.isComposing || config().isEnabled === false) return
      if (event.key === 'ArrowDown' || event.key === 'Tab' && !event.shiftKey && layer.open.value && firstControl()) {
        event.preventDefault()
        if (!layer.open.value) setVisible(true, 'focus')
        void nextTick(() => {
          if (layer.open.value) (firstControl() ?? getPanel())?.focus({ preventScroll: true })
        })
      }
    }, opts)
    cleanup(() => { abort.abort(); corridor?.abort(); clearTimeout(timer); hovered = focused = held = false })
  }, { flush: 'post' })

  watch([trigger, layer.open], ([element, open], _, cleanup) => {
    if (!element || !open) return
    const document = element.ownerDocument
    const abort = new AbortController()
    const opts = { signal: abort.signal, capture: true }
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      event.stopPropagation()
      const focusedInside = preview && contains(document.activeElement, getPanel())
      hide()
      if (focusedInside) returnFocus()
    }, opts)
    document.addEventListener('pointerdown', event => {
      const path = event.composedPath()
      const panel = document.getElementById(layer.id)
      if (!path.includes(element) && (!panel || !path.includes(panel))) {
        if (held) noteOutsidePress(event, element)
        hide()
      }
    }, opts)
    cleanup(() => abort.abort())
  }, { flush: 'sync' })
  onMounted(() => {
    if (config().isEnabled !== false && (config().isOpen ?? config().isDefaultOpen)) layer.show()
  })
  watch(() => [config().isEnabled, config().isOpen] as const, ([enabled, open]) => {
    if (enabled === false || open === false) {
      clearTimeout(timer)
      corridor?.abort()
      layer.hide()
    }
    else if (open) layer.show()
  })
  onScopeDispose(() => { clearTimeout(timer); corridor?.abort() })
  function render(children: VNodeChild | (() => VNodeChild), props: Omit<LayerRenderProps, 'positioning'> = {}) {
    const label = config().label ?? props.label
    return layer.render(children, {
      ...props, label, role: preview ? label ? 'dialog' : 'group' : 'tooltip', tabindex: preview ? -1 : props.tabindex,
      class: [preview ? 'sy-hover-card__panel' : 'sy-tooltip sy-layer-tooltip', props.class],
      placement: config().placement ?? 'above', align: config().alignment ?? 'center',
      'data-state': layer.open.value ? preview ? 'open' : 'instant-open' : 'closed',
      onFocusin: event => {
        props.onFocusin?.(event)
        if (preview) focused = true
      },
      onFocusout: event => {
        props.onFocusout?.(event)
        if (!preview || contains(event.relatedTarget, trigger.value) || contains(event.relatedTarget, getPanel())) return
        focused = held = false
        closeAfterLeave('focus')
      },
      onKeydown: event => {
        props.onKeydown?.(event)
        if (preview && !event.defaultPrevented && event.key === 'Tab' && event.shiftKey && event.target === firstControl()) {
          event.preventDefault()
          returnFocus()
        }
      },
      onPointerenter: event => {
        props.onPointerenter?.(event)
        corridor?.abort()
        clearTimeout(timer)
        hovered = true
      },
      onPointerleave: event => {
        props.onPointerleave?.(event)
        hovered = contains(event.relatedTarget, trigger.value)
        closeAfterLeave('hover')
        if (!hovered && event.currentTarget instanceof HTMLElement) protectPointer(event, event.currentTarget, trigger.value)
      },
    })
  }
  return { ref, positionRef: layer.ref, interactionRef, anchorId: layer.anchorId, describedBy: layer.id, isOpen: layer.open, render, show, hide }
}

export function useTooltip(options: MaybeRefOrGetter<TooltipOptions> = {}) {
  const { render, ...controls } = useHoverSurface(options, false)
  return { ...controls, renderTooltip: render }
}

export function useHoverCard(options: MaybeRefOrGetter<HoverCardOptions> = {}) {
  const { render, ...controls } = useHoverSurface(options, true)
  return { ...controls, renderHoverCard: render }
}
