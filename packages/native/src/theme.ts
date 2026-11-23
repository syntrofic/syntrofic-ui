import { dark, geometry, light, motion } from './theme-values'

export type NativeAppearance = 'light' | 'dark'
export type NativeDirection = 'ltr' | 'rtl'
export type NativeMotion = 'system' | 'full' | 'reduced'
export type NativeSurfaceMaterial = 'solid' | 'glass'
export type NativePalette = { readonly [Key in keyof typeof light]: string }

export type NativeGeometry = { readonly [Key in keyof typeof geometry]: number }

export interface NativeTheme {
  readonly appearance: NativeAppearance
  readonly colors: NativePalette
  readonly geometry: NativeGeometry
  readonly motion: typeof motion
}

export function createNativeTheme(appearance: NativeAppearance = 'light', colors?: Partial<NativePalette>, sizing?: Partial<NativeGeometry>): NativeTheme {
  const palette = appearance === 'dark' ? dark : light
  return { appearance, colors: { ...palette, ...colors }, geometry: { ...geometry, ...sizing }, motion }
}
