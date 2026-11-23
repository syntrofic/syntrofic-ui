export interface PixelSize { type: 'pixel'; value: number }
type PercentBound = { min: PixelSize; max?: never } | { min?: never; max: PixelSize }
export type PercentSize = { type: 'percent'; value: number } & PercentBound
export type ResizableSize = number | `${number}${'%' | 'px' | 'rem' | 'em'}` | PixelSize | PercentSize
export type ResizableLayout = Readonly<Record<string, number>>
export function pixel(value: number): PixelSize { return { type: 'pixel', value } }
export function percent(value: number, limit: PercentBound): PercentSize { return { type: 'percent', value, ...limit } }

export interface ResizablePanel {
  id: string
  label?: string
  defaultSize?: ResizableSize
  minSize?: ResizableSize
  maxSize?: ResizableSize
  collapsible?: boolean
  collapsedSize?: ResizableSize
  resizeBehavior?: 'relative' | 'pixel'
}

export interface ResizeBounds {
  min: number
  max: number
}

const epsilon = 0.0001
const sizeToken = /^(\d+(?:\.\d+)?|\.\d+)(px|%|em|rem)$/
export const sumSizes = (sizes: readonly number[]) => sizes.reduce((sum, size) => sum + size, 0)
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function needsResizableBasis(size: ResizableSize | string | undefined) {
  if (typeof size === 'string') {
    const token = sizeToken.exec(size.trim())
    return Boolean(token && token[2] !== 'px' && Number.isFinite(Number(token[1])))
  }
  return typeof size === 'object' && size?.type === 'percent' && resolveResizableSize(size, 100) !== undefined
}

export function resolveResizableSize(size: ResizableSize | string | undefined, basis: number, units = { em: 16, rem: 16 }): number | undefined {
  if (typeof size === 'number') return Number.isFinite(size) && size >= 0 ? size : undefined
  if (typeof size === 'string') {
    const token = sizeToken.exec(size.trim())
    if (!token) return
    const scale = token[2] === '%' ? basis / 100 : token[2] === 'rem' ? units.rem : token[2] === 'em' ? units.em : 1
    const value = Number(token[1]) * scale
    return Number.isFinite(value) ? value : undefined
  }
  if (!size || !Number.isFinite(size.value) || size.value < 0) return
  if (size.type === 'pixel') return size.value
  if (size.type !== 'percent' || size.value > 100 || (size.min === undefined) === (size.max === undefined)) return
  const limit = size.min ?? size.max
  if (limit?.type !== 'pixel' || !Number.isFinite(limit.value) || limit.value < 0) return
  const value = size.value * basis / 100
  if (Number.isFinite(value)) return size.min ? Math.max(limit.value, value) : Math.min(limit.value, value)
}

export function readPanelSize(size: ResizableSize | undefined, available: number, fallback: number, units = { em: 16, rem: 16 }) {
  const pixels = resolveResizableSize(typeof size === 'number' ? `${size}%` : size, available, units)
  return pixels === undefined ? fallback : clamp(pixels, 0, available)
}

export function panelBounds(panels: readonly ResizablePanel[], collapsed: readonly string[], extent: number, units?: { em: number; rem: number }) {
  let limits = panels.map(panel => {
    const min = readPanelSize(panel.minSize, extent, 0, units)
    const max = Math.max(min, readPanelSize(panel.maxSize, extent, extent, units))
    if (!panel.collapsible || !collapsed.includes(panel.id)) return { min, max }
    const closed = Math.min(max, readPanelSize(panel.collapsedSize, extent, 0, units))
    return { min: closed, max: closed }
  })
  const required = sumSizes(limits.map(limit => limit.min))
  if (required > extent) {
    const ratio = extent / required
    limits = limits.map(limit => ({ min: limit.min * ratio, max: Math.max(limit.min * ratio, limit.max * ratio) }))
  }
  return limits
}

export function fitPanelSizes(panels: readonly ResizablePanel[], layout: ResizableLayout, bounds: ResizeBounds[], available: number, units?: { em: number; rem: number }) {
  const desired = panels.map(panel => readPanelSize(layout[panel.id] ?? panel.defaultSize, available, -1, units))
  const total = sumSizes(desired.map(size => Math.max(0, size)))
  const unspecified = desired.filter(size => size < 0).length
  const remainder = Math.max(0, available - total)
  const sizes = desired.map((size, index) => clamp(size < 0 ? remainder / unspecified : size, bounds[index].min, bounds[index].max))
  let delta = available - sumSizes(sizes)
  while (Math.abs(delta) > epsilon) {
    const grow = delta > 0
    const candidates = sizes.flatMap((size, index) =>
      (grow ? bounds[index].max - size : size - bounds[index].min) > epsilon ? [index] : [])
    if (!candidates.length) break
    const relative = candidates.filter(index => panels[index].resizeBehavior !== 'pixel')
    const flexible = relative.length ? relative : candidates
    const share = delta / flexible.length
    for (const index of flexible) sizes[index] = clamp(sizes[index] + share, bounds[index].min, bounds[index].max)
    const next = available - sumSizes(sizes)
    if (Math.abs(next - delta) <= epsilon) break
    delta = next
  }
  return sizes
}

export function capacity(sizes: readonly number[], bounds: readonly ResizeBounds[], indices: readonly number[], grow: boolean) {
  return sumSizes(indices.map(index => grow ? bounds[index].max - sizes[index] : sizes[index] - bounds[index].min))
}

export function shiftPanelSizes(sizes: readonly number[], bounds: readonly ResizeBounds[], grow: readonly number[], shrink: readonly number[], requested: number) {
  const actual = Math.min(requested, capacity(sizes, bounds, grow, true), capacity(sizes, bounds, shrink, false))
  if (actual <= epsilon) return sizes
  const next = [...sizes]
  for (const [indices, direction] of [[grow, 1], [shrink, -1]] as const) {
    let remaining = actual
    for (const index of indices) {
      const limit = direction > 0 ? bounds[index].max - next[index] : next[index] - bounds[index].min
      const amount = Math.min(remaining, limit)
      next[index] += direction * amount
      remaining -= amount
      if (remaining <= epsilon) break
    }
  }
  return next
}

export function parseResizableLayout(raw: string): ResizableLayout | undefined {
  const value: unknown = JSON.parse(raw)
  if (!value || Array.isArray(value) || typeof value !== 'object') return
  return Object.fromEntries(Object.entries(value).filter(([, size]) =>
    typeof size === 'number' && Number.isFinite(size) && size >= 0))
}

export function parseCollapsedPanels(raw: string): string[] | undefined {
  const value: unknown = JSON.parse(raw)
  if (Array.isArray(value)) return value.filter(panel => typeof panel === 'string')
}
