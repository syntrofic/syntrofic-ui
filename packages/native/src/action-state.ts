export type NativeActionStatus = 'idle' | 'running' | 'success' | 'error'
export type NativeMorphDirection = 'top' | 'bottom' | 'start' | 'end' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
export type NativeFabDirection = 'up' | 'down' | 'start' | 'end' | 'auto'

export interface NativeFabAction {
  id: string | number
  label: string
  disabled?: boolean
  accessibilityLabel?: string
}

export const socialProviders = {
  google: 'Google', apple: 'Apple', github: 'GitHub', facebook: 'Facebook', x: 'X',
  microsoft: 'Microsoft', discord: 'Discord', linkedin: 'LinkedIn', slack: 'Slack', notion: 'Notion', linear: 'Linear',
}
export type NativeSocialProvider = keyof typeof socialProviders

export function compactActionSize(labels: readonly string[], size: 'sm' | 'md' | 'lg') {
  const metrics = { sm: { height: 44, font: 13 }, md: { height: 48, font: 15 }, lg: { height: 54, font: 17 } }[size]
  const largest = labels.reduce((width, label) => Math.max(width,
    Array.from(label).reduce((units, character) => units + (character.codePointAt(0)! > 0x2e7f ? 1 : .66), 0)), 0)
  return { height: metrics.height, width: Math.max(metrics.height, Math.ceil(largest * metrics.font + 33)) }
}

export function actionRatio(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

export function holdRatio(start: number, current: number, duration: number) {
  const span = Number.isFinite(duration) ? Math.max(1, duration) : 1800
  return actionRatio((current - start) / span)
}

export function slideRatio(start: number, current: number, travel: number, reversed = false) {
  return travel > 0 ? actionRatio((current - start) / travel * (reversed ? -1 : 1)) : 0
}

export function slideCompleted(value: number, threshold: number) {
  const limit = Number.isFinite(threshold) ? Math.min(1, Math.max(.05, threshold)) : .85
  return actionRatio(value) >= limit
}

export function morphOrigin(direction: NativeMorphDirection, rtl = false) {
  const horizontal = direction.includes('start') ? (rtl ? 0 : 1) : direction.includes('end') ? (rtl ? 1 : 0) : .5
  return { x: horizontal, y: direction.startsWith('top') ? 1 : direction.startsWith('bottom') ? 0 : .5 }
}

export function placeMorph(
  viewport: { width: number; height: number },
  anchor: { x: number; y: number; width: number; height: number },
  panel: { width: number; height: number },
  origin: { x: number; y: number },
  inset: number,
) {
  const width = Math.min(panel.width, Math.max(1, viewport.width - inset * 2))
  const height = Math.min(panel.height, Math.max(1, viewport.height - inset * 2))
  const x = anchor.x + (anchor.width - width) * origin.x
  const y = anchor.y + (anchor.height - height) * origin.y
  return {
    width, height,
    x: Math.max(inset, Math.min(x, viewport.width - width - inset)),
    y: Math.max(inset, Math.min(y, viewport.height - height - inset)),
  }
}
