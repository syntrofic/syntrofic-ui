<script setup lang="ts">
import { observeReducedMotion } from '../internal/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, useId, useTemplateRef, watch } from 'vue'
import SNavigationLink from '../internal/SNavigationLink.vue'
import { lockDocumentScroll } from '../internal/document-scroll'
import { createAnimator, prefersReducedMotion, startLayoutCompanion, useAnimatedLayout } from '../internal/motion'
import { bindNavigationIndicator } from '../internal/navigation-indicator'
import { observeNavigationHeight } from '../internal/navigation-intrinsic-motion'
import { observeNavigationReflow } from '../internal/navigation-reflow'
import { topNavCompact, topNavPopups, useAppLayout, useAppShellMobile, useShellCompact, type NavigationItem } from '../internal/shell-layout'
import SMobileNavToggle from './SMobileNavToggle.vue'
import SMotionText from './SMotionText.vue'
import SNavIcon from './SNavIcon.vue'
import { labelDirection } from '../internal/label-direction'

const props = withDefaults(defineProps<{
  items?: readonly NavigationItem[]
  label?: string
  brand?: string
  brandDescription?: string
  brandHref?: string
  brandIcon?: string
  centered?: boolean
  menuLabel?: string
  defaultCurrent?: string
  currentPath?: string
  defaultMenuOpen?: boolean
  breakpoint?: number
  density?: 'compact' | 'comfortable'
  position?: 'static' | 'sticky' | 'floating'
  maxWidth?: string
  stickyOffset?: string
  hideOnScroll?: boolean
  scrollTarget?: HTMLElement | null
  lockScroll?: boolean
}>(), {
  items: () => [],
  label: 'Site navigation',
  menuLabel: 'Menu',
  breakpoint: 510,
  density: 'compact',
  position: 'static',
  stickyOffset: '0px',
})

const model = defineModel<string>()
const menuOpen = defineModel<boolean | undefined>('menuOpen', { default: undefined })
const emit = defineEmits<{ activate: [item: NavigationItem, event: MouseEvent] }>()
const app = useAppLayout()
const { hasAutoToggle, isMobile } = useAppShellMobile()
const root = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const bar = useTemplateRef<HTMLDivElement>('bar')
const leading = useTemplateRef<HTMLDivElement>('leading')
const start = useTemplateRef<HTMLDivElement>('start')
const desktop = useTemplateRef<HTMLDivElement>('desktop')
const center = useTemplateRef<HTMLDivElement>('center')
const actions = useTemplateRef<HTMLDivElement>('actions')
const mobileCenter = useTemplateRef<HTMLDivElement>('mobileCenter')
const marker = useTemplateRef<HTMLSpanElement>('marker')
let measureMarker: (() => void) | undefined
const moveItems = useAnimatedLayout({ scope: root })
const labelEffects = new Map<HTMLElement, Animation>()
const textMounted = ref(false)
onMounted(() => { textMounted.value = true })
function cancelLabelMotion() {
  for (const effect of labelEffects.values()) effect.cancel()
  labelEffects.clear()
}
onBeforeUnmount(cancelLabelMotion)
watch(root, (navbar, _, cleanup) => {
  if (!navbar) return
  cleanup(observeReducedMotion(navbar, reduced => {
    if (!reduced) return
    cancelLabelMotion()
    moveItems.dispose()
  }))
}, { flush: 'post' })
const localCompact = useShellCompact(root, () => props.breakpoint)
const compact = computed(() => !!app?.compact.value || localCompact.value)
provide(topNavCompact, compact)
let closeActivePopup: (() => void) | undefined
provide(topNavPopups, {
  claim(close) {
    const previous = closeActivePopup
    closeActivePopup = close
    if (previous !== close) previous?.()
  },
  release(close) {
    if (closeActivePopup === close) closeActivePopup = undefined
  },
})
const menuId = useId()
const brandDescriptionId = useId()
const hidden = ref(false)
const focused = ref(false)
const opened = computed({
  get: () => menuOpen.value ?? props.defaultMenuOpen ?? false,
  set: (value: boolean) => { menuOpen.value = value },
})
const expanded = computed(() => compact.value && opened.value)
const current = computed(() => model.value ?? props.defaultCurrent)
const brandItem = computed<NavigationItem>(() => ({ id: 'brand', label: props.brand ?? '', href: props.brandHref }))
const scrollContainer = computed(() => props.scrollTarget ?? app?.scrollTarget.value ?? root.value?.ownerDocument.defaultView)

