import { computed, nextTick, onScopeDispose, watch, type Ref } from 'vue'
import { brandRuleTargets, type BrandComponentRule } from '../platform/brand-rules'
import { createAnimator, prefersReducedMotion } from './motion'

function appearance(element: HTMLElement, style: CSSStyleDeclaration): Keyframe {
  return element.matches('.sy-banner__icon')
    ? { opacity: style.opacity, inlineSize: style.inlineSize, marginInlineEnd: style.marginInlineEnd }
    : { opacity: style.opacity }
}

export function useBrandPieceMotion(root: Readonly<Ref<HTMLElement | null>>, rules: Readonly<Ref<Readonly<Record<string, BrandComponentRule>> | undefined>>) {
  const active = new Map<HTMLElement, () => void>()
  const hidden = computed<Map<string, string>>(previous => {
    const next = new Map(Object.entries(rules.value ?? {}).flatMap(([key, rule]) => rule.declarations.display === 'none'
      ? [[key, brandRuleTargets[rule.target].selector] as const] : []))
    return previous?.size === next.size && [...next].every(([key, selector]) => previous.get(key) === selector) ? previous : next
  })

  watch(hidden, async (next, previous, onCleanup) => {
    const theme = root.value
    const view = theme?.ownerDocument.defaultView
    const changed = [...previous, ...next].filter(([key]) => previous.has(key) !== next.has(key))
    const selectors = [...new Set(changed.map(([, selector]) => selector))].join(', ')
    if (!theme || !view || !selectors || prefersReducedMotion(theme)) return

    const before = [...theme.querySelectorAll<HTMLElement>(selectors)].flatMap(element => {
      if (element.closest('[data-sy-brand]') !== theme || !element.getClientRects().length) return []
      const style = view.getComputedStyle(element)
      const interrupted = active.has(element)
      const snapshot = { element, display: style.display, frame: appearance(element, style), interrupted }
      active.get(element)?.()
      return [snapshot]
    })
    let current = true
    onCleanup(() => { current = false })
    await nextTick()
    if (!current || prefersReducedMotion(theme)) return

    for (const { element, frame, display, interrupted } of before) {
      if (!theme.contains(element) || typeof element.animate !== 'function') continue
      const style = view.getComputedStyle(element)
      const closing = style.display === 'none'
      // An engine that animates display already keeps the previous display value here.
      if (!closing && !interrupted) continue
      const to = appearance(element, style)
      const previousDisplay = element.style.display
      const inert = element.inert
      if (closing) {
        element.inert = true
        element.style.display = display
      }
      const animator = createAnimator(element)
      const effect = animator.animate('theme-piece', [frame, to], { id: 'sy-theme-piece', role: 'move', fill: 'backwards' })
      function release() {
        if (active.get(element) !== release) return
        active.delete(element)
        if (closing) {
          element.style.display = previousDisplay
          element.inert = inert
        }
        animator.dispose()
      }
      active.set(element, release)
      effect.finished.then(release, release)
    }
  }, { flush: 'pre' })

  onScopeDispose(() => { for (const release of active.values()) release() })
}
