import { domainFor, fraction } from '../charts/values'
import type { AgentEntry, AgentNodeKind } from './schema'

type Mark = {
  id: string
  label: string
  color: number
  opacity?: number
  text?: { value: string; x: number; y: number }
} & (
  { kind: 'rect'; x: number; y: number; w: number; h: number } |
  { kind: 'point'; x: number; y: number; radius: number } |
  { kind: 'path'; path: string; stroke?: number }
)

export const customPlots: readonly AgentNodeKind[] = ['candlestick-chart', 'funnel-chart', 'sunburst-chart', 'sankey-chart', 'scatter-chart', 'heatmap', 'diagram']
const numeric = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : undefined
const positive = (value: unknown) => Math.max(0, numeric(value) ?? 0)
export function agentMarks(kind: AgentNodeKind, entries: readonly AgentEntry[]): Mark[] {
  if (kind === 'diagram') {
    const step = 480 / Math.max(1, entries.length)
    return entries.flatMap((entry, index) => {
      const x = 20 + index * step
      const label = entry.detail ? entry.label + ' · ' + entry.detail : entry.label
      const node: Mark = { kind: 'rect', id: entry.id, label, color: index, opacity: .32, x, y: 60,
        w: step * .77, h: 53, text: { value: entry.label, x: x + step * .385, y: 88 } }
      if (index === entries.length - 1) return [node]
      const from = x + step * .79
      const target = x + step - 2
      return [node, { kind: 'path', id: entry.id + '-link', label, color: 0, stroke: 1.2,
        path: `M${from},86 H${target} M${target - 6},82 L${target},86 L${target - 6},90` }]
    })
  }
  if (kind === 'candlestick-chart') {
    const values = entries.flatMap(entry => {
      const open = numeric(entry.values?.open), close = numeric(entry.values?.close)
      const low = numeric(entry.values?.low), high = numeric(entry.values?.high)
      return open === undefined || close === undefined || low === undefined || high === undefined || low > Math.min(open, close) || high < Math.max(open, close)
        ? [] : [{ entry, open, close, low, high }]
    })
    const domain = domainFor(values.flatMap(value => [value.low, value.high]))
    const y = (value: number) => 150 - 130 * fraction(value, domain)
    const step = 468 / Math.max(1, values.length)
    return values.flatMap(({ entry, open, close, low, high }, index) => {
      const x = 26 + step * (index + .5)
      const color = close >= open ? 0 : 1
      const label = `${entry.label} · 开 ${open} · 高 ${high} · 低 ${low} · 收 ${close}`
      return [
        { kind: 'path', id: entry.id + '-wick', label, color, path: `M${x},${y(low)} V${y(high)}`, stroke: 2 },
        { kind: 'rect', id: entry.id, label, color, x: x - Math.min(step * .3, 16), y: y(Math.max(open, close)), w: Math.min(step * .6, 32),
          h: Math.max(2, Math.abs(y(open) - y(close))), text: { value: entry.label, x, y: 170 } },
      ]
    })
  }
  if (kind === 'scatter-chart') {
    const rows = entries.flatMap(entry => {
      const x = numeric(entry.values?.x), y = numeric(entry.values?.y)
      return x === undefined || y === undefined ? [] : [{ entry, x, y }]
    })
    const xscale = domainFor(rows.map(row => row.x))
    const yscale = domainFor(rows.map(row => row.y))
    const groups = [...new Set(rows.map(row => row.entry.values?.group))]
    return rows.map(({ entry, x, y }) => ({
      kind: 'point', id: entry.id, label: `${entry.label} · ${x}, ${y}`, color: groups.indexOf(entry.values?.group),
      x: 28 + fraction(x, xscale) * 464, y: 151 - fraction(y, yscale) * 126,
      radius: Math.max(4, Math.min(14, Math.sqrt(positive(entry.values?.size)) + 4)), opacity: .85,
    }))
  }
  if (kind === 'heatmap') {
    const cols = [...new Set(entries.map(entry => String(entry.values?.column ?? entry.label)))]
    const rows = [...new Set(entries.map(entry => String(entry.values?.row ?? '')))]
    const max = Math.max(1, ...entries.map(entry => positive(entry.value)))
    const width = 430 / Math.max(cols.length, 1), height = 132 / Math.max(rows.length, 1)
    return entries.map(entry => {
      const col = cols.indexOf(String(entry.values?.column ?? entry.label)), row = rows.indexOf(String(entry.values?.row ?? ''))
      const x = 68 + col * width, y = 10 + row * height
      return { kind:'rect', id:entry.id, label:`${rows[row]} · ${cols[col]} · ${entry.value ?? '—'}`,
        color: 0, opacity: .13 + .87 * positive(entry.value) / max, x, y, w: Math.max(1, width - 3), h: Math.max(1, height - 3),
        text: { value: String(entry.value ?? '—'), x: x + width / 2, y: y + height / 2 } }
    })
  }
  if (kind === 'funnel-chart') {
    const max = Math.max(1, ...entries.map(entry => positive(entry.value)))
    const step = 142 / Math.max(entries.length, 1)
    return entries.map((entry, index) => {
      const w = Math.max(2, 420 * positive(entry.value) / max)
      const next = Math.max(2, 420 * positive(entries[index + 1]?.value ?? entry.value) / max)
      const y = 12 + index * step
      return { kind:'path', id:entry.id, label:`${entry.label} · ${entry.value ?? 0}`, color:index, opacity:.85,
        path:`M${260 - w / 2},${y} H${260 + w / 2} L${260 + next / 2},${y + step - 2} H${260 - next / 2} Z`,
        text:{value:entry.label,x:260,y:y + step / 2} }
    })
  }
  if (kind === 'sankey-chart') {
    const links = entries.filter(entry => typeof entry.values?.source === 'string' && typeof entry.values?.target === 'string' && positive(entry.value))
    const left = [...new Set(links.map(link => String(link.values?.source)))]
    const right = [...new Set(links.map(link => String(link.values?.target)))]
    const max = Math.max(1, ...links.map(entry => positive(entry.value)))
    return links.map((entry, index) => {
      const a = left.indexOf(String(entry.values?.source)), b = right.indexOf(String(entry.values?.target))
      const y1 = 21 + (a + .5) * 137 / left.length, y2 = 21 + (b + .5) * 137 / right.length
      return { kind:'path', id:entry.id, label:`${left[a]} → ${right[b]} · ${entry.value}`, color:index, opacity:.62,
        path:`M110,${y1} C240,${y1} 280,${y2} 405,${y2}`, stroke:Math.max(2, 32 * positive(entry.value) / max),
        text:{value:`${left[a]} → ${right[b]}`,x:260,y:(y1+y2)/2 - 9} }
    })
  }
  const marks: Mark[] = []
  const point = (r: number, a: number) => `${260 + Math.sin(a) * r},${88 - Math.cos(a) * r}`
  function rings(rows: readonly AgentEntry[], start: number, span: number, level: number, parent: string) {
    const total = rows.reduce((sum, row) => sum + positive(row.value), 0)
    if (!total || level > 3) return
    let cursor = start
    rows.forEach((row,index) => {
      const sweep = span * positive(row.value) / total
      if (sweep <= 0) return
      const radius = 16 + level * 17
      const end = cursor + Math.min(2 * Math.PI - .001, sweep) - Math.min(.022, sweep * .05)
      const key = parent + row.id
      marks.push({ kind:'path', id:key, label:`${row.label} · ${row.value}`, color:index + level, stroke:15,
        path:`M${point(radius,cursor)} A${radius},${radius} 0 ${end-cursor > Math.PI ? 1 : 0} 1 ${point(radius,end)}` })
      if (row.children?.length) rings(row.children, cursor, sweep, level + 1, key + '/')
      cursor += sweep
    })
  }
  rings(entries, 0, 2 * Math.PI, 1, '')
  return marks
}
