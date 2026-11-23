export interface KpiChartPoint {
  value: number | null
  label?: string
}

export type KpiDatum = number | null | KpiChartPoint

export interface KpiTrend {
  value: number
  trend?: 'up' | 'down' | 'neutral'
  prefix?: string
  suffix?: string
  locale?: string | string[]
  formatOptions?: Intl.NumberFormatOptions
  directionLabels?: Partial<Record<'up' | 'down' | 'neutral', string>>
  positive?: 'up' | 'down'
  reserve?: number
  indicator?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'soft' | 'solid' | 'outline' | 'plain'
}

export interface SparkPoint extends KpiChartPoint {
  index: number
  x: number
  y: number
}

export function sparkPoints(data: readonly KpiDatum[]): SparkPoint[] {
  const points = data.map(datum => {
    const sample = typeof datum === 'object' && datum !== null ? datum : { value: datum }
    return { label: sample.label, value: typeof sample.value === 'number' && Number.isFinite(sample.value) ? sample.value : null }
  })
  let min = Infinity
  let max = -Infinity
  for (const { value } of points) {
    if (value === null) continue
    min = Math.min(min, value)
    max = Math.max(max, value)
  }

  const range = max - min
  return points.map((point, index) => {
    const normalized = point.value === null || min === max ? .5 : Number.isFinite(range)
      ? (point.value - min) / range
      : (point.value / 2 - min / 2) / (max / 2 - min / 2)
    return {
      ...point,
      index,
      x: points.length < 2 ? 50 : 4 + 92 * index / (points.length - 1),
      y: 85 - 70 * normalized,
    }
  })
}

export function sparkSegments(points: readonly SparkPoint[], connectNulls: boolean) {
  const segments: SparkPoint[][] = []
  let segment: SparkPoint[] = []
  for (const point of points) {
    if (point.value === null) {
      if (!connectNulls) segment = []
      continue
    }
    if (!segment.length) segments.push(segment)
    segment.push(point)
  }
  return segments
}
