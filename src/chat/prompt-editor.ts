import { normalizePromptSegments, promptText, promptTokenAttributes, type PromptSegment, type PromptTokenSegment } from './prompt-tokens'

function asToken(node: ChildNode): PromptTokenSegment | undefined {
  if (node.nodeType !== 1) return
  const element = node as HTMLElement
  const id = element.dataset.promptTokenId
  const value = element.dataset.promptTokenValue
  if (id === undefined || value === undefined) return
  return { type: 'token', id, value, label: element.dataset.promptTokenLabel, expandedText: element.dataset.promptTokenExpanded }
}

export function writePromptEditor(editor: HTMLElement, segments: readonly PromptSegment[]) {
  const document = editor.ownerDocument
  const fragment = document.createDocumentFragment()
  for (const segment of segments) {
    if (segment.type === 'text') {
      fragment.append(document.createTextNode(segment.text))
      continue
    }
    const chip = document.createElement('span')
    chip.className = 'sy-prompt-input__token'
    chip.contentEditable = 'false'
    for (const [name, value] of Object.entries(promptTokenAttributes(segment))) {
      if (value !== undefined) chip.setAttribute(name, value)
    }
    chip.textContent = segment.label || segment.value
    fragment.append(chip)
  }
  if (segments.at(-1)?.type === 'text' && promptText(segments).endsWith('\n')) {
    const caretSpace = document.createElement('br')
    caretSpace.dataset.promptCaretSpace = ''
    fragment.append(caretSpace)
  }
  editor.replaceChildren(fragment)
}

export function readPromptEditor(editor: HTMLElement | DocumentFragment) {
  const pieces: PromptSegment[] = []
  function read(node: ChildNode) {
    if (node.nodeType === 3) {
      pieces.push({ type: 'text', text: node.textContent ?? '' })
      return
    }
    if (node.nodeType !== 1) return
    const element = node as HTMLElement
    const token = asToken(node)
    if (token) {
      pieces.push(token)
      return
    }
    if (element.tagName === 'BR') {
      if (element.dataset.promptCaretSpace === undefined && (element.parentNode !== editor || editor.childNodes.length > 1)) {
        pieces.push({ type: 'text', text: '\n' })
      }
      return
    }
    if ((element.tagName === 'DIV' || element.tagName === 'P') && pieces.length) {
      const previous = pieces.at(-1)
      if (previous?.type !== 'text' || !previous.text.endsWith('\n')) pieces.push({ type: 'text', text: '\n' })
    }
    element.childNodes.forEach(read)
  }
  editor.childNodes.forEach(read)
  return normalizePromptSegments(pieces)
}

function offset(editor: HTMLElement, node: Node, position: number) {
  const prefix = editor.ownerDocument.createRange()
  prefix.selectNodeContents(editor)
  prefix.setEnd(node, position)
  return promptText(readPromptEditor(prefix.cloneContents())).length
}

export function promptEditorSelection(editor: HTMLElement) {
  const selection = editor.ownerDocument.getSelection()
  if (!selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return
  const start = offset(editor, range.startContainer, range.startOffset)
  const end = range.collapsed ? start : offset(editor, range.endContainer, range.endOffset)
  return { start, end }
}

export function setPromptEditorCaret(editor: HTMLElement, offset: number) {
  const selection = editor.ownerDocument.getSelection()
  if (!selection) return
  const range = editor.ownerDocument.createRange()
  let consumed = 0
  for (const [index, node] of Array.from(editor.childNodes).entries()) {
    const token = asToken(node)
    const width = node.nodeType === 3 ? node.textContent?.length ?? 0 : token?.value.length ?? 0
    if (offset <= consumed + width) {
      if (node.nodeType === 3) range.setStart(node, Math.max(0, offset - consumed))
      else range.setStart(editor, offset <= consumed ? index : index + 1)
      break
    }
    consumed += width
  }
  if (!editor.contains(range.startContainer)) range.setStart(editor, editor.childNodes.length)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

export function promptCaretRect(editor: HTMLElement) {
  const selection = editor.ownerDocument.getSelection()
  if (!selection?.rangeCount || !selection.isCollapsed || !editor.contains(selection.anchorNode)) return
  const range = selection.getRangeAt(0)
  const rect = range.getClientRects()[0]
  if (rect?.height) return rect
  if (range.startContainer.nodeType === 3 && range.startOffset > 0) {
    const preceding = range.cloneRange()
    preceding.setStart(range.startContainer, range.startOffset - 1)
    const last = preceding.getClientRects()[0]
    if (last?.height) {
      const rightToLeft = editor.ownerDocument.defaultView?.getComputedStyle(editor).direction === 'rtl'
      return new DOMRect(rightToLeft ? last.left : last.right, last.top, 0, last.height)
    }
  }
  return editor.getBoundingClientRect()
}
