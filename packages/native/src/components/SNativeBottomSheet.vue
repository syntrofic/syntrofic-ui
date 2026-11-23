<script setup lang="ts">
import { computed, h, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import type { NativeDialogCloseReason, NativeRestoreFocus } from '../modal'
import { useNativeSheet } from '../sheet'
import { createSheetPlatform, initialNativeDetents } from '../sheet-platform'
import { sheetDetents, sheetIndex, type NativeSheetDetent } from '../sheet-state'
import SNativeBottomSheetSurface from './SNativeBottomSheetSurface.vue'
import SNativeButton from './SNativeButton.vue'

const props = withDefaults(defineProps<{
  name?: string
  title?: string
  description?: string
  triggerLabel?: string
  closeLabel?: string
  detents?: readonly NativeSheetDetent[]
  showClose?: boolean
  draggable?: boolean
  dismissible?: boolean
  dismissOnOutside?: boolean
  dismissOnBack?: boolean
  dimmed?: boolean
  dimOpacity?: number
  grabber?: boolean
  scrollable?: boolean
  scrollExpands?: boolean
  inset?: number
  initialFocus?: NativeRestoreFocus
  beforeDismiss?: () => boolean | void
}>(), {
  closeLabel: 'Close', showClose: true, dismissible: true, dismissOnOutside: true, dismissOnBack: true, draggable: true, dimmed: true,
  dimOpacity: 0.45, grabber: true, scrollable: true, scrollExpands: true,
})
const emit = defineEmits<{
  opened: []
  closed: [reason: NativeDialogCloseReason]
  'detent-change': [index: number]
  error: [error: unknown]
}>()
const open = defineModel<boolean>('open', { default: false })
const detent = defineModel<number>('detent', { default: 0 })
const trigger = useTemplateRef<InstanceType<typeof SNativeButton>>('trigger')
const slots = defineSlots<{
  trigger(props: { present: (index?: number, returnFocus?: NativeRestoreFocus) => void; visible: boolean }): unknown
  header(props: SheetSlot): unknown
  default(props: SheetSlot): unknown
  footer(props: SheetSlot): unknown
}>()
interface SheetSlot {
  detent: number
  resize: (index: number) => void
  dismiss: (reason?: NativeDialogCloseReason) => void
}

const { theme, reducedMotion } = useNativeUI()
const stops = computed(() => sheetDetents(props.detents))
const index = computed(() => sheetIndex(detent.value, stops.value.length))
const dim = computed(() => !props.dimmed ? 0 : Number.isFinite(props.dimOpacity) ? Math.max(0, Math.min(1, props.dimOpacity)) : 0.45)

function resize(next: number) {
  detent.value = sheetIndex(next, stops.value.length)
}

const { present, dismiss, dismissStack, refresh } = useNativeSheet(open, () => ({
  detents: initialNativeDetents(stops.value),
  peekHeight: 96, // The adapter replaces the system stops after presentation on iOS 15.
  animated: !reducedMotion.value,
  cornerRadius: theme.value.geometry.radiusLg,
  dismissOnBackgroundTap: props.dismissible && props.dismissOnOutside,
  dismissOnDraggingDownSheet: props.draggable && props.dismissible,
  dismissOnBackButton: props.dismissible && props.dismissOnBack,
  grabber: props.grabber && props.draggable,
  scrollExpands: props.scrollExpands,
  disableDimBackground: !props.dimmed,
  edgeAttachedInCompactHeight: true,
  trackingScrollView: props.scrollable ? 'syntrofic-sheet-body' : undefined,
  windowSoftInputMode: 16, // SOFT_INPUT_ADJUST_RESIZE
  onWillDismiss: () => props.dismissible && props.beforeDismiss?.() !== false,
}), (view, size) => createSheetPlatform(view, size, () => ({
  detents: stops.value,
  index: index.value,
  background: theme.value.colors.surface,
  draggable: props.draggable,
  dismissible: props.dismissible,
  dismissOnOutside: props.dismissOnOutside,
  grabber: props.grabber,
  dimOpacity: dim.value,
  reducedMotion: reducedMotion.value,
})), state => {
  const actions: SheetSlot = { detent: index.value, resize, dismiss }
  return h(SNativeBottomSheetSurface, {
    title: props.title,
    description: props.description,
    showClose: props.showClose,
    closeLabel: props.closeLabel,
    inset: props.inset ?? theme.value.geometry.space3,
    shown: state.shown.value,
    height: state.height.value,
    scrollable: props.scrollable,
    initialFocus: props.initialFocus,
    onReady: state.ready,
    onMeasure: state.measure,
    onClose: () => dismiss('close-button'),
  }, {
    header: slots.header ? () => slots.header(actions) : undefined,
    default: slots.default ? () => slots.default(actions) : undefined,
    footer: slots.footer ? () => slots.footer(actions) : undefined,
  })
}, {
  name: () => props.name,
  index: () => index.value,
  resize,
  change(next) {
    if (next < 0 || next >= stops.value.length) return
    detent.value = next
    emit('detent-change', next)
  },
  opened: () => emit('opened'),
  closed: reason => emit('closed', reason),
  error: error => emit('error', error),
})

watch([stops, index, theme, dim, reducedMotion, () => props.draggable, () => props.dismissible, () => props.grabber], refresh, { flush: 'post' })
defineExpose({ present, resize, dismiss, dismissStack })
</script>

<template>
  <slot name="trigger" :present="present" :visible="open">
    <SNativeButton v-if="triggerLabel" ref="trigger" :label="triggerLabel" @tap="present(undefined, () => trigger?.focus())" />
  </slot>
</template>
