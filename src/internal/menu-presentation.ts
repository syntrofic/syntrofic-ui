import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMediaQuery } from './interaction'

export type MenuPresentation = 'popover' | 'bottom-sheet' | 'adaptive'

export function useMenuPresentation(presentation: MaybeRefOrGetter<MenuPresentation>, open: MaybeRefOrGetter<boolean>) {
  const compactTouch = useMediaQuery('(max-width: 639px) and (pointer: coarse) and (hover: none)')
  return computed<'popover' | 'bottom-sheet'>(previous => {
    if (previous && toValue(open)) return previous
    const requested = toValue(presentation)
    if (requested !== 'adaptive') return requested
    return compactTouch.value ? 'bottom-sheet' : 'popover'
  })
}

export function toggleMenuSelection(selected: readonly string[], id: string, checked: boolean) {
  if (checked) return [...new Set([...selected, id])]
  return selected.filter(value => value !== id)
}

export function replaceMenuSelection(selected: readonly string[], items: readonly { id: string }[], id: string) {
  const group = new Set(items.map(item => item.id))
  return [...selected.filter(value => !group.has(value)), id]
}
