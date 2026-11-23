<script setup lang="ts">
import { useLayerCollisionPadding } from '../internal/layer-context'
import { noteOutsidePress } from '../internal/backdrop-press'
import { useLayerFocus } from '../internal/layer-focus'
import { usePortalTheme } from '../internal/portal-theme'
import { useMenuPress } from '../internal/menu-press'
import { computed, inject, useId, useTemplateRef, watch } from 'vue'
import { ContextMenuContent, ContextMenuPortal, ContextMenuRoot, ContextMenuTrigger } from 'reka-ui'
import { dialogContainer } from '../internal/dialog-container'
import { useScrollLock } from '../internal/document-scroll'
import SMenuItems from '../internal/SMenuItems.vue'
import SMenuSheet from '../internal/SMenuSheet.vue'
import SThemePortalScope from '../internal/SThemePortalScope.vue'
import { useMenuPresentation, type MenuPresentation } from '../internal/menu-presentation'
import type { MenuEntry } from '../types'

const props = withDefaults(defineProps<{
  label: string
  triggerLabel?: string
  items?: readonly MenuEntry[]
  defaultOpen?: boolean
  disabled?: boolean
  focusable?: boolean
  asChild?: boolean
  modal?: boolean
  direction?: 'ltr' | 'rtl'
  pressOpenDelay?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  offset?: number
  presentation?: MenuPresentation
  dismissLabel?: string
}>(), {
  items: () => [], focusable: true, modal: true, pressOpenDelay: 500, side: 'bottom', align: 'start', offset: 4,
  presentation: 'popover',
})
const emit = defineEmits<{ action: [id: string] }>()
defineSlots<{
  trigger(props: { open: boolean }): unknown
  default(props: { close: () => void }): unknown
  sheet(props: { close: () => void }): unknown
}>()
const model = defineModel<boolean | undefined>('open', { default: undefined })
const selected = defineModel<readonly string[]>('selected', { default: () => [] })
const open = computed(() => Boolean((model.value ?? props.defaultOpen) && !props.disabled))
const presentationMode = useMenuPresentation(() => props.presentation, open)
const region = useTemplateRef<HTMLDivElement>('region')
const container = inject(dialogContainer, null)
const target = computed(() => container?.value ?? 'body')
const portalTheme = usePortalTheme(target, region)
const menuId = `sy-context-${useId()}`
let origin: HTMLElement | undefined

function getTrigger() {
  return region.value?.querySelector<HTMLElement>('[data-sy-context-trigger]')
}
function remember(event: Event) {
  if (props.disabled) return
  const root = event.currentTarget as HTMLElement
  const focusable = (event.target as Element | null)?.closest<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex]')
  origin = focusable && root.contains(focusable) ? focusable : root
  if (!open.value && presentationMode.value === 'popover') focus.rememberOpener(origin)
}
function keys(event: KeyboardEvent) {
  if (props.disabled || event.defaultPrevented || event.target !== event.currentTarget) return
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10') && !(event.ctrlKey && event.key === 'Enter')) return
  event.preventDefault()
  remember(event)
  setOpen(true)
}
function setOpen(showing: boolean) {
  if (showing && !open.value && presentationMode.value === 'bottom-sheet') {
    const anchor = origin?.isConnected ? origin : getTrigger()
    anchor?.focus({ preventScroll: true })
  }
  model.value = showing
}
function outside(event: CustomEvent<{ originalEvent: PointerEvent | FocusEvent }>) {
  if (event.defaultPrevented) return
  const pointer = event.detail.originalEvent
  if ('button' in pointer && pointer.button === 2 && pointer.target instanceof Node && getTrigger()?.contains(pointer.target)) {
    event.preventDefault()
  }
  noteOutsidePress(event, origin ?? region.value)
}
watch(() => props.disabled, disabled => { if (disabled && (model.value ?? props.defaultOpen)) model.value = false })
const collisionPadding = useLayerCollisionPadding(12)
const panel = useTemplateRef<HTMLDivElement>('panel')
useScrollLock(() => props.modal && presentationMode.value === 'popover' && (open.value || Boolean(panel.value)),
  () => (region.value ?? panel.value)?.ownerDocument ?? globalThis.document)
const focus = useLayerFocus({ open: () => open.value && presentationMode.value === 'popover',
  surface: () => panel.value, origin: () => region.value, trigger: getTrigger,
  dismissOnBackdrop: () => { model.value = false; return true } })
const press = useMenuPress({
  menuRef: panel, itemSelector: '.sy-menu__item[role^="menuitem"]', isEnabled: () => !props.disabled,
  onDismiss: () => { model.value = false },
})
watch(open, showing => { if (!showing) press.cancel() })
</script>

<template>
  <div ref="region" class="sy-context-menu">
    <ContextMenuRoot :open="open" :modal="modal" :dir="direction" :press-open-delay="pressOpenDelay" @update:open="setOpen">
      <ContextMenuTrigger :as-child="asChild" as="div" class="sy-context-menu__trigger" data-sy-context-trigger
        :disabled="disabled" :role="asChild ? undefined : 'group'" :tabindex="focusable && !disabled ? 0 : undefined" :aria-label="triggerLabel"
        :aria-haspopup="disabled ? undefined : presentationMode === 'bottom-sheet' ? 'dialog' : 'menu'" :aria-expanded="!disabled ? open : undefined"
        :aria-controls="open ? menuId : undefined"
        @contextmenu="remember" @pointerdown="remember" @keydown="keys">
        <slot name="trigger" :open="open">{{ triggerLabel ?? label }}</slot>
      </ContextMenuTrigger>
      <ContextMenuPortal v-if="presentationMode === 'popover'" :to="target">
        <SThemePortalScope :theme="portalTheme" persistent>
          <ContextMenuContent as-child :id="menuId"
            :aria-label="label" :side="side" :side-offset="offset" :align="align" :collision-padding="collisionPadding" loop
            @interact-outside="outside" @open-auto-focus="focus.opened" @close-auto-focus="focus.finish">
            <div ref="panel" class="sy-floating-panel sy-menu sy-context-menu__panel" data-menu-variant="popover" v-bind="press.menuProps">
              <slot :close="() => { model = false }">
                <SMenuItems :items="items" :selected="selected" context :target="target"
                  @action="emit('action', $event)" @change="selected = $event" />
              </slot>
            </div>
          </ContextMenuContent>
        </SThemePortalScope>
      </ContextMenuPortal>
      <SMenuSheet v-else :id="menuId" :open="open" v-model:selected="selected" :label="label" :items="items" :direction="direction" context
        :dismiss-label="dismissLabel" :modal="modal" @update:open="model = $event" @action="emit('action', $event)">
        <template v-if="$slots.sheet" #default="actions"><slot name="sheet" v-bind="actions" /></template>
      </SMenuSheet>
    </ContextMenuRoot>
  </div>
</template>
