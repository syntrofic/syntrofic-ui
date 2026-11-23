import { computed, inject, provide, shallowRef, toValue, type Component, type InjectionKey, type MaybeRefOrGetter } from 'vue'
import { useThemeName } from './theme-context'

export const iconPaths = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'm6 6 12 12M18 6 6 18',
  check: 'm5 12 4 4L19 6',
  chevron: 'm9 5 7 7-7 7',
  chevronDown: 'm5 9 7 7 7-7',
  chevronLeft: 'm15 5-7 7 7 7',
  chevronRight: 'm9 5 7 7-7 7',
  chevronsLeft: 'm13 5-7 7 7 7m5-14-7 7 7 7',
  chevronsRight: 'm6 5 7 7-7 7m5-14 7 7-7 7',
  search: 'M16 10.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Zm-1 4.5 4 4',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0',
  microphone: 'M9 6a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V6Zm-3 5v1a6 6 0 0 0 12 0v-1m-6 7v3m-3 0h6',
  stop: 'M6 6h12v12H6z',
  info: 'M12 11v5m0-8v.1m9 3.9a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  more: 'M5 12v.01M12 12v.01M19 12v.01',
  moreHorizontal: 'M5 12v.01M12 12v.01M19 12v.01',
  calendar: 'M4 7h16v13H4zM8 4v5m8-5v5M4 11h16',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-5v5l3 2',
  externalLink: 'M13 5h6v6m0-6-9 9m7-1v6H5V7h6',
  upload: 'M12 16V4m-5 5 5-5 5 5m-12 6v5h14v-5',
  arrowUp: 'M12 20V4M6 10l6-6 6 6',
  arrowDown: 'M12 4v16m-6-6 6 6 6-6',
  arrowsUpDown: 'M8 19V5m-4 4 4-4 4 4m4-4v14m-4-4 4 4 4-4',
  funnel: 'M4 5h16l-6 7v6l-4 2v-8L4 5z',
  eyeSlash: 'M3 3l18 18M8.4 8.4a5 5 0 0 0 7.2 7.2M3 12s3.2-6 9-6 9 6 9 6a14 14 0 0 1-2 2.6M9 18a8 8 0 0 1-6-6',
  viewColumns: 'M4 5h16v14H4zM10 5v14m5-14v14',
  copy: 'M8 8h11v12H8zM5 15H4V4h11v1',
  checkDouble: 'm3 12 4 4L17 6m-5 10 2 2 7-7',
  wrench: 'M19 4l-4 4 1 2 2 1 4-4a6 6 0 0 1-8 7L7 21l-4-4 7-7a6 6 0 0 1 9-6Z',
  link: 'm10 14 4-4m-7 0-2 2a4.95 4.95 0 0 0 7 7l2-2m-4-10 2-2a4.95 4.95 0 0 1 7 7l-2 2',
  file: 'M6 3h8l4 4v14H6V3Zm8 0v5h4M9 13h6m-6 4h6',
  home: 'M3 11 12 4l9 7M6 10v10h12V10m-7 10v-5h2v5',
  folder: 'M3 6h7l2 2h9v11H3zM3 11h18',
  users: 'M14 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 19v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1m-1-14a3 3 0 0 1 0 6m2 3a4 4 0 0 1 3 4v1',
  lock: 'M6 10h12v10H6zM9 10V7a3 3 0 0 1 6 0v3m-3 4v2',
  archive: 'M4 5h16v4H4zM5 9v10h14V9m-9 4h4',
  book: 'M12 7C9 5 6 5 3 6v13c3-1 6-1 9 1 3-2 6-2 9-1V6c-3-1-6-1-9 1Zm0 0v13',
  sidebar: 'M4 5h16v14H4zM9 5v14m-3-9h1m-1 3h1',
  image: 'M4 5h16v14H4zM4 16l4-4 4 4 3-3 5 5M15 9h.01',
  user: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1',
  success: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-13 0 2.5 2.5 5-5',
  warning: 'M12 4 3 20h18L12 4Zm0 6v4m0 2.5v.1',
  error: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-12-3 6 6m0-6-6 6',
}
export type IconName = keyof typeof iconPaths
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
    const candidate = resolve?.(key) ?? (theme.value ? registeredIcon(key, theme.value) : undefined)
      ?? registeredIcon(key) ?? (Object.hasOwn(iconPaths, key) ? iconPaths[key as IconName] : undefined)
    return typeof candidate === 'function' ? candidate({ size: toValue(size), variant: variantName }) : candidate
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
