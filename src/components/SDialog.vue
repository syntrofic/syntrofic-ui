<script lang="ts">
export interface DialogPosition {
  top?: number | string
  bottom?: number | string
  start?: number | string
  end?: number | string
}
</script>

<script setup lang="ts">
import SIcon from './SIcon.vue'
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, provide, shallowRef, useId, useTemplateRef, watch, watchPostEffect } from 'vue'
import { Primitive } from 'reka-ui'
import SButton from './SButton.vue'
import SDialogHeroHeader from './SDialogHeroHeader.vue'
import { avatarGroupContext, avatarStatusContext } from '../internal/avatar-context'
import { useBackdropPress } from '../internal/backdrop-press'
import { buttonGroup } from '../internal/button-group'
import { dialogContainer } from '../internal/dialog-container'
import { showModalWithScrollLock } from '../internal/document-scroll'
import { holdEntranceInput } from '../internal/entrance-input'
import { useFocusTrap } from '../internal/focus-trap'
import { documentFocus, focusable, focusWithin } from '../internal/focus-order'
import { useLayerFocus } from '../internal/layer-focus'
import { layoutPadding, layoutPaddingContext, layoutSize, type LayoutSize } from '../internal/layout-spacing'
import { listDensityContext } from '../internal/list-context'
import { createAnimator, useAnimatedLayout } from '../internal/motion'
import { observeReducedMotion, prefersReducedMotion } from '../internal/reduced-motion'
import type { OverlayPurpose } from '../internal/panel'
import { toolbarContext } from '../internal/toolbar-context'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  dismissLabel?: string
  size?: 'sm' | 'md' | 'lg'
  width?: number | string
  maxHeight?: number | string
  padding?: LayoutSize
  position?: Readonly<DialogPosition>
  dir?: 'ltr' | 'rtl' | 'auto'
  inline?: boolean
  variant?: 'standard' | 'fullscreen'
  purpose?: OverlayPurpose
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  heroMode?: 'light' | 'dark'
  hideHeroTitle?: boolean
  heroDivider?: boolean
  heroMaxLines?: number
}>(), {
  dismissLabel: 'Close',
  size: 'sm',
  variant: 'standard',
  closeOnBackdrop: undefined,
  closeOnEscape: undefined,
})

const open = defineModel<boolean>('open')
const surface = useTemplateRef<HTMLElement>('surface')
const dialog = computed(() => surface.value?.localName === 'dialog' ? surface.value as HTMLDialogElement : null)
const modalOpen = computed(() => !props.inline && open.value === true)
const focus = useLayerFocus({ open: modalOpen, surface: () => dialog.value })
provide(dialogContainer, dialog)
provide(buttonGroup, null)
provide(toolbarContext, null)
provide(listDensityContext, null)
provide(avatarGroupContext, null)
provide(avatarStatusContext, null)
provide(layoutPaddingContext, shallowRef({
  paddingInlineStart: 'var(--sy-dialog-padding-inline-start)',
  paddingInlineEnd: 'var(--sy-dialog-padding-inline-end)',
  paddingBlockStart: 'var(--sy-dialog-padding-block-start)',
  paddingBlockEnd: 'var(--sy-dialog-padding-block-end)',
}))
useFocusTrap({ container: dialog, isActive: () => modalOpen.value, restoreFocus: false })
const id = `sy-dialog-${useId()}`
const offset = (value?: LayoutSize) => value === 'auto' ? undefined : value === '0' ? '0px' : layoutSize(value)
const position = computed(() => {
  if (props.inline || props.variant === 'fullscreen') return {}
  return { top: offset(props.position?.top), bottom: offset(props.position?.bottom),
    start: offset(props.position?.start), end: offset(props.position?.end) }
})
const sizing = computed(() => ({
  '--sy-dialog-width-override': layoutSize(props.width),
  '--sy-dialog-height-limit': layoutSize(props.maxHeight),
  '--sy-dialog-padding-override': props.padding === undefined ? undefined : layoutPadding(props).paddingBlockStart,
  '--sy-dialog-top': position.value.top,
  '--sy-dialog-bottom': position.value.bottom,
  '--sy-dialog-start': position.value.start,
  '--sy-dialog-end': position.value.end,
}))
const scrollBody = computed(() => props.maxHeight !== undefined || !props.inline && props.variant === 'fullscreen')
const reducedMotion = shallowRef(false)
// Vue assigns the existing element to the vnode before running hydrated setup.
let hydratedOpen = Boolean(open.value && getCurrentInstance()?.vnode.el)
let presentation: 'settled' | 'reduced' | 'fade' | 'directional' | undefined
let entryAnimator: ReturnType<typeof createAnimator> | undefined
let operation = 0
let releaseScroll: (() => void) | undefined

