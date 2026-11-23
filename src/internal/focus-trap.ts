import { shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { documentFocus, tabOrder } from './focus-order'
import { useLayerFocus } from './layer-focus'

export { tabOrder } from './focus-order'

export interface FocusTrapOptions {
  isActive: MaybeRefOrGetter<boolean>
  container?: MaybeRefOrGetter<HTMLElement | null | undefined>
  onEscape?: (event: KeyboardEvent) => void
  restoreFocus?: boolean
}

const traps = new WeakMap<Document, HTMLElement[]>()

export function useFocusTrap(options: FocusTrapOptions) {
  const containerRef = shallowRef<HTMLElement>()
  const container = () => toValue(options.container) ?? containerRef.value
  const active = () => toValue(options.isActive) && options.restoreFocus !== false
  const focus = useLayerFocus({ open: active, surface: container, autofocus: () => false })
  function focusFirst() {
    const root = container()
    if (root) (tabOrder(root)[0] ?? root).focus({ preventScroll: true })
  }
  watch([container, () => toValue(options.isActive)], ([root, active], _, dispose) => {
    if (!root || !active) return
    const element = root
    const document = root.ownerDocument
    const list = traps.get(document) ?? []
    list.push(root)
    traps.set(document, list)
    function keydown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || list.at(-1) !== root || !event.composedPath().includes(element)) return
      if (event.key === 'Escape' && options.onEscape) {
        event.preventDefault()
        event.stopPropagation()
        options.onEscape(event)
      } else if (event.key === 'Tab') {
        const items = tabOrder(element)
        const current = documentFocus(document)
        const index = items.findIndex(item => item === current)
        const next = index < 0 ? (event.shiftKey ? items.at(-1) : items[0])
          : items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]
        event.preventDefault()
        const destination = next ?? element
        destination.focus({ preventScroll: true })
      }
    }
    root.addEventListener('keydown', keydown)
    dispose(() => {
      root.removeEventListener('keydown', keydown)
      list.splice(list.lastIndexOf(root), 1)
      if (!list.length) traps.delete(document)
      if (options.restoreFocus !== false) focus.finish()
    })
  }, { flush: 'post', immediate: true })
  return { containerRef, focusFirst }
}
