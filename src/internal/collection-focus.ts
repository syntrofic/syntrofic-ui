import { watch, type Ref } from 'vue'

export function canFocus(element: HTMLElement) {
  return !element.matches(':disabled, [aria-disabled="true"]')
    && !element.closest('[hidden], [inert], [aria-hidden="true"]')
    && element.getClientRects().length > 0
}

export function readFocusIndex(items: readonly HTMLElement[], target: EventTarget | null | undefined) {
  if (!(target instanceof Node)) return -1
  let match = -1
  for (const [index, item] of items.entries()) {
    if (item === target) return index
    if (item.contains(target) && (match < 0 || items[match].contains(item))) match = index
  }
  return match
}

export function isRtl(element: HTMLElement | null) {
  return element?.ownerDocument.defaultView?.getComputedStyle(element).direction === 'rtl'
}

export function focusRoving(root: Ref<HTMLElement | null>, enabled: () => boolean, items: () => HTMLElement[],
  targetFor: (item: HTMLElement) => HTMLElement | null, eligible: (item: HTMLElement) => boolean = canFocus) {
  const available = (item: HTMLElement, target: HTMLElement | null): target is HTMLElement => Boolean(target && eligible(item) && canFocus(target))
  let stamp: ((active?: HTMLElement) => void) | undefined
  watch(() => [root.value, enabled()] as const, ([node, active], _, cleanup) => {
    if (!node || !active) return
    const original = new Map<HTMLElement, string | null>()
    let current: HTMLElement | undefined
    let previousIndex = 0
    function restore(target: HTMLElement, value: string | null) {
      if (value === null) target.removeAttribute('tabindex')
      else target.setAttribute('tabindex', value)
    }
    function update(desired?: HTMLElement) {
      const candidates = items().map(item => ({ item, target: targetFor(item) }))
      const targets = [...new Set(candidates.flatMap(({ target }) => target ? [target] : []))]
      const enabledTargets = candidates.flatMap(({ item, target }) => available(item, target) ? [target] : [])
      const targetSet = new Set(targets)
      for (const [target, value] of original) {
        if (targetSet.has(target)) continue
        restore(target, value)
        original.delete(target)
      }
      const preferred = desired ?? current ?? enabledTargets.find(target => target.tabIndex === 0)
      current = preferred && enabledTargets.includes(preferred) ? preferred : enabledTargets[Math.min(previousIndex, enabledTargets.length - 1)]
      previousIndex = current ? enabledTargets.indexOf(current) : 0
      for (const target of targets) {
        if (!original.has(target)) original.set(target, target.getAttribute('tabindex'))
        const tabIndex = target === current ? '0' : '-1'
        if (target.getAttribute('tabindex') !== tabIndex) target.setAttribute('tabindex', tabIndex)
      }
    }
    stamp = update
    update()
    const Observer = node.ownerDocument.defaultView?.MutationObserver
    const observer = Observer ? new Observer(() => update()) : undefined
    observer?.observe(node, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['aria-disabled', 'aria-hidden', 'data-tree-disabled', 'disabled', 'hidden', 'inert', 'tabindex'] })
    cleanup(() => {
      stamp = undefined
      observer?.disconnect()
      for (const [target, value] of original) restore(target, value)
    })
  }, { flush: 'post', immediate: true })

  function focus(item?: HTMLElement) {
    if (!item) return false
    const destination = targetFor(item)
    if (!available(item, destination)) return false
    stamp?.(destination)
    destination.focus()
    return true
  }
  function handleFocus(event: FocusEvent) {
    if (!stamp) return
    const candidates = items()
    const owner = candidates[readFocusIndex(candidates, event.target)]
    const target = owner && targetFor(owner)
    if (owner && available(owner, target) && (target === event.target || event.target instanceof Node && target.contains(event.target))) stamp(target)
  }
  return { focus, handleFocus, canUse: (item: HTMLElement) => available(item, targetFor(item)) }
}

export function editable(target: EventTarget | null) {
  return target instanceof HTMLElement ? target.closest<HTMLElement>('textarea, input, [contenteditable]:not([contenteditable="false"])') : null
}

export function caretConsumesArrow(event: KeyboardEvent, previous: boolean) {
  const control = editable(event.target)
  if (!control) return false
  if (control.isContentEditable) return true
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return false
  if (control.selectionStart === null || control.selectionEnd === null) return false
  return control.selectionStart !== control.selectionEnd || (previous ? control.selectionStart > 0 : control.selectionEnd < control.value.length)
}
