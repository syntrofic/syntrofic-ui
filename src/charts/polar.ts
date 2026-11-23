import type { ChartDatum, ChartFormatter, ChartLegendItem, ChartPoint, ChartSelection, ChartSlice, PieRing, RadarChartProps, RadialChartProps } from './types'
import { pathFor } from './cartesian'
import { clamp, domainFor, finite, fraction, numberAt, seriesColor, stepValues, validDomain } from './values'

const turn = Math.PI / 180
const cycle = (delta: number) => (delta % 360 + 360) % 360

export function point(center: ChartPoint, radius: number, angle: number): ChartPoint {
  return { x: center.x + Math.sin(angle * turn) * radius, y: center.y - Math.cos(angle * turn) * radius }
}

function xy(p: ChartPoint) { return `${p.x},${p.y}` }

function arc(center: ChartPoint, radius: number, start: number, end: number) {
  const delta = end - start
  const large = Math.abs(delta) > 180 ? 1 : 0
  const direction = delta >= 0 ? 1 : 0
  const segment = (to: number, flag: number) => ` A${radius},${radius} 0 ${flag} ${direction} ${xy(point(center, radius, to))}`
  return Math.abs(delta) >= 360 - .00001 ? segment(start + delta / 2, 0) + segment(end, 0) : segment(end, large)
}

function arcLine(center: ChartPoint, radius: number, start: number, end: number) {
  return `M${xy(point(center, radius, start))}${arc(center, radius, start, end)}`
}

function sector(center: ChartPoint, inner: number, outer: number, start: number, end: number) {
  const outerPath = arcLine(center, outer, start, end)
  return inner > 0
    ? `${outerPath} L${xy(point(center, inner, end))}${arc(center, inner, end, start)} Z`
    : `${outerPath} L${xy(center)} Z`
}

interface ArcHit { inner: number; outer: number; start: number; end: number }

export interface ArcMark extends ArcHit {
  index: number
  key: string
  path: string
  ink: string
  stroke?: number
}

export interface TextMark extends ChartPoint { key: string; text: string; align?: 'start' | 'middle' | 'end'; line?: string }
export interface PolarScene {
  center: ChartPoint
  radius: number
  options: ChartSelection[]
  legend: ChartLegendItem[]
  anchors: ChartPoint[]
  marks: ArcMark[]
  guides: string[]
  polygons: { key: string; path: string; ink: string; closed: boolean; points: (ChartPoint | null)[] }[]
  labels: TextMark[]
  total?: number
  empty: boolean
}

function scene(width: number, height: number, labelSpace: number): PolarScene {
  return {
    center: { x: width / 2, y: height / 2 },
    radius: Math.max(8, Math.min((height - 16) / 2, (width - labelSpace * 2) / 2)),
    options: [], legend: [], anchors: [], marks: [], guides: [], polygons: [], labels: [], empty: true,
  }
}

function sumPositive(data: readonly ChartSlice[]) {
  let largest = 0
  for (const item of data) if (finite(item.value)) largest = Math.max(largest, item.value)
  if (largest === 0) return { scaled: 0, largest, total: 0 }
  const scaled = data.reduce((sum, item) => sum + (finite(item.value) ? Math.max(0, item.value) / largest : 0), 0)
  return { scaled, largest, total: Math.min(Number.MAX_VALUE, scaled * largest) }
}

function text(label: string, length: number) {
  const letters = Array.from(label)
  return letters.length <= length ? label : letters.slice(0, length - 1).join('') + '…'
}

