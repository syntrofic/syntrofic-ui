import { onBeforeUnmount, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { documentFocus, focusable, focusWithin, parentAcrossShadow, tabOrder } from './focus-order'

interface FocusOptions {
  open: MaybeRefOrGetter<boolean | undefined>
  surface?: () => HTMLElement | null | undefined
  origin?: () => Element | null | undefined
  trigger?: () => Element | null | undefined
  anchor?: () => Element | null | undefined
  enabled?: () => boolean
  autofocus?: () => boolean
  dismissOnBackdrop?: () => boolean
}

interface FocusRecord {
  document: Document
  opener?: Element
  ancestors: Element[]
  place?: { container: HTMLElement; index: number }
  parent?: FocusRecord
  surface?: HTMLElement
  entered: boolean
  movingTo?: Element
  closing: boolean
  awaitsFocus: boolean
  abort: AbortController
  options: FocusOptions
}

const layers = new WeakMap<Document, Set<FocusRecord>>()
const exits = new WeakSet<Element>()

export function backdropChildDismissal(surface: HTMLElement) {
  const document = surface.ownerDocument
  const records = layers.get(document)
  const child = records && [...records].reverse().find(layer => !layer.closing && layer.surface !== surface
    && Boolean(layer.options.dismissOnBackdrop) && (
      focusWithin(surface, layer.surface) || focusWithin(surface, layer.opener) ||
      focusWithin(surface, layer.options.trigger?.() ?? undefined) || focusWithin(surface, layer.options.origin?.() ?? undefined)
    ))
  if (!child) return
  const heldFocus = focusWithin(child.surface, documentFocus(document))
  return () => {
    // Focus-based dismissal can run before a freshly opened floating layer installs its outside pointer listener.
    if (child.closing) return heldFocus
    return child.options.dismissOnBackdrop?.() === true
  }
}

function isControl(document: Document, element?: Element): element is Element {
  return Boolean(element?.isConnected && element !== document.body && element !== document.documentElement)
}

function usable(element?: Element | null): element is HTMLElement {
  if (!element || !isControl(element.ownerDocument, element) || !focusable(element)) return false
  for (let node: Element | null = element; node; node = parentAcrossShadow(node)) {
    if (exits.has(node) || node.matches('[inert], [hidden], [aria-hidden="true"]')) return false
  }
  return true
}

function focusCandidate(element: HTMLElement) {
  const temporary = element.tabIndex < 0 && !element.hasAttribute('tabindex') && !element.isContentEditable
  const cleanup = () => { if (element.getAttribute('tabindex') === '-1') element.removeAttribute('tabindex') }
  if (temporary) element.setAttribute('tabindex', '-1')
  element.focus({ preventScroll: true })
  const focused = documentFocus(element.ownerDocument) === element
  if (temporary && focused) element.addEventListener('blur', cleanup, { once: true })
  else if (temporary) cleanup()
  return focused
}

function *destinations(record: FocusRecord): Generator<Element | null | undefined> {
  const { options, surface, document, place } = record
  yield record.opener
  yield options.trigger?.()
  if (surface?.id) yield document.querySelector(`[aria-controls~="${CSS.escape(surface.id)}"]`)
  yield options.anchor?.()
  if (record.parent?.closing) return
  if (place?.container.isConnected) {
    const stops = tabOrder(place.container)
    yield stops[place.index]
    yield stops[place.index - 1]
    yield stops[place.index + 1]
    yield stops[0]
  }
  yield* record.ancestors
}

/** Track focus before a layer opens and finish the return after its exit.
 * A blur destination records the browser's focus move before focusin arrives. */
export function useLayerFocus(options: FocusOptions) {
  let record: FocusRecord | undefined
  let requested: Element | undefined
  let unmounting = false
  const open = () => !unmounting && Boolean(toValue(options.open))

  function dispose(current: FocusRecord) {
    current.abort.abort()
    layers.get(current.document)?.delete(current)
    if (record === current) record = undefined
  }

  function begin(surface = options.surface?.()) {
    const document = surface?.ownerDocument ?? requested?.ownerDocument ?? options.origin?.()?.ownerDocument
    if (!document) return
    const existing = record
    const active = documentFocus(document)
    const opener = requested ?? (existing && focusWithin(existing.surface, active) ? existing.opener : active)
    requested = undefined
    if (existing) dispose(existing)
    if (surface) exits.delete(surface)
    const activeLayers = layers.get(document) ?? new Set<FocusRecord>()
    const parent = [...activeLayers].reverse().find(layer => focusWithin(layer.surface, opener))
    const ancestors: Element[] = []
    if (isControl(document, opener)) {
      for (let node = parentAcrossShadow(opener); node && isControl(document, node); node = parentAcrossShadow(node)) ancestors.push(node)
    }
    const container = ancestors.find((node): node is HTMLElement => node.matches('section, form, nav, [role="group"], [role="menu"]') && 'tabIndex' in node)
      ?? (ancestors[0] as HTMLElement | undefined)
    const index = container && isControl(document, opener) ? tabOrder(container).indexOf(opener as HTMLElement) : -1
    const current: FocusRecord = { document, opener, ancestors, parent, surface: surface ?? undefined,
      place: index >= 0 && container ? { container, index } : undefined,
      entered: focusWithin(surface ?? undefined, active), closing: false, awaitsFocus: options.autofocus?.() !== false,
      abort: new AbortController(), options }
    record = current
    activeLayers.add(current)
    layers.set(document, activeLayers)

    const config = { capture: true, signal: current.abort.signal }
    document.addEventListener('blur', event => {
      if (!current.surface || !event.composedPath().includes(current.surface)) return
      const next = event.relatedTarget as Element | null
      if (next?.nodeType !== 1 || focusWithin(current.surface, next)) return
      current.movingTo = next
      queueMicrotask(() => { if (!current.closing && current.movingTo === next) current.movingTo = undefined })
    }, config)
    document.addEventListener('focusin', event => {
      if (current.surface && event.composedPath().includes(current.surface)) {
        current.entered = true
        current.awaitsFocus = false
        current.movingTo = undefined
      }
    }, config)
  }

  function observe(element: HTMLElement) {
    if (!open()) return
    if (!record || record.document !== element.ownerDocument) begin(element)
    if (!record) return
    exits.delete(element)
    record.surface = element
    record.entered ||= focusWithin(element, documentFocus(record.document))
  }
  function opened(event: Event) {
    const element = options.surface?.() ?? event.target as HTMLElement | null
    if (element?.nodeType === 1) observe(element)
  }
  function markClosing(current: FocusRecord) {
    current.closing = true
    current.awaitsFocus = false
    if (current.surface) exits.add(current.surface)
  }

  function finish(event?: Event) {
    event?.preventDefault()
    const current = record
    if (!current || open()) return
    const reporting = event?.target as Element | undefined
    if (reporting && current.surface && !focusWithin(reporting, current.surface) && !focusWithin(current.surface, reporting)) return
    markClosing(current)
    queueMicrotask(() => {
      if (record !== current || open()) return
      const { document, surface, movingTo } = current
      const active = documentFocus(document)
      const childOpening = [...(layers.get(document) ?? [])].some(child => child.parent === current && !child.closing && child.awaitsFocus)
      const shouldReturn = options.enabled?.() !== false && current.entered && !childOpening
        && (!isControl(document, active) || focusWithin(surface, active)) && !usable(movingTo)
      dispose(current)
      if (!shouldReturn) return
      const tried = new Set<Element>()
      for (let layer: FocusRecord | undefined = current; layer; layer = layer.parent) {
        for (const target of destinations(layer)) {
          if (!usable(target) || tried.has(target)) continue
          tried.add(target)
          if (focusCandidate(target)) return
        }
        if (layer.parent && !layer.parent.closing && usable(layer.parent.surface) && focusCandidate(layer.parent.surface)) return
      }
      const main = document.querySelector('main, [role="main"]')
      if (usable(main) && focusCandidate(main)) return
      if (import.meta.env.DEV) console.warn(`[Syntrofic UI] ${surface?.id || 'Overlay'} could not restore focus to a rendered control.`)
    })
  }

  watch(open, visible => {
    if (visible) begin()
    else if (record) markClosing(record)
  }, { flush: 'sync', immediate: true })
  if (options.surface) watch(options.surface, node => { if (node) observe(node) }, { flush: 'post' })
  onBeforeUnmount(() => {
    const current = record
    if (!current) return
    unmounting = true
    markClosing(current)
    // The model may still be open when a parent removes the layer.
    finish()
  })
  return { opened, observe, finish, opener: () => record?.opener, rememberOpener: (element: Element) => { requested = element } }
}
