function joiningPattern() {
  try {
    const script = new RegExp('^[\\p{Script=Arabic}\\p{Script=Syriac}\\p{Script=Mandaic}]', 'u')
    const letter = new RegExp('\\p{Letter}', 'u')
    return (part: string) => script.test(part) && letter.test(part)
  } catch {
    const letters = /^[\u0620-\u063f\u0641-\u064a\u066e\u066f\u0671-\u06d3\u06fa-\u06fc\u06ff\u0710-\u072f\u074d-\u077f\u0840-\u0858\u0860-\u086a\u08a0-\u08c9\ufb50-\ufdc7\ufe70-\ufefc]/
    return (part: string) => letters.test(part)
  }
}

export const isNativeJoiningLetter = joiningPattern()

export function nativeGraphemeWidth(text: string, size: number, numeric: boolean) {
  if (numeric) return Math.ceil(size * (/^[０-９]$/u.test(text) ? 1.08 : .62))
  const width = Array.from(text).reduce((total, point) => {
    const value = point.codePointAt(0)!
    if (/^[\u0300-\u036f\u200c\u200d\ufe00-\ufe0f]$/.test(point)) return total
    if (value >= 0x2e7f || /[MW@%]/.test(point)) return total + 1.08
    if (/[.:/\\-]/u.test(point)) return total + .32
    if (/[ ilI!,;']/u.test(point)) return total + .42
    return total + .76
  }, 0)
  return Math.max(1, Math.ceil(size * width))
}

export function nativeSegmenter() {
  return typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : undefined
}

export function nativeNumberFormat(locale?: string, options?: Intl.NumberFormatOptions): { format(value: number): string } {
  if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') return new Intl.NumberFormat(locale, options)
  return {
    format(value) {
      if (options?.style === 'percent') return `${Math.round(value * 100)}%`
      const decimals = options?.maximumFractionDigits
      if (decimals !== undefined && Number.isFinite(decimals)) return String(Number(value.toFixed(Math.max(0, Math.min(100, decimals)))))
      return String(value)
    },
  }
}