function isCurrent(item: NavigationItem) {
  return props.currentPath !== undefined ? item.href === props.currentPath : item.id === current.value
}

function itemIcon(item: NavigationItem) {
  return isCurrent(item) ? item.selectedIcon ?? item.icon : item.icon
}

function iconOnly(item: NavigationItem) {
  return Boolean(item.iconOnly && item.icon)
}

watch([desktop, marker, compact], ([track, indicator, narrow], _, cleanup) => {
  if (!track || !indicator || narrow) return
  const binding = bindNavigationIndicator(track, indicator)
  measureMarker = binding?.measure
  cleanup(() => {
    measureMarker = undefined
    binding?.dispose()
  })
}, { flush: 'post' })
const labelState = () => [props.brand, props.brandDescription, props.items.map(item => [item.id, item.label, item.icon, item.iconOnly])] as const
watch(labelState, ([brand, description, items], [previousBrand, previousDescription, previousItems], cleanup) => {
  const navbar = root.value
  const view = navbar?.ownerDocument.defaultView
  if (!navbar || !view || prefersReducedMotion(navbar)) return
  const resized = items.length === previousItems.length && items.every((item, index) => item[0] === previousItems[index]?.[0])
  if (resized && brand === previousBrand && description === previousDescription
    && items.every((item, index) => item.every((value, field) => value === previousItems[index]?.[field]))) return
  if (!resized) {
    const play = moveItems(navbar.querySelectorAll<HTMLElement>('.sy-navbar__desktop > li, .sy-navbar__menu > ul > li'))
    void nextTick(() => { play(); measureMarker?.() })
    return
  }
  const links = [...navbar.querySelectorAll<HTMLElement>('.sy-navbar__brand, .sy-navbar__desktop > li > .sy-navigation-link, .sy-navbar__menu > ul > li > .sy-navigation-link')]
    .filter(link => link.getClientRects().length && link.closest('.sy-navbar') === navbar && !link.closest('.sy-navbar__menu[inert]'))
  const measure = (link: HTMLElement) => parseFloat(view.getComputedStyle(link).inlineSize)
  const widths = links.map(link => measure(link))
  cancelLabelMotion()
  let cancelled = false
  cleanup(() => { cancelled = true })
  void nextTick(() => {
    if (cancelled || !navbar.isConnected || prefersReducedMotion(navbar)) return
    const targets = links.map(link => measure(link))
    for (const [index, link] of links.entries()) {
      const from = widths[index]!
      const to = targets[index]!
      if (!link.isConnected || typeof link.animate !== 'function' || !Number.isFinite(to - from) || Math.abs(to - from) < .5) continue
      const effect = startLayoutCompanion(link, createAnimator(link).animate('label-width', [
        { inlineSize: from + 'px' }, { inlineSize: to + 'px' },
      ], { role: 'move', fill: 'backwards' }))
      labelEffects.set(link, effect)
      const release = () => { if (labelEffects.get(link) === effect) labelEffects.delete(link) }
      effect.finished.then(release, release)
    }
    measureMarker?.()
  })
}, { flush: 'pre' })
watch([desktop, compact], ([track, narrow], _, cleanup) => {
  const dispose = track && !narrow ? observeNavigationHeight(track) : undefined
  if (dispose) cleanup(dispose)
}, { flush: 'post' })
watch([root, bar, leading, start, desktop, center, actions, () => props.centered],
  ([navbar, row, group, heading, track, middle, end, centered], _, cleanup) => {
    if (!navbar || !row || (!centered && !middle)) return
    const dispose = observeNavigationReflow(navbar, row, { start: middle ? group : heading, center: middle ?? track, end })
    if (dispose) cleanup(dispose)
  }, { flush: 'post' })

function activate(item: NavigationItem, event: MouseEvent) {
  emit('activate', item, event)
  if (event.defaultPrevented) return
  if (props.currentPath === undefined) model.value = item.id
  if (expanded.value) {
    trigger.value?.focus({ preventScroll: true })
    opened.value = false
  }
}

