<script setup lang="ts">
import { computed, inject, onMounted, provide, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { DialogClose, DialogContent, DialogDescription, DialogPortal, DialogRoot, DialogTitle, Presence, Primitive } from 'reka-ui'
import { useBackdropPress } from './backdrop-press'
import { dialogContainer } from './dialog-container'
import { useScrollLock } from './document-scroll'
import { holdEntranceInput } from './entrance-input'
import { panelDepth, resolvePanelSide, type PanelSnapPoint, type SheetOptions } from './panel'
import { usePortalTheme } from './portal-theme'
import { usePanelPosition } from './use-panel-position'
import { useLayerFocus } from './layer-focus'
import { attachSheetBodyDrag } from './sheet-body-drag'
import SButton from '../components/SButton.vue'
import SThemePortalScope from './SThemePortalScope.vue'

const props = withDefaults(defineProps<SheetOptions>(), {
  dismissOnDrag: undefined, closeOnBackdrop: undefined, closeOnEscape: undefined, hideCloseButton: undefined,
})
const open = defineModel<boolean>('open', { default: false })
const snapPoint = defineModel<PanelSnapPoint | null>('snapPoint')
const anchor = useTemplateRef<HTMLElement>('anchor')
const trigger = useTemplateRef<{ $el: HTMLElement }>('trigger')
const body = useTemplateRef<HTMLElement>('body')
const content = useTemplateRef<HTMLElement>('content')
const header = useTemplateRef<HTMLElement>('header')
const footer = useTemplateRef<HTMLElement>('footer')
const handle = useTemplateRef<HTMLElement>('handle')
const inheritedDirection = ref<'ltr' | 'rtl'>('ltr')
const direction = computed(() => props.direction ?? inheritedDirection.value)
const side = computed(() => resolvePanelSide(props.side ?? 'bottom', direction.value))
const fitContent = computed(() => (side.value === 'bottom' || side.value === 'top') && (props.height === 'hug' || props.height === 'capped'))
const intrinsicHeight = ref<number>()
const dialog = inject(dialogContainer, null)
const depth = inject(panelDepth, 0)
provide(panelDepth, depth + 1)
const defaultId = `sy-panel-${useId()}`
const contentId = computed(() => props.contentId ?? defaultId)
const defaultPortal = shallowRef<HTMLElement>()
const target = computed(() => props.portalTarget ?? dialog?.value ?? defaultPortal.value)
const portalTheme = usePortalTheme(() => target.value ?? 'body', anchor)
const allowBackdrop = computed(() => props.closeOnBackdrop ?? (props.modal && (!props.purpose || props.purpose === 'info')))
const allowEscape = computed(() => props.closeOnEscape ?? props.purpose !== 'required')
const showClose = computed(() => !(props.hideCloseButton ?? props.purpose === 'required'))
const focus = useLayerFocus({ open, origin: () => anchor.value, trigger: () => trigger.value?.$el,
  surface: () => header.value?.parentElement, autofocus: () => props.autofocus })
useScrollLock(() => props.modal && (open.value || Boolean(header.value)), () => anchor.value?.ownerDocument ?? globalThis.document)

useBackdropPress({
  surface: () => header.value?.parentElement,
  enabled: () => Boolean(open.value && props.modal && allowBackdrop.value),
  isBackdrop: (node, hit) => Boolean(hit?.classList.contains('sy-panel-layer__backdrop') && hit.parentElement === node.parentElement),
  dismiss: close,
})

function opened(event: Event) {
  if (props.autofocus === false) event.preventDefault()
  focus.opened(event)
}

function close() {
  open.value = false
}

function toggle(event: MouseEvent) {
  if (event.defaultPrevented) return
  if (!open.value && event.currentTarget instanceof HTMLElement) focus.rememberOpener(event.currentTarget)
  open.value = !open.value
}

function interactOutside(event: Event) {
  if (props.modal || !allowBackdrop.value || trigger.value?.$el.contains(event.target as Node)) event.preventDefault()
}

function syncDirection() {
  inheritedDirection.value = anchor.value?.matches(':dir(rtl)') ? 'rtl' : 'ltr'
}

onMounted(() => {
  const marker = anchor.value
  defaultPortal.value = marker?.closest<HTMLElement>('[data-sy-theme]') ?? marker?.ownerDocument.body
  syncDirection()
})
watch(open, visible => {
  if (visible) syncDirection()
})
watch([open, header], ([visible, head], _, cleanup) => {
  const panel = head?.parentElement
  if (!visible || !panel) return
  const release = holdEntranceInput(panel, { viewport: props.modal })
  if (release) cleanup(release)
}, { flush: 'post' })

watch([fitContent, body, content, header, footer], ([fit, viewport, inner, head, foot], _, cleanup) => {
  const panel = viewport?.closest<HTMLElement>('.sy-panel')
  if (!fit || !viewport || !inner || !panel) {
    if (!fit) intrinsicHeight.value = undefined
    return
  }
  const measure = () => {
    const chrome = panel.offsetHeight - viewport.offsetHeight
    if (panel.offsetHeight) intrinsicHeight.value = chrome + inner.offsetHeight
  }
  measure()
  const observer = new ResizeObserver(measure)
  for (const element of [panel, inner, head, foot]) if (element) observer.observe(element)
  cleanup(() => observer.disconnect())
}, { flush: 'post' })

const { activeDrag, canResize, dismissible, peeking, slideOffset, settling, style, layerStyle, startDrag, moveDrag, endDrag, cancelDrag, activateHandle, moveHandle, bodyDrag } =
  usePanelPosition(props, anchor, side, intrinsicHeight, open, snapPoint, close)
const handles = computed(() => props.draggable && (canResize.value || dismissible.value))
const bodyPans = computed(() => open.value && handles.value && side.value === 'bottom' && !peeking.value)
watch([body, bodyPans], ([node, enabled], _, cleanup) => {
  if (node && enabled) cleanup(attachSheetBodyDrag(node, bodyDrag))
}, { flush: 'post' })
watch(peeking, visible => {
  const focused = anchor.value?.ownerDocument.activeElement
  if (visible && focused && (body.value?.contains(focused) || footer.value?.contains(focused))) handle.value?.focus({ preventScroll: true })
})
</script>

<template>
  <DialogRoot v-model:open="open" :modal="modal">
    <span ref="anchor" hidden />
    <Primitive v-if="$slots.trigger" ref="trigger" as-child type="button" aria-haspopup="dialog" :aria-expanded="open"
      :aria-controls="open ? contentId : undefined" :data-state="open ? 'open' : 'closed'" @click="toggle"><slot name="trigger" /></Primitive>
    <DialogPortal :to="target">
      <SThemePortalScope :theme="portalTheme" persistent>
        <div
          class="sy-panel-layer"
          :data-side="side"
          :dir="direction"
          :data-detached="detached || undefined"
          :data-nested="depth > 0 || undefined"
          :data-following="Boolean(activeDrag || settling) || undefined"
          :style="[{ '--sy-panel-depth': depth }, layerStyle]"
        >
          <Presence v-if="modal" :present="open">
            <div class="sy-panel-layer__backdrop" :data-state="open ? 'open' : 'closed'" aria-hidden="true" @pointerdown.left.self.prevent />
          </Presence>
          <DialogContent
            class="sy-panel"
            :class="contentClass"
            :id="contentId"
            :aria-modal="modal || undefined"
            :data-size="size"
            :data-peek="peeking || undefined"
            :data-dragging="Boolean(activeDrag) || undefined"
            :data-settling="settling || undefined"
            :data-drag-offset="Boolean(slideOffset) || undefined"
            :data-handled="handles || undefined"
            :style="style"
            v-bind="!description && !$slots.description ? { 'aria-describedby': undefined } : {}"
            @escape-key-down="!allowEscape && $event.preventDefault()"
            @interact-outside="interactOutside"
            @open-auto-focus="opened"
            @close-auto-focus="focus.finish"
          >
            <component
              :is="canResize ? 'button' : 'div'"
              v-if="handles"
              ref="handle"
              :type="canResize ? 'button' : undefined"
              :aria-label="canResize ? resizeLabel : undefined"
              :aria-hidden="!canResize || undefined"
              class="sy-panel__handle"
              @pointerdown="startDrag"
              @pointermove="moveDrag"
              @pointerup="endDrag"
              @pointercancel="cancelDrag"
              @lostpointercapture="cancelDrag"
              @click="activateHandle"
              @keydown="moveHandle"
            />
            <header ref="header" class="sy-panel__header" :data-title-hidden="hideTitle || undefined">
              <div v-if="$slots['header-start']" class="sy-panel__header-action"><slot name="header-start" :close="close" /></div>
              <DialogTitle class="sy-panel__title" :class="{ 'sy-visually-hidden': hideTitle || $slots.title }">{{ title }}</DialogTitle>
              <div v-if="$slots.title" class="sy-panel__title"><slot name="title" /></div>
              <div v-if="$slots['header-end']" class="sy-panel__header-action"><slot name="header-end" :close="close" /></div>
              <DialogClose v-if="showClose" as-child>
                <SButton size="sm" variant="secondary">{{ dismissLabel }}</SButton>
              </DialogClose>
              <DialogDescription v-if="description || $slots.description" class="sy-panel__description">
                <slot name="description">{{ description }}</slot>
              </DialogDescription>
            </header>
            <div ref="body" class="sy-panel__body" :data-sheet-pan="bodyPans || undefined" :inert="peeking" :tabindex="height !== undefined && !peeking ? 0 : undefined"
              :role="height !== undefined ? 'region' : undefined" :aria-label="height !== undefined ? title : undefined">
              <div v-if="fitContent" ref="content" class="sy-panel__content"><slot :close="close" /></div>
              <slot v-else :close="close" />
            </div>
            <footer v-if="$slots.footer" ref="footer" class="sy-panel__footer" :inert="peeking"><slot name="footer" :close="close" /></footer>
          </DialogContent>
        </div>
      </SThemePortalScope>
    </DialogPortal>
  </DialogRoot>
</template>
