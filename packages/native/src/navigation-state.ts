export function nativePagerPosition(offset: number, width: number, count: number, rtl = false) {
  if (!Number.isFinite(offset) || !Number.isFinite(width) || width <= 0 || count <= 1) return 0
  const edge = count - 1
  const physical = Math.min(edge, Math.max(0, offset / width))
  return rtl ? edge - physical : physical
}

export function nativePagerOffset(index: number, width: number, count: number, rtl = false) {
  if (!Number.isFinite(index) || !Number.isFinite(width) || width <= 0) return 0
  const edge = Math.max(0, count - 1)
  const logical = Math.min(edge, Math.max(0, index))
  return (rtl ? edge - logical : logical) * Math.max(0, width)
}

export function nativePagerIndicator(
  bounds: readonly { x: number; width: number }[],
  selected: number,
) {
  if (!bounds.length || !Number.isFinite(selected)) return undefined
  const index = Math.min(bounds.length - 1, Math.max(0, selected))
  const first = bounds[Math.floor(index)]
  const second = bounds[Math.ceil(index)]
  const fraction = index - Math.floor(index)
  return { x: first.x + (second.x - first.x) * fraction, width: first.width + (second.width - first.width) * fraction }
}

export function nativeSplitBounds(viewport: number, divider: number, firstMin: number, secondMin: number) {
  const space = Math.max(0, viewport - divider)
  const total = Math.max(0, firstMin) + Math.max(0, secondMin)
  if (total > space) {
    const fixed = space * Math.max(0, firstMin) / total
    return { space, min: fixed, max: fixed }
  }
  return { space, min: Math.max(0, firstMin), max: space - Math.max(0, secondMin) }
}

export function nativeSplitPoints(points: readonly number[], viewport: number, divider: number, firstMin: number, secondMin: number) {
  const { min, max, space } = nativeSplitBounds(viewport, divider, firstMin, secondMin)
  return points.map(point => Math.min(max, Math.max(min, !Number.isFinite(point) ? space / 2 : point <= 1 ? point * space : point)))
}

export function nearestNativeSplitPoint(points: readonly number[], position: number, velocity = 0) {
  const projected = position + Math.min(80, Math.max(-80, velocity * 120))
  let match = -1
  let distance = Infinity
  for (const [index, point] of points.entries()) {
    const nextDistance = Math.abs(point - projected)
    if (nextDistance < distance) {
      match = index
      distance = nextDistance
    }
  }
  return match
}

export function nearestNativePage(items: readonly { disabled?: boolean }[], position: number, bias = 0) {
  let match = -1
  let distance = Infinity
  for (const [index, item] of items.entries()) {
    if (item.disabled) continue
    const nextDistance = Math.abs(index - position)
    if (nextDistance < distance || nextDistance === distance && bias > 0) {
      match = index
      distance = nextDistance
    }
  }
  return match
}

export function nativeMorphWidths(count: number, width: number, compact: number, position: number) {
  if (!count) return []
  const minimum = Number.isFinite(compact) ? Math.max(44, compact) : 44
  const baseTotal = minimum * count
  const remainder = Math.max(0, width - baseTotal)
  if (!Number.isFinite(position) || position < 0) return Array.from({ length: count }, () => minimum + remainder / count)
  const center = Math.max(0, Math.min(count - 1, position))
  return Array.from({ length: count }, (_, index) => minimum + remainder * Math.max(0, 1 - Math.abs(index - center)))
}
