import type { NativePalette } from './theme'

export type NativeGlassEffect = 'regular' | 'clear' | 'blur'
export type NativeBackgroundTone = 'base' | 'subtle' | 'muted' | 'sage' | 'blue' | 'canvas' | 'plain'

export function surfaceColor(colors: NativePalette, tone: NativeBackgroundTone) {
  const named = { base: 'surface', subtle: 'surfaceSubtle', muted: 'surfaceMuted', sage: 'surfaceSage', blue: 'surfaceBlue', canvas: 'canvas' } as const
  return tone === 'plain' ? 'transparent' : colors[named[tone]]
}

export function glassEffect(
  effect: NativeGlassEffect,
  active: boolean,
  solid: boolean,
  capabilities: { liquid: boolean; blur: boolean; opaque: boolean },
): NativeGlassEffect | 'solid' {
  if (!active || solid || capabilities.opaque) return 'solid'
  if (effect === 'blur') return capabilities.blur ? 'blur' : 'solid'
  return capabilities.liquid ? effect : 'solid'
}
