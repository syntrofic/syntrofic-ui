import type { InjectionKey, Ref } from 'vue'

export type LayoutSize = number | string
export interface LayoutDimensions {
  width?: LayoutSize
  height?: LayoutSize
  maxWidth?: LayoutSize
  minHeight?: LayoutSize
}
export interface LayoutPadding {
  padding?: LayoutSize
  paddingInline?: LayoutSize
  paddingInlineStart?: LayoutSize
  paddingInlineEnd?: LayoutSize
  paddingBlock?: LayoutSize
  paddingBlockStart?: LayoutSize
  paddingBlockEnd?: LayoutSize
}
export type LayoutInsets = {
  paddingInlineStart: string
  paddingInlineEnd: string
  paddingBlockStart: string
  paddingBlockEnd: string
}
export const layoutPaddingContext: InjectionKey<Readonly<Ref<LayoutInsets>>> = Symbol('layout padding')
export const noLayoutPadding = { paddingInlineStart: '0px', paddingInlineEnd: '0px', paddingBlockStart: '0px', paddingBlockEnd: '0px' }

export function layoutSize(value?: LayoutSize) {
  return typeof value === 'number' ? Number.isFinite(value) ? `${Math.max(0, value)}px` : undefined : value
}

export function layoutDimensions(options: LayoutDimensions) {
  return { inlineSize: layoutSize(options.width), blockSize: layoutSize(options.height),
    maxInlineSize: layoutSize(options.maxWidth), minBlockSize: layoutSize(options.minHeight) }
}

function space(value?: LayoutSize) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6) return `var(--sy-space-${value})`
  return typeof value === 'number' ? layoutSize(value * 4) : value
}

export function layoutPadding(options: LayoutPadding, fallback: LayoutInsets = noLayoutPadding): LayoutInsets {
  const all = space(options.padding)
  const inline = space(options.paddingInline) ?? all
  const block = space(options.paddingBlock) ?? all
  return {
    paddingInlineStart: space(options.paddingInlineStart) ?? inline ?? fallback.paddingInlineStart,
    paddingInlineEnd: space(options.paddingInlineEnd) ?? inline ?? fallback.paddingInlineEnd,
    paddingBlockStart: space(options.paddingBlockStart) ?? block ?? fallback.paddingBlockStart,
    paddingBlockEnd: space(options.paddingBlockEnd) ?? block ?? fallback.paddingBlockEnd,
  }
}

export function fullBleed(insets?: LayoutInsets) {
  if (!insets) return {}
  return {
    marginInlineStart: `calc(-1 * ${insets.paddingInlineStart})`,
    marginInlineEnd: `calc(-1 * ${insets.paddingInlineEnd})`,
    marginBlockStart: `calc(-1 * ${insets.paddingBlockStart})`,
    marginBlockEnd: `calc(-1 * ${insets.paddingBlockEnd})`,
  }
}
