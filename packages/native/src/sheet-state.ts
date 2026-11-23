export type NativeSheetDetent = 'auto' | 'peek' | number

export function sheetDetents(values?: readonly NativeSheetDetent[]) {
  const valid = (values ?? []).filter(value => value === 'auto' || value === 'peek'
    || Number.isFinite(value) && value > 0 && value <= 1).slice(0, 3)
  return valid.length ? valid : ['auto' as const]
}

export function sheetIndex(index: number | undefined, length: number) {
  return typeof index === 'number' && Number.isFinite(index) ? Math.min(length - 1, Math.max(0, Math.trunc(index))) : 0
}

export function sheetHeights(detents: readonly NativeSheetDetent[], viewport: number, chrome: number, content: number) {
  const ceiling = Math.max(detents.length, Math.round(viewport))
  const fixed = Math.max(1, Math.round(chrome))
  const desired = detents.map(detent => {
    const height = detent === 'peek' ? fixed : detent === 'auto' ? fixed + Math.max(0, content) : Math.max(fixed, detent * ceiling)
    return Math.max(1, Math.min(ceiling, Math.round(height)))
  })
  let cap = ceiling
  for (let index = desired.length - 1; index >= 0; index--) {
    desired[index] = Math.max(index + 1, Math.min(cap, desired[index]))
    cap = desired[index] - 1
  }
  return desired
}
