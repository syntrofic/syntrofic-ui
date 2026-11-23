<script setup lang="ts">
import { computed, provide, ref, useId, useSlots, watch, type CSSProperties } from 'vue'
import SDrawer from './SDrawer.vue'
import SMobileNavToggle from './SMobileNavToggle.vue'
import SShellResizeHandle from '../internal/SShellResizeHandle.vue'
import { layoutPadding, type LayoutSize } from '../internal/layout-spacing'
import { routerContext, type RouterConfig } from '../internal/router'
import {
  appLayoutContext, parseShellBoolean, parseShellWidth, useShellCompact, useShellPreference, useShellRouter,
  useShellMeasurement, useShellShortcut, type AppShellMobileOptions,
} from '../internal/shell-layout'

const props = withDefaults(defineProps<{
  breakpoint?: number
  sidebarMode?: 'rail' | 'offcanvas' | 'none'
  sidebarSide?: 'start' | 'end'
  variant?: 'default' | 'inset' | 'floating'
  defaultSidebarOpen?: boolean
  defaultAsideOpen?: boolean
  asideMobile?: 'drawer' | 'hide'
  mobileNav?: AppShellMobileOptions | false
  sidebarSize?: number
  asideSize?: number
  railSize?: number
  sidebarMin?: number
  sidebarMax?: number
  asideMin?: number
  asideMax?: number
  resizeSidebar?: boolean
  resizeAside?: boolean
  scrollMode?: 'page' | 'content'
  contentPadding?: LayoutSize
  stickyNavbar?: boolean
  height?: string
  stickyOffset?: string
  storageKey?: string
  toggleShortcut?: string | false
  sidebarTitle?: string
  asideTitle?: string
  dismissLabel?: string
  sidebarResizeLabel?: string
  asideResizeLabel?: string
  mainLabel?: string
  navigate?: RouterConfig['navigate']
  useHref?: RouterConfig['useHref']
}>(), {
  breakpoint: 760,
  sidebarMode: 'rail',
  sidebarSide: 'start',
  variant: 'default',
  defaultSidebarOpen: true,
  defaultAsideOpen: true,
  asideMobile: 'drawer',
  mobileNav: undefined,
  sidebarSize: 224,
  asideSize: 214,
  railSize: 52,
  sidebarMin: 160,
  sidebarMax: 360,
  asideMin: 160,
  asideMax: 340,
  stickyNavbar: true,
  scrollMode: 'page',
  stickyOffset: '0px',
  toggleShortcut: 'mod+b',
  sidebarTitle: 'Workspace navigation',
  asideTitle: 'Page details',
  dismissLabel: 'Close',
  sidebarResizeLabel: 'Resize navigation',
  asideResizeLabel: 'Resize details',
})

const sidebarModel = defineModel<boolean | undefined>('sidebarOpen', { default: undefined })
const asideModel = defineModel<boolean | undefined>('asideOpen', { default: undefined })
const mobileSidebar = defineModel<boolean>('mobileSidebarOpen', { default: false })
const mobileAside = defineModel<boolean>('mobileAsideOpen', { default: false })
const sidebarWidth = defineModel<number>('sidebarWidth')
const asideWidth = defineModel<number>('asideWidth')
const root = ref<HTMLElement | null>(null)
const navbar = ref<HTMLElement | null>(null)
const navbarHeight = useShellMeasurement(navbar, element => element.offsetHeight)
const main = ref<HTMLElement | null>(null)
const sidebar = ref<HTMLElement | null>(null)
const aside = ref<HTMLElement | null>(null)
const drawerSide = ref<'left' | 'right'>('left')
const dragging = ref(false)
const slots = useSlots()
const id = useId()
const compact = useShellCompact(root, () => props.breakpoint)
const hasSidebar = computed(() => !!slots.sidebar || (compact.value && !!slots.mobileSidebar))
const hasAside = computed(() => !!slots.aside || (compact.value && !!slots.mobileAside))
const isMobileNavEnabled = computed(() => props.mobileNav !== false && !slots.mobileNav && Boolean(slots.sidebar || slots.mobileSidebar))
const hasAutoToggle = computed(() => isMobileNavEnabled.value && props.mobileNav !== false && props.mobileNav?.hasToggle !== false)
const isMobileNavOpen = computed(() => compact.value && isMobileNavEnabled.value && mobileSidebar.value)
const mobileNavId = computed(() => isMobileNavEnabled.value ? `${id}-sidebar-drawer` : undefined)
const desktopSidebar = useShellPreference(root, () => storage('sidebar'), sidebarModel, () => props.defaultSidebarOpen, parseShellBoolean)
const desktopAside = useShellPreference(root, () => storage('aside'), asideModel, () => props.defaultAsideOpen, parseShellBoolean)
const storedSidebarWidth = useShellPreference(root, () => storage('sidebar-width'), sidebarWidth, () => props.sidebarSize, parseShellWidth)
const storedAsideWidth = useShellPreference(root, () => storage('aside-width'), asideWidth, () => props.asideSize, parseShellWidth)
const sidebarOpen = computed(() => hasSidebar.value && (compact.value ? isMobileNavOpen.value :
  props.sidebarMode === 'none' || desktopSidebar.value))
