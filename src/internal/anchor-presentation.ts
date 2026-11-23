import { onScopeDispose, shallowRef, watch, type Ref } from 'vue'
import { holdTouchInput } from './entrance-input'
import { createAnimator, prefersReducedMotion } from './motion'

type AnchorMotion = 'grow' | 'fade'
const rest = 'translate(0px, 0px) scale(1, 1)'

function triggerTransform(panel: HTMLElement, trigger: HTMLElement) {
  const wrapper = panel.closest('[data-reka-popper-content-wrapper]') ?? panel
  const target = wrapper.getBoundingClientRect()
  const source = trigger.getBoundingClientRect()
  if (!source.width || !source.height || !target.width || !target.height) return rest
  return `translate(${source.left - target.left}px, ${source.top - target.top}px) scale(${source.width / target.width}, ${source.height / target.height})`
}

export function isAnchorTouch(pointerType: string | undefined) {
  return pointerType === 'touch' || pointerType === 'pen'
}

/** Move the actual panel between the trigger and the collision-resolved rect.
 * The CSS exit lets Presence remove the closed layer after its last frame. */
export function useAnchorPresentation(open: Readonly<Ref<boolean | undefined>>, panel: Readonly<Ref<HTMLElement | null>>) {
  const mode = shallowRef<AnchorMotion>()
  const pending = shallowRef(false)
  let armed: HTMLElement | undefined
  let requested: HTMLElement | undefined
  let trigger: HTMLElement | undefined
  let entry: Animation | undefined
  let held: ReturnType<typeof holdTouchInput> | undefined
  let interrupt: { transform: string; opacity: string } | undefined

  function arm(node: HTMLElement) { armed = node }
  function accept() { requested = armed; armed = undefined }
  function disarm() { armed = requested = undefined }

  watch(open, showing => {
    const node = panel.value
    if (showing) {
      trigger = requested
      disarm()
      const view = trigger?.ownerDocument.defaultView
      const coarse = view?.matchMedia('(pointer: coarse)').matches ?? false
      const reduced = trigger && prefersReducedMotion(trigger)
      mode.value = view && (!reduced || coarse) ? reduced ? 'fade' : 'grow' : undefined
      pending.value = Boolean(mode.value)
      const style = node?.dataset.state === 'closed' && view?.getComputedStyle(node)
      interrupt = style ? { transform: style.transform, opacity: style.opacity } : undefined
      if (coarse && view && mode.value) held = holdTouchInput(view)
      return
    }
    if (node && trigger && mode.value) {
      const style = node.ownerDocument.defaultView?.getComputedStyle(node)
      if (style) {
        node.style.setProperty('--sy-anchor-exit-transform', style.transform)
        node.style.setProperty('--sy-anchor-exit-opacity', pending.value ? '0' : style.opacity)
      }
      node.style.setProperty('--sy-anchor-trigger-transform', trigger.isConnected ? triggerTransform(node, trigger) : rest)
    }
    pending.value = false
    disarm()
    entry?.cancel()
    entry = undefined
    held?.release()
    held = undefined
  }, { flush: 'sync' })

  watch([open, panel, mode], ([showing, node, motion], _, cleanup) => {
    const view = node?.ownerDocument.defaultView
    const anchor = trigger
    if (!showing || !node || !motion || !view || !anchor) return
    let frame = 0
    let attempts = 0
    const input = held
    function start() {
      if (!node || !view || !anchor) return
      // The floating wrapper parks the contents offscreen while it computes the side.
      if (node.style.animationName === 'none' && ++attempts < 8) {
        frame = view.requestAnimationFrame(start)
        return
      }
      if (!anchor.isConnected || typeof node.animate !== 'function' || attempts >= 8) {
        mode.value = undefined
        pending.value = false
        input?.release()
        return
      }
      const from = triggerTransform(node, anchor)
      const opacity = interrupt?.opacity ?? (motion === 'grow' ? .35 : 0)
      const keyframes = motion === 'grow'
        ? [{ transform: interrupt?.transform ?? from, opacity }, { transform: rest, opacity: 1 }]
        : [{ opacity }, { opacity: 1 }]
      interrupt = undefined
      entry = createAnimator(node).animate('anchor-presentation', keyframes, { role: 'enter', fill: 'backwards', reducedMotion: 'fade' })
      entry.finished.then(() => input?.release(), () => input?.release())
      pending.value = false
    }
    frame = view.requestAnimationFrame(start)
    cleanup(() => view.cancelAnimationFrame(frame))
  }, { flush: 'post' })

  onScopeDispose(() => { entry?.cancel(); held?.release() })
  return { mode, pending, arm, accept, disarm }
}
