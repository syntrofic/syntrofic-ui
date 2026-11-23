import { parentAcrossShadow } from './focus-order'
import { keyboardMotion, type KeyboardViewport } from './keyboard-inset'
import { createAnimator, prefersReducedMotion } from './motion'

const positionProperties = /^(?:(?:min|max)-)?(?:inset.*|top|bottom|transform|translate|height|block-size)$/
const lift = (offset: number) => `0px ${-offset}px`

function appMoves(node: HTMLElement, ride?: Animation) {
  return node.getAnimations?.().some(animation => {
    if (animation === ride || animation.playState !== 'running') return false
    if ('transitionProperty' in animation) return positionProperties.test(String(animation.transitionProperty))
    const effect = animation.effect as KeyframeEffect | null
    return effect?.getKeyframes?.().some(frame => Object.keys(frame).some(property =>
      positionProperties.test(property.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())))) ?? false
  }) ?? false
}

export function createKeyboardDock(view: Window) {
  let active: { node: HTMLElement; motion: Animation; offset: number } | undefined
  const resting = new Map<HTMLElement, Animation>()

  function release(animate = true) {
    if (!active) return
    const { node, motion, offset } = active
    active = undefined
    motion.cancel()
    if (!animate || !node.isConnected || prefersReducedMotion(node)) return
    const animator = createAnimator(node)
    const settling = animator.animate('keyboard-dock', [{ translate: lift(offset) }, { translate: lift(0) }], {
      ...keyboardMotion.ios.hide, role: 'move', scaleTempo: false,
    })
    resting.set(node, settling)
    const finish = () => { if (resting.get(node) === settling) resting.delete(node) }
    settling.finished.then(finish, finish)
  }

  function follow(field: Element, report: KeyboardViewport, clearance: number) {
    let fixed: HTMLElement | undefined
    for (let node = parentAcrossShadow(field); node; node = parentAcrossShadow(node)) {
      if (node.matches('dialog[open], [role="dialog"][aria-modal="true"]')) break
      if (view.getComputedStyle(node).position === 'fixed') { fixed = node as HTMLElement; break }
    }
    if (active?.node !== fixed) release()
    if (!fixed || typeof fixed.animate !== 'function') return
    resting.get(fixed)?.cancel()
    const style = view.getComputedStyle(fixed)
    const ride = active?.node === fixed ? active : undefined
    if ((!ride && style.translate && style.translate !== 'none') || appMoves(fixed, ride?.motion)) { release(false); return }
    const box = fixed.getBoundingClientRect()
    const authored = style.transform === 'none' ? 0 : new DOMMatrixReadOnly(style.transform).m42
    const viewportHeight = view.document.documentElement.clientHeight
    const unshiftedBottom = box.bottom + (ride?.offset ?? 0)
    const docked = Math.abs(viewportHeight - (unshiftedBottom - authored)) <= 2
    const offset = Math.max(0, unshiftedBottom - report.bottom + clearance)
    if (!docked || !offset || box.height + clearance * 2 > report.bottom - report.top) { release(false); return }
    if (ride) {
      if (Math.abs(ride.offset - offset) <= .25) return
      const effect = ride.motion.effect as KeyframeEffect
      effect.setKeyframes([{ translate: lift(offset) }])
      ride.offset = offset
      return
    }
    // Hold the measured position without starting an author CSS transition on every keyboard frame.
    const motion = fixed.animate([{ translate: lift(offset) }], { duration: 1, fill: 'both' })
    motion.finish()
    active = { node: fixed, motion, offset }
  }

  return {
    follow,
    release,
    dispose() {
      release(false)
      for (const motion of resting.values()) motion.cancel()
      resting.clear()
    },
  }
}