const layout = useAnimatedLayout({ includePositioned: true })
watch([position, () => props.dir], async () => {
  const element = dialog.value
  if (!modalOpen.value || !element?.open || props.variant === 'fullscreen' || prefersReducedMotion(element)) return
  const move = layout([element])
  await nextTick()
  if (modalOpen.value && dialog.value === element && element.open) move()
})

watch([dialog, modalOpen, () => props.variant], ([element, visible, variant], _, cleanup) => {
  if (!element || !visible || variant === 'fullscreen') return
  cleanup(observeReducedMotion(element, reduced => { reducedMotion.value = reduced }))
}, { flush: 'post' })

function aimAtOpener(element: HTMLDialogElement) {
  element.style.removeProperty('--sy-dialog-offset-x')
  element.style.removeProperty('--sy-dialog-offset-y')
  const opener = focus.opener()
  const view = opener?.ownerDocument.defaultView
  if (!opener?.isConnected || !view || opener === opener.ownerDocument.body || opener === opener.ownerDocument.documentElement) return
  const box = opener.getBoundingClientRect()
  if (!box.width && !box.height) return
  const viewport = view.visualViewport
  const x = box.left + box.width / 2 - ((viewport?.offsetLeft ?? 0) + (viewport?.width ?? view.innerWidth) / 2)
  const y = box.top + box.height / 2 - ((viewport?.offsetTop ?? 0) + (viewport?.height ?? view.innerHeight) / 2)
  const distance = Math.hypot(x, y)
  const scale = 16 / (distance || 1)
  element.style.setProperty('--sy-dialog-offset-x', Math.round(x * scale) + 'px')
  element.style.setProperty('--sy-dialog-offset-y', Math.round(y * scale) + 'px')
}

function close() {
  open.value = false
}

let releaseEntrance: (() => void) | undefined
function endEntrance() {
  releaseEntrance?.()
  releaseEntrance = undefined
}

function finish(event: Event) {
  if (event.currentTarget !== dialog.value || dialog.value?.open) return
  endEntrance()
  releaseScroll?.()
  releaseScroll = undefined
  close()
  void nextTick(() => focus.finish())
}

function closeNative(element: HTMLDialogElement) {
  const active = documentFocus(element.ownerDocument)
  element.close()
  if (active && !focusWithin(element, active) && focusable(active) && active !== element.ownerDocument.body
    && active !== documentFocus(element.ownerDocument)) active.focus({ preventScroll: true })
  focus.finish()
}

watch(dialog, (_, previous) => {
  if (!previous?.open) return
  endEntrance()
  operation++
  entryAnimator?.dispose()
  entryAnimator = undefined
  closeNative(previous)
  releaseScroll?.()
  releaseScroll = undefined
}, { flush: 'post' })

watchPostEffect(() => {
  const element = dialog.value
  const content = element?.querySelector<HTMLElement>(':scope > .sy-dialog__panel')
  const visible = modalOpen.value
  if (!element || !content) return
  const current = ++operation

  if (visible) {
    const entering = !element.hasAttribute('data-visible')
    const fullscreen = props.variant === 'fullscreen'
    const reduced = (!fullscreen && reducedMotion.value) || prefersReducedMotion(element)
    const next = hydratedOpen ? 'settled' : reduced ? 'reduced' : fullscreen ? 'fade' : 'directional'
    if (!element.open) {
      if (next === 'directional') aimAtOpener(element)
      if (hydratedOpen) element.dataset.initialOpen = ''
      if (releaseScroll) element.showModal()
      else releaseScroll = showModalWithScrollLock(element)
      const heroTitle = content.querySelector<HTMLElement>('[data-dialog-hero-focus]')
      if (heroTitle) {
        const autofocus = [...content.querySelectorAll<HTMLElement>('[autofocus]')].some(node => (
          !node.matches(':disabled') && !node.closest('[inert], [hidden]') && node.getClientRects().length > 0
        ))
        if (!autofocus) heroTitle.focus({ preventScroll: true })
      }
      content.getBoundingClientRect()
    } else if (next !== presentation && element.hasAttribute('data-visible')) {
      entryAnimator?.cancel('presentation')
      if (next === 'directional' || next === 'fade') {
        if (next === 'directional') aimAtOpener(element)
        const from = next === 'directional' ? { opacity: .8, transform: 'var(--sy-dialog-entry-transform)' } : { opacity: .8 }
        const to = next === 'directional' ? { opacity: 1, transform: 'none' } : { opacity: 1 }
        entryAnimator ??= createAnimator(content)
        entryAnimator.animate('presentation', [from, to], { role: 'enter' })
      }
    }
    presentation = next
    element.dataset.visible = ''
    const entry = [...element.getAnimations(), ...content.getAnimations()]
    // A native modal receives its backdrop hits on the dialog itself.
    if (entering && !hydratedOpen) releaseEntrance = holdEntranceInput(element, { animations: entry })
    delete element.dataset.initialOpen
    void Promise.allSettled(entry.map(animation => animation.finished)).then(() => {
      if (operation === current && open.value && element.open) element.dataset.settled = ''
    })
    return
  }

  hydratedOpen = false
  presentation = undefined
  endEntrance()
  if (!element.open) return
  if (element.hasAttribute('data-settled')) {
    delete element.dataset.settled
    content.getBoundingClientRect()
  }
  delete element.dataset.visible
  const exit = [...element.getAnimations(), ...content.getAnimations()].map(animation => animation.finished)
  entryAnimator?.cancel('presentation')
  void Promise.allSettled(exit).then(() => {
    if (operation === current && element.open) {
      closeNative(element)
      releaseScroll?.()
      releaseScroll = undefined
    }
  })
})

