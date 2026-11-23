import { shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import { canFocus, caretConsumesArrow, focusRoving, isRtl, readFocusIndex } from './collection-focus'

export interface GridFocusOptions {
  columns: number
  cellSelector?: string
  getFocusTarget?: (cell: HTMLElement) => HTMLElement | null
  isCellFocusable?: (cell: HTMLElement) => boolean
  onNavigateBefore?: (column: number, offset: number) => void
  onNavigateAfter?: (column: number, offset: number) => void
  onPageUp?: (event: KeyboardEvent) => void
  onPageDown?: (event: KeyboardEvent) => void
  hasRovingTabIndex?: boolean
}

export function useGridFocus(input: MaybeRefOrGetter<GridFocusOptions>) {
  const gridRef = shallowRef<HTMLElement | null>(null)
  const options = () => toValue(input)
  function cells() {
    const root = gridRef.value
    if (!root) return []
    const boundary = root.matches('[role="grid"]')
    return [...root.querySelectorAll<HTMLElement>(options().cellSelector ?? 'button, [tabindex]')]
      .filter(cell => !boundary || cell.closest('[role="grid"]') === root)
  }
  const { focus, handleFocus, canUse } = focusRoving(gridRef, () => Boolean(options().hasRovingTabIndex), cells,
    cell => options().getFocusTarget ? options().getFocusTarget!(cell) : cell,
    cell => canFocus(cell) && (options().isCellFocusable?.(cell) ?? true))
  const focusFirst = () => focus(cells().find(canUse))
  const focusLast = () => focus(cells().reverse().find(canUse))
  function focusCell(index: number) {
    const items = cells()
    return focus(items[Math.min(items.length - 1, Math.max(0, Math.trunc(index) || 0))])
  }
  function handleKeyDown(event: KeyboardEvent) {
    const root = gridRef.value
    if (!root || event.defaultPrevented || event.isComposing || event.altKey || event.metaKey
      || root.matches('[role="grid"]') && event.target instanceof Element && event.target.closest('[role="grid"]') !== root) return
    const settings = options()
    const width = Number.isFinite(settings.columns) ? Math.max(1, Math.trunc(settings.columns)) : 1
    const items = cells()
    if (!items.length) return
    const current = readFocusIndex(items, event.target)
    const column = Math.max(0, current) % width
    const row = Math.max(0, current) - column
    const logical = isRtl(root) ? -1 : 1
    const offset = event.key === 'ArrowDown' ? width : event.key === 'ArrowUp' ? -width :
      event.key === 'ArrowRight' ? logical : event.key === 'ArrowLeft' ? -logical : 0
    if (offset && !event.ctrlKey) {
      if (caretConsumesArrow(event, event.key === 'ArrowLeft' || event.key === 'ArrowUp')) return
      event.preventDefault()
      if (current < 0) { (offset > 0 ? focusFirst : focusLast)(); return }
      let next = current + offset
      while (next >= 0 && next < items.length) {
        if (focus(items[next])) return
        next += offset
      }
      if (next < 0) settings.onNavigateBefore?.(column, Math.abs(offset))
      else settings.onNavigateAfter?.(column, Math.abs(offset))
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const edge = event.key === 'Home'
      if (event.ctrlKey || current < 0) (edge ? focusFirst : focusLast)()
      else {
        const rowCells = items.slice(row, row + width)
        focus(edge ? rowCells.find(canUse) : rowCells.reverse().find(canUse))
      }
      return
    }
    const onPage = event.key === 'PageUp' ? settings.onPageUp : event.key === 'PageDown' ? settings.onPageDown : undefined
    if (onPage) { event.preventDefault(); onPage(event) }
  }
  return { gridRef, handleKeyDown, handleFocus, focusCell, focusFirst, focusLast }
}
