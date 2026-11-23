import type { ChainedCommands, Editor, JSONContent } from '@tiptap/core'

export const richTextMessages = {
  toolbar: 'Formatting', selection: 'Selection formatting', insert: 'Insert block', blockStyle: 'Block style',
  paragraph: 'Paragraph', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
  bullets: 'Bullet list', numbers: 'Numbered list', quote: 'Quote', codeBlock: 'Code block',
  bold: 'Bold', italic: 'Italic', underline: 'Underline', strike: 'Strike', code: 'Inline code',
  undo: 'Undo', redo: 'Redo', clear: 'Clear formatting', clearContent: 'Clear content',
  link: 'Link', url: 'Link URL', apply: 'Apply', unlink: 'Remove link', invalidUrl: 'Enter a valid URL.',
  suggestions: 'Insert a block', noSuggestions: 'No matching blocks', words: 'words', characters: 'characters',
}
export type RichTextMessages = typeof richTextMessages
export type RichTextDocument = JSONContent
export interface RichTextDetails {
  html: string
  text: string
  empty: boolean
  characters: number
  words: number
}
export interface RichTextSuggestion {
  id: string
  label: string
  keywords?: readonly string[]
  run: (editor: Editor) => void
}
export const marks = ['bold', 'italic', 'underline', 'strike', 'code'] as const
export const actions = ['undo', 'redo', 'clear', 'clearContent'] as const
export const blockStyles = ['paragraph', 'h1', 'h2', 'h3', 'bullets', 'numbers', 'quote', 'codeBlock'] as const
export type RichTextAction = typeof marks[number] | typeof actions[number] | typeof blockStyles[number]

export const editorCommands: Record<RichTextAction, (chain: ChainedCommands) => ChainedCommands> = {
  bold: chain => chain.toggleBold(),
  italic: chain => chain.toggleItalic(),
  underline: chain => chain.toggleUnderline(),
  strike: chain => chain.toggleStrike(),
  code: chain => chain.toggleCode(),
  undo: chain => chain.undo(),
  redo: chain => chain.redo(),
  clear: chain => chain.unsetAllMarks().clearNodes(),
  clearContent: chain => chain.clearContent(),
  paragraph: chain => chain.clearNodes().setParagraph(),
  h1: chain => chain.setHeading({ level: 1 }),
  h2: chain => chain.setHeading({ level: 2 }),
  h3: chain => chain.setHeading({ level: 3 }),
  bullets: chain => chain.toggleBulletList(),
  numbers: chain => chain.toggleOrderedList(),
  quote: chain => chain.toggleBlockquote(),
  codeBlock: chain => chain.toggleCodeBlock(),
}

export function currentBlock(editor?: Editor): typeof blockStyles[number] {
  if (editor?.isActive('heading', { level: 1 })) return 'h1'
  if (editor?.isActive('heading', { level: 2 })) return 'h2'
  if (editor?.isActive('heading', { level: 3 })) return 'h3'
  if (editor?.isActive('bulletList')) return 'bullets'
  if (editor?.isActive('orderedList')) return 'numbers'
  if (editor?.isActive('blockquote')) return 'quote'
  if (editor?.isActive('codeBlock')) return 'codeBlock'
  return 'paragraph'
}
