<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { ToastViewport, useToastManager } from 'reka-ui'
import SToast from '../components/SToast.vue'
import { layerLength, type LayerInset } from './layer-context'
import { usePortalTheme } from './portal-theme'
import SThemePortalScope from './SThemePortalScope.vue'

const props = defineProps<{
  placement: 'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end'
  maxVisible: number
  viewportLabel: string
  dismissLabel?: string
  hotkey?: string[]
  expanded?: boolean
  inset?: LayerInset
  topLayer?: boolean
}>()

const { toasts } = useToastManager()
const origin = useTemplateRef<HTMLElement>('origin')
const surface = useTemplateRef<HTMLElement>('surface')
const modal = shallowRef<HTMLElement>()
const portalTheme = usePortalTheme(modal, origin)
const visible = computed(() => toasts.value.length > 0)
const focusSelector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
let lastOutside: HTMLElement | undefined
let lastInside: HTMLElement | undefined
let restoreAfterMove: HTMLElement | undefined

function firstControl() {
  const toast = surface.value?.querySelector<HTMLElement>('.sy-toast[data-state="open"]:not([data-limited])')
  return Array.from(toast?.querySelectorAll<HTMLElement>(focusSelector) ?? []).find(node =>
    !node.closest('[hidden], [inert], [aria-hidden="true"]') && node.getClientRects().length && node.tabIndex >= 0)
}

function onFocusIn(event: FocusEvent) {
  if (!props.topLayer || !(event.target instanceof HTMLElement)) return
  if (event.target.closest('.sy-toast')) lastInside = event.target
  if (event.relatedTarget instanceof HTMLElement && !surface.value?.contains(event.relatedTarget)) lastOutside = event.relatedTarget
}
function onFocusOut(event: FocusEvent) {
  if (event.relatedTarget instanceof HTMLElement && !surface.value?.contains(event.relatedTarget)) lastInside = undefined
}

watch([origin, visible, () => props.topLayer], ([node, showing, topLayer], _, cleanup) => {
  if (!node || !topLayer || !showing) { modal.value = undefined; return }
  const document = node.ownerDocument
  const view = document.defaultView
  if (!view) return
  const selector = 'dialog:modal, [role="dialog"][aria-modal="true"]:not([data-state="closed"]), [role="alertdialog"][aria-modal="true"]:not([data-state="closed"])'
  let stack: HTMLElement[] = []
  function update(records: MutationRecord[] = []) {
    const current = [...document.querySelectorAll<HTMLElement>(selector)].filter(item => !item.closest('[inert], [hidden]'))
    const reopened = new Set(records.filter(record => record.type === 'attributes').map(record => record.target))
    stack = stack.filter(item => current.includes(item) && !reopened.has(item))
    for (const item of current) if (!stack.includes(item)) stack.push(item)
    modal.value = stack.at(-1)
  }
  update()
  const watcher = new view.MutationObserver(update)
  watcher.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'data-state', 'aria-modal'] })
  function onHotkey(event: KeyboardEvent) {
    if (props.hotkey || event.key !== 'F6' || event.defaultPrevented) return
    const focus = firstControl()
    if (!focus) return
    event.preventDefault()
    if (document.activeElement instanceof HTMLElement && !surface.value?.contains(document.activeElement)) lastOutside = document.activeElement
    focus.focus({ preventScroll: true })
  }
  document.addEventListener('keydown', onHotkey, true)
  cleanup(() => { watcher.disconnect(); document.removeEventListener('keydown', onHotkey, true) })
}, { flush: 'post' })

watch(modal, () => {
  const root = surface.value
  const focused = root?.ownerDocument.activeElement
  if (focused instanceof HTMLElement && root?.contains(focused)) restoreAfterMove = focused
}, { flush: 'sync' })
watch(() => [surface.value, modal.value, visible.value, props.topLayer] as const, ([node, , showing, topLayer]) => {
  if (!node || !topLayer || typeof node.showPopover !== 'function') return
  if (showing && !node.matches(':popover-open')) node.showPopover()
  if (!showing && node.matches(':popover-open')) node.hidePopover()
  if (showing && restoreAfterMove && node.contains(restoreAfterMove)) restoreAfterMove.focus({ preventScroll: true })
  restoreAfterMove = undefined
}, { flush: 'post' })

watch(() => toasts.value, () => {
  if (!props.topLayer || !lastInside) return
  const root = surface.value
  const closed = lastInside.closest('.sy-toast[data-state="closed"], .sy-toast[data-limited]')
  if (closed || !root?.contains(lastInside)) {
    const next = firstControl() ?? lastOutside
    lastInside = undefined
    if (next?.isConnected) next.focus({ preventScroll: true })
  }
}, { flush: 'post' })
const insetStyle = computed(() => ({
  '--sy-toast-inset-block-start': layerLength(props.inset?.blockStart),
  '--sy-toast-inset-block-end': layerLength(props.inset?.blockEnd),
  '--sy-toast-inset-inline-start': layerLength(props.inset?.inlineStart),
  '--sy-toast-inset-inline-end': layerLength(props.inset?.inlineEnd),
}))
const entries = computed(() => {
  let visible = 0
  return toasts.value.map(toast => {
    if (!toast.open || visible++ < props.maxVisible) return toast
    return { ...toast, duration: Number.POSITIVE_INFINITY }
  })
})
</script>

<template>
  <span v-if="topLayer" ref="origin" hidden />
  <Teleport :to="modal ?? 'body'" :disabled="!modal">
    <div ref="surface" class="sy-toast-surface" :data-top="topLayer || undefined" :popover="topLayer ? 'manual' : undefined"
      @focusin="onFocusIn" @focusout="onFocusOut">
      <SThemePortalScope :theme="portalTheme" :persistent="topLayer">
        <ToastViewport
          :label="topLayer && !hotkey ? viewportLabel.replace('{hotkey}', 'F6') : viewportLabel"
          :hotkey="topLayer && !hotkey ? [] : hotkey"
          class="sy-toast-viewport"
          :data-placement="placement"
          :data-force-expanded="expanded || undefined"
          :style="insetStyle"
        />
        <SToast v-for="toast in entries" :key="toast.id" :toast="toast" :dismiss-label="dismissLabel" />
      </SThemePortalScope>
    </div>
  </Teleport>
</template>
