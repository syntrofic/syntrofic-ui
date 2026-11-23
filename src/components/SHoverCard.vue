<script setup lang="ts">
import { noteOutsidePress } from '../internal/backdrop-press'
import { useLayerCollisionPadding } from '../internal/layer-context'
import { PopoverAnchor, PopoverArrow, PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { dialogContainer } from '../internal/dialog-container'
import { activatePreview, isPreviewWarm, previewCorridor, releasePreview } from '../internal/hover-preview'
import { usePortalTheme } from '../internal/portal-theme'
import SThemePortalScope from '../internal/SThemePortalScope.vue'

const props = withDefaults(defineProps<{
  label: string
  triggerLabel?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  offset?: number
  openDelay?: number
  closeDelay?: number
  touchDelay?: number
  defaultOpen?: boolean
  disabled?: boolean
  arrow?: boolean
  interactive?: boolean
  sharedWarmup?: boolean
  openOnFocus?: boolean
  touchPreview?: boolean
  portalTarget?: string | HTMLElement
}>(), {
  side: 'bottom', align: 'start', offset: 7, openDelay: 240, closeDelay: 170,
  touchDelay: 490, interactive: true, sharedWarmup: true, openOnFocus: true, touchPreview: true,
})

const model = defineModel<boolean | undefined>('open', { default: undefined })
const open = computed(() => Boolean((model.value ?? props.defaultOpen) && !props.disabled))
const anchor = ref<HTMLElement | null>(null)
const body = ref<HTMLElement | null>(null)
const themeRoot = ref<HTMLElement>()
const dialog = inject(dialogContainer, null)
const portal = computed(() => props.portalTarget ?? dialog?.value ?? themeRoot.value)
const portalTheme = usePortalTheme(() => portal.value ?? 'body', anchor)
const shortcut = ref(false)
const id = `sy-hover-${useId()}`
const identity = Symbol('hover-preview')
const focusable = 'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]'
let owner: Document | undefined
let showTimer: ReturnType<typeof setTimeout> | undefined
let closeTimer: ReturnType<typeof setTimeout> | undefined
let holdTimer: ReturnType<typeof setTimeout> | undefined
let pointerHold: { id: number; x: number; y: number } | undefined
let suppressClickUntil = 0
let skipFocus = false
let pendingFocus = false
let bridge: ((event: PointerEvent) => void) | undefined
let openedBy: 'pointer' | 'focus' | 'touch' | 'programmatic' = 'programmatic'

const triggerProps = computed(() => ({
  'aria-haspopup': props.interactive ? ('dialog' as const) : undefined,
  'aria-expanded': props.interactive ? open.value : undefined,
  'aria-controls': props.interactive && open.value ? id : undefined,
  'aria-describedby': !props.interactive && open.value ? id : undefined,
}))

function panel() { return body.value?.closest<HTMLElement>('.sy-hover-card__panel') }

function tabbable(node: HTMLElement | null | undefined) {
  return [...(node?.querySelectorAll<HTMLElement>(focusable) ?? [])].filter(element => element.tabIndex >= 0 &&
    !element.matches(':disabled') && !element.closest('[inert],[hidden],[aria-hidden="true"]') && element.getClientRects().length > 0)
}

function anchorControl() { return tabbable(anchor.value)[0] ?? anchor.value }

function inside(node: EventTarget | null | undefined) {
  return node instanceof Node && Boolean(anchor.value?.contains(node) || panel()?.contains(node))
}

function stopBridge() {
  if (bridge) owner?.removeEventListener('pointermove', bridge, true)
  bridge = undefined
}

function clearTimers() {
  clearTimeout(showTimer)
  clearTimeout(closeTimer)
  stopBridge()
}

function change(next: boolean, source: typeof openedBy = 'programmatic') {
  if (next && props.disabled) return
  clearTimers()
  if (next) {
    openedBy = source
    shortcut.value = Boolean(owner && props.sharedWarmup && source === 'pointer' && isPreviewWarm(owner, identity))
  } else pendingFocus = false
  model.value = next
}

function restore() {
  skipFocus = true
  try { anchorControl()?.focus({ preventScroll: true }) }
  finally { skipFocus = false }
}

function leave(event: PointerEvent, from: HTMLElement | null, to: HTMLElement | null) {
  if (event.pointerType !== 'mouse') return
  clearTimeout(showTimer)
  if (!open.value || inside(event.relatedTarget)) return
  closeSoon()
  if (!owner || !from || !to) return
  stopBridge()
  const protects = previewCorridor(from.getBoundingClientRect(), to.getBoundingClientRect(), { x: event.clientX, y: event.clientY })
  bridge = pointer => {
    if (pointer.pointerType !== 'mouse') return
    if (inside(pointer.target)) {
      clearTimeout(closeTimer)
      stopBridge()
    } else if (protects({ x: pointer.clientX, y: pointer.clientY })) closeSoon()
    else {
      stopBridge()
      closeSoon()
    }
  }
  owner.addEventListener('pointermove', bridge, { capture: true, passive: true })
}

function closeSoon() {
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    if (!inside(owner?.activeElement)) change(false)
  }, Math.max(0, props.closeDelay))
}

function enterAnchor(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  clearTimers()
  if (props.disabled || open.value) return
  const delay = owner && props.sharedWarmup && isPreviewWarm(owner, identity) ? 0 : Math.max(0, props.openDelay)
  showTimer = setTimeout(() => change(true, 'pointer'), delay)
}

function focusAnchor() {
  if (props.openOnFocus && !skipFocus && !pointerHold && Date.now() >= suppressClickUntil) {
    clearTimers()
    if (!open.value) change(true, 'focus')
  }
}

function focusLeft(event: FocusEvent) {
  if (inside(event.relatedTarget) || !open.value) return
  closeSoon()
}

