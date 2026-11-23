import { computed, inject, onMounted, onScopeDispose, ref, watch, type InjectionKey, type Ref } from 'vue'
import { matchesShortcut } from './keyboard-shortcut'
import type { LinkComponent } from './link-component'
import { routerContext, type RouterConfig } from './router'

export interface NavigationItem {
  id: string
  label: string
  href?: string
  as?: LinkComponent
  target?: string
  disabled?: boolean
  shortLabel?: string
  icon?: string
  iconOnly?: boolean
  selectedIcon?: string
  defaultExpanded?: boolean
  children?: readonly NavigationItem[]
}

export interface SidebarGroup {
  id: string
  label?: string
  items: readonly NavigationItem[]
  collapsible?: boolean
  defaultExpanded?: boolean
}

export interface SidebarPage {
  id: string
  groups: readonly SidebarGroup[]
}

export interface AppShellMobileControls {
  isMobile: Readonly<Ref<boolean>>
  isMobileNavOpen: Readonly<Ref<boolean>>
  mobileNavId: Readonly<Ref<string | undefined>>
  isMobileNavEnabled: Readonly<Ref<boolean>>
  hasAutoToggle: Readonly<Ref<boolean>>
  toggleMobileNav: () => void
  openMobileNav: () => void
  closeMobileNav: () => void
}

export interface AppShellMobileOptions { hasToggle?: boolean }

export interface AppLayoutControls {
  compact: Readonly<Ref<boolean>>
  sidebarAvailable?: Readonly<Ref<boolean>>
  sidebarOpen: Readonly<Ref<boolean>>
  sidebarCollapsed: Readonly<Ref<boolean>>
  asideOpen: Readonly<Ref<boolean>>
  scrollTarget: Readonly<Ref<HTMLElement | null>>
  sidebarId: Readonly<Ref<string | undefined>>
  asideId: Readonly<Ref<string | undefined>>
  toggleSidebar: () => void
  toggleAside: () => void
  mobile?: AppShellMobileControls
}

export const appLayoutContext: InjectionKey<AppLayoutControls> = Symbol('app-layout')
export const sidebarControls: InjectionKey<{
  open: Readonly<Ref<boolean>>
  disabled: Readonly<Ref<boolean>>
  controls: Readonly<Ref<string | undefined>>
  toggle: () => void
}> = Symbol('sidebar controls')
export const mobileNavClose: InjectionKey<() => void> = Symbol('mobile-navigation-close')
export const sideNavDepth: InjectionKey<number> = Symbol('side-navigation-depth')
export const navMenuCommit: InjectionKey<() => void> = Symbol('navigation-menu-commit')
export const topNavCompact: InjectionKey<Readonly<Ref<boolean>>> = Symbol('top-navigation-compact')
export const topNavPopups: InjectionKey<{ claim: (close: () => void) => void; release: (close: () => void) => void }> = Symbol('top-navigation-popups')
export const megaMenuSelect: InjectionKey<(event: MouseEvent, closeOnSelect?: boolean) => void> = Symbol('mega-menu-select')

export function useAppLayout() {
  return inject(appLayoutContext, null)
}

const off = computed(() => false)
const noop = () => {}
const mobileDefaults: AppShellMobileControls = {
  isMobile: off, isMobileNavOpen: off, mobileNavId: computed(() => undefined), isMobileNavEnabled: off, hasAutoToggle: off,
  toggleMobileNav: noop, openMobileNav: noop, closeMobileNav: noop,
}

export function useAppShellMobile() {
  return useAppLayout()?.mobile ?? mobileDefaults
}

export function useShellRouter(local: () => RouterConfig | undefined) {
  const inherited = inject(routerContext, null)
  return computed(() => local() ?? inherited)
}

export function useShellMeasurement(root: Ref<HTMLElement | null>, measure: (element: HTMLElement) => number) {
  const size = ref<number>()
  watch(root, (element, _, onCleanup) => {
    const view = element?.ownerDocument.defaultView
    if (!element || !view) {
      size.value = undefined
      return
    }
    size.value = measure(element)
    let frame = 0
    const observer = new ResizeObserver(() => {
      view.cancelAnimationFrame(frame)
      frame = view.requestAnimationFrame(() => { size.value = measure(element) })
    })
    observer.observe(element)
    onCleanup(() => {
      observer.disconnect()
      view.cancelAnimationFrame(frame)
    })
  }, { flush: 'post' })
  return size
}

export function useShellCompact(root: Ref<HTMLElement | null>, breakpoint: () => number) {
  const width = useShellMeasurement(root, element => element.clientWidth)
  return computed(() => width.value !== undefined && width.value < breakpoint())
}

export function useShellPreference<T>(
  root: Ref<HTMLElement | null>,
  key: () => string | undefined,
  value: Ref<T | undefined>,
  fallback: () => T,
  deserialize: (raw: string) => T | undefined,
  getStorage?: () => Pick<Storage, 'getItem' | 'setItem'> | undefined,
) {
  const saved = ref<T>()
  let mounted = false
  const state = computed({
    get: () => value.value ?? saved.value ?? fallback(),
    set(next: T) {
      saved.value = next
      value.value = next
    },
  })
  const storage = () => getStorage?.() ?? root.value?.ownerDocument.defaultView?.localStorage
  const restore = () => {
    saved.value = undefined
    const name = key()
    if (!mounted || !name || value.value !== undefined) return
    try {
      const serialized = storage()?.getItem(name)
      if (serialized != null) saved.value = deserialize(serialized)
    } catch { /* Storage is optional for private or sandboxed documents. */ }
  }
  onMounted(() => {
    mounted = true
    restore()
  })
  watch(key, restore)
  watch(state, next => {
    const name = key()
    if (!mounted || !name) return
    try { storage()?.setItem(name, JSON.stringify(next)) } catch { /* Keep the in-memory state. */ }
  }, { flush: 'post' })
  return state
}

export function parseShellBoolean(value: string) {
  if (value === 'true') return true
  if (value === 'false') return false
}

export function parseShellWidth(value: string) {
  const width = Number(value)
  if (Number.isFinite(width) && width > 0) return width
}

export function useShellShortcut(
  root: Ref<HTMLElement | null>,
  shortcut: () => string | false,
  toggle: () => void,
) {
  let document: Document | undefined
  function handle(event: KeyboardEvent) {
    const focused = event.target as HTMLElement | null
    if (!document || !focused || !root.value?.contains(focused) ||
      focused.closest('button[disabled], input, textarea, select, [contenteditable]:not([contenteditable="false"])') ||
      !matchesShortcut(event, shortcut(), document)) return
    event.preventDefault()
    toggle()
  }
  onMounted(() => {
    document = root.value?.ownerDocument
    document?.addEventListener('keydown', handle)
  })
  onScopeDispose(() => document?.removeEventListener('keydown', handle))
}
