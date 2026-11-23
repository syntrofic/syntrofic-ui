<script setup lang="ts">
import type { GridLayout } from '@nativescript/core'
import type { NativeMorphDirection } from '../action-state'
import { computed, h, ref, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { useNativeModal, type NativeDialogCloseReason, type NativeRestoreFocus } from '../modal'
import type { NativePopoverOptions, OverlayRect } from '../popover-state'
import type { NativeSheetDetent } from '../sheet-state'
import SNativeBottomSheet from './SNativeBottomSheet.vue'
import SNativeButton from './SNativeButton.vue'
import SNativePopoverSurface from './SNativePopoverSurface.vue'

interface ContentSlot {
  close: (reason?: NativeDialogCloseReason) => void
}

const props = withDefaults(defineProps<NativePopoverOptions & {
  triggerLabel?: string
  title?: string
  description?: string
  showClose?: boolean
  closeLabel?: string
  disabled?: boolean
  detents?: readonly NativeSheetDetent[]
  initialFocus?: NativeRestoreFocus
  stretchTrigger?: boolean
  anchorWidth?: number
  backdrop?: 'transparent' | 'dim' | 'blur'
  morphDirection?: NativeMorphDirection
  beforeClose?: (reason: NativeDialogCloseReason) => boolean | void
}>(), {
  presentation: 'popover', placement: 'bottom', align: 'start', width: 'content-fit', offset: 8,
  alignOffset: 0, inset: 12, maxHeight: 420, closeLabel: 'Close', avoidCollisions: true,
  dismissOnOutside: true, dismissOnBack: true, scrollable: true,
})
const emit = defineEmits<{ opened: []; closed: [reason: NativeDialogCloseReason]; error: [error: unknown] }>()
const open = defineModel<boolean>('open', { default: false })
const anchor = useTemplateRef<{ nativeView: GridLayout }>('anchor')
const trigger = useTemplateRef<InstanceType<typeof SNativeButton>>('trigger')
const sheet = useTemplateRef<InstanceType<typeof SNativeBottomSheet>>('sheet')
const { direction } = useNativeUI()
const mode = ref(props.presentation)
let rendering = false
const anchored = computed({ get: () => mode.value === 'popover' && open.value, set: visible => { open.value = visible } })
const slots = defineSlots<{
  trigger(props: { open: (focus?: NativeRestoreFocus) => void; close: ContentSlot['close']; visible: boolean; disabled: boolean }): unknown
  header(props: ContentSlot): unknown
  default(props: ContentSlot): unknown
  footer(props: ContentSlot): unknown
}>()

function anchorRect(): OverlayRect | undefined {
  const view = anchor.value?.nativeView
  const point = view?.getLocationOnScreen()
  const size = view?.getActualSize()
  return point && size?.width && size.height ? { ...point, ...size } : undefined
}

function opened() {
  rendering = true
  emit('opened')
}

function settled(reason: NativeDialogCloseReason) {
  rendering = false
  if (!open.value) mode.value = props.presentation
  emit('closed', reason)
}

function failed(error: unknown) {
  rendering = false
  mode.value = props.presentation
  emit('error', error)
}

const modal = useNativeModal(anchored, events => h(SNativePopoverSurface, {
  visible: anchored.value,
  anchor: anchorRect,
  placement: props.placement,
  align: props.align,
  width: props.width,
  offset: props.offset,
  alignOffset: props.alignOffset,
  inset: props.inset,
  maxHeight: props.maxHeight,
  avoidCollisions: props.avoidCollisions,
  scrollable: props.scrollable,
  dismissOnOutside: props.dismissOnOutside,
  dismissOnBack: props.dismissOnBack,
  title: props.title,
  description: props.description,
  showClose: props.showClose,
  closeLabel: props.closeLabel,
  initialFocus: props.initialFocus,
  backdrop: props.backdrop,
  morphDirection: props.morphDirection,
  onReady: view => { rendering = true; events.ready(view) },
  onEntered: opened,
  onLeft: events.dismiss,
  onRequest: close,
}, {
  header: slots.header ? () => slots.header({ close }) : undefined,
  default: slots.default ? () => slots.default({ close }) : undefined,
  footer: slots.footer ? () => slots.footer({ close }) : undefined,
}), { closed: settled, error: failed })

function show(focus: NativeRestoreFocus = () => trigger.value?.focus()) {
  if (props.disabled || open.value) return
  if (mode.value === 'bottom-sheet' && sheet.value) sheet.value.present(undefined, focus)
  else modal.show(focus)
}

function close(reason: NativeDialogCloseReason = 'programmatic') {
  if (props.beforeClose?.(reason) === false) return
  if (mode.value === 'bottom-sheet' && sheet.value) sheet.value.dismiss(reason)
  else modal.close(reason)
}

watch(() => props.presentation, next => {
  if (!rendering && !open.value) mode.value = next
})
watch(() => props.disabled, disabled => { if (disabled) close() })
defineExpose({ show, close })
</script>

<template>
  <StackLayout :horizontalAlignment="stretchTrigger ? 'stretch' : direction === 'rtl' ? 'right' : 'left'">
    <GridLayout ref="anchor" :width="anchorWidth">
      <slot name="trigger" :open="show" :close="close" :visible="open" :disabled="disabled">
        <SNativeButton
          v-if="triggerLabel"
          ref="trigger"
          :label="triggerLabel"
          :disabled="disabled"
          :pressed="open"
          :fullWidth="stretchTrigger"
          variant="secondary"
          @tap="show()"
        />
      </slot>
    </GridLayout>
    <SNativeBottomSheet
      v-if="mode === 'bottom-sheet'"
      ref="sheet"
      v-model:open="open"
      :title="title"
      :description="description"
      :showClose="showClose"
      :closeLabel="closeLabel"
      :detents="detents"
      :initialFocus="initialFocus"
      :scrollable="scrollable"
      :dismissOnOutside="dismissOnOutside"
      :dismissOnBack="dismissOnBack"
      :beforeDismiss="() => beforeClose?.('back')"
      @opened="opened"
      @closed="settled"
      @error="failed"
    >
      <template v-if="$slots.header" #header><slot name="header" :close="close" /></template>
      <slot :close="close" />
      <template v-if="$slots.footer" #footer><slot name="footer" :close="close" /></template>
    </SNativeBottomSheet>
  </StackLayout>
</template>
