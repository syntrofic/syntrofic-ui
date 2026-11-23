import { observeReducedMotion } from './reduced-motion'
import { createAnimator, glideOf, prefersReducedMotion, startLayoutCompanion } from './motion'

export function bindNavigationIndicator(track: HTMLElement, marker: HTMLElement) {
  const owner = track.ownerDocument.defaultView
  if (!owner) return
  const view = owner
  const animator = createAnimator(marker)
  const option = ':scope > .sy-navbar__desktop > li'
  let active: HTMLElement | null = null
  let frame = 0

  function follow() {
    if (frame) return
    frame = view.requestAnimationFrame(() => {
      frame = 0
      measure()
    })
  }

  function measure() {
    const target = track.querySelector<HTMLElement>(':scope > .sy-navbar__desktop [aria-current="page"]')
    if (!target?.getClientRects().length || !track.offsetWidth) {
      animator.cancel('selection')
      marker.removeAttribute('data-visible')
      active = null
      return
    }
    const bounds = track.getBoundingClientRect()
    const box = target.getBoundingClientRect()
    // Use the track's CSS coordinates when an ancestor is visually scaled.
    const style = view.getComputedStyle(track)
    const scaleX = bounds.width / (parseFloat(style.width) || track.offsetWidth) || 1
    const scaleY = bounds.height / (parseFloat(style.height) || track.offsetHeight) || 1
    const changing = active !== target
    const from = changing && active && !prefersReducedMotion(marker) ? marker.getBoundingClientRect() : undefined
    if (changing) animator.cancel('selection')
    active = target
    marker.style.setProperty('--sy-nav-x', (box.left - bounds.left) / scaleX + 'px')
    marker.style.setProperty('--sy-nav-y', (box.bottom - bounds.top) / scaleY + 'px')
    marker.style.setProperty('--sy-nav-width', box.width / scaleX + 'px')
    marker.setAttribute('data-visible', '')

    if (from?.width && typeof marker.animate === 'function') {
      const to = marker.getBoundingClientRect()
      if (to.width) {
        // Keep the destination attached to the live item while the offset settles.
        const shift = `${(from.left - to.left) / scaleX}px ${(from.top - to.top) / scaleY}px`
        const animation = animator.animate('selection', [
          { translate: shift, scale: from.width / to.width + ' 1' },
          { translate: '0px 0px', scale: '1 1' },
        ], { role: 'move', composite: 'add', fill: 'backwards' })
        startLayoutCompanion(marker, animation)
      }
    }
    if (glideOf(target) || glideOf(target.closest<HTMLElement>('li') ?? target)) follow()
  }

  const sizing = new view.ResizeObserver(measure)
  function observe() {
    sizing.disconnect()
    sizing.observe(track)
    for (const item of track.querySelectorAll(option)) sizing.observe(item)
    measure()
  }
  const content = new view.MutationObserver(records => records.some(record => record.type === 'childList') ? observe() : measure())
  content.observe(track, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current'] })
  const stopMotion = observeReducedMotion(track, reduced => { if (reduced) animator.cancel('selection') })
  observe()
  return {
    measure,
    dispose() {
      view.cancelAnimationFrame(frame)
      sizing.disconnect()
      content.disconnect()
      stopMotion()
      animator.dispose()
      marker.removeAttribute('data-visible')
    },
  }
}
