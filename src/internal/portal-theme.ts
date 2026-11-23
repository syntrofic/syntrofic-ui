import { computed, createCommentVNode, defineComponent, inject, normalizeStyle, provide, shallowRef, toValue, useAttrs, useId, watch, type InjectionKey, type MaybeRefOrGetter, type Ref } from 'vue'
import type { BrandMode } from '../platform/theme-workspace'
import { reducedMotionAttribute, reducedMotionQuery, themeReducesMotion } from './reduced-motion'

type ScopedRules = (selector: string) => string

interface SurfaceAppearance {
  brand?: string
  mode: BrandMode
  rules: ScopedRules
  style?: Record<string, string>
  reducedMotion?: boolean
}

interface ThemeSurface extends SurfaceAppearance {
  root: HTMLElement | null
  style: Record<string, string>
}

export interface PortalTheme {
  brand?: string
  mode?: string
  rules?: ScopedRules
  style: Record<string, string>
  reducedMotion?: boolean
}

type PortalTarget = HTMLElement | string | null | undefined
const selector = '[data-sy-brand], [data-sy-theme]'
const themeSurface: InjectionKey<Readonly<Ref<ThemeSurface | undefined>>> = Symbol('syntrofic theme surface')
export const ThemePortalOrigin = defineComponent(() => () => createCommentVNode('sy-theme-origin'))

export function useThemeScopeId() {
  const id = 'sy-' + encodeURIComponent(useId())
  return { id, selector: `[data-sy-scope-id="${id}"]` }
}

export function provideThemeSurface(root: Readonly<Ref<HTMLElement | null>>, appearance: () => SurfaceAppearance | undefined) {
  const parent = inject(themeSurface, null)
  const attrs = useAttrs()
  const inline = shallowRef<Record<string, string>>()
  watch(root, (node, _, cleanup) => {
    if (!node) { inline.value = undefined; return }
    const read = () => {
      const style = Object.fromEntries(Array.from(node.style).flatMap(name => {
        if (!name.startsWith('--')) return []
        const value = node.style.getPropertyValue(name)
        const priority = node.style.getPropertyPriority(name)
        return [[name, priority ? value + ' !important' : value]]
      }))
      const previous = inline.value
      if (!previous || Object.keys(previous).length !== Object.keys(style).length ||
          Object.entries(style).some(([name, value]) => previous[name] !== value)) inline.value = style
    }
    read()
    const Observer = node.ownerDocument.defaultView?.MutationObserver
    if (!Observer) return
    const observer = new Observer(read)
    observer.observe(node, { attributes: true, attributeFilter: ['style'] })
    cleanup(() => observer.disconnect())
  }, { flush: 'post' })
  provide(themeSurface, computed(() => {
    const active = appearance()
    if (!active) return parent?.value
    const style = inline.value ?? Object.fromEntries(Object.entries(normalizeStyle([active.style, attrs.style]) ?? {}).flatMap(([name, value]) =>
      name.startsWith('--') && (typeof value === 'string' || typeof value === 'number') ? [[name, String(value)]] : []))
    return { root: root.value, ...active, style }
  }))
}

function hostScope(target: PortalTarget, document: Document) {
  const host = typeof target === 'string' ? document.querySelector(target) : target
  return host?.closest(selector) ?? null
}

/** Carry inherited theme tokens separately from the component's own rules. */
export function usePortalTheme(target: MaybeRefOrGetter<PortalTarget>,
  origin?: MaybeRefOrGetter<HTMLElement | null | undefined>) {
  const surface = inject(themeSurface, null)
  const markup = shallowRef<PortalTheme & { root: Element }>()
  const markupMotion = shallowRef(false)
  watch([() => toValue(origin), () => toValue(target), () => surface?.value?.root], ([node, destination, owner], _, cleanup) => {
    markup.value = undefined
    markupMotion.value = false
    const view = node?.ownerDocument.defaultView
    if (!node || !destination || !view) return
    const read = () => {
      markupMotion.value = themeReducesMotion(node)
      const root = node.closest(selector)
      const shell = node.closest('[data-sy-portal-scope]')
      const nestedInPortal = root && shell !== root && shell?.contains(root)
      if (!root || owner && (root === owner || !owner.contains(root) && !nestedInPortal)) { markup.value = undefined; return }
      const brandRoot = root.closest('[data-sy-brand]')
      const modeRoot = root.closest('[data-sy-theme]')
      const style = root === hostScope(destination, node.ownerDocument) ? undefined : view.getComputedStyle(root)
      markup.value = {
        root,
        brand: brandRoot?.getAttribute('data-sy-brand') ?? undefined,
        mode: modeRoot?.getAttribute('data-sy-theme') ?? undefined,
        rules: brandRoot === owner ? surface?.value?.rules : undefined,
        reducedMotion: markupMotion.value,
        style: style ? Object.fromEntries(Array.from(style).filter(name => name.startsWith('--'))
          .map(name => [name, style.getPropertyValue(name)])) : {},
      }
      return root
    }
    const root = read()
    const observer = new view.MutationObserver(read)
    const carriesTokens = root && root !== hostScope(destination, node.ownerDocument)
    for (let ancestor: HTMLElement | null = node; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor, { attributes: true, attributeFilter: carriesTokens
        ? ['data-sy-brand', 'data-sy-theme', 'class', 'style', 'dir', reducedMotionAttribute] : [reducedMotionAttribute] })
    }
    const preferences = (carriesTokens ? ['(prefers-color-scheme: dark)', reducedMotionQuery, '(pointer: coarse)'] : [])
      .map(query => view.matchMedia(query))
    for (const query of preferences) query.addEventListener('change', read)
    if (carriesTokens) view.addEventListener('resize', read, { passive: true })
    cleanup(() => {
      observer.disconnect()
      for (const query of preferences) query.removeEventListener('change', read)
      view.removeEventListener('resize', read)
    })
  }, { flush: 'post' })
  return computed<PortalTheme | undefined>(() => {
    const source = markup.value ?? surface?.value
    const destination = toValue(target)
    if (!destination) return
    const node = toValue(origin) ?? source?.root
    const reducedMotion = markupMotion.value || source?.reducedMotion === true
    if (source && (!source.root || hostScope(destination, source.root.ownerDocument) !== source.root)) return { ...source, reducedMotion }
    if (!reducedMotion || !node) return
    const host = typeof destination === 'string' ? node.ownerDocument.querySelector(destination) : destination
    if (!themeReducesMotion(host)) return { style: {}, reducedMotion }
  })
}
