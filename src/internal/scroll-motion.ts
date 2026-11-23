import { prefersReducedMotion } from './motion'
import { scrollMotion, solveDecay } from './motion-physics'

export function createScrollMotion(node: HTMLElement) {
  const view = node.ownerDocument.defaultView
  let frame = 0
  let finished: (() => void) | undefined
  function cancel() {
    if (frame) view?.cancelAnimationFrame(frame)
    frame = 0
    const notify = finished
    finished = undefined
    notify?.()
  }
  function move(horizontal: boolean, position: number) {
    node.scrollTo(horizontal ? { left: position, behavior: 'instant' } : { top: position, behavior: 'instant' })
  }
  function animate(horizontal: boolean, curve: ReturnType<typeof solveDecay>, end: number, maximum: number) {
    if (!view) return
    const startTime = view.performance.now()
    const duration = Math.min(maximum, curve.settleTime(.5))
    function advance(now: number) {
      const time = (now - startTime) / 1000
      if (time >= duration) {
        move(horizontal, end)
        cancel()
      } else {
        move(horizontal, curve.value(time))
        frame = view!.requestAnimationFrame(advance)
      }
    }
    frame = view.requestAnimationFrame(advance)
  }
  function easeTo(horizontal: boolean, end: number, done?: () => void) {
    const start = horizontal ? node.scrollLeft : node.scrollTop
    if (!view || start === end || prefersReducedMotion(node)) {
      if (start !== end) move(horizontal, end)
      done?.()
      return
    }
    finished = done
    const rate = scrollMotion.toStartRate
    animate(horizontal, solveDecay({ from: start, velocity: (start - end) * 1000 * Math.log(rate), rate }), end, 1.6)
  }
  function scrollToStart(axis: 'block' | 'inline' = 'block') {
    cancel()
    if (!view) return
    const writing = view.getComputedStyle(node).writingMode
    const verticalWriting = /^(vertical|sideways)/.test(writing)
    const horizontal = verticalWriting === (axis === 'block')
    easeTo(horizontal, 0)
  }
  function coast(velocity: number, axis: 'x' | 'y') {
    cancel()
    if (!Number.isFinite(velocity) || Math.abs(velocity) < 20) return
    const horizontal = axis === 'x'
    const from = horizontal ? node.scrollLeft : node.scrollTop
    const curve = solveDecay({ from, velocity })
    const extent = horizontal ? node.scrollWidth - node.clientWidth : node.scrollHeight - node.clientHeight
    const reversed = horizontal && node.matches(':dir(rtl)')
    const end = reversed ? Math.max(-extent, Math.min(0, curve.rest)) : Math.max(0, Math.min(extent, curve.rest))
    const cap = curve.timeToReach(end) ?? 1.4
    animate(horizontal, curve, end, Math.min(cap, 1.4))
  }
  function onKey(event: KeyboardEvent) {
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageDown', 'PageUp', ' '].includes(event.key)) cancel()
  }
  node.addEventListener('pointerdown', cancel, { passive: true })
  node.addEventListener('wheel', cancel, { passive: true })
  node.addEventListener('keydown', onKey)
  return {
    scrollToStart,
    scrollBack(top: number, done: () => void) {
      cancel()
      easeTo(false, top, done)
    },
    coast,
    dispose() {
      cancel()
      node.removeEventListener('pointerdown', cancel)
      node.removeEventListener('wheel', cancel)
      node.removeEventListener('keydown', onKey)
    },
  }
}