onBeforeUnmount(() => {
  operation++
  endEntrance()
  entryAnimator?.dispose()
  if (dialog.value?.open) closeNative(dialog.value)
  releaseScroll?.()
  releaseScroll = undefined
})

function cancel(event: Event) {
  if (event.target !== dialog.value) return
  event.preventDefault()
  if (props.closeOnEscape ?? props.purpose !== 'required') close()
}

useBackdropPress({
  surface: () => dialog.value,
  enabled: () => modalOpen.value && (props.closeOnBackdrop ?? (!props.purpose || props.purpose === 'info')),
  isBackdrop(node, hit, event) {
    if (hit !== node) return false
    const { left, right, top, bottom } = node.getBoundingClientRect()
    return event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom
  },
  dismiss: close,
})

</script>

<template>
  <component
    :is="inline ? 'section' : 'dialog'"
    ref="surface"
    class="sy-dialog"
    :dir="dir"
    :data-inline="inline || undefined"
    :data-visible="inline && open ? '' : undefined"
    :data-size="size"
    :data-variant="!inline && variant === 'fullscreen' ? variant : undefined"
    :data-scroll-body="scrollBody || undefined"
    :data-position-block="position.top !== undefined || position.bottom !== undefined || undefined"
    :data-position-inline="position.start !== undefined || position.end !== undefined || undefined"
    :aria-hidden="inline && !open || undefined"
    :style="sizing"
    :aria-labelledby="`${id}-title`"
    :aria-describedby="description || $slots.description ? `${id}-description` : undefined"
    @cancel="cancel"
    @close="finish"
  >
    <Primitive :as="inline ? 'div' : undefined" :as-child="!inline"
      :class="inline ? 'sy-dialog__inline-content' : undefined" :inert="inline && !open || undefined">
    <div class="sy-dialog__panel">
      <SDialogHeroHeader v-if="$slots.hero" :title="title" :title-id="`${id}-title`" :title-hidden="hideHeroTitle" :media-mode="heroMode" :divider="heroDivider"
        :max-lines="heroMaxLines" :closable="showCloseButton" :close-label="dismissLabel" @close="close">
        <template #media><slot name="hero" /></template>
        <template v-if="$slots['hero-leading']" #leading><slot name="hero-leading" /></template>
        <template v-if="$slots['hero-title']" #title><slot name="hero-title" /></template>
        <p v-if="description || $slots.description" :id="`${id}-description`" class="sy-dialog__description"><slot name="description">{{ description }}</slot></p>
      </SDialogHeroHeader>
      <header v-else class="sy-dialog__header">
        <div v-if="$slots['header-start']" class="sy-dialog__header-action"><slot name="header-start" :close="close" /></div>
        <h2 :id="`${id}-title`" class="sy-dialog__title">
          <slot name="title">
            <Transition name="sy-dialog-title" @before-leave="node => node.setAttribute('aria-hidden', 'true')">
              <span :key="title">{{ title }}</span>
            </Transition>
          </slot>
        </h2>
        <div v-if="$slots['header-end']" class="sy-dialog__header-action"><slot name="header-end" :close="close" /></div>
        <SButton v-if="showCloseButton" class="sy-dialog__close" size="sm" variant="ghost" @click="close">
          <template #start><SIcon class="sy-dialog__close-icon" name="close" /></template>
          {{ dismissLabel }}
        </SButton>
        <p v-if="description || $slots.description" :id="`${id}-description`" class="sy-dialog__description"><slot name="description">{{ description }}</slot></p>
      </header>
      <div v-if="$slots.default" class="sy-dialog__body" :tabindex="scrollBody ? 0 : undefined" :role="scrollBody ? 'region' : undefined"
        :aria-labelledby="scrollBody ? `${id}-title` : undefined"><slot /></div>
      <footer v-if="$slots.footer || !showCloseButton" class="sy-dialog__footer">
        <slot name="footer" :close="close">
          <SButton size="sm" variant="secondary" :autofocus="!inline || undefined" @click="close">{{ dismissLabel }}</SButton>
        </slot>
      </footer>
    </div>
    </Primitive>
  </component>
</template>
