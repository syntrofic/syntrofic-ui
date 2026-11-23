import { shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import { canFocus, editable, focusRoving, isRtl } from './collection-focus'
import { useTypeahead } from './typeahead'

export interface TreeFocusOptions {
  itemSelector?: string
  isItemDisabled?: (item: HTMLElement) => boolean
  getLevel?: (item: HTMLElement) => number
  getItemId?: (item: HTMLElement) => string | undefined
  getItemLabel?: (item: HTMLElement) => string
  onToggleExpand?: (id: string) => void
  onActivate?: (item: HTMLElement, id: string | undefined) => boolean | void
  onActiveChange?: (id: string | undefined) => void
  hasRovingTabIndex?: boolean
  typeahead?: boolean
}

function labelOf(item: HTMLElement) {
  const aria = item.getAttribute('aria-label')
  if (aria) return aria
  const labelledBy = item.getAttribute('aria-labelledby')?.trim().split(/\s+/)
  if (labelledBy?.length) {
    const label = labelledBy.map(id => item.ownerDocument.getElementById(id)?.textContent).join(' ').trim()
    if (label) return label
  }
  return [...item.childNodes].flatMap(child => child instanceof Element && child.matches('[role="group"],[role="treeitem"],[aria-hidden="true"]')
    ? [] : [child.textContent ?? '']).join('').trim()
}

export function useTreeFocus(input: MaybeRefOrGetter<TreeFocusOptions> = {}) {
  const treeRef = shallowRef<HTMLElement | null>(null)
  const options = () => toValue(input)
  const selector = () => options().itemSelector ?? '[role="treeitem"]'
  function owner(target: EventTarget | null | undefined) {
    return target instanceof Element ? target.closest<HTMLElement>(selector()) : null
  }
  function items() {
    const root = treeRef.value
    if (!root) return []
    return [...root.querySelectorAll<HTMLElement>(selector())]
      .filter(item => !root.matches('[role="tree"]') || item.closest('[role="tree"]') === root)
  }
  function enabled(item: HTMLElement) {
    const custom = options().isItemDisabled
    return canFocus(item) && !(custom ? custom(item) : item.hasAttribute('data-tree-disabled'))
  }
  const level = (item: HTMLElement) => options().getLevel?.(item) ?? (Number(item.getAttribute('aria-level')) || 1)
  const id = (item: HTMLElement) => options().getItemId ? options().getItemId!(item) : item.dataset.treeId
  const { focus, handleFocus } = focusRoving(treeRef, () => Boolean(options().hasRovingTabIndex), items, item => item, enabled)

  function focusAt(item?: HTMLElement) {
    if (item && focus(item)) options().onActiveChange?.(id(item))
  }
  const focusFirst = () => focusAt(items().find(enabled))
  const focusLast = () => focusAt(items().reverse().find(enabled))
  let typedItems: HTMLElement[] = []
  const ahead = useTypeahead(() => ({
    getItemLabels: () => typedItems.map(item => options().getItemLabel?.(item) ?? labelOf(item)),
    getCurrentIndex: () => typedItems.indexOf(owner(treeRef.value?.ownerDocument.activeElement)!),
    isDisabled: index => !enabled(typedItems[index]),
    onMatch: index => focusAt(typedItems[index]),
  }))

  function handleKeyDown(event: KeyboardEvent) {
    const root = treeRef.value
    if (!root || event.defaultPrevented || event.isComposing || editable(event.target)
      || (root.matches('[role="tree"]') && event.target instanceof Element && event.target.closest('[role="tree"]') !== root)) return
    const list = items()
    if (options().typeahead !== false) {
      typedItems = list
      const consumed = ahead.onKeyDown(event)
      typedItems = []
      if (consumed) return
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const current = owner(event.target)
    const index = current ? list.indexOf(current) : -1
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      if (event.key === 'Home') focusFirst()
      else focusLast()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const candidates = event.key === 'ArrowDown' ? list.slice(index + 1) : list.slice(0, index < 0 ? list.length : index).reverse()
      focusAt(candidates.find(enabled))
      return
    }
    if (!current || index < 0 || !enabled(current)) return
    const identity = id(current)
    const expanded = current.getAttribute('aria-expanded')
    const levelNow = level(current)
    const toggle = () => { if (identity !== undefined) options().onToggleExpand?.(identity) }
    const rtl = isRtl(root)
    if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
      event.preventDefault()
      if (expanded === 'false') toggle()
      else if (expanded === 'true') {
        for (const child of list.slice(index + 1)) {
          const nextLevel = level(child)
          if (nextLevel <= levelNow) break
          if (nextLevel === levelNow + 1 && enabled(child)) { focusAt(child); break }
        }
      }
    } else if (event.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) {
      event.preventDefault()
      if (expanded === 'true') toggle()
      else focusAt(list.slice(0, index).reverse().find(item => level(item) < levelNow && enabled(item)))
    } else if (event.key === 'Enter' || event.key === ' ') {
      const activate = options().onActivate
      if (!activate && expanded === null) return
      event.preventDefault()
      if (!activate?.(current, identity) && expanded !== null) toggle()
    }
  }
  return { treeRef, handleKeyDown, handleFocus, focusFirst, focusLast }
}
