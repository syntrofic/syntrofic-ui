export function nativeProgressRange(value: number, min = 0, max = 100) {
  const start = Number.isFinite(min) ? min : 0
  const end = Number.isFinite(max) && max > start ? max : start + 1
  const current = Number.isFinite(value) ? Math.min(end, Math.max(start, value)) : start
  return { min: start, max: end, value: current, ratio: (current - start) / (end - start) }
}

export function nativeRatingValue(value: number, count: number, fraction = 1) {
  const max = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 5
  const step = Number.isFinite(fraction) ? Math.max(.1, Math.min(1, fraction)) : 1
  const current = Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0
  return current === max ? max : Math.min(max, Number((Math.round(current / step) * step).toFixed(4)))
}

export function nativeRatingFill(value: number, index: number) {
  return Math.min(1, Math.max(0, value - index))
}

export function nativeTrend(value: number, neutral = 0) {
  if (!Number.isFinite(value) || Math.abs(value) <= Math.max(0, neutral)) return 'flat'
  return value > 0 ? 'up' : 'down'
}

export function nativeProgressArc(size: number, stroke: number, partial: number, start = -90) {
  const diameter = Number.isFinite(size) ? Math.min(280, Math.max(12, size)) : 50
  const line = Number.isFinite(stroke) ? Math.max(1, Math.min(stroke, diameter / 2)) : 4
  const fraction = Number.isFinite(partial) ? Math.min(1, Math.max(0, partial)) : 0
  const offset = Number.isFinite(start) ? start : -90
  return { diameter, line, radius: (diameter - line) / 2, center: diameter / 2, start: offset, sweep: fraction * 360 }
}

export function nativeRatingTouch(index: number, point: number, count: number, step: number) {
  const fraction = Math.min(1, Math.max(0, Number.isFinite(point) ? point : 1))
  const interval = Number.isFinite(step) ? Math.min(1, Math.max(.1, step)) : 1
  if (interval === 1) return Math.min(count, Math.max(0, index + 1))
  const pointInScale = index + Math.max(.0001, fraction)
  const boundary = Math.ceil(pointInScale / interval - 1e-9) * interval
  return nativeRatingValue(Math.min(count, boundary), count, interval)
}

export function nativeCompactValue(value: number, locale: string, long = false) {
  const chinese = /^zh\b/i.test(locale)
  const japanese = /^ja\b/i.test(locale)
  const korean = /^ko\b/i.test(locale)
  const units = chinese ? [[1e12, '万亿'], [1e8, '亿'], [1e4, '万'], [1e3, '千']]
    : japanese ? [[1e12, '兆'], [1e8, '億'], [1e4, '万'], [1e3, '千']]
      : korean ? [[1e12, '조'], [1e8, '억'], [1e4, '만'], [1e3, '천']]
        : [[1e12, long ? ' trillion' : 'T'], [1e9, long ? ' billion' : 'B'],
          [1e6, long ? ' million' : 'M'], [1e3, long ? ' thousand' : 'K']]
  const entry = units.find(([magnitude]) => Math.abs(value) >= Number(magnitude))
  return entry ? { value: value / Number(entry[0]), suffix: String(entry[1]) } : { value, suffix: '' }
}

export function nativeScientificValue(value: number, engineering = false) {
  if (!Number.isFinite(value) || value === 0) return { value, exponent: 0 }
  const [digits, rawExponent] = value.toExponential().split('e')
  const order = Number(rawExponent)
  const exponent = engineering ? Math.floor(order / 3) * 3 : order
  return { value: Number(digits) * 10 ** (order - exponent), exponent }
}
