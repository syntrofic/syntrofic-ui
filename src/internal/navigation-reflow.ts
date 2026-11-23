import { observeReducedMotion, prefersReducedMotion } from './reduced-motion'
import { createAnimator, startLayoutCompanion } from './motion'
import { observeResize } from './resize-observer'

interface Position { x: number; y: number }
interface RegionMotion { effect: Animation; displacement: Position }

export function observeNavigationReflow(navbar: HTMLElement, bar: HTMLElement,
  regions: Readonly<{ start: HTMLElement | null; center: HTMLElement | null; end: HTMLElement | null }>) {
  const owner = navbar.ownerDocument.defaultView
  if (!owner || typeof navbar.animate !== 'function') return
  const view = owner
  const parts = Object.entries(regions).flatMap(([alignment, element]) => element ? [{ alignment, element }] : [])
  const effects = new Map<HTMLElement, RegionMotion>()
  let heightEffect: Animation | undefined
  let previous: { rows: string; height: number; positions: (Position | null)[] } | undefined
  let frame = 0

  function cancel() {
    for (const { effect } of effects.values()) effect.cancel()
    effects.clear()
    heightEffect?.cancel()
    heightEffect = undefined
  }

  function measure() {
    if (!bar.offsetWidth) {
      cancel()
      previous = undefined
      return
    }
    const rtl = view.getComputedStyle(bar).direction === 'rtl'
    const boxes = parts.map(({ alignment, element }) => {
      const { offsetLeft: left, offsetTop: top, offsetWidth: width, offsetHeight: height } = element
      const x = left + (alignment === 'center' ? width / 2 : rtl !== (alignment === 'end') ? width : 0)
      return height ? { x, y: top, bottom: top + height } : null
    })
    // Compare the regions vertically so a centered second line can follow both edge regions.
    const rows = boxes.map((box, index) => box ? boxes.slice(index + 1).map(other => !other ? 'x'
      : box.bottom <= other.y ? '<' : other.bottom <= box.y ? '>' : '=').join('') : 'x').join(',')
    const positions: (Position | null)[] = boxes
    const before = previous
    const reduced = prefersReducedMotion(navbar)
    if (reduced || !before || before.rows === rows) {
      if (reduced) cancel()
      previous = { rows, positions, height: heightEffect && before ? before.height : navbar.getBoundingClientRect().height }
      return
    }
    // Offsets describe the new flex lines even while the previous translation is still playing.
    const painted = before.positions.map((position, index) => {
      if (!position) return null
      const motion = effects.get(parts[index]!.element)
      const remaining = 1 - (motion?.effect.effect?.getComputedTiming().progress ?? 0)
      return { x: position.x + (motion?.displacement.x ?? 0) * remaining, y: position.y + (motion?.displacement.y ?? 0) * remaining }
    })
    const fromHeight = heightEffect ? navbar.getBoundingClientRect().height : before.height
    cancel()
    const height = navbar.getBoundingClientRect().height
    previous = { rows, positions, height }

    for (const [index, { element: part }] of parts.entries()) {
      const from = painted[index]
      const to = positions[index]
      if (!to) continue
      const displacement = from ? { x: from.x - to.x, y: from.y - to.y } : { x: 0, y: 4 }
      if (from && Math.abs(displacement.x) + Math.abs(displacement.y) < 1) continue
      const effect = startLayoutCompanion(part, createAnimator(part).animate('navbar-reflow', [
        { translate: `${displacement.x}px ${displacement.y}px`, ...(from ? {} : { opacity: .35 }) },
        { translate: '0px 0px', ...(from ? {} : { opacity: 1 }) },
      ], { id: 'sy-navbar-reflow', role: 'move', composite: 'add', fill: 'backwards' }))
      effects.set(part, { effect, displacement })
      const release = () => { if (effects.get(part)?.effect === effect) effects.delete(part) }
      effect.finished.then(release, release)
    }
    if (Math.abs(height - fromHeight) < .5) return
    const effect = startLayoutCompanion(navbar, createAnimator(navbar).animate('navbar-height', [
      { blockSize: fromHeight + 'px' }, { blockSize: height + 'px' },
    ], { id: 'sy-navbar-reflow-height', role: 'move', fill: 'backwards' }))
    heightEffect = effect
    const release = () => { if (heightEffect === effect) heightEffect = undefined }
    effect.finished.then(release, release)
  }

  const stopMotion = observeReducedMotion(navbar, measure)
  function schedule() {
    if (frame) return
    // The height animation changes the navbar's observed size.
    frame = view.requestAnimationFrame(() => {
      frame = 0
      measure()
    })
  }
  const stops = [observeResize(bar, view, schedule), ...parts.map(({ element }) => observeResize(element, view, schedule))]
  return () => {
    view.cancelAnimationFrame(frame)
    cancel()
    for (const stop of stops) stop()
    stopMotion()
  }
}
