import { toValue, useId, type MaybeRefOrGetter } from 'vue'
import type { PromptTokenSegment } from './prompt-tokens'

export interface ChatPasteTokenInput { insertToken(token: PromptTokenSegment): boolean | void }
export interface ChatPasteTokenOptions {
  threshold?: number
  toToken?: (text: string) => PromptTokenSegment | undefined
}
export interface ChatPasteAsToken { onPaste(event: ClipboardEvent, text: string): boolean }

export function pastedToken(text: string, id: string, sequence: number, label: string): PromptTokenSegment {
  return { type: 'token', id: id + '-' + sequence, value: `[${label} ${sequence}]`, label, expandedText: text }
}

export function useChatPasteAsToken(inputRef: MaybeRefOrGetter<ChatPasteTokenInput | null | undefined>,
  options: MaybeRefOrGetter<ChatPasteTokenOptions> = {},
): ChatPasteAsToken {
  const id = 'sy-paste-' + useId()
  let sequence = 0
  function onPaste(event: ClipboardEvent, text: string) {
    const input = toValue(inputRef)
    if (event.defaultPrevented || !input || !text) return false
    const { threshold = 200, toToken } = toValue(options)
    const limit = Number.isFinite(threshold) ? Math.max(0, Math.floor(threshold)) : 200
    if (text.length <= limit) return false
    const token = toToken ? toToken(text) : pastedToken(text, id, ++sequence, `${text.length} characters pasted`)
    if (!token || input.insertToken(token) === false) return false
    event.preventDefault()
    return true
  }
  return { onPaste }
}
