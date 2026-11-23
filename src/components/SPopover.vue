<script setup lang="ts">
import { computed, inject, provide, useId, useTemplateRef, watch } from 'vue'
import { PopoverAnchor, PopoverContent, PopoverRoot, Primitive } from 'reka-ui'
import { isAnchorTouch, useAnchorPresentation } from '../internal/anchor-presentation'
import { noteOutsidePress } from '../internal/backdrop-press'
import { dialogContainer } from '../internal/dialog-container'
import { useScrollLock } from '../internal/document-scroll'
import { tabOrder, useFocusTrap } from '../internal/focus-trap'
import { useLayerCollisionPadding, useLayerTarget } from '../internal/layer-context'
import { useLayerFocus } from '../internal/layer-focus'
import { ThemePortalOrigin, usePortalTheme } from '../internal/portal-theme'
import { openState, OverlayTriggerStateContext } from '../rac/state'
import SThemePortalScope from '../internal/SThemePortalScope.vue'

const props = withDefaults(defineProps<{
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  anchor?: Element | null | (() => Element | null | undefined)
  modal?: boolean
  menu?: boolean
  label?: string
  contentId?: string
  closeLabel?: string
  closeButton?: boolean
  dismissOnOutside?: boolean
  dismissOnEscape?: boolean
  autofocus?: boolean
  restoreFocus?: boolean
  tabBehavior?: 'contain' | 'pageOrder'
  surface?: boolean
  portal?: boolean
}>(), { side: 'bottom', align: 'start', closeLabel: 'Close popover', dismissOnOutside: true, dismissOnEscape: true,
  autofocus: true, restoreFocus: true, surface: true })
const open = defineModel<boolean>('open')
const emit = defineEmits<{ show: []; hide: [] }>()
const dialog = inject(dialogContainer, null)
const layerHost = useLayerTarget()
const container = computed(() => dialog?.value ?? layerHost?.value)
const themeOrigin = useTemplateRef<{ $el: Comment }>('themeOrigin')
const portalTheme = usePortalTheme(() => container.value ?? (props.portal ? 'body' : undefined), () => themeOrigin.value?.$el.parentElement)
const external = computed(() => typeof props.anchor === 'function' ? props.anchor() : props.anchor)
const showing = computed(() => Boolean(open.value) && (props.anchor === undefined || Boolean(external.value)))
const trigger = useTemplateRef<{ $el: HTMLElement }>('trigger')
const panel = useTemplateRef<HTMLDivElement>('panel')
const modal = computed(() => Boolean(props.modal) && props.tabBehavior !== 'pageOrder')
useScrollLock(() => modal.value && (showing.value || Boolean(panel.value)),
  () => (external.value ?? trigger.value?.$el ?? panel.value ?? container.value)?.ownerDocument ?? globalThis.document)
const id = useId()
const triggerId = computed(() => trigger.value?.$el.id || `sy-popover-trigger-${id}`)
const panelId = computed(() => props.contentId ?? `sy-popover-${id}`)
const touch = useAnchorPresentation(showing, panel)
let leftPageOrderPopover = false
const focus = useLayerFocus({ open: showing, surface: () => panel.value,
  origin: () => trigger.value?.$el ?? external.value ?? themeOrigin.value?.$el.parentElement,
  trigger: () => trigger.value?.$el, anchor: () => external.value,
  enabled: () => props.restoreFocus && !leftPageOrderPopover, autofocus: () => props.autofocus,
  dismissOnBackdrop: () => {
    if (!props.dismissOnOutside) return false
    hide()
    return true
  } })
