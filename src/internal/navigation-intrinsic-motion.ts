import { observeReducedMotion, prefersReducedMotion } from './reduced-motion'
import { createAnimator, startLayoutCompanion } from './motion'
import { observeResize } from './resize-observer'

const linkSelector = '.sy-navbar__desktop > li > .sy-navigation-link'
const events = ['pointerover', 'pointerout', 'pointerdown', 'pointerup', 'pointercancel', 'focusin', 'focusout', 'keydown', 'keyup']

interface LinkHeight {
  value: string
  shown: number
  effect?: Animation
  stop: () => void
}

export function observeNavigationHeight(track: HTMLElement) {
  const owner = track.ownerDocument.defaultView
  if (!owner || owner.CSS.supports('interpolate-size', 'allow-keywords')) return
  const view = owner
  const links = new Map<HTMLElement, LinkHeight>()
  let frame = 0

  function measure() {
    for (const [link, state] of links) {
      const style = view.getComputedStyle(link)
      const value = style.getPropertyValue('--sy-navigation-item-height').trim()
      const shown = parseFloat(style.height)
      const enabled = style.getPropertyValue('--sy-navigation-item-height-motion').trim() === 'enabled'
      const previous = state.effect ? shown : state.shown
      const changed = state.value !== value
      state.value = value
      state.shown = shown
      if (!enabled || prefersReducedMotion(link)) {
        state.effect?.cancel()
        continue
      }
      if (!changed || !link.getClientRects().length || typeof link.animate !== 'function') continue
      const hasMotion = link.getAnimations().some(animation => animation.id === 'sy-navigation-layout'
        || 'transitionProperty' in animation && ['height', 'block-size'].includes(String(animation.transitionProperty)))
      if (hasMotion) continue
      state.effect?.cancel()
      const target = parseFloat(view.getComputedStyle(link).height)
      if (!Number.isFinite(previous) || !Number.isFinite(target) || Math.abs(target - previous) < .25) continue
      const effect = startLayoutCompanion(link, createAnimator(link).animate('navigation-height', [
        { height: previous + 'px' }, { height: target + 'px' },
      ], { id: 'sy-navigation-height', role: 'move', fill: 'backwards' }))
      state.effect = effect
      state.shown = previous
      const release = () => { if (state.effect === effect) state.effect = undefined }
      effect.finished.then(release, release)
    }
  }
  function schedule() {
    if (frame) return
    frame = view.requestAnimationFrame(() => {
      frame = 0
      measure()
    })
  }
  function reconcile() {
    const current = new Set(track.querySelectorAll<HTMLElement>(linkSelector))
    for (const [link, state] of links) {
      if (current.has(link)) continue
      state.effect?.cancel()
      state.stop()
      links.delete(link)
    }
    for (const link of current) {
      if (links.has(link)) continue
      const style = view.getComputedStyle(link)
      links.set(link, {
        value: style.getPropertyValue('--sy-navigation-item-height').trim(), shown: parseFloat(style.height),
        stop: observeResize(link, view, measure),
      })
    }
    schedule()
  }
  const mutations = new view.MutationObserver(reconcile)
  mutations.observe(track, { childList: true, subtree: true, attributes: true,
    attributeFilter: ['aria-current', 'aria-disabled', 'disabled', 'data-disabled', 'data-sy-press'] })
  for (const event of events) track.addEventListener(event, schedule, true)
  const stopMotion = observeReducedMotion(track, schedule)
  reconcile()
  return () => {
    view.cancelAnimationFrame(frame)
    mutations.disconnect()
    for (const event of events) track.removeEventListener(event, schedule, true)
    stopMotion()
    for (const state of links.values()) {
      state.effect?.cancel()
      state.stop()
    }
  }
}