const asideOpen = computed(() => hasAside.value && (compact.value ? props.asideMobile === 'drawer' && mobileAside.value : desktopAside.value))
const sidebarCollapsed = computed(() => !compact.value && hasSidebar.value && props.sidebarMode === 'rail' && !sidebarOpen.value)
const sidebarId = computed(() => hasSidebar.value && (!compact.value || sidebarOpen.value) ? `${id}-sidebar${compact.value ? '-drawer' : ''}` : undefined)
const asideId = computed(() => hasAside.value && (!compact.value || asideOpen.value) ? `${id}-aside${compact.value ? '-drawer' : ''}` : undefined)
const sidebarMax = computed(() => Math.max(props.sidebarMin, props.sidebarMax))
const asideMax = computed(() => Math.max(props.asideMin, props.asideMax))
const sidebarPixels = computed(() => Math.min(Math.max(storedSidebarWidth.value, props.sidebarMin), sidebarMax.value))
const asidePixels = computed(() => Math.min(Math.max(storedAsideWidth.value, props.asideMin), asideMax.value))
const styles = computed<CSSProperties>(() => ({
  '--sy-shell-height': props.height,
  '--sy-shell-navbar-height': `${props.stickyNavbar ? navbarHeight.value ?? 0 : 0}px`,
  '--sy-shell-sticky-offset': props.stickyOffset,
  '--sy-shell-sidebar-size': `${sidebarPixels.value}px`,
  '--sy-shell-aside-size': `${asidePixels.value}px`,
  '--sy-shell-sidebar-track': `${!compact.value && sidebarOpen.value ? sidebarPixels.value : sidebarCollapsed.value ? props.railSize : 0}px`,
  '--sy-shell-aside-track': `${!compact.value && asideOpen.value ? asidePixels.value : 0}px`,
}))
const router = useShellRouter(() => props.navigate ? { navigate: props.navigate, useHref: props.useHref } : undefined)
provide(routerContext, {
  isEnabled: () => !!router.value && router.value.isEnabled?.() !== false,
  navigate(href, event) { return router.value?.navigate(href, event) },
  useHref: href => router.value?.useHref?.(href) ?? href,
})
const scrollTarget = computed(() => props.scrollMode === 'content' ? main.value : null)
const mainInsets = computed(() => props.contentPadding === undefined ? undefined : layoutPadding({ padding: props.contentPadding }))
provide(appLayoutContext, { compact, sidebarAvailable: hasSidebar, sidebarOpen, sidebarCollapsed, asideOpen, scrollTarget, sidebarId, asideId, toggleSidebar, toggleAside,
  mobile: { isMobile: compact, isMobileNavEnabled, isMobileNavOpen, mobileNavId, hasAutoToggle, openMobileNav, closeMobileNav, toggleMobileNav },
})

function storage(part: string) {
  return props.storageKey && `${props.storageKey}:${part}`
}

function updateDrawerSide() {
  const rootElement = root.value
  const direction = rootElement && rootElement.ownerDocument.defaultView?.getComputedStyle(rootElement).direction
  drawerSide.value = (props.sidebarSide === 'start') === (direction !== 'rtl') ? 'left' : 'right'
}

function openMobileNav() {
  if (!compact.value || !isMobileNavEnabled.value) return
  updateDrawerSide()
  mobileAside.value = false
  mobileSidebar.value = true
}

function closeMobileNav() { mobileSidebar.value = false }

function toggleMobileNav() {
  if (isMobileNavOpen.value) closeMobileNav()
  else openMobileNav()
}

function toggleSidebar() {
  if (compact.value) toggleMobileNav()
  else if (hasSidebar.value && props.sidebarMode !== 'none') desktopSidebar.value = !desktopSidebar.value
}

function toggleAside() {
  if (!hasAside.value) return
  if (compact.value) {
    if (props.asideMobile !== 'drawer') return
    updateDrawerSide()
    if (!mobileAside.value) mobileSidebar.value = false
    mobileAside.value = !mobileAside.value
  } else {
    desktopAside.value = !desktopAside.value
  }
}

function focusBeforeHide(isOpen: boolean, wasOpen: boolean, panel: HTMLElement | null, controls: string) {
  if (isOpen || !wasOpen || compact.value || !panel?.contains(panel.ownerDocument.activeElement)) return
  const trigger = root.value?.querySelector<HTMLElement>(`[aria-controls="${controls}"]`)
  const destination = trigger ?? main.value
  destination?.focus({ preventScroll: true })
}

watch(sidebarOpen, (open, wasOpen) => {
  if (!sidebarCollapsed.value) focusBeforeHide(open, wasOpen, sidebar.value, `${id}-sidebar`)
  if (!open) dragging.value = false
}, { flush: 'sync' })
watch(asideOpen, (open, wasOpen) => {
  focusBeforeHide(open, wasOpen, aside.value, `${id}-aside`)
  if (!open) dragging.value = false
}, { flush: 'sync' })
watch([root, compact, () => props.sidebarSide], updateDrawerSide, { flush: 'post' })
watch(isMobileNavEnabled, enabled => { if (!enabled) closeMobileNav() })
watch(compact, narrow => {
  if (!narrow) {
    mobileSidebar.value = false
    mobileAside.value = false
  } else {
    dragging.value = false
    const focus = root.value?.ownerDocument.activeElement
    if (focus && (sidebar.value?.contains(focus) || aside.value?.contains(focus))) main.value?.focus({ preventScroll: true })
  }
})

