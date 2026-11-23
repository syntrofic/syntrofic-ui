export function isAppleKeyboard(owner?: Document | null) {
  return /Mac|iPod|iPhone|iPad/.test(owner?.defaultView?.navigator.platform ?? '')
}

export function matchesShortcut(event: KeyboardEvent, shortcut: string | false, owner: Document) {
  if (!shortcut || event.defaultPrevented || event.repeat || event.isComposing) return false
  const tokens = shortcut.toLowerCase().split('+').map(part => part.trim())
  const key = tokens.pop()
  const apple = isAppleKeyboard(owner)
  const mod = tokens.includes('mod')
  return event.key.toLowerCase() === key &&
    event.metaKey === (tokens.includes('meta') || (mod && apple)) &&
    event.ctrlKey === (tokens.includes('ctrl') || (mod && !apple)) &&
    event.shiftKey === tokens.includes('shift') &&
    event.altKey === tokens.includes('alt')
}
