import { computed, h, onScopeDispose, ref, shallowRef, toValue, watch, type MaybeRefOrGetter, type VNodeChild } from 'vue'
import { useMediaQuery } from './interaction'

export interface OverlayOptions {
  open?: boolean
  content?: VNodeChild | (() => VNodeChild)
  showOn?: 'always' | 'hover' | 'focus' | 'hover-or-focus'
  scrim?: 'dark' | 'light' | false
  position?: 'start' | 'center' | 'end' | 'full' | 'top' | 'bottom' | 'fill'
  align?: 'start' | 'center' | 'end'
  delay?: number
  hideDelay?: number
}

const controls = 'a[href],button,input,select,textarea,[role="button"],[role="link"],[contenteditable="true"]'
const positions = { top: 'start', bottom: 'end', fill: 'full' } as const

export function useOverlay(options: MaybeRefOrGetter<OverlayOptions> = {}) {
  const state = computed(() => toValue(options))
  const containerRef = shallowRef<HTMLElement | null>(null)
  const hovered = ref(false)
  const focused = ref(false)
  const revealedByTap = ref(false)
  const touch = ref(false)
  const hasCoarsePointer = useMediaQuery('(hover: none)')
  const touchMode = computed(() => touch.value || hasCoarsePointer.value)
  const trigger = computed(() => state.value.showOn ?? 'always')
  const hoverTrigger = computed(() => trigger.value === 'hover' || trigger.value === 'hover-or-focus')
  const visible = computed(() => state.value.open ?? (trigger.value === 'always' || (hoverTrigger.value
    ? touchMode.value ? revealedByTap.value : hovered.value || focused.value : focused.value)))
  let timer: ReturnType<typeof setTimeout> | undefined
  let contact: { id: number; x: number; y: number } | undefined

  function hover(event: PointerEvent, next: boolean) {
    if (!hoverTrigger.value || event.pointerType === 'touch') return
    if (event.pointerType === 'mouse') touch.value = false
    clearTimeout(timer)
    const wait = next ? state.value.delay ?? 170 : state.value.hideDelay ?? 120
    if (wait > 0) timer = setTimeout(() => { hovered.value = next }, wait)
    else hovered.value = next
  }
  function pointerDown(event: PointerEvent) {
    if (event.pointerType !== 'touch' || !event.isPrimary || !hoverTrigger.value || state.value.open !== undefined) return
    touch.value = true
    if (event.target instanceof Element && event.target.closest(controls)) return
    contact = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }
  function pointerUp(event: PointerEvent) {
    const tap = contact
    contact = undefined
    if (tap && tap.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 9) {
      revealedByTap.value = !revealedByTap.value
    }
  }
  function focusOut(event: FocusEvent) {
    focused.value = (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)
  }
  watch([containerRef, revealedByTap], ([node, open], _, dispose) => {
    if (!node || !open) return
    const close = (event: PointerEvent) => { if (!event.composedPath().includes(node)) revealedByTap.value = false }
    node.ownerDocument.addEventListener('pointerdown', close, true)
    dispose(() => node.ownerDocument.removeEventListener('pointerdown', close, true))
  })
  onScopeDispose(() => clearTimeout(timer))

  const containerProps = {
    class: 'sy-overlay',
    onPointerenter: (event: PointerEvent) => hover(event, true),
    onPointerleave: (event: PointerEvent) => hover(event, false),
    onPointerdown: pointerDown,
    onPointerup: pointerUp,
    onPointercancel: () => { contact = undefined },
    onFocusin: () => { focused.value = true },
    onFocusout: focusOut,
  }
  const overlayProps = computed(() => {
    const { scrim = 'dark', align = 'start', position = 'end' } = state.value
    return {
      class: 'sy-overlay__content',
      'data-visible': visible.value || undefined,
      'data-scrim': scrim || undefined,
      'data-position': Object.hasOwn(positions, position) ? positions[position as keyof typeof positions] : position,
      'data-align': align,
      inert: !visible.value && (state.value.open !== undefined || hoverTrigger.value && touchMode.value),
    }
  })
  const renderOverlay = (children: VNodeChild) => h('div', overlayProps.value, Array.isArray(children) ? children : [children])
  const element = computed(() => {
    const content = state.value.content
    return content === undefined ? null : renderOverlay(typeof content === 'function' ? content() : content)
  })
  return { containerRef, containerProps, overlayProps, visible, element, renderOverlay }
}
