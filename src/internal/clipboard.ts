function copySelection(text: string, document: Document) {
  const selection = document.getSelection()
  const selected = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : []
  const focused = document.activeElement
  const field = document.createElement('textarea')
  field.value = text
  field.readOnly = true
  field.style.cssText = 'position:fixed;inset:0 auto auto 0;width:1px;height:1px;opacity:0;pointer-events:none'
  const container = focused?.closest('dialog[open]') ?? document.body
  container.appendChild(field)
  field.select()
  try {
    if (!document.execCommand('copy')) throw new Error('Clipboard is unavailable')
  } finally {
    field.remove()
    if (focused && 'focus' in focused) (focused as HTMLElement).focus({ preventScroll: true })
    if (selection && selected.length) {
      selection.removeAllRanges()
      for (const range of selected) selection.addRange(range)
    }
  }
}

export async function writeClipboard(text: string, document: Document) {
  const clipboard = document.defaultView?.navigator.clipboard
  if (typeof clipboard?.writeText === 'function') {
    try {
      await clipboard.writeText(text)
      return
    } catch {
      // Some browsers expose the Clipboard API without granting write access.
    }
  }
  copySelection(text, document)
}
