import { isAndroid, isIOS, type TextField } from '@nativescript/core'

interface AndroidCaret { getSelectionStart(): number }
interface AppleCaret {
  beginningOfDocument: unknown
  selectedTextRange?: { start: unknown }
  offsetFromPositionToPosition(start: unknown, end: unknown): number
}

export function nativeCaret(field: TextField, fallback: number) {
  if (isAndroid) {
    const start = (field.android as AndroidCaret | undefined)?.getSelectionStart()
    return start !== undefined && start >= 0 ? start : fallback
  }
  if (isIOS) {
    const input = field.ios as AppleCaret | undefined
    const start = input?.selectedTextRange?.start
    if (input && start != null) return input.offsetFromPositionToPosition(input.beginningOfDocument, start)
  }
  return fallback
}
