import { onMounted, onScopeDispose, readonly, ref } from 'vue'
import { documentFocus } from './focus-order'
import { createAnimator, prefersReducedMotion } from './motion'

export const keyboardMotion = Object.freeze({
  android: { show: { duration: 270, easing: 'cubic-bezier(.12, 0, .1, 1)' }, hide: { duration: 170, easing: 'ease-in' } },
  ios: { show: { duration: 250, easing: 'cubic-bezier(.23, .72, .24, 1)' }, hide: { duration: 230, easing: 'ease-in-out' } },
})

export function acceptsKeyboard(element: Element | undefined) {
  return Boolean(element && !element.matches(':disabled, [inputmode="none"], [aria-readonly="true"]')
    && element.matches('textarea:not([readonly]), [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], input:not([readonly]):is(:not([type]), [type="text"], [type="search"], [type="url"], [type="tel"], [type="email"], [type="password"], [type="number"])'))
}

export interface KeyboardViewport {
  height: number
  inset: number
  top: number
  bottom: number
  focus: Element | undefined
  zoomed: boolean
}

type KeyboardListener = (report: KeyboardViewport) => void
const keyboards = new WeakMap<Window, ReturnType<typeof observeKeyboard>>()

function observeKeyboard(window: Window) {
  const viewport = window.visualViewport
  const virtual = (window.navigator as Navigator & { virtualKeyboard?: EventTarget & { boundingRect: DOMRectReadOnly } }).virtualKeyboard
  const document = window.document
  const listeners = new Set<KeyboardListener>()
  let reported: KeyboardViewport | undefined
  let frame = 0

  function read(): KeyboardViewport {
    const focus = documentFocus(document)
    const layout = document.documentElement.clientHeight
    const zoomed = Boolean(viewport && Math.abs(viewport.scale - 1) >= .02)
    const top = zoomed ? 0 : Math.max(0, viewport?.offsetTop ?? 0)
    const keyboard = virtual?.boundingRect
    const docked = keyboard && keyboard.height > 0 && keyboard.bottom >= layout - 2 ? keyboard.top : layout
    const visualHeight = viewport?.height ?? layout
    const physical = Math.round(Math.max(layout - visualHeight, layout - docked, 0))
    const height = !zoomed && physical >= (reported?.height ? 1 : 48) && (reported?.height || acceptsKeyboard(focus)) ? physical : 0
    const bottom = height ? Math.max(top, Math.min(layout, top + visualHeight, docked)) : layout
    return { focus, top, bottom, height, inset: Math.max(0, Math.round(layout - bottom)), zoomed }
  }
  function measure() {
    frame = 0
    const next = read()
    reported = next
    for (const change of listeners) change(next)
  }
  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(measure)
  }

  virtual?.addEventListener('geometrychange', schedule)
  viewport?.addEventListener('resize', schedule)
  viewport?.addEventListener('scroll', schedule)
  window.addEventListener('resize', schedule)
  document.addEventListener('focusin', schedule)
  document.addEventListener('focusout', schedule)
  return {
    subscribe(change: KeyboardListener) {
      listeners.add(change)
      change(reported ??= read())
      return () => {
        if (!listeners.delete(change) || listeners.size) return
        if (frame) window.cancelAnimationFrame(frame)
        virtual?.removeEventListener('geometrychange', schedule)
        viewport?.removeEventListener('resize', schedule)
        viewport?.removeEventListener('scroll', schedule)
        window.removeEventListener('resize', schedule)
        document.removeEventListener('focusin', schedule)
        document.removeEventListener('focusout', schedule)
        keyboards.delete(window)
      }
    },
  }
}

export function subscribeKeyboardViewport(window: Window, change: KeyboardListener) {
  let observer = keyboards.get(window)
  if (!observer) keyboards.set(window, observer = observeKeyboard(window))
  return observer.subscribe(change)
}

export function subscribeKeyboardInset(window: Window, change: (inset: number) => void) {
  let previous = 0
  change(previous)
  return subscribeKeyboardViewport(window, ({ inset }) => { if (inset !== previous) change(previous = inset) })
}

export function useKeyboardInset() {
  const inset = ref(0)
  let unsubscribe: (() => void) | undefined
  onMounted(() => { unsubscribe = subscribeKeyboardInset(window, value => { inset.value = value }) })
  onScopeDispose(() => unsubscribe?.())
  return readonly(inset)
}

/** Move an element above the keyboard using its document's visual viewport. */
export function rideKeyboard(element: HTMLElement, platform?: keyof typeof keyboardMotion) {
  const view = element.ownerDocument.defaultView
  if (!view) return () => {}
  const original = element.style.bottom
  const bottom = view.getComputedStyle(element).bottom
  const base = bottom === 'auto' ? '0px' : bottom
  const animator = createAnimator(element)
  let current = 0
  const dispose = subscribeKeyboardInset(view, inset => {
    if (current === inset) return
    const from = view.getComputedStyle(element).bottom
    const to = inset ? `calc(${base} + ${inset}px)` : base
    const timing = platform ? keyboardMotion[platform][inset > current ? 'show' : 'hide'] : undefined
    current = inset
    element.style.bottom = inset ? to : original
    if (timing && !prefersReducedMotion(element)) animator.animate('keyboard', [{ bottom: from }, { bottom: to }], { ...timing, scaleTempo: false })
  })
  return () => {
    dispose()
    animator.dispose()
    element.style.bottom = original
  }
}
