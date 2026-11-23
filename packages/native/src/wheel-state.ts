export type NativeWheelValue = string | number

export interface NativeWheelOption {
  value: NativeWheelValue
  label: string
  disabled?: boolean
}

export type NativeWheelValues = Record<string, NativeWheelValue>
export type NativeWheelMotion = 'default' | 'none'

export function nativeWheelMetrics(height = 44, visible = 5) {
  const row = Number.isFinite(height) ? Math.min(120, Math.max(28, height)) : 44
  const count = Number.isFinite(visible) ? Math.min(13, Math.max(1, Math.floor(visible))) : 5
  const odd = count % 2 ? count : count + 1
  return { row, count: odd, padding: row * (odd - 1) / 2, viewport: row * odd }
}

export function nearestNativeWheelItem(items: readonly NativeWheelOption[], position: number, direction = 0) {
  if (!items.length || !Number.isFinite(position)) return -1
  const point = Math.min(items.length - 1, Math.max(0, position))
  let left = Math.floor(point)
  let right = left + 1
  while (left >= 0 || right < items.length) {
    const before = left >= 0 ? point - left : Infinity
    const after = right < items.length ? right - point : Infinity
    const index = before < after || (before === after && direction <= 0) ? left-- : right++
    if (!items[index].disabled) return index
  }
  return -1
}

export function stepNativeWheelItem(items: readonly NativeWheelOption[], current: number, direction: -1 | 1) {
  if (current < 0) return nearestNativeWheelItem(items, direction > 0 ? 0 : items.length - 1)
  for (let target = current + direction; target >= 0 && target < items.length; target += direction) {
    if (!items[target].disabled) return target
  }
  return current
}

export function nativeWheelWeight(position: number, index: number, visibleCount: number) {
  const edge = Math.max(1, (visibleCount - 1) / 2)
  return 1 - Math.min(1, Math.abs(position - index) / edge)
}

export interface NativeWheelColumn {
  name: string
  label: string
  items: readonly NativeWheelOption[]
  defaultValue?: NativeWheelValue
  width?: string | number
  disabled?: boolean
}

export function nativeWheelSettlement() {
  const moving = new Set<symbol>()
  let pending = false
  return {
    activity(wheel: symbol, active: boolean) {
      if (active) moving.add(wheel)
      else moving.delete(wheel)
    },
    mark() { pending = true },
    discard() { pending = false },
    take() {
      if (moving.size || !pending) return false
      pending = false
      return true
    },
  }
}

export function nativeWheelWindow(size: number, center: number, visibleCount: number) {
  const buffer = Math.max(3, visibleCount)
  const page = Math.floor(center / buffer) * buffer
  const first = Math.max(0, Math.min(size - 1, page - 2 * buffer))
  const end = Math.min(size, page + 3 * buffer)
  return { first, end }
}