export function drawPie(rings: readonly PieRing[], width: number, height: number, settings: {
  inner: number; gap: number; start: number; labels: boolean; valueLabel?: string; format?: ChartFormatter
}): PolarScene {
  const result = scene(width, height, settings.labels ? 61 : 26)
  if (settings.labels) result.radius = Math.max(8, Math.min(result.radius, (height - 30) / 2))
  const { center, radius } = result
  const base = radius * clamp(numberAt(settings.inner, .44), 0, .82)
  const band = (radius - base) / Math.max(1, rings.length)
  const gap = clamp(numberAt(settings.gap, 2), 0, 18)
  const legend = new Map<string, ChartLegendItem>()
  let colorIndex = 0
  rings.forEach((ring, ringIndex) => {
    const { scaled, largest, total } = sumPositive(ring.data)
    if (ringIndex === 0) result.total = total
    let current = cycle(numberAt(settings.start, 0))
    const inner = base + band * ringIndex
    const outer = inner + band * (rings.length > 1 ? .89 : 1)
    ring.data.forEach(slice => {
      const key = `${ring.id}:${slice.id}`
      const ink = slice.color ?? legend.get(slice.label)?.color ?? seriesColor(colorIndex)
      if (!legend.has(slice.label)) {
        legend.set(slice.label, { key, label: slice.label, color: ink })
        colorIndex++
      }
      const amount = finite(slice.value) && slice.value >= 0 ? slice.value : null
      const ratio = amount !== null && scaled && largest ? amount / largest / scaled : 0
      const sweep = 360 * ratio
      const index = result.options.length
      const heading = ring.label && rings.length > 1 ? `${ring.label} · ${slice.label}` : slice.label
      result.options.push({ key, label: heading, items: [{ key: 'value', label: settings.valueLabel ?? 'Value', value: amount, color: ink, format: settings.format }] })
      const middle = current + sweep / 2
      result.anchors.push(point(center, (inner + outer) / 2, middle))
      if (sweep > 0) {
        const inset = sweep >= 359.999 ? 0 : Math.min(gap / 2, sweep * .22)
        const start = current + inset
        const end = current + sweep - inset
        result.marks.push({ key, index, inner, outer, start, end, ink, path: sector(center, inner, outer, start, end) })
        if (settings.labels && ringIndex === rings.length - 1 && sweep >= 16) {
          const tip = point(center, outer + 13, middle)
          const edge = point(center, outer + 2, middle)
          const side = tip.x < center.x ? -1 : 1
          const labelX = clamp(tip.x + 5 * side, 10, width - 10)
          result.labels.push({
            key, x: labelX, y: clamp(tip.y, 10, height - 10) + 3, text: text(slice.label, width < 340 ? 4 : 7),
            align: side < 0 ? 'end' : 'start', line: `M${xy(edge)} L${xy(tip)}`,
          })
        }
      }
      current += sweep
    })
  })
  result.legend = [...legend.values()]
  result.empty = result.marks.length === 0
  return result
}

export function drawRadar(data: readonly ChartDatum[], width: number, height: number, settings: RadarChartProps): PolarScene {
  const result = scene(width, height, width < 345 ? 43 : 58)
  result.radius = Math.max(8, Math.min(result.radius, (height - 38) / 2))
  const { center, radius } = result
  if (!data.length) return result
  const count = data.length
  const angles = data.map((_, index) => 360 * index / count)
  const values = settings.series.map(series => data.map(row => {
    const value = row.values[series.key]
    return finite(value) ? value : null
  }))
  const domain = domainFor(values.flatMap(row => row.filter(finite)), settings.domain, true)
  const ticks = stepValues(domain, settings.ticks)
  const scale = (value: number) => radius * clamp(fraction(value, domain), 0, 1)
  const colors = settings.series.map((series, index) => series.color ?? seriesColor(index))
  const print = new Intl.NumberFormat(settings.locale, { maximumFractionDigits: 1, notation: 'compact' })
  result.legend = settings.series.map((series, index) => ({ key: series.key, label: series.label, color: colors[index] }))
  result.options = data.map((row, index) => ({
    key: row.id ?? String(index), label: row.label, items: settings.series.map((series, seriesIndex) => ({
      key: series.key, label: series.label, value: values[seriesIndex][index], color: colors[seriesIndex],
      unit: series.unit, format: series.format,
    })),
  }))
  result.anchors = angles.map(angle => point(center, radius * .76, angle))
  for (const value of ticks) {
    const edge = scale(value)
    if (edge < 1) continue
    result.guides.push(settings.circles || count < 3
      ? arcLine(center, edge, 0, 360) : pathFor(angles.map(angle => point(center, edge, angle))) + 'Z')
    if (settings.radiusAxis) result.labels.push({
      key: `tick-${value}`, x: center.x + 8, y: center.y - edge + 8,
      text: settings.axisFormat?.(value) ?? print.format(value), align: 'start',
    })
  }
  angles.forEach((angle, index) => {
    const end = point(center, radius, angle)
    const name = point(center, radius + 11, angle)
    result.guides.push(`M${xy(center)} L${xy(end)}`)
    result.labels.push({
      key: `axis-${index}`, x: name.x, y: clamp(name.y + 3, 10, height - 8),
      text: text(data[index].label, width < 340 ? 5 : 8), align: Math.abs(name.x - center.x) < 6 ? 'middle' : name.x < center.x ? 'end' : 'start',
    })
  })
  result.polygons = settings.series.map((series, seriesIndex) => {
    const points = values[seriesIndex].map((value, index) => value === null ? null : point(center, scale(value), angles[index]))
    const closed = !settings.dotsOnly && count >= 3 && points.every(Boolean)
    const segments: ChartPoint[][] = []
    let part: ChartPoint[] = []
    for (const dot of points) {
      if (!dot) {
        part = []
        continue
      }
      if (!part.length) segments.push(part)
      part.push(dot)
    }
    const path = settings.dotsOnly ? '' : segments.filter(section => section.length > 1).map(section => pathFor(section)).join(' ') + (closed ? 'Z' : '')
    return { key: series.key, ink: colors[seriesIndex], points, closed, path }
  })
  result.empty = !result.polygons.some(polygon => polygon.points.some(Boolean))
  return result
}

