export type NativeSliderValue = number | number[]

export interface NativeSliderMark {
  value: number
  label?: string
}

const maxNativeIntervals = 2 ** 23

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function sliderDomain(min: number, max: number, step: number) {
  const lower = Number.isFinite(min) ? min : 0
  const upper = Number.isFinite(max - lower) ? Math.max(lower, max) : lower
  const span = upper - lower
  const increment = Math.max(Number.isFinite(step) && step > 0 ? step : 1, span / maxNativeIntervals)
  const quotient = span / increment
  const last = span ? Math.max(1, Math.ceil(quotient - Number.EPSILON * Math.max(1, quotient) * 4)) : 0
  return { min: lower, max: upper, span, step: increment, last }
}

type Domain = ReturnType<typeof sliderDomain>

export function sliderValueAt(domain: Domain, index: number) {
  if (index <= 0) return domain.min
  if (index >= domain.last) return domain.max
  const exact = domain.min + index * domain.step
  const rounded = Number(exact.toPrecision(15))
  return Math.abs(exact - rounded) <= domain.step * 1e-4 ? rounded : exact
}

export function sliderIndexAt(domain: Domain, value: number) {
  if (!Number.isFinite(value) || value <= domain.min) return 0
  if (value >= domain.max) return domain.last
  const position = (value - domain.min) / domain.step
  const before = Math.floor(position)
  const after = Math.min(domain.last, before + 1)
  return value - sliderValueAt(domain, before) < sliderValueAt(domain, after) - value ? before : after
}

export function sliderRatios(domain: Domain, positions: readonly number[]) {
  return positions.map(index => domain.span ? (sliderValueAt(domain, index) - domain.min) / domain.span : 0)
}

export function sliderGap(domain: Domain, size: number, steps: number) {
  return size < 2 || !Number.isFinite(steps) ? 0 : clamp(Math.floor(steps), 0, Math.floor(domain.last / (size - 1)))
}

export function sliderPositions(domain: Domain, model: NativeSliderValue | undefined, steps: number) {
  const values = Array.isArray(model) ? model.length ? model : [domain.min] : [model ?? domain.min]
  const gap = sliderGap(domain, values.length, steps)
  const positions = values.map(value => sliderIndexAt(domain, value)).sort((a, b) => a - b)
  return positions.reduce<number[]>((next, position, index) => {
    const lower = index ? next[index - 1] + gap : 0
    const upper = domain.last - (positions.length - 1 - index) * gap
    next.push(clamp(position, lower, upper))
    return next
  }, [])
}

export function sliderThumbBounds(positions: readonly number[], index: number, last: number, gap: number) {
  return {
    min: index > 0 ? positions[index - 1] + gap : 0,
    max: index < positions.length - 1 ? positions[index + 1] - gap : last,
  }
}

export function sliderThumbAt(ticks: readonly number[], position: number, direction = 0) {
  let closest = 0
  for (let index = 1; index < ticks.length; index++) {
    const distance = Math.abs(ticks[index] - position)
    const current = Math.abs(ticks[closest] - position)
    const towardEnd = position > ticks[index] || position === ticks[index] && direction > 0
    if (distance < current || distance === current && (ticks[index] !== ticks[closest] ? direction >= 0 : towardEnd)) closest = index
  }
  return closest
}
