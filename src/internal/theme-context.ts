import { computed, getCurrentInstance, inject, onMounted, onScopeDispose, ref, shallowRef, type InjectionKey, type Ref } from 'vue'
import { useMediaQuery } from './interaction'
import { resolveThemeTokens } from './theme-tokens'
import { syntaxPalette, type SyntaxThemeDefinition, type SyntaxThemeToken } from './syntax-theme'
import type { BrandMode, BrandTheme } from '../platform/theme-workspace'

export const themeNameContext: InjectionKey<Readonly<Ref<string | null>>> = Symbol('syntrofic theme name')
export const themeModeContext: InjectionKey<Readonly<Ref<BrandMode>>> = Symbol('syntrofic theme mode')
export const themeDefinitionContext: InjectionKey<Readonly<Ref<BrandTheme>>> = Symbol('syntrofic theme definition')

export function useThemeMode(system = false) {
  const inherited = inject(themeModeContext, null)
  if (inherited) return inherited
  const preference = useMediaQuery('(prefers-color-scheme: dark)')
  const root = ref<BrandMode | 'system'>()
  let observer: MutationObserver | undefined
  onMounted(() => {
    const documentRoot = document.documentElement
    const read = () => {
      const specified = documentRoot.dataset.syTheme ?? documentRoot.style.colorScheme
      root.value = specified === 'light' || specified === 'dark' ? specified : specified === 'system' || specified === 'light dark' ? 'system' : undefined
    }
    read()
    if (typeof MutationObserver !== 'function') return
    observer = new MutationObserver(read)
    observer.observe(documentRoot, { attributeFilter: ['data-sy-theme', 'style'] })
  })
  onScopeDispose(() => observer?.disconnect())
  return computed<BrandMode>(() => {
    if (root.value === 'light' || root.value === 'dark') return root.value
    return (system || root.value === 'system') && preference.value ? 'dark' : 'light'
  })
}

const documentBrands = new WeakMap<Document, { name: Ref<string | null>; observer?: MutationObserver; subscribers: number }>()
function trackDocumentBrand(document: Document) {
  const existing = documentBrands.get(document)
  if (existing) return existing
  const root = document.documentElement
  const name = ref<string | null>(root.dataset.syBrand || null)
  const Observer = document.defaultView?.MutationObserver
  const observer = Observer && new Observer(() => { name.value = root.dataset.syBrand || null })
  observer?.observe(root, { attributeFilter: ['data-sy-brand'] })
  const scope = { name, observer, subscribers: 0 }
  documentBrands.set(document, scope)
  return scope
}

export function useThemeName() {
  const inherited = inject(themeNameContext, null)
  if (inherited) return inherited
  const instance = getCurrentInstance()
  const root = shallowRef<Ref<string | null>>()
  let release: (() => void) | undefined
  onMounted(() => {
    const document = instance?.proxy?.$el?.ownerDocument as Document | undefined ?? globalThis.document
    if (!document) return
    const scope = trackDocumentBrand(document)
    scope.subscribers++
    root.value = scope.name
    release = () => {
      if (--scope.subscribers > 0) return
      scope.observer?.disconnect()
      documentBrands.delete(document)
    }
  })
  onScopeDispose(() => release?.())
  return computed(() => root.value?.value ?? null)
}

export function useTheme() {
  const definition = inject(themeDefinitionContext, null)
  const current = useThemeName()
  const name = computed(() => current.value ?? 'default')
  const mode = useThemeMode()
  const tokens = computed(() => resolveThemeTokens(definition?.value, { mode: mode.value }))
  const token = (key: string) => Object.hasOwn(tokens.value, key) ? tokens.value[key] : undefined
  return { name, mode, tokens, token }
}

export const syntaxThemeContext: InjectionKey<Readonly<Ref<SyntaxThemeDefinition | null>>> = Symbol('syntrofic syntax theme')
export function useSyntaxTheme() {
  const scope = inject(syntaxThemeContext, null)
  const mode = useThemeMode()
  const name = computed(() => scope?.value?.name ?? null)
  const palette = computed(() => syntaxPalette(scope?.value?.tokens ?? {}))
  const tokens = computed(() => syntaxPalette(scope?.value?.tokens ?? {}, mode.value))
  const token = (key: SyntaxThemeToken) => Object.hasOwn(tokens.value, key) ? tokens.value[key] : undefined
  return Object.assign(palette, { name, mode, tokens, token })
}
