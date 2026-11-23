import { computed, getCurrentInstance, hasInjectionContext, inject, onMounted, shallowRef, toValue, watch, type InjectionKey, type MaybeRefOrGetter, type Ref } from 'vue'

export type ReducedMotionPolicy = 'system' | 'always'
export const reducedMotionAttribute = 'data-sy-reduced-motion'
export const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
export const reducedMotionContext: InjectionKey<Readonly<Ref<boolean>>> = Symbol('reduced motion')

const preferences = new WeakMap<Window, MediaQueryList>()
const observers = new WeakMap<Document, { listeners: Set<() => void>; dispose: () => void }>()

function preference(view: Window | null | undefined) {
  if (!view || typeof view.matchMedia !== 'function') return
  const existing = preferences.get(view)
  if (existing) return existing
  const query = view.matchMedia(reducedMotionQuery)
  preferences.set(view, query)
  return query
}

export function themeReducesMotion(element: Element | null | undefined): boolean {
  for (let node = element; node;) {
    if (node.closest(`[${reducedMotionAttribute}]`)) return true
    const root = node.getRootNode()
    node = 'host' in root ? (root as ShadowRoot).host : null
  }
  return false
}

export function prefersReducedMotion(element: Element): boolean {
  return themeReducesMotion(element) || preference(element.ownerDocument.defaultView)?.matches === true
}

/** Watch one document's system preference and theme marks. Subscribers only
 * hear changes to their own scope, including its inherited marks. */
export function observeReducedMotion(element: Element, update: (reduced: boolean) => void) {
  const document = element.ownerDocument
  const view = document.defaultView
  let current = prefersReducedMotion(element)
  update(current)
  if (!view) return () => {}
  let entry = observers.get(document)
  if (!entry) {
    const listeners = new Set<() => void>()
    const notify = () => { for (const listener of listeners) listener() }
    const query = preference(view)
    const observer = typeof view.MutationObserver === 'function' ? new view.MutationObserver(notify) : undefined
    observer?.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: [reducedMotionAttribute] })
    query?.addEventListener('change', notify)
    const dispose = () => {
      observer?.disconnect()
      query?.removeEventListener('change', notify)
      observers.delete(document)
    }
    entry = { listeners, dispose }
    observers.set(document, entry)
  }
  const { listeners, dispose } = entry
  const read = () => {
    const next = prefersReducedMotion(element)
    if (current === next) return
    current = next
    update(next)
  }
  listeners.add(read)
  return () => { if (listeners.delete(read) && !listeners.size) dispose() }
}

export function useReducedMotion(target?: MaybeRefOrGetter<Element | null | undefined>) {
  const inherited = hasInjectionContext() ? inject(reducedMotionContext, null) : null
  const mounted = shallowRef(!getCurrentInstance())
  const reduced = shallowRef(false)
  if (!mounted.value) onMounted(() => { mounted.value = true })
  watch(() => mounted.value ? toValue(target) ?? globalThis.document?.documentElement : undefined, (element, _, cleanup) => {
    if (element) cleanup(observeReducedMotion(element, value => { reduced.value = value }))
  }, { immediate: true, flush: 'post' })
  return computed(() => reduced.value || inherited?.value === true)
}