function focusChanged(event: FocusEvent) {
  focused.value = root.value?.contains(event.relatedTarget as Node | null) ?? false
}

watch([root, expanded, () => props.lockScroll], ([element, open, lock], _, onCleanup) => {
  if (!element || !open) return
  const document = element.ownerDocument
  const unlock = lock ? lockDocumentScroll(document) : undefined
  const outside = (event: PointerEvent) => {
    if (!event.composedPath().includes(element)) opened.value = false
  }
  const escape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !event.composedPath().includes(element)) return
    event.preventDefault()
    opened.value = false
    trigger.value?.focus()
  }
  document.addEventListener('pointerdown', outside, true)
  document.addEventListener('keydown', escape)
  onCleanup(() => {
    unlock?.()
    document.removeEventListener('pointerdown', outside, true)
    document.removeEventListener('keydown', escape)
  })
}, { flush: 'post' })

let focusBeforeResize: Element | null | undefined
let centerHadFocus = false
watch(compact, () => {
  focusBeforeResize = root.value?.ownerDocument.activeElement
  centerHadFocus = !!focusBeforeResize && !!(mobileCenter.value?.contains(focusBeforeResize) || center.value?.contains(focusBeforeResize))
}, { flush: 'pre' })
watch(compact, (isCompact, wasCompact) => {
  const active = focusBeforeResize
  const fromCenter = centerHadFocus
  focusBeforeResize = undefined
  centerHadFocus = false
  if (!isCompact && wasCompact) {
    opened.value = false
    if (fromCenter && active instanceof HTMLElement && center.value?.contains(active)) {
      active.focus({ preventScroll: true })
    } else if (active === trigger.value || (active && menu.value?.contains(active))) {
      const links = [...(desktop.value?.querySelectorAll<HTMLElement>('.sy-navigation-link:not(:disabled, [aria-disabled="true"])') ?? [])]
      const id = active?.closest<HTMLElement>('[data-sy-navbar-item]')?.dataset.syNavbarItem
      const same = id === undefined ? undefined : links.find(link => link.closest<HTMLElement>('[data-sy-navbar-item]')?.dataset.syNavbarItem === id)
      const next = same ?? links.find(link => link.getAttribute('aria-current') === 'page') ?? links[0]
      const centerControl = center.value?.querySelector<HTMLElement>('input:not(:disabled), button:not(:disabled), a[href], select:not(:disabled), [tabindex="0"]')
      const target = next ?? centerControl
      target?.focus({ preventScroll: true })
    }
  } else if (isCompact && active && root.value?.contains(active)) {
    if (fromCenter && expanded.value && active instanceof HTMLElement && mobileCenter.value?.contains(active)) active.focus({ preventScroll: true })
    else if (fromCenter || active.closest('.sy-navbar__desktop')) trigger.value?.focus({ preventScroll: true })
  }
}, { flush: 'post' })

watch([scrollContainer, () => props.hideOnScroll], ([target, enabled], _, onCleanup) => {
  hidden.value = false
  if (!target || !enabled) return
  const offset = () => 'scrollY' in target ? target.scrollY : target.scrollTop
  let last = offset()
  function onScroll() {
    const next = offset()
    if (Math.abs(next - last) < 5 && next > 0) return
    hidden.value = next > 32 && next > last
    last = next
  }
  target.addEventListener('scroll', onScroll, { passive: true })
  onCleanup(() => target.removeEventListener('scroll', onScroll))
}, { flush: 'post' })
</script>

