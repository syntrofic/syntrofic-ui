import { observeReducedMotion } from './reduced-motion'
import { nextTick, onScopeDispose, watch, type Ref } from 'vue'
import type { BrandComponentRule } from '../platform/brand-rules'
import { createAnimator, prefersReducedMotion, startLayoutCompanion } from './motion'

const parts = new Set(['app-shell-header', 'layout-header', 'top-nav', 'top-nav-item'])
const geometry = /^(?:height|min-height|padding(?:-.+)?)$/
const targets = [
  '.sy-app-layout__navbar', '.sy-layout__header', '.sy-layout-header',
  '.sy-layout__header > .sy-layout__region-body', '.sy-layout-header > .sy-layout__region-content',
  '.sy-navbar', '.sy-navbar__bar', '.sy-navbar__desktop > li > .sy-navigation-link',
].join(', ')
const properties = ['blockSize', 'minBlockSize', 'paddingBlockStart', 'paddingBlockEnd', 'paddingInlineStart', 'paddingInlineEnd'] as const
type Size = Record<typeof properties[number], string>
const animatedHeaderLayouts = new WeakSet<HTMLElement>()

export function hasAnimatedBrandHeader(layout: HTMLElement) {
  return animatedHeaderLayouts.has(layout)
}

export function useBrandNavigationMotion(root: Readonly<Ref<HTMLElement | null>>, rules: Readonly<Ref<Readonly<Record<string, BrandComponentRule>> | undefined>>) {
  let before: Map<HTMLElement, Size> | undefined
  let measuring: HTMLElement | undefined
  const active = new Map<HTMLElement, Animation>()
  const layouts = new Set<HTMLElement>()
  const geometryRules = () => JSON.stringify(Object.entries(rules.value ?? {}).flatMap(([key, rule]) => {
    if (!parts.has(rule.target)) return []
    const declarations = Object.entries(rule.declarations).filter(([property]) => geometry.test(property))
    return declarations.length ? [[key, declarations]] : []
  }))

  function releaseIdleTracks() {
    for (const layout of layouts) {
      if ([...active.keys()].some(element => layout.contains(element))) continue
      animatedHeaderLayouts.delete(layout)
      layouts.delete(layout)
    }
  }

  function cancel() {
    for (const effect of active.values()) effect.cancel()
    active.clear()
    releaseIdleTracks()
  }

  function releaseMeasurement() {
    measuring?.removeAttribute('data-sy-navigation-measuring')
    measuring = undefined
  }

  function snapshot(theme: HTMLElement) {
    const view = theme.ownerDocument.defaultView!
    const sizes = new Map<HTMLElement, Size>()
    for (const element of theme.querySelectorAll<HTMLElement>(targets)) {
      if (element.closest('[data-sy-brand]') !== theme || !element.getClientRects().length ||
        element.closest('.sy-layout:not([data-animated]) > .sy-layout__header')) continue
      const style = view.getComputedStyle(element)
      sizes.set(element, {
        blockSize: style.blockSize, minBlockSize: style.minBlockSize === 'auto' ? '0px' : style.minBlockSize,
        paddingBlockStart: style.paddingBlockStart, paddingBlockEnd: style.paddingBlockEnd,
        paddingInlineStart: style.paddingInlineStart, paddingInlineEnd: style.paddingInlineEnd,
      })
    }
    return sizes
  }

  watch(geometryRules, () => {
    const theme = root.value
    releaseMeasurement()
    before = theme?.ownerDocument.defaultView && !prefersReducedMotion(theme) ? snapshot(theme) : undefined
    cancel()
    if (!theme || !before) return
    // The theme edit owns these sizes until the new CSS has been measured.
    theme.setAttribute('data-sy-navigation-measuring', '')
    measuring = theme
    for (const element of before.keys()) {
      const layout = element.parentElement
      if (!element.matches('.sy-layout__header') || !layout?.matches('.sy-layout')) continue
      layouts.add(layout)
      animatedHeaderLayouts.add(layout)
    }
  }, { flush: 'pre' })
  watch(geometryRules, () => {
    const previous = before
    before = undefined
    const theme = root.value
    // Keep track ownership through SLayout's update hooks, even when a rule
    // has no rendered size change in a particular layout.
    void nextTick(releaseIdleTracks)
    const sizes = previous?.size && theme?.ownerDocument.defaultView && !prefersReducedMotion(theme) ? snapshot(theme) : undefined
    if (!sizes || !previous) { releaseMeasurement(); return }
    for (const [element, to] of sizes) {
      const from = previous.get(element)
      if (!from || typeof element.animate !== 'function') continue
      const changed = properties.filter(key => from[key] !== to[key] && from[key].endsWith('px') && to[key].endsWith('px'))
      if (!changed.length) continue
      const frames = [from, to].map(size => Object.fromEntries(changed.map(key => [key, size[key]])))
      const effect = startLayoutCompanion(element, createAnimator(element).animate('theme-navigation', frames, {
        id: 'sy-navigation-layout', role: 'move', fill: 'backwards',
      }))
      active.set(element, effect)
      const release = () => {
        if (active.get(element) !== effect) return
        active.delete(element)
        releaseIdleTracks()
      }
      effect.finished.then(release, release)
    }
    releaseMeasurement()
  }, { flush: 'post' })
  watch(root, (theme, _, cleanup) => {
    if (theme) cleanup(observeReducedMotion(theme, reduced => { if (reduced) cancel() }))
  }, { flush: 'post' })
  onScopeDispose(() => {
    cancel()
    releaseMeasurement()
  })
}
