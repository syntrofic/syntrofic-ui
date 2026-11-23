<script setup lang="ts">
import { useLayerCollisionPadding } from '../internal/layer-context'
import { noteOutsidePress } from '../internal/backdrop-press'
import { useLayerFocus } from '../internal/layer-focus'
import { isAnchorTouch, useAnchorPresentation } from '../internal/anchor-presentation'
import { useMenuPress } from '../internal/menu-press'
import { useTemplateRef, watch } from 'vue'
import { useScrollLock } from '../internal/document-scroll'
import { DropdownMenuContent, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui'

const props = withDefaults(defineProps<{
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  direction?: 'ltr' | 'rtl'
  modal?: boolean
  disabled?: boolean
  autofocus?: boolean
  menuLabel?: string
  touchMotion?: boolean
}>(), { side: 'bottom', align: 'start', autofocus: true, touchMotion: true })
const open = defineModel<boolean>('open')
const collisionPadding = useLayerCollisionPadding(12)
const trigger = useTemplateRef<{ $el: HTMLElement }>('trigger')
const panel = useTemplateRef<HTMLDivElement>('panel')
useScrollLock(() => Boolean(props.modal && (open.value || panel.value)),
  () => (trigger.value?.$el ?? panel.value)?.ownerDocument ?? globalThis.document)
const { mode, pending, arm, accept, disarm } = useAnchorPresentation(open, panel)
let opener: HTMLElement | undefined
let tapUntil = 0
const focus = useLayerFocus({ open, surface: () => panel.value, origin: () => opener ?? trigger.value?.$el,
  trigger: () => trigger.value?.$el, autofocus: () => props.autofocus,
  dismissOnBackdrop: () => { updateOpen(false); return true } })
const press = useMenuPress({
  menuRef: panel, itemSelector: '.sy-menu__item[role^="menuitem"]', isEnabled: () => !props.disabled,
  onTriggerPress: pointer => {
    const next = !open.value
    if (next && opener) {
      opener.focus({ preventScroll: true })
      focus.rememberOpener(opener)
      if (props.touchMotion && isAnchorTouch(pointer)) arm(opener)
    }
    updateOpen(next)
    return next
  },
  onDismiss: () => { open.value = false },
})
function beginPress(event: PointerEvent) {
  if (event.defaultPrevented || props.disabled) return
  opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined
  tapUntil = event.isPrimary && event.button === 0 && isAnchorTouch(event.pointerType) ? Date.now() + 1000 : 0
  disarm()
  if (!props.touchMotion && isAnchorTouch(event.pointerType)) return
  const wasOpen = open.value
  press.triggerProps.onPointerdown(event)
  if (event.pointerType === 'mouse' && !wasOpen && open.value) event.preventDefault()
}
function rememberOpener(event: KeyboardEvent) {
  if (event.currentTarget instanceof HTMLElement && ['Enter', ' ', 'ArrowDown'].includes(event.key)) {
    opener = event.currentTarget
    if (!open.value) focus.rememberOpener(opener)
    tapUntil = 0
    disarm()
  }
}
function consumeClick(event: MouseEvent) {
  const tap = Date.now() < tapUntil
  tapUntil = 0
  if (!event.detail) return
  if (press.isTriggerClickFromPress()) { event.preventDefault(); return }
  if (event.defaultPrevented || props.disabled || open.value || event.button !== 0 || event.ctrlKey || !(event.currentTarget instanceof HTMLElement)) return
  focus.rememberOpener(event.currentTarget)
  if (props.touchMotion && (tap || isAnchorTouch((event as PointerEvent).pointerType))) arm(event.currentTarget)
}
function updateOpen(value: boolean) {
  if (value) accept()
  else disarm()
  open.value = value
}
watch(open, showing => { if (!showing) press.cancel() })
watch([open, panel, mode], ([showing, surface, motion], _, cleanup) => {
  const view = surface?.ownerDocument.defaultView
  if (!showing || !surface || !motion || !view) return
  const listeners = new AbortController()
  const options = { signal: listeners.signal, capture: true, passive: true }
  let outside: PointerEvent | undefined
  view.addEventListener('pointerdown', event => {
    if (!isAnchorTouch(event.pointerType)) return
    if (!event.isPrimary) { outside = undefined; return }
    const path = event.composedPath()
    const target = event.target as Element | null
    outside = !path.includes(surface) && (!opener || !path.includes(opener)) && !target?.closest?.('[data-reka-menu-content]') ? event : undefined
  }, options)
  view.addEventListener('pointermove', event => {
    if (outside?.pointerId === event.pointerId && Math.hypot(event.clientX - outside.clientX, event.clientY - outside.clientY) > 8) open.value = false
  }, options)
  view.addEventListener('pointercancel', event => { if (outside?.pointerId === event.pointerId) open.value = false }, options)
  view.addEventListener('pointerup', event => { if (outside?.pointerId === event.pointerId) outside = undefined }, options)
  cleanup(() => listeners.abort())
}, { flush: 'post' })
</script>

<template>
  <DropdownMenuRoot :open="open" :modal="modal" :dir="direction" @update:open="updateOpen">
    <DropdownMenuTrigger ref="trigger" as-child :disabled="disabled" @pointerdown="beginPress" @contextmenu="press.triggerProps.onContextmenu"
      @click.capture="consumeClick" @keydown.capture="rememberOpener"><slot name="trigger" /></DropdownMenuTrigger>
    <DropdownMenuContent
      as-child
      :side="side"
      :align="align"
      :side-offset="6"
      :collision-padding="collisionPadding"
      :aria-label="menuLabel"
      @pointer-down-outside="noteOutsidePress($event, opener ?? trigger?.$el)"
      @open-auto-focus="focus.opened($event); !autofocus && $event.preventDefault()"
      @close-auto-focus="focus.finish"
      loop
    ><div ref="panel" class="sy-floating-panel sy-menu" data-menu-variant="root"
      :data-sy-anchor-motion="mode" :data-sy-anchor-pending="pending || undefined" :inert="mode && !open || undefined"
      v-bind="{ ...press.menuProps, ...(menuLabel ? { 'aria-labelledby': undefined } : {}) }"><slot /></div></DropdownMenuContent>
  </DropdownMenuRoot>
</template>