useShellShortcut(root, () => props.toggleShortcut, toggleSidebar)
</script>

<template>
  <div
    ref="root"
    class="sy-app-layout"
    :class="[
      `sy-app-layout--${variant}`, `sy-app-layout--${scrollMode}`,
      { 'sy-app-layout--compact': compact, 'sy-app-layout--reverse': sidebarSide === 'end', 'sy-app-layout--dragging': dragging },
    ]"
    :style="styles"
  >
    <div v-if="$slots.navbar" ref="navbar" class="sy-app-layout__navbar" :class="{ 'sy-app-layout__navbar--sticky': stickyNavbar }">
      <slot
        name="navbar"
        :compact="compact"
        :sidebar-open="sidebarOpen"
        :sidebar-collapsed="sidebarCollapsed"
        :aside-open="asideOpen"
        :sidebar-id="sidebarId"
        :aside-id="asideId"
        :toggle-sidebar="toggleSidebar"
        :toggle-aside="toggleAside"
      />
    </div>
    <div v-if="$slots.banner" class="sy-app-layout__banner"><slot name="banner" /></div>
    <div class="sy-app-layout__body">
      <div v-if="!compact && $slots.sidebar" class="sy-app-layout__track sy-app-layout__track--sidebar">
        <aside
          :id="sidebarId"
          ref="sidebar"
          class="sy-app-layout__pane sy-app-layout__pane--sidebar"
          :class="{ 'sy-app-layout__pane--rail': sidebarCollapsed }"
          :inert="!sidebarOpen && !sidebarCollapsed"
          :aria-label="sidebarTitle"
        >
          <slot name="sidebar" :collapsed="sidebarCollapsed" :compact="false" :close="toggleSidebar" />
        </aside>
        <SShellResizeHandle
          v-if="resizeSidebar && sidebarOpen && sidebarId"
          position="overlay"
          :always-visible="false"
          :controls="sidebarId"
          :label="sidebarResizeLabel"
          :edge="sidebarSide"
          :value="sidebarPixels"
          :min="sidebarMin"
          :max="sidebarMax"
          @resize="storedSidebarWidth = $event"
          @dragging="dragging = $event"
        />
      </div>
      <main ref="main" class="sy-app-layout__main" :aria-label="mainLabel" :style="mainInsets" tabindex="-1">
        <SMobileNavToggle v-if="compact && hasAutoToggle && !$slots.navbar" :label="sidebarTitle" />
        <slot :compact="compact" :toggle-sidebar="toggleSidebar" :toggle-aside="toggleAside" />
        <slot name="footer" />
      </main>
      <div v-if="!compact && $slots.aside" class="sy-app-layout__track sy-app-layout__track--aside">
        <aside :id="asideId" ref="aside" class="sy-app-layout__pane sy-app-layout__pane--aside" :inert="!asideOpen" :aria-label="asideTitle">
          <slot name="aside" :compact="false" :close="toggleAside" />
        </aside>
        <SShellResizeHandle
          v-if="resizeAside && asideOpen && asideId"
          position="overlay"
          :always-visible="false"
          :controls="asideId"
          :label="asideResizeLabel"
          :edge="sidebarSide === 'start' ? 'end' : 'start'"
          :value="asidePixels"
          :min="asideMin"
          :max="asideMax"
          @resize="storedAsideWidth = $event"
          @dragging="dragging = $event"
        />
      </div>
    </div>
    <slot v-if="compact" name="mobileNav" />
    <SDrawer
      v-if="isMobileNavEnabled" :open="isMobileNavOpen" :side="drawerSide" size="sm"
      :content-id="mobileNavId" :title="sidebarTitle" :dismiss-label="dismissLabel" :draggable="false" class="sy-app-layout__drawer"
      @update:open="mobileSidebar = $event"
    >
      <div>
        <slot name="mobileSidebar" :collapsed="false" :compact="true" :close="closeMobileNav">
          <slot name="sidebar" :collapsed="false" :compact="true" :close="closeMobileNav" />
        </slot>
      </div>
    </SDrawer>
    <SDrawer
      v-if="hasAside && asideMobile === 'drawer'" :open="compact && mobileAside" :side="drawerSide === 'left' ? 'right' : 'left'" size="sm"
      :title="asideTitle" :dismiss-label="dismissLabel" :draggable="false" class="sy-app-layout__drawer"
      @update:open="mobileAside = $event"
    >
      <div :id="`${id}-aside-drawer`">
        <slot name="mobileAside" :compact="true" :close="() => { mobileAside = false }">
          <slot name="aside" :compact="true" :close="() => { mobileAside = false }" />
        </slot>
      </div>
    </SDrawer>
  </div>
</template>
