import { shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import { canFocus, caretConsumesArrow, focusRoving, isRtl, readFocusIndex } from './collection-focus'

export interface ListFocusOptions {
  itemSelector?: string
  boundarySelector?: string
  wrap?: boolean
  onEscape?: () => void
  orientation?: 'horizontal' | 'vertical' | 'both'
  hasHomeEnd?: boolean
  hasPaging?: boolean
  hasRovingTabIndex?: boolean
  hasCaretGuard?: boolean
}

export function useListFocus(options: MaybeRefOrGetter<ListFocusOptions> = {}) {
  const listRef = shallowRef<HTMLElement | null>(null)
  function ownsEvent(event: Event) {
    const boundary = toValue(options).boundarySelector
    return !boundary || event.target instanceof Element && event.target.closest(boundary) === listRef.value
  }
  function getItems() {
    const root = listRef.value
    if (!root) return []
    const { itemSelector = '[role="menuitem"]', boundarySelector } = toValue(options)
    return [...root.querySelectorAll<HTMLElement>(itemSelector)].filter(item => !boundarySelector || item.closest(boundarySelector) === root)
  }
  const { focus, handleFocus } = focusRoving(listRef, () => Boolean(toValue(options).hasRovingTabIndex), getItems, item => item)
  const available = () => getItems().filter(canFocus)
  const focusFirst = () => focus(available()[0])
  const focusLast = () => focus(available().at(-1))

  function focusItem(index: number) {
    const items = getItems()
    return focus(items[Math.min(items.length - 1, Math.max(0, Math.trunc(index) || 0))])
  }
  function pageIndex(root: HTMLElement, items: HTMLElement[], current: number, step: number, horizontal: boolean) {
    const box = root.getBoundingClientRect()
    const viewStart = horizontal ? box.left + root.clientLeft : box.top + root.clientTop
    const extent = horizontal ? root.clientWidth : root.clientHeight
    const reverse = horizontal && isRtl(root)
    const edge = viewStart + extent
    const positions = items.map(item => {
      const bounds = item.getBoundingClientRect()
      const start = horizontal ? bounds.left : bounds.top
      const end = horizontal ? bounds.right : bounds.bottom
      return reverse ? { start: edge - end, end: edge - start } : { start: start - viewStart, end: end - viewStart }
    })
    const fullyVisible = positions.flatMap((position, index) => position.start >= -1 && position.end <= extent + 1 ? [index] : [])
    const near = step > 0 ? fullyVisible.at(-1) : fullyVisible[0]
    if (near !== undefined && (current < 0 || step * (near - current) > 0)) return near
    const beyond = current < 0 ? 0 : positions[current].start + step * extent
    let next = current < 0 ? 0 : current
    for (let index = next + step; index >= 0 && index < items.length; index += step) {
      next = index
      if (step * (positions[index].start - beyond) >= 0) break
    }
    return next
  }
  function handleKeyDown(event: KeyboardEvent) {
    const root = listRef.value
    if (!root || event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey || !ownsEvent(event)) return
    const { orientation = 'vertical', wrap = true, hasHomeEnd = true, hasPaging, onEscape, hasCaretGuard } = toValue(options)
    if (event.key === 'Escape' && onEscape) { event.preventDefault(); onEscape(); return }
    const items = available()
    if (!items.length) return
    const direction = isRtl(root) ? -1 : 1
    const step = orientation !== 'horizontal' && event.key === 'ArrowDown' ? 1 :
      orientation !== 'horizontal' && event.key === 'ArrowUp' ? -1 :
      orientation !== 'vertical' && event.key === 'ArrowRight' ? direction :
      orientation !== 'vertical' && event.key === 'ArrowLeft' ? -direction : 0
    const current = readFocusIndex(items, event.target)
    let next: number
    if (step) {
      if (hasCaretGuard && caretConsumesArrow(event, event.key === 'ArrowLeft' || event.key === 'ArrowUp')) return
      next = current < 0 ? (step < 0 ? items.length - 1 : 0) : current + step
      if (wrap) next = (next + items.length) % items.length
    } else if (hasHomeEnd && ['Home', 'End'].includes(event.key)) {
      next = event.key === 'Home' ? 0 : items.length - 1
    } else if (hasPaging && ['PageUp', 'PageDown'].includes(event.key)) {
      next = pageIndex(root, items, current, event.key === 'PageUp' ? -1 : 1, orientation === 'horizontal')
    } else return
    event.preventDefault()
    focus(items[Math.max(0, Math.min(items.length - 1, next))])
  }
  return { listRef, getItems, ownsEvent, handleKeyDown, handleFocus, focusItem, focusFirst, focusLast }
}
