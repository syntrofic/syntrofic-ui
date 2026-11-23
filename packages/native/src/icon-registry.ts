import { inject, provide, type InjectionKey } from 'nativescript-vue'

export interface NativeIconGlyph {
  glyph: string
  rtl?: string
  variants?: Readonly<Record<string, string | undefined>>
}
export type NativeIconSet = Readonly<Record<string, string | NativeIconGlyph | undefined>>
type Resolve = (name: string) => string | NativeIconGlyph | undefined
const registry: InjectionKey<Resolve> = Symbol('Syntrofic Native Icons')

const defaults = {
  plus: '+', minus: '−', close: '×', check: '✓',
  chevron: { glyph: '›', rtl: '‹' }, chevronDown: '⌄', chevronLeft: '‹', chevronRight: '›',
  search: '⌕', info: 'ⓘ', menu: '☰', more: '⋯', moreHorizontal: '⋯',
  arrowUp: '↑', arrowDown: '↓', arrowsUpDown: '↕', externalLink: '↗',
  success: '✓', warning: '!', error: '×', file: '▤', calendar: '▦', stop: '■',
} satisfies NativeIconSet
export type NativeIconName = keyof typeof defaults

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
    const entry = resolve?.(name) ?? (Object.hasOwn(defaults, name) ? defaults[name as NativeIconName] : undefined)
    if (typeof entry === 'string' || entry === undefined) return entry
    const artwork: NativeIconGlyph = entry
    return (variant ? artwork.variants?.[variant] : undefined) ?? (rtl ? artwork.rtl : undefined) ?? artwork.glyph
  }
}
