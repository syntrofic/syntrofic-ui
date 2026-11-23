import { h, onUpdated, shallowRef, watch, type Ref } from 'vue'
import { useLayer } from './layer'

export function useTableTextOverflow(viewport: Ref<HTMLElement | null>, enabled: Ref<boolean>) {
  const active = shallowRef<HTMLElement | null>(null)
  const text = shallowRef('')
  const direction = shallowRef<string>()
  const layer = useLayer({ offset: 6 })
  let leave: ReturnType<typeof setTimeout> | undefined

  function hide() {
    clearTimeout(leave)
    active.value = null
    layer.hide()
    layer.ref(null)
  }
  function update() {
    const label = active.value
    if (!label) return
    if (!viewport.value?.contains(label) || !label.hasAttribute('data-table-cut') || label.scrollWidth <= label.clientWidth + 1) {
      hide()
      return
    }
    text.value = label.textContent ?? ''
    direction.value = label.ownerDocument.defaultView?.getComputedStyle(label).direction
    if (text.value.trim()) layer.show()
    else hide()
  }
  function show(label: HTMLElement) {
    if (label.scrollWidth <= label.clientWidth + 1 || !label.textContent?.trim()) return
    clearTimeout(leave)
    active.value = label
    layer.ref(label)
    update()
  }
  onUpdated(update)
  watch(active, (label, _, cleanup) => {
    const view = label?.ownerDocument.defaultView
    if (!label || !view) return
    const observers = new AbortController()
    const { signal } = observers
    const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(update) : undefined
    observer?.observe(label)
    label.ownerDocument.fonts?.addEventListener('loadingdone', update, { signal })
    view.addEventListener('keydown', event => { if (event.key === 'Escape') hide() }, { capture: true, signal })
    view.addEventListener('pointerdown', event => { if (!event.composedPath().includes(label)) hide() }, { capture: true, signal })
    cleanup(() => { observers.abort(); observer?.disconnect() })
  })

  watch([viewport, enabled], ([frame, truncated], _, cleanup) => {
    if (!frame || !truncated) return
    const listeners = new AbortController()
    const { signal } = listeners
    let pending: ReturnType<typeof setTimeout> | undefined
    let resetPointer: ReturnType<typeof setTimeout> | undefined
    let pointerFocused: Element | null = null
    let tap: { label: HTMLElement; id: number; x: number; y: number; closes: boolean } | undefined
    const bodyLabel = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement) || !target.matches('[data-table-cut="body"]')) return undefined
      if (target.closest('.sy-table__scroll') === frame) return target
    }
    const headerLabel = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement) || target.closest('.sy-table__scroll') !== frame) return undefined
      return target.closest('th[scope="col"]')?.querySelector<HTMLElement>('[data-table-cut="heading"]')
    }
    frame.addEventListener('pointerover', event => {
      const label = bodyLabel(event.target)
      if (!label || event.pointerType === 'touch' || event.buttons) return
      if (active.value === label) { clearTimeout(leave); return }
      clearTimeout(pending)
      pending = setTimeout(() => show(label), 300)
    }, { signal })
    frame.addEventListener('pointerout', event => {
      const label = bodyLabel(event.target)
      if (!label || event.pointerType === 'touch') return
      clearTimeout(pending)
      if (active.value === label) leave = setTimeout(hide, 160)
    }, { signal })
    frame.addEventListener('pointerdown', event => {
      clearTimeout(pending)
      const label = bodyLabel(event.target)
      if (label && event.isPrimary && event.pointerType === 'touch') {
        tap = { label, id: event.pointerId, x: event.clientX, y: event.clientY, closes: active.value === label }
      }
      pointerFocused = event.target instanceof Element ? event.target.closest('th[scope="col"]') : null
      clearTimeout(resetPointer)
      resetPointer = setTimeout(() => { pointerFocused = null }, 0)
      hide()
    }, { signal, passive: true })
    frame.addEventListener('pointercancel', () => { tap = undefined }, { signal })
    frame.addEventListener('pointerup', event => {
      if (!tap || event.pointerId !== tap.id) return
      const contact = tap
      tap = undefined
      if (!contact.closes && bodyLabel(event.target) === contact.label && Math.hypot(event.clientX - contact.x, event.clientY - contact.y) <= 8) show(contact.label)
    }, { signal, passive: true })
    frame.addEventListener('focusin', event => {
      const label = headerLabel(event.target)
      if (label && !pointerFocused && event.target instanceof HTMLElement && event.target.matches(':focus-visible')) {
        clearTimeout(pending)
        show(label)
      }
    }, { signal })
    frame.addEventListener('focusout', event => {
      if (active.value === headerLabel(event.target) && active.value !== headerLabel(event.relatedTarget)) hide()
    }, { signal })
    frame.addEventListener('scroll', () => {
      clearTimeout(pending)
      if (active.value?.dataset.tableCut === 'body') hide()
    }, { signal, passive: true })
    cleanup(() => { listeners.abort(); clearTimeout(pending); clearTimeout(resetPointer); hide() })
  }, { flush: 'post' })

  return () => layer.render(h('span', { dir: direction.value }, text.value), {
    class: 'sy-tooltip sy-layer-tooltip sy-table__overflow-tooltip', role: 'tooltip', placement: 'above', align: 'start',
    'data-state': layer.open.value ? 'instant-open' : 'closed',
    onPointerenter: () => clearTimeout(leave),
    onPointerleave: event => {
      const label = active.value
      if (label?.dataset.tableCut === 'body' && event.relatedTarget !== label) hide()
    },
  })
}
