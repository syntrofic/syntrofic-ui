import { computed, h, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import SKbd from '../components/SKbd.vue'
import SLayer from '../components/SLayer.vue'
import { useLayer } from './layer'

export interface KeyboardHintOptions {
  orientation?: 'horizontal' | 'vertical' | 'both'
  dismissAfterMs?: number
  isEnabled?: boolean
  label?: string
  focusSelector?: string
}

export function useKeyboardHint(input: MaybeRefOrGetter<KeyboardHintOptions> = {}) {
  const config = computed(() => toValue(input))
  const layer = useLayer({ offset: 5, onHide: clear })
  const scope = shallowRef<HTMLElement>()
  let shown = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let escape: (() => void) | undefined

  function clear() {
    clearTimeout(timer)
    escape?.()
    escape = undefined
    scope.value = undefined
  }

  function at(target: EventTarget | null) {
    if (target instanceof HTMLElement) {
      layer.ref(target)
      layer.show()
    }
  }
  function eligible(target: EventTarget | null): target is HTMLElement {
    return target instanceof HTMLElement && (!config.value.focusSelector || target.matches(config.value.focusSelector))
  }
  function onFocus(event: FocusEvent) {
    const root = event.currentTarget
    const target = event.target
    if (!(root instanceof HTMLElement) || !eligible(target)) return
    const closest = target.closest('[data-sy-keyboard-hint-scope]')
    if (closest && closest !== root && root.contains(closest)) return
    if (layer.open.value) { at(target); return }
    if (shown || config.value.isEnabled === false || !target.matches(':focus-visible')
      || event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return
    shown = true
    scope.value = root
    at(target)
    const view = root.ownerDocument.defaultView
    function onEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || !eligible(event.target) || !scope.value?.contains(event.target)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      layer.hide()
    }
    view?.addEventListener('keydown', onEscape, true)
    escape = () => view?.removeEventListener('keydown', onEscape, true)
    const duration = config.value.dismissAfterMs
    if (duration !== undefined && Number.isFinite(duration)) timer = setTimeout(layer.hide, Math.max(0, duration))
  }
  function onBlur(event: FocusEvent) {
    if (!layer.open.value) return
    if (eligible(event.relatedTarget) && scope.value?.contains(event.relatedTarget)) at(event.relatedTarget)
    else layer.hide()
  }
  function onKeyDown(event: KeyboardEvent) {
    if (layer.open.value && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) layer.hide()
  }
  watch(() => config.value.isEnabled, enabled => { if (enabled === false) layer.hide() })
  onScopeDispose(clear)
  const HintElement = () => {
    const orientation = config.value.orientation ?? 'horizontal'
    const keys = orientation === 'horizontal' ? ['left', 'right'] : orientation === 'vertical' ? ['up', 'down'] : ['left', 'up', 'down', 'right']
    return h(SLayer, { layer, ariaHidden: true }, () => h('div', { class: 'sy-keyboard-hint' }, [
      h(SKbd, { keys, separator: '' }), h('span', config.value.label ?? 'to navigate'),
    ]))
  }
  return { HintElement, onFocus, onBlur, onKeyDown }
}