export function drawRadial(settings: RadialChartProps, width: number, height: number): PolarScene {
  const result = scene(width, height, 16)
  const inner = result.radius * clamp(numberAt(settings.innerRadius, .4), 0, .86)
  const outer = result.radius * clamp(numberAt(settings.outerRadius, .92), inner / result.radius + .03, 1)
  const band = (outer - inner) / Math.max(1, settings.data.length)
  const stroke = clamp(numberAt(settings.thickness, band * .7), .25, Math.max(.25, band))
  const startAngle = numberAt(settings.startAngle, -135)
  const start = cycle(startAngle)
  const sweep = clamp(numberAt(settings.endAngle, 135) - startAngle, -360, 360)
  const end = start + sweep
  const preferred = [numberAt(settings.min, 0), numberAt(settings.max, 100)] as const
  const fallback = validDomain(preferred) ? preferred : [0, 100] as const
  settings.data.forEach((item, index) => {
    const current = outer - (index + .5) * band
    const ink = item.color ?? seriesColor(index)
    const value = finite(item.value) ? item.value : null
    const candidates = [numberAt(item.min, fallback[0]), numberAt(item.max, fallback[1])] as const
    const domain = validDomain(candidates) ? candidates : fallback
    const ratio = value === null ? 0 : clamp(fraction(value, domain), 0, 1)
    const finish = start + sweep * ratio
    result.options.push({ key: item.id, label: item.label, items: [{ key: 'value', label: settings.valueLabel ?? 'Value', value, color: ink, unit: item.unit, format: item.format }] })
    result.legend.push({ key: item.id, label: item.label, color: ink })
    result.anchors.push(point(result.center, current, start + (finish - start) * .8))
    const bounds = { inner: current - band / 2, outer: current + band / 2, start, end }
    if (settings.track && sweep) result.guides.push(arcLine(result.center, current, start, end))
    result.marks.push({ key: item.id, index, ink, ...bounds, stroke,
      path: ratio && sweep ? arcLine(result.center, current, start, finish) : '' })
  })
  result.empty = !settings.data.some(item => finite(item.value))
  return result
}

export function pickArc(geometry: PolarScene, x: number, y: number) {
  const dx = x - geometry.center.x
  const dy = y - geometry.center.y
  const radius = Math.hypot(dx, dy)
  const angle = Math.atan2(dx, -dy) / turn
  return geometry.marks.find(mark => radius >= mark.inner && radius <= mark.outer &&
    cycle(mark.end >= mark.start ? angle - mark.start : mark.start - angle) <= Math.abs(mark.end - mark.start))?.index
}

export function pickRadar(geometry: PolarScene, x: number, y: number) {
  const dx = x - geometry.center.x
  const dy = y - geometry.center.y
  if (Math.hypot(dx, dy) > geometry.radius + 14 || !geometry.options.length) return
  return Math.round(cycle(Math.atan2(dx, -dy) / turn) / 360 * geometry.options.length) % geometry.options.length
}
