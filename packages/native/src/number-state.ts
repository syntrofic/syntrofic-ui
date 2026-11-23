import { nativeDecimalValue } from './control-state'

export interface NativeNumberRange {
  min?: number
  max?: number
  step?: number
}

export interface NativeNumberSymbols {
  decimal: string
  group?: string
  minus?: string
  plus?: string
}

const bidiMarks = /[\u061c\u200e\u200f]/g

export function nativeNumberRange(config: NativeNumberRange) {
  const min = Number.isFinite(config.min) ? config.min! : -Infinity
  const max = Number.isFinite(config.max) ? Math.max(min, config.max!) : Infinity
  const step = Number.isFinite(config.step) && config.step! > 0 ? config.step! : 1
  return { min, max, step, base: Number.isFinite(min) ? min : 0 }
}

function decimals(value: number) {
  const [mantissa, exponent = '0'] = value.toString().split('e')
  return Math.max(0, (mantissa.split('.')[1]?.length ?? 0) - Number(exponent))
}

export function commitNativeNumber(value: number, config: NativeNumberRange, snap = true) {
  if (!Number.isFinite(value)) return undefined
  const { min, max, step, base } = nativeNumberRange(config)
  const precision = Math.min(12, Math.max(decimals(step), decimals(base)))
  const snapped = snap ? Number((base + Math.round((value - base) / step) * step).toFixed(precision)) : value
  return Math.max(min, Math.min(max, Number.isFinite(snapped) ? snapped : value))
}

export function stepNativeNumber(value: number | undefined, amount: number, config: NativeNumberRange) {
  const { base, step } = nativeNumberRange(config)
  return commitNativeNumber((value ?? base) + amount * step, config)
}

export function nativeDigitText(value: string) {
  return Array.from(value, character => {
    const decimal = nativeDecimalValue(character)
    return decimal === undefined ? character : String(decimal)
  }).join('')
}

export function normalizeNativeNumberDraft(raw: string, symbols: NativeNumberSymbols) {
  const text = nativeDigitText(raw).replace(bidiMarks, '').trim()
  const out = Array.from(text, character => {
    if (character === symbols.decimal || character === '\u066b') return '.'
    if (character === symbols.group || /[\u0020\u00a0\u202f\u066c]/.test(character)) return ''
    if (character === symbols.minus || character === '\u2212') return '-'
    if (character === symbols.plus) return '+'
    return character
  }).join('')
  return /^[+-]?(?:\d+)?(?:\.\d*)?$/.test(out) ? out : undefined
}

export function readNativeNumber(raw: string, symbols: NativeNumberSymbols, percent = false) {
  const draft = normalizeNativeNumberDraft(raw, symbols)
  if (draft === undefined || !/\d/.test(draft)) return undefined
  const value = Number(draft) / (percent ? 100 : 1)
  return Number.isFinite(value) ? value : undefined
}

export function applyNativePadKey(value: string, key: string, options: {
  maxDigits?: number
  decimal?: string
}) {
  if (key === 'delete') return value.slice(0, -1)
  const decimal = options.decimal
  if (key === 'decimal') {
    if (!decimal || value.includes(decimal)) return value
    return (value || '0') + decimal
  }
  if (!/^[0-9]$/.test(key)) return value
  const digits = Array.from(value).filter(character => nativeDecimalValue(character) !== undefined).length
  if (options.maxDigits !== undefined && digits >= Math.max(0, options.maxDigits)) return value
  return value + key
}

const currencyMarks: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', KRW: '₩' }

export function nativeNumberAdapter(locale = 'en', options: Intl.NumberFormatOptions = {}) {
  if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
    const format = new Intl.NumberFormat(locale, options)
    const parts = new Intl.NumberFormat(locale, { signDisplay: 'always' }).formatToParts(-1234.5)
    const mark = (type: Intl.NumberFormatPartTypes) => parts.find(part => part.type === type)?.value
    const symbols = { decimal: mark('decimal') ?? '.', group: mark('group'), minus: mark('minusSign'), plus: '+' }
    const affixes = format.formatToParts(1234.5).filter(part => ['currency', 'unit', 'percentSign'].includes(part.type)).map(part => part.value)
    return { symbols, affixes, format: (value: number) => format.format(value) }
  }
  const language = locale.toLowerCase().split(/[-_]/)[0]
  const east = language === 'ar' || language === 'fa'
  const comma = ['de', 'es', 'it', 'nl', 'pt', 'fr', 'ru', 'fi', 'sv', 'da', 'no', 'pl', 'uk', 'tr'].includes(language)
  const spaceGroup = ['fr', 'ru', 'fi', 'sv', 'no', 'pl', 'uk'].includes(language)
  const symbols = {
    decimal: east ? '٫' : comma ? ',' : '.', group: east ? '٬' : spaceGroup ? '\u202f' : comma ? '.' : ',', minus: '-', plus: '+',
  }
  const currency = options.currency?.toUpperCase()
  const affix = options.style === 'currency' && currency ? options.currencyDisplay === 'code' ? currency : currencyMarks[currency] ?? currency
    : options.style === 'percent' ? (east ? '٪' : '%') : options.style === 'unit' ? options.unit : undefined
  const defaultDigits = options.style === 'percent' ? 0 : options.style === 'currency' ? currency === 'JPY' || currency === 'KRW' ? 0 : 2 : 3
  const max = Math.min(12, Math.max(0, options.maximumFractionDigits ?? Math.max(defaultDigits, options.minimumFractionDigits ?? 0)))
  const min = Math.min(max, Math.max(0, options.minimumFractionDigits ?? (options.style === 'currency' ? defaultDigits : 0)))
  function format(value: number) {
    const amount = Math.abs(value) * (options.style === 'percent' ? 100 : 1)
    let [integer, fraction = ''] = amount.toFixed(max).split('.')
    integer = integer.padStart(Math.min(21, Math.max(1, options.minimumIntegerDigits ?? 1)), '0')
    if (options.useGrouping !== false) integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, symbols.group)
    while (fraction.length > min && fraction.endsWith('0')) fraction = fraction.slice(0, -1)
    const number = integer + (fraction ? symbols.decimal + fraction : '')
    const sign = value < 0 ? '-' : options.signDisplay === 'always' ? '+' : ''
    return affix ? options.style === 'currency' && !comma ? sign + affix + (affix.length > 1 ? ' ' : '') + number
      : sign + number + (options.style === 'percent' && !comma ? '' : ' ') + affix : sign + number
  }
  return { symbols, affixes: affix ? [affix] : [], format }
}

export function readFormattedNativeNumber(text: string, adapter: ReturnType<typeof nativeNumberAdapter>, percent = false) {
  let draft = text.replace(bidiMarks, '').trim()
  const sign = /^[+-]|^\u2212/.exec(draft)?.[0] ?? ''
  draft = draft.slice(sign.length).trimStart()
  for (const affix of adapter.affixes) {
    if (draft.startsWith(affix)) draft = draft.slice(affix.length).trimStart()
    else if (draft.endsWith(affix)) draft = draft.slice(0, -affix.length).trimEnd()
  }
  return readNativeNumber(sign + draft, adapter.symbols, percent)
}