let tapUntil = 0
function rememberPointer(event: PointerEvent) {
  touch.disarm()
  tapUntil = event.isPrimary && event.button === 0 && isAnchorTouch(event.pointerType) ? Date.now() + 1000 : 0
}
function armTrigger(event: MouseEvent) {
  const tap = Date.now() < tapUntil
  tapUntil = 0
  if (!showing.value && !event.defaultPrevented && event.detail && event.button === 0 && !event.ctrlKey
    && event.currentTarget instanceof HTMLElement && (tap || isAnchorTouch((event as PointerEvent).pointerType))) touch.arm(event.currentTarget)
}
function updateOpen(value: boolean) {
  if (value) touch.accept()
  else touch.disarm()
  open.value = value
}
function toggleTrigger(event: MouseEvent) {
  if (event.defaultPrevented) return
  if (!showing.value && event.currentTarget instanceof HTMLElement) focus.rememberOpener(event.currentTarget)
  updateOpen(!showing.value)
}
let opener: HTMLElement | undefined
watch(showing, value => {
  if (value) {
    leftPageOrderPopover = false
    const focused = (external.value?.ownerDocument ?? container.value?.ownerDocument ?? globalThis.document)?.activeElement
    opener = focused instanceof HTMLElement ? focused : undefined
    emit('show')
  }
})
watch(showing, (value, previous) => { if (!value && previous) emit('hide') }, { flush: 'post' })
useFocusTrap({ container: panel, isActive: () => showing.value && props.tabBehavior === 'contain' && !props.menu, restoreFocus: false })
function hide() { open.value = false }
function show() { open.value = true }
function interactOutside(event: Event) {
  const target = event.target as Node
  if (!props.dismissOnOutside || trigger.value?.$el.contains(target) || props.tabBehavior === 'pageOrder' && external.value?.contains(target)) {
    event.preventDefault()
    return
  }
  if (!event.defaultPrevented && props.tabBehavior === 'pageOrder') leftPageOrderPopover = true
}
function leaveInPageOrder(event: KeyboardEvent) {
  const surface = panel.value
  const anchor = external.value ?? opener
  if (props.tabBehavior !== 'pageOrder' || event.key !== 'Tab' || event.defaultPrevented || !surface || !(anchor instanceof HTMLElement)) return
  const controls = tabOrder(surface)
  const current = controls.indexOf(event.target as HTMLElement)
  const next = current === -1 ? (event.shiftKey ? controls.at(-1) : controls[0]) : controls[current + (event.shiftKey ? -1 : 1)]
  event.stopPropagation()
  if (next) {
    event.preventDefault()
    next.focus({ preventScroll: true })
    return
  }
  const scope = anchor.closest<HTMLElement>('dialog[open], [role="dialog"]') ?? anchor.ownerDocument.body
  const nearby = tabOrder(scope).filter(control => !surface.contains(control))
  const index = nearby.indexOf(anchor)
  const destination = event.shiftKey ? anchor : index < 0 ? undefined : nearby[index + 1]
  leftPageOrderPopover = true
  if (destination) {
    event.preventDefault()
    destination.focus({ preventScroll: true })
  }
  hide()
}
provide(OverlayTriggerStateContext, openState(showing, next => { open.value = next }))
defineExpose({ show, hide, showing })
const collisionPadding = useLayerCollisionPadding(12)
</script>

<template>
  <PopoverRoot :open="showing" :modal="modal" @update:open="updateOpen">
    <ThemePortalOrigin v-if="container || portal" ref="themeOrigin" />
    <PopoverAnchor v-if="external" :reference="external" />
    <component :is="anchor === undefined ? PopoverAnchor : Primitive" v-if="$slots.trigger" as-child>
      <Primitive ref="trigger" as-child type="button" :id="triggerId" aria-haspopup="dialog" :aria-controls="showing ? panelId : undefined"
        :aria-expanded="showing" :data-state="showing ? 'open' : 'closed'" @pointerdown.capture="rememberPointer" @click.capture="armTrigger"
        @keydown.capture="tapUntil = 0; touch.disarm()" @click="toggleTrigger"><slot name="trigger" /></Primitive>
    </component>
    <Teleport :to="container ?? 'body'" :disabled="!container && !portal">
      <SThemePortalScope :theme="portalTheme" :persistent="Boolean(portal || dialog || layerHost)">
        <PopoverContent
          as-child
          :side="side"
          :align="align"
          :side-offset="6"
          :collision-padding="collisionPadding"
          :update-position-strategy="container ? 'always' : 'optimized'"
          @escape-key-down.prevent="dismissOnEscape && hide()"
          @pointer-down-outside="noteOutsidePress($event, external ?? trigger?.$el ?? panel)"
          @interact-outside="interactOutside"
          @open-auto-focus="focus.opened($event); !autofocus && $event.preventDefault()"
          @close-auto-focus="focus.finish"
        >
          <div ref="panel" class="sy-floating-panel sy-popover" :data-bare="!surface || undefined"
            :data-sy-anchor-motion="touch.mode.value" :data-sy-anchor-pending="touch.pending.value || undefined"
            :inert="touch.mode.value && !showing || undefined"
            :id="panelId" :role="menu ? 'presentation' : 'dialog'" :aria-label="menu ? undefined : label"
            :aria-labelledby="label || menu || !$slots.trigger ? undefined : triggerId"
            @keydown.capture="leaveInPageOrder">
            <slot :close="hide" />
            <button v-if="closeButton" type="button" class="sy-popover__close" @click="hide">{{ closeLabel }}</button>
          </div>
        </PopoverContent>
      </SThemePortalScope>
    </Teleport>
  </PopoverRoot>
</template>
