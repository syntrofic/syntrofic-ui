import { toValue, watch, type MaybeRefOrGetter } from 'vue'

import { observeResize } from './resize-observer'

export function useResizeGrabSpace(handle: MaybeRefOrGetter<HTMLElement | null>, options: () => {
  controls: string; axis: 'horizontal' | 'vertical'; position?: 'inline' | 'overlay'; closed?: boolean
}) {
  watch(() => {
    const { controls, axis, position, closed } = options()
    return [toValue(handle), controls, axis, position, closed] as const
  }, ([root, controls, axis, position, closed], _, cleanup) => {
    const document = root?.ownerDocument
    const view = document?.defaultView
    const pane = controls.split(/\s+/).map(id => document?.getElementById(id)).find(Boolean)
    if (!root || !pane || !view || pane === root || closed) return
    const measure = () => {
      const body = pane.getBoundingClientRect()
      const divider = root.getBoundingClientRect()
      const horizontal = axis === 'horizontal'
      const paneSize = horizontal ? body.width : body.height
      const cssSize = horizontal ? pane.offsetWidth : pane.offsetHeight
      if (!paneSize || !cssSize) { root.style.removeProperty('--sy-resize-grab-limit'); return }
      const centre = horizontal ? divider.x + divider.width / 2 : divider.y + divider.height / 2
      const paneCentre = (horizontal ? body.x : body.y) + paneSize / 2
      // Keep the grab zone out of the far half of the pane. A divider in
      // the normal flow can use a centred strip across the two regions.
      const limit = position === 'overlay' ? cssSize / 2
        : Math.min(cssSize, Math.abs(centre - paneCentre) * cssSize / paneSize * 2)
      const next = limit + 'px'
      if (root.style.getPropertyValue('--sy-resize-grab-limit') !== next) root.style.setProperty('--sy-resize-grab-limit', next)
    }
    measure()
    const stop = observeResize(pane, view, measure)
    const stopHandle = position === 'overlay' ? undefined : observeResize(root, view, measure)
    cleanup(() => {
      stop()
      stopHandle?.()
      root.style.removeProperty('--sy-resize-grab-limit')
    })
  }, { flush: 'post', immediate: true })
}
