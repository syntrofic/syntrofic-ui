import { inject, provide, type InjectionKey } from 'nativescript-vue'
import { nativeIconFont, nativeIconGlyphs } from './icon-glyphs'

export interface NativeIconGlyph {
  glyph: string
  rtl?: string
  variants?: Readonly<Record<string, string | undefined>>
}
export type NativeIconSet = Readonly<Record<string, string | NativeIconGlyph | undefined>>
type Resolve = (name: string) => string | NativeIconGlyph | undefined
const registry: InjectionKey<Resolve> = Symbol('Syntrofic Native Icons')

export type NativeIconName = keyof typeof nativeIconGlyphs

export function provideNativeIcons(icons: NativeIconSet | (() => NativeIconSet)) {
  const parent = inject(registry, undefined)
  provide(registry, name => {
    const scope = typeof icons === 'function' ? icons() : icons
    return Object.hasOwn(scope, name) ? scope[name] : parent?.(name)
  })
}
export function useNativeIconGlyph() {
  const resolve = inject(registry, undefined)
  return (name: string, rtl: boolean, variant?: string) => {
    const entry = resolve?.(name)
    if (typeof entry === 'string') return { glyph: entry }
    if (entry) return { glyph: (variant ? entry.variants?.[variant] : undefined) ?? (rtl ? entry.rtl : undefined) ?? entry.glyph }
    if (!Object.hasOwn(nativeIconGlyphs, name)) return
    return { glyph: nativeIconGlyphs[name as NativeIconName], fontFamily: nativeIconFont, mirror: name === 'chevron' && rtl }
  }
}
