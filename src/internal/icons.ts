import { computed, inject, provide, shallowRef, toValue, type Component, type InjectionKey, type MaybeRefOrGetter } from 'vue'
import { useThemeName } from './theme-context'

import { getSyntroficIcon, syntroficIconViewBox, type iconAliases, type SyntroficIconName } from '../icons/artwork'

type CamelCase<Name extends string> = Name extends `${infer Head}-${infer Tail}` ? `${Head}${Capitalize<CamelCase<Tail>>}` : Name
export type IconName = SyntroficIconName | CamelCase<SyntroficIconName> | keyof typeof iconAliases
export type SemanticIconSize = 'xsm' | 'sm' | 'md' | 'lg'
export interface IconArtwork { path: string; viewBox?: string; mirror?: boolean; fill?: string }
export interface IconDefinition extends IconArtwork { variants?: Readonly<Record<string, string | IconArtwork | undefined>> }
export interface IconRequest { size: SemanticIconSize | number | string; variant?: string }
export type IconSource = string | IconDefinition | { component: Component }
export type IconEntry = IconSource | ((request: IconRequest) => IconSource | undefined)
export type IconSet = Readonly<Record<string, IconEntry | undefined>>
type ResolveIcon = (name: string) => IconEntry | undefined
const registry: InjectionKey<ResolveIcon> = Symbol('syntrofic icon set')
const iconSize: InjectionKey<MaybeRefOrGetter<SemanticIconSize | number | string | undefined>> = Symbol('syntrofic icon size')
const registrations = shallowRef<readonly { theme?: string; icons: IconSet }[]>([])

export function provideIconSize(size: MaybeRefOrGetter<SemanticIconSize | number | string | undefined>) { provide(iconSize, size) }
export function useIconSize() { return inject(iconSize, undefined) }

export function registerIcons(icons: IconSet, options: { theme?: string } = {}) {
  const record = { theme: options.theme, icons: { ...icons } }
  registrations.value = [...registrations.value, record]
  return () => { registrations.value = registrations.value.filter(entry => entry !== record) }
}

function registeredIcon(name: string, theme?: string) {
  for (let index = registrations.value.length - 1; index >= 0; index--) {
    const entry = registrations.value[index]
    if (entry.theme === theme && Object.hasOwn(entry.icons, name)) return entry.icons[name]
  }
}

export function provideIcons(definitions: MaybeRefOrGetter<IconSet>, theme?: MaybeRefOrGetter<string | undefined>) {
  const inherited = inject(registry, undefined)
  provide(registry, name => {
    const entries = toValue(definitions)
    if (Object.hasOwn(entries, name)) return entries[name]
    const current = toValue(theme)
    return (current === undefined ? undefined : registeredIcon(name, current)) ?? inherited?.(name)
  })
}

export function useIcon(name: MaybeRefOrGetter<string | undefined>, variant?: MaybeRefOrGetter<string | undefined>,
  size: MaybeRefOrGetter<IconRequest['size']> = 'md',
) {
  const resolve = inject(registry, undefined)
  const theme = useThemeName()
  const source = computed(() => {
    const key = toValue(name)
    if (!key) return
    const variantName = toValue(variant)
    const candidate = resolve?.(key) ?? (theme.value ? registeredIcon(key, theme.value) : undefined) ?? registeredIcon(key)
    if (candidate !== undefined) return typeof candidate === 'function' ? candidate({ size: toValue(size), variant: variantName }) : candidate
    const builtin = getSyntroficIcon(key)
    return builtin && { path: builtin.path, viewBox: syntroficIconViewBox, fill: 'currentColor' }
  })
  const artwork = computed((): IconArtwork | undefined => {
    const entry = source.value
    if (typeof entry === 'string') return { path: entry }
    if (!entry || 'component' in entry) return
    const alternate = entry?.variants?.[toValue(variant) ?? '']
    if (typeof alternate === 'string') return { ...entry, path: alternate }
    return alternate ? { ...entry, ...alternate } : entry
  })
  const component = computed(() => {
    const entry = source.value
    return entry && typeof entry !== 'string' && 'component' in entry ? entry.component : undefined
  })
  return Object.assign(artwork, { component })
}
