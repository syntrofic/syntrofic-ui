export type NativeSwipeSide = 'start' | 'end'

export function nativeSwipePosition(offset: number, start: number, end: number) {
  const sign = Math.sign(offset)
  const extent = sign >= 0 ? Math.max(0, start) : Math.max(0, end)
  if (!extent || !Number.isFinite(offset)) return 0
  const distance = Math.abs(offset)
  return sign * (Math.min(extent, distance) + Math.min(26, Math.max(0, distance - extent) * .22))
}

export function nativeSwipeTarget(offset: number, velocity: number, start: number, end: number): NativeSwipeSide | undefined {
  const predicted = offset + Math.min(44, Math.max(-44, (Number.isFinite(velocity) ? velocity : 0) * 120))
  const extent = predicted > 0 ? start : end
  if (!extent || Math.abs(predicted) < Math.max(12, Math.min(48, extent * .42))) return
  return predicted > 0 ? 'start' : 'end'
}
