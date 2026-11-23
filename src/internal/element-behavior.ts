import { computed, inject, onScopeDispose, toValue, useAttrs, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { contentUrl } from './content-url'
import { navigateLink, routerContext } from './router'
import { validLinkDestination } from './link-component'

type ElementRef<T> = Ref<T | null> | ((value: T | null) => void) | null | undefined
export function useMergedRefs<T>(...refs: readonly ElementRef<T>[]) {
  return (value: T | null) => {
    for (const target of refs) {
      if (typeof target === 'function') target(value)
      else if (target) target.value = value
    }
  }
}

export function useDevWarning(check: () => boolean, message: string | (() => string)) {
  if (!import.meta.env.DEV) return
  let warned = false
  const stop = watch(check, failed => {
    if (failed && !warned) {
      warned = true
      console.warn('[Syntrofic UI] ' + toValue(message))
    }
  }, { immediate: true })
  onScopeDispose(stop)
}

export type InteractiveRole = 'link' | 'button' | 'inert'
export interface InteractiveRoleOptions {
  tag?: string
  href?: string
  onClick?: ((...args: never[]) => unknown) | null
  onActivate?: boolean
  disabled?: boolean
  isDisabled?: boolean
  triggerRole?: Exclude<InteractiveRole, 'inert'>
}
export function useInteractiveRole(options: MaybeRefOrGetter<InteractiveRoleOptions>) {
  const attrs = useAttrs()
  const settings = computed(() => toValue(options))
  const disabled = computed(() => settings.value.isDisabled ?? settings.value.disabled ?? false)
  const semantic = computed<InteractiveRole>(() => {
    const { href, onActivate, onClick, triggerRole } = settings.value
    if (href && !disabled.value) return validLinkDestination(href) ? 'link' : 'inert'
    if (onActivate || onClick) return 'button'
    const popup = attrs['aria-haspopup']
    const toggle = attrs['aria-expanded']
    return triggerRole ?? (attrs.onClick && (toggle !== undefined || popup && popup !== 'false') ? 'button' : 'inert')
  })
  const attributes = computed(() => {
    const tag = settings.value.tag
    const role = semantic.value
    const interactive = role !== 'inert'
    const native = (role === 'link' && tag === 'a') || (role === 'button' && tag === 'button')
    return {
      role: interactive && !native ? role : undefined,
      tabindex: interactive && !native ? disabled.value ? -1 : 0 : undefined,
      'aria-disabled': interactive && disabled.value ? true as const : undefined,
    }
  })
  return Object.assign(attributes, { semantic })
}

export interface ClickableContainerOptions {
  container?: HTMLElement | null
  interactive?: HTMLElement | null
  href?: string
  target?: string
  disabled?: boolean
  onClick?: (event: MouseEvent) => void
  onPressBlocked?: (event: PointerEvent) => void
}
const nestedControl = 'a[href], button, input, textarea, select, summary, label, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"], [role="checkbox"], [role="switch"], [tabindex]:not([tabindex="-1"])'

export function useClickableContainer(source: MaybeRefOrGetter<ClickableContainerOptions>) {
  const router = inject(routerContext, null)
  function eventRoot(event: MouseEvent) {
    return toValue(source).container ?? event.currentTarget as HTMLElement | null
  }
  function insideControl(event: MouseEvent, root: HTMLElement) {
    const path = event.composedPath()
    const stop = path.indexOf(root)
    const ElementType = root.ownerDocument.defaultView?.Element
    return stop > 0 && Boolean(ElementType && path.slice(0, stop).some(target => target instanceof ElementType && target.matches(nestedControl)))
  }
  function navigate(root: HTMLElement, href: string, target?: string) {
    const destination = router?.useHref?.(href) ?? href
    if (!validLinkDestination(destination)) return
    const anchor = root.ownerDocument.createElement('a')
    anchor.href = destination
    if (target) anchor.target = target
    if (target === '_blank') anchor.rel = 'noopener noreferrer'
    anchor.addEventListener('click', event => navigateLink(router, href, event))
    anchor.click()
  }
  function activate(event: MouseEvent, middle = false) {
    const options = toValue(source)
    const root = eventRoot(event)
    if (!root || options.disabled || event.defaultPrevented || !validLinkDestination(options.href) || insideControl(event, root)) return
    const selection = root.ownerDocument.getSelection()
    if (selection && !selection.isCollapsed && (root.contains(selection.anchorNode) || root.contains(selection.focusNode))) return
    const href = contentUrl(options.href)
    const modified = middle || event.metaKey || event.ctrlKey || event.shiftKey
    if (!modified) options.onClick?.(event)
    if (event.defaultPrevented) return
    if (href) navigate(root, href, modified ? '_blank' : options.target)
    else if (!modified && !options.onClick && root.contains(options.interactive ?? null)) options.interactive?.click()
  }
  return {
    onClick: (event: MouseEvent) => { if (event.button === 0) activate(event) },
    onMouseup: (event: MouseEvent) => { if (event.button === 1) activate(event, true) },
    onPointerdown(event: PointerEvent) {
      const root = eventRoot(event)
      if (event.pointerType !== 'mouse' && root && insideControl(event, root)) toValue(source).onPressBlocked?.(event)
    },
  }
}

export interface ContainerRevealOptions { hoverDelay?: number; forceState?: 'active' | 'inactive' }
export interface ContainerRevealConfig { isEnabled?: boolean }
export interface RevealContentOptions {
  inverted?: boolean
  isRevealInverted?: boolean
  isLayoutPreserved?: boolean
  forceVisibility?: 'shown' | 'hidden'
}
export function useContainerReveal(config: MaybeRefOrGetter<boolean | ContainerRevealConfig> = true) {
  const enabled = computed(() => {
    const value = toValue(config)
    return typeof value === 'boolean' ? value : value.isEnabled !== false
  })
  function getContainerProps(options: ContainerRevealOptions = {}) {
    if (!enabled.value) return {}
    const delay = options.hoverDelay ?? 0
    return {
      'data-sy-reveal': options.forceState ?? '',
      style: { '--sy-reveal-delay': (Number.isFinite(delay) ? Math.max(0, delay) : 0) + 'ms' },
    }
  }
  function getContentRevealProps(options: RevealContentOptions = {}) {
    if (!enabled.value) return {}
    return { 'data-sy-reveal-item': (options.isRevealInverted ?? options.inverted) ? 'conceal' : 'reveal',
      'data-sy-reveal-layout': options.isLayoutPreserved === false ? 'collapse' : undefined,
      'data-sy-reveal-visibility': options.forceVisibility }
  }
  return { getContainerProps, getContentRevealProps }
}

export function useIndicatorFocusRing(target: MaybeRefOrGetter<HTMLElement | null | undefined>, disabled: MaybeRefOrGetter<boolean> = false) {
  const wrapper = computed(() => toValue(target))
  const active = computed(() => !toValue(disabled))
  const attributes = computed(() => ({ 'data-sy-indicator-ring': wrapper.value && active.value ? '' : undefined }))
  let source: HTMLElement | undefined
  let indicator: Element | undefined
  function clear() {
    indicator?.removeAttribute('data-sy-indicator-focus')
    indicator = undefined
    source = undefined
  }
  function onFocusin(event: FocusEvent) {
    if (!(event.currentTarget instanceof HTMLElement) || !(event.target instanceof HTMLElement)) return
    if (!active.value || !event.target.matches(':focus-visible')) { clear(); return }
    const next = wrapper.value?.firstElementChild ?? undefined
    if (!next || next === indicator) return
    clear()
    indicator = next
    source = event.currentTarget
    indicator.setAttribute('data-sy-indicator-focus', '')
  }
  function onFocusout(event: FocusEvent) {
    if (!(event.relatedTarget instanceof Node) || !source?.contains(event.relatedTarget)) clear()
  }
  watch([wrapper, active], clear)
  onScopeDispose(clear, true)
  return Object.assign(attributes, { focusProps: { onFocusin, onFocusout } })
}
