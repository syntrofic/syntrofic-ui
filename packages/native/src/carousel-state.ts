type CarouselAlignment = 'start' | 'center' | 'end'

export interface NativeCarouselLayoutOptions {
  perView?: number
  gap?: number
  padding?: number
  align?: CarouselAlignment
}

function finite(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value) ? value : fallback
}

export function nativeCarouselLayout(width: number, count: number, options: NativeCarouselLayoutOptions = {}) {
  const viewport = Math.max(1, finite(width, 1))
  const items = Math.max(0, Math.trunc(finite(count, 0)))
  const padding = Math.max(0, Math.min(finite(options.padding, 0), (viewport - 1) / 2))
  const inner = viewport - padding * 2
  const perView = Math.max(1, Math.min(8, finite(options.perView, 1)))
  const gap = Math.max(0, Math.min(finite(options.gap, padding || 12), inner / (perView * 2)))
  const item = (inner - (perView - 1) * gap) / perView
  const pitch = item + gap
  const content = Math.max(viewport, padding * 2 + items * pitch - gap)
  const max = content - viewport
  const inset = options.align === 'center' ? (inner - item) / 2 : options.align === 'end' ? inner - item : 0
  const snap = Array.from({ length: items }, (_, index) => Math.max(0, Math.min(max, index * pitch - inset)))
  return { viewport, padding, content, item, pitch, gap, max, snap }
}

export function nativeCarouselOffset(offset: number, max: number, rtl: boolean) {
  const bounded = Math.max(0, Math.min(max, finite(offset, 0)))
  return rtl ? max - bounded : bounded
}

export function nearestNativeCarouselSnap(snap: readonly number[], offset: number, current = 0) {
  if (!snap.length) return -1
  const start = Math.max(0, Math.min(snap.length - 1, Math.trunc(finite(current, 0))))
  return snap.reduce((best, point, index) => {
    return Math.abs(point - offset) + .01 < Math.abs(snap[best] - offset) ? index : best
  }, start)
}

export function nativeCarouselVisible(left: number, item: number, offset: number, width: number) {
  return Math.max(0, Math.min(left + item, offset + width) - Math.max(left, offset)) / Math.max(1, item)
}

export function nativeCarouselProgress(snap: readonly number[], offset: number, current: number) {
  if (snap.length <= 1) return 0
  const near = nearestNativeCarouselSnap(snap, offset, current)
  const point = snap[near]
  if (Math.abs(point - offset) < .01) return near
  const next = offset > point ? snap.findIndex((entry, index) => index > near && entry > point) : -1
  if (next >= 0) return near + (next - near) * (offset - point) / (snap[next] - point)
  for (let previous = near - 1; previous >= 0 && offset < point; previous--) {
    if (snap[previous] < point) return near - (near - previous) * (point - offset) / (point - snap[previous])
  }
  return near
}
