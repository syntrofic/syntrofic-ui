export type NativeBadgePlacement = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'

export function nativeBadgePosition(placement: NativeBadgePlacement, rtl: boolean, inset: number) {
  const top = placement.startsWith('top')
  const left = placement.endsWith('start') !== rtl
  const offset = Number.isFinite(inset) ? inset : 0
  return {
    horizontal: left ? 'left' as const : 'right' as const,
    vertical: top ? 'top' as const : 'bottom' as const,
    x: left ? -offset : offset,
    y: top ? -offset : offset,
  }
}

export function nativeBadgeText(count: number | undefined, max: number, zero: boolean, formatter: (value: number) => string) {
  if (count === undefined || !Number.isFinite(count)) return undefined
  const value = Math.max(0, Math.floor(count))
  const ceiling = Number.isFinite(max) ? Math.max(1, Math.floor(max)) : 99
  if (!zero && value === 0) return ''
  return value > ceiling ? formatter(ceiling) + '+' : formatter(value)
}

export function nativeFlipFrame(progress: number, reverse = false) {
  const bounded = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
  const back = bounded >= .5
  const faceAngle = (back ? bounded - 1 : bounded) * 180
  return { back, angle: (reverse ? -1 : 1) * faceAngle || 0 }
}

export function nativeFlipSwipe(x: number, y: number, horizontal: boolean, rtl: boolean) {
  const along = horizontal ? x : y
  const across = horizontal ? y : x
  if (Math.abs(along) < 38 || Math.abs(along) <= Math.abs(across) * 1.25) return undefined
  return horizontal && rtl ? along > 0 : along < 0
}
