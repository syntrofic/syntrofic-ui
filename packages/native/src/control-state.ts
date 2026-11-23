export type NativeCheckState = boolean | 'mixed'
export type NativeChoiceKind = 'checkbox' | 'radio' | 'switch'
export type NativeRadioValue = string | number
export type NativeOTPMode = 'numeric' | 'alphanumeric'

export interface NativeRadioOption {
  value: NativeRadioValue
  label: string
  description?: string
  disabled?: boolean
}

export function otpSize(length: number) {
  return Number.isFinite(length) ? Math.max(1, Math.floor(length)) : 6
}

// Starts of the Unicode decimal digit sets. Android's NativeScript runtime can run without Unicode properties in regexes.
const decimalStarts = [
  0x30, 0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6,
  0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xde6, 0xe50, 0xed0,
  0xf20, 0x1040, 0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80,
  0x1a90, 0x1b50, 0x1bb0, 0x1c40, 0x1c50, 0xa620, 0xa8d0, 0xa900,
  0xa9d0, 0xa9f0, 0xaa50, 0xabf0, 0xff10, 0x104a0, 0x10d30, 0x10d40,
  0x11066, 0x110f0, 0x11136, 0x111d0, 0x112f0, 0x11450, 0x114d0, 0x11650,
  0x116c0, 0x116d0, 0x116da, 0x11730, 0x118e0, 0x11950, 0x11bf0, 0x11c50,
  0x11d50, 0x11da0, 0x11de0, 0x11f50, 0x16130, 0x16a60, 0x16ac0, 0x16b50,
  0x16d70, 0x1ccf0, 0x1d7ce, 0x1d7d8, 0x1d7e2, 0x1d7ec, 0x1d7f6, 0x1e140,
  0x1e2f0, 0x1e4f0, 0x1e5f1, 0x1e950, 0x1fbf0,
]

export function nativeDecimalValue(character: string) {
  const point = character.codePointAt(0)
  if (point === undefined) return undefined
  const start = decimalStarts.find(first => point >= first && point <= first + 9)
  return start === undefined ? undefined : point - start
}

export function normalizeOTP(text: string, mode: NativeOTPMode, length: number) {
  const localized = Array.from(text.normalize('NFKC'), character => {
    const decimal = nativeDecimalValue(character)
    return decimal === undefined ? character : String(decimal)
  }).join('')
  const invalid = mode === 'numeric' ? /[^0-9]/g : /[^A-Za-z0-9]/g
  return localized.replace(invalid, '').slice(0, otpSize(length))
}

export function nextChoiceState(current: NativeCheckState, kind: NativeChoiceKind): boolean {
  return kind === 'radio' || current !== true
}