function cancelHold() {
  clearTimeout(holdTimer)
  pointerHold = undefined
}

function pointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' || !event.isPrimary || !props.touchPreview || props.disabled) return
  cancelHold()
  pointerHold = { id: event.pointerId, x: event.clientX, y: event.clientY }
  holdTimer = setTimeout(() => {
    suppressClickUntil = Date.now() + 850
    pendingFocus = props.interactive
    change(true, 'touch')
  }, Math.max(240, props.touchDelay))
}

function pointerMove(event: PointerEvent) {
  if (pointerHold?.id === event.pointerId &&
    Math.hypot(event.clientX - pointerHold.x, event.clientY - pointerHold.y) > 9) cancelHold()
}

function pointerEnd(event: PointerEvent) {
  if (pointerHold?.id === event.pointerId) cancelHold()
}

function suppress(event: MouseEvent) {
  if (Date.now() < suppressClickUntil || pointerHold) {
    event.preventDefault()
    event.stopPropagation()
  }
}

async function focusPanel() {
  await nextTick()
  if (!open.value) return
  const region = panel()
  if (!region) {
    pendingFocus = true
    return
  }
  const destination = tabbable(region)[0] ?? region
  destination.focus({ preventScroll: true })
  pendingFocus = false
}

function autofocus(event: Event) {
  event.preventDefault()
  if (pendingFocus || openedBy === 'touch') void focusPanel()
}

function escape(event: Event) {
  if (!open.value) return
  event.preventDefault()
  change(false)
  void nextTick(restore)
}

function keyboard(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing) return
  if (event.key === 'Escape') {
    escape(event)
  } else if (props.interactive && (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey && open.value && tabbable(panel()).length))) {
    event.preventDefault()
    pendingFocus = true
    if (!open.value) change(true, 'focus')
    void focusPanel()
  }
}

function keyInPanel(event: KeyboardEvent) {
  if (event.key !== 'Tab' || event.defaultPrevented) return
  const region = panel()
  const controls = tabbable(region)
  if (event.shiftKey && (controls[0] === event.target || region === event.target)) {
    event.preventDefault()
    restore()
  } else if (!event.shiftKey && ((!controls.length && region === event.target) || controls.at(-1) === event.target)) {
    const trigger = anchorControl()
    const next = tabbable(owner?.body).find(node => trigger && (trigger.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      !anchor.value?.contains(node) && !region?.contains(node))
    change(false)
    if (next) {
      event.preventDefault()
      next.focus({ preventScroll: true })
    }
  }
}

function outside(event: CustomEvent<{ originalEvent: Event }>) {
  if (inside(event.detail.originalEvent.target)) event.preventDefault()
  if (props.interactive || openedBy === 'touch' || openedBy === 'programmatic') noteOutsidePress(event, anchor.value)
}

onMounted(() => {
  owner = anchor.value?.ownerDocument
  const theme = anchor.value?.closest<HTMLElement>('[data-sy-theme]')
  themeRoot.value = theme ?? owner?.body
  if (owner && open.value && props.sharedWarmup) activatePreview(owner, identity, () => change(false))
})
watch(open, shown => {
  if (!owner) return
  if (shown && props.sharedWarmup) activatePreview(owner, identity, () => change(false))
  else if (!shown) releasePreview(owner, identity)
})
watch(() => props.disabled, disabled => {
  if (disabled) {
    cancelHold()
    change(false)
  }
})
onBeforeUnmount(() => {
  clearTimers()
  cancelHold()
  if (owner) releasePreview(owner, identity)
})
const collisionPadding = useLayerCollisionPadding(10)
</script>

<template>
  <span class="sy-hover-card">
    <PopoverRoot :open="open" :modal="false" @update:open="value => change(value)">
      <PopoverAnchor as-child>
        <span
          ref="anchor" class="sy-hover-card__anchor"
          @pointerenter="enterAnchor" @pointerleave="event => leave(event, anchor, panel() ?? null)"
          @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerEnd" @pointercancel="pointerEnd"
          @click.capture="suppress" @contextmenu="suppress"
          @focusin="focusAnchor" @focusout="focusLeft" @keydown="keyboard"
        >
          <slot name="trigger" :open="open" :trigger-props="triggerProps">
            <button type="button" class="sy-hover-card__trigger" v-bind="triggerProps" :disabled="disabled"
              @click="change(!open, 'programmatic')">{{ triggerLabel ?? label }}</button>
          </slot>
        </span>
      </PopoverAnchor>
      <PopoverPortal :to="portal">
        <SThemePortalScope :theme="portalTheme" persistent>
          <PopoverContent
            as-child
            :side="side" :align="align" :side-offset="offset" :collision-padding="collisionPadding"
            @open-auto-focus="autofocus" @close-auto-focus.prevent
            @pointer-down-outside="outside" @focus-outside="outside"
            @escape-key-down="escape"
          >
            <div
              :id="id" class="sy-hover-card__panel" :data-warm="shortcut || undefined"
              :aria-label="interactive ? label : undefined" :aria-labelledby="undefined"
              :role="interactive ? 'dialog' : 'tooltip'" tabindex="-1"
              @keydown="keyInPanel" @pointerenter="clearTimers"
              @pointerleave="(event: PointerEvent) => leave(event, panel() ?? null, anchor)" @focusout="focusLeft"
            >
              <PopoverArrow v-if="arrow" class="sy-hover-card__arrow" />
              <div ref="body" class="sy-hover-card__content">
                <slot :open="open" :close="() => { change(false); restore() }" />
              </div>
            </div>
          </PopoverContent>
        </SThemePortalScope>
      </PopoverPortal>
    </PopoverRoot>
  </span>
</template>
