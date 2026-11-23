import { Color } from '@nativescript/core'

export const nativeChartColors = ['#668471', '#a46f69', '#758ca1', '#a0804d', '#8a7491', '#68918b', '#a7957f']

export function chartEscape(text: string) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

export function chartInk(value: string | undefined, index: number) {
  if (value) {
    try { return new Color(value).hex } catch { /* Use the default series color. */ }
  }
  return nativeChartColors[index % nativeChartColors.length]
}

export function chartText(text: string, x: number, y: number, color: string, anchor = 'middle') {
  return `<text x="${x}" y="${y}" fill="${color}" text-anchor="${anchor}" dominant-baseline="middle">${chartEscape(text)}</text>`
}

export function chartLine(x1: number, y1: number, x2: number, y2: number, ink: string, dashed = false) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-width="1"${dashed ? ' stroke-dasharray="4 3"' : ''}/>`
}

export function nativeChartHTML(width: number, height: number, data: string) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{padding:0;margin:0;background:transparent;overflow:hidden}svg{display:block;width:100vw;height:100vh;font:11px system-ui,sans-serif}</style></head><body><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${data}</svg></body></html>`
}
