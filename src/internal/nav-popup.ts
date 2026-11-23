import { inject, onScopeDispose, watch, type Ref } from 'vue'
import { topNavPopups } from './shell-layout'
import { useLayerFocus } from './layer-focus'

interface NavPopupOptions {
  trigger(): HTMLButtonElement | undefined
  panel(): HTMLElement | undefined
  showDelay(): number
  hideDelay(): number
  focus(last: boolean): void
}

export function useNavPopup(open: Ref<boolean>, options: NavPopupOptions) {
  const group = inject(topNavPopups, null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let hoverOpen = false
  let focusOnOpen: 'first' | 'last' | undefined
  let restore = true
  let pointerType = ''
  const focus = useLayerFocus({ open, origin: options.trigger, trigger: options.trigger,
    surface: () => options.panel()?.closest<HTMLElement>('.sy-floating-panel'),
    enabled: () => restore, autofocus: () => Boolean(focusOnOpen) })

  function hover(event: PointerEvent, visible: boolean) {
    if (event.pointerType !== 'mouse') return
    clearTimeout(timer)
    if (visible && !open.value) {
      timer = setTimeout(() => {
        hoverOpen = true
        open.value = true
      }, options.showDelay())
    } else if (!visible && open.value) {
      timer = setTimeout(() => {
        const active = options.trigger()?.ownerDocument.activeElement
        const hasFocus = Boolean(options.panel()?.contains(active ?? null))
        if (!hoverOpen && hasFocus) return
        restore = hasFocus
        open.value = false
      }, options.hideDelay())
    }
  }

  function openWithFocus(last = false) {
    clearTimeout(timer)
    hoverOpen = false
    if (open.value) options.focus(last)
    else {
      focusOnOpen = last ? 'last' : 'first'
      open.value = true
    }
  }

  function close(returnFocus = true) {
    clearTimeout(timer)
    focusOnOpen = undefined
    restore = returnFocus
    open.value = false
  }

  function triggerClick(event: MouseEvent) {
    if (open.value && !hoverOpen) close(event.detail === 0)
    else openWithFocus()
  }

  function opened(event: Event) {
    focus.opened(event)
    event.preventDefault()
    if (focusOnOpen) options.focus(focusOnOpen === 'last')
    focusOnOpen = undefined
  }

  function closed(event: Event) {
    focus.finish(event)
    hoverOpen = false
    pointerType = ''
  }

  function select(event: MouseEvent, closeOnSelect?: boolean) {
    const pointer = pointerType || (event as PointerEvent).pointerType
    pointerType = ''
    if (event.defaultPrevented || closeOnSelect === false || (hoverOpen && event.detail > 0 && (!pointer || pointer === 'mouse'))) return false
    close()
    return true
  }

  const closeForSibling = () => close(false)
  watch(open, visible => {
    if (visible) {
      restore = true
      group?.claim(closeForSibling)
    }
    else group?.release(closeForSibling)
  }, { immediate: true, flush: 'sync' })
  onScopeDispose(() => {
    clearTimeout(timer)
    group?.release(closeForSibling)
  })
  return { hover, openWithFocus, triggerClick, opened, closed, select, close,
    pointerDown(event: PointerEvent) { pointerType = event.pointerType },
    keyboard() { hoverOpen = false },
    escape() { restore = true },
    interactOutside(event: Event) { if (options.trigger()?.contains(event.target as Node)) event.preventDefault() },
  }
}
