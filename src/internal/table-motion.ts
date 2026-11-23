import type { Ref } from 'vue'
import type { TableKey } from '../types'
import { holdLayoutSwap } from './layout-content'
import { useCollectionContentMotion } from './collection-motion'

const noRows: readonly TableKey[] = []
const tableRows = (body: HTMLElement) => Array.from((body as HTMLTableSectionElement).rows)

export function useTableContentMotion(frame: Ref<HTMLElement | null>, state: () => string, keys: () => readonly TableKey[],
  windowed: () => boolean, animateItems?: () => boolean) {
  function capture(body: HTMLElement, viewport: HTMLElement) {
    if (windowed() || !body.parentElement) return
    const bounds = viewport.getBoundingClientRect()
    if (bounds.bottom <= 0 || bounds.top >= (viewport.ownerDocument.defaultView?.innerHeight ?? Infinity)) return
    const snapshot = holdLayoutSwap(body.parentElement, viewport)
    if (snapshot) snapshot.copy.style.opacity = getComputedStyle(body).opacity
    return snapshot
  }

  useCollectionContentMotion(frame, state, {
    items: () => windowed() ? noRows : keys(),
    content: viewport => viewport.querySelector(':scope > .sy-table__grid:not([data-layout-swap-copy]) > tbody'),
    itemRows: tableRows,
    animateItems,
    clip: false,
    blockSize(viewport) {
      if (windowed()) return
      const height = viewport.ownerDocument.defaultView?.innerHeight ?? Infinity
      return Math.min(parseFloat(getComputedStyle(viewport).blockSize), Math.max(0, height - viewport.getBoundingClientRect().top))
    },
    capture,
    captureLeaving(body, viewport, indices) {
      const bounds = viewport.getBoundingClientRect()
      const bottom = Math.min(bounds.bottom, viewport.ownerDocument.defaultView?.innerHeight ?? Infinity)
      const top = Math.max(0, bounds.top)
      const originals = tableRows(body)
      const visible = new Set(indices.filter(index => {
        const rect = originals[index]?.getBoundingClientRect()
        return rect && rect.bottom > top && rect.top < bottom
      }))
      if (!visible.size) return
      const snapshot = capture(body, viewport)
      const copyBody = snapshot?.copy.querySelector('tbody')
      if (copyBody) {
        for (const [index, row] of Array.from(copyBody.rows).entries()) {
          if (!visible.has(index)) { row.style.opacity = '0'; continue }
          const style = getComputedStyle(originals[index])
          row.style.translate = style.translate
          row.style.opacity = style.opacity
        }
      }
      return snapshot
    },
  })
}