<template>
  <nav
    ref="root"
    class="sy-navbar"
    :class="[`sy-navbar--${position}`, `sy-navbar--${density}`]"
    :data-compact="compact || undefined"
    :data-centered="centered || !!$slots.center || undefined"
    :data-custom-center="$slots.center ? '' : undefined"
    :data-offscreen="(hidden && !expanded && !focused) || undefined"
    :style="{ '--sy-navbar-max-width': maxWidth, '--sy-navbar-offset': stickyOffset }"
    :aria-label="label"
    @focusin="focused = true"
    @focusout="focusChanged"
  >
    <div ref="bar" class="sy-navbar__bar">
      <div ref="leading" class="sy-navbar__leading">
        <div v-if="centered || $slots.start || $slots.brand || brand || $slots['start-content'] || (isMobile && hasAutoToggle && !$slots.end)"
          ref="start" class="sy-navbar__start">
          <SMobileNavToggle v-if="isMobile && hasAutoToggle && !$slots.start && !$slots.end" />
          <slot name="start" :compact="compact" />
          <slot name="brand" :compact="compact">
            <component v-if="brand" :is="brandHref ? SNavigationLink : 'span'" class="sy-navbar__brand"
              :item="brandHref ? brandItem : undefined" :aria-label="brandHref && brandDescription ? brand : undefined"
              :aria-describedby="brandHref && brandDescription ? brandDescriptionId : undefined">
              <slot name="brand-icon"><SNavIcon v-if="brandIcon" :icon="brandIcon" /></slot>
              <span class="sy-navbar__brand-text">
                <span class="sy-navbar__brand-title" :dir="labelDirection(brand)"><SMotionText :value="brand" truncate /></span>
                <span v-if="brandDescription" :id="brandDescriptionId" class="sy-navbar__brand-description"
                  :dir="labelDirection(brandDescription)"><SMotionText :value="brandDescription" truncate /></span>
              </span>
            </component>
          </slot>
          <slot name="start-content" :compact="compact" />
        </div>
        <div v-if="items.length || $slots.links || $slots.menus" ref="desktop" class="sy-navbar__desktop-track"
          :aria-hidden="compact || undefined" :inert="compact">
          <ul class="sy-navbar__desktop">
            <slot name="links" :items="items" :is-current="isCurrent" :activate="activate">
              <li v-for="item in items" :key="item.id" :data-sy-navbar-item="item.id">
                <SNavigationLink :item="item" :current="isCurrent(item)" :compact="iconOnly(item)" :data-icon-only="iconOnly(item) || undefined" @activate="activate">
                  <slot name="item" :item="item" :compact="false">
                    <SNavIcon v-if="itemIcon(item)" :icon="itemIcon(item)" />
                    <SMotionText v-if="!iconOnly(item)" class="sy-navbar__item-label" :value="item.label"
                      :dir="labelDirection(item.label)" :appear="textMounted" wrap />
                  </slot>
                </SNavigationLink>
              </li>
            </slot>
            <slot v-if="!compact" name="menus" :compact="false" />
          </ul>
          <span ref="marker" class="sy-navbar__indicator" aria-hidden="true" />
        </div>
      </div>
      <div v-if="$slots.center" ref="center" class="sy-navbar__center">
        <Teleport :to="mobileCenter ?? 'body'" :disabled="!compact || !mobileCenter" defer>
          <slot name="center" :compact="compact" />
        </Teleport>
      </div>
      <div v-if="centered || $slots.end || items.length || $slots.mobile || $slots.menus || $slots.center" ref="actions" class="sy-navbar__actions">
        <slot name="end" :compact="compact" />
        <button
          v-if="items.length || $slots.mobile || $slots.menus || $slots.center" ref="trigger" class="sy-navbar__toggle" type="button"
          :aria-controls="menuId" :aria-expanded="expanded" @click="opened = !opened"
        >{{ menuLabel }}</button>
      </div>
    </div>
    <div
      v-if="items.length || $slots.mobile || $slots.menus || $slots.center" :id="menuId" ref="menu" class="sy-navbar__menu"
      :data-open="expanded || undefined" :inert="!expanded" :aria-hidden="!expanded || undefined"
    >
      <div v-if="$slots.center" ref="mobileCenter" class="sy-navbar__mobile-center" />
      <slot name="mobile" :items="items" :is-current="isCurrent" :activate="activate" :close="() => { opened = false }">
        <ul v-if="items.length || $slots.menus">
          <li v-for="item in items" :key="item.id" :data-sy-navbar-item="item.id">
            <SNavigationLink :item="item" :current="isCurrent(item)" @activate="activate">
              <slot name="item" :item="item" :compact="true">
                <SNavIcon v-if="itemIcon(item)" :icon="itemIcon(item)" />
                <SMotionText class="sy-navbar__item-label" :value="item.label" :dir="labelDirection(item.label)" :appear="textMounted" wrap />
              </slot>
            </SNavigationLink>
          </li>
          <slot v-if="compact" name="menus" :compact="true" />
        </ul>
      </slot>
    </div>
  </nav>
</template>
