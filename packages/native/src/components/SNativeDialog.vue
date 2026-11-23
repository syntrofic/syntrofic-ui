<script setup lang="ts">
import { h, useTemplateRef } from 'nativescript-vue'
import { useNativeModal, type NativeDialogCloseReason, type NativeRestoreFocus } from '../modal'
import SNativeButton from './SNativeButton.vue'
import SNativeDialogSurface from './SNativeDialogSurface.vue'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  triggerLabel?: string
  showClose?: boolean
  closeLabel?: string
  backdropColor?: string
  backdrop?: 'dim' | 'blur'
  maxWidth?: number
  dismissOnOutside?: boolean
  dismissOnBack?: boolean
  swipeToDismiss?: boolean
  initialFocus?: NativeRestoreFocus
}>(), { closeLabel: 'Close', maxWidth: 360, dismissOnOutside: true, dismissOnBack: true, swipeToDismiss: true })
const emit = defineEmits<{ opened: []; closed: [reason: NativeDialogCloseReason]; error: [error: unknown] }>()
const open = defineModel<boolean>('open', { default: false })
const trigger = useTemplateRef<InstanceType<typeof SNativeButton>>('trigger')
const slots = defineSlots<{
  trigger(props: { open: (returnFocus?: NativeRestoreFocus) => void; visible: boolean }): unknown
  header(props: { close: (reason?: NativeDialogCloseReason) => void }): unknown
  default(props: { close: (reason?: NativeDialogCloseReason) => void }): unknown
  footer(props: { close: (reason?: NativeDialogCloseReason) => void }): unknown
}>()

const { show, close } = useNativeModal(open, events => {
  const controls = { close }
  return h(SNativeDialogSurface, {
    visible: open.value,
    title: props.title,
    description: props.description,
    showClose: props.showClose,
    closeLabel: props.closeLabel,
    backdropColor: props.backdropColor,
    backdrop: props.backdrop,
    maxWidth: props.maxWidth,
    dismissOnOutside: props.dismissOnOutside,
    dismissOnBack: props.dismissOnBack,
    swipeToDismiss: props.swipeToDismiss,
    initialFocus: props.initialFocus,
    onReady: events.ready,
    onLeft: events.dismiss,
    onEntered: () => emit('opened'),
    onRequest: close,
  }, {
    header: slots.header ? () => slots.header(controls) : undefined,
    default: slots.default ? () => slots.default(controls) : undefined,
    footer: slots.footer ? () => slots.footer(controls) : undefined,
  })
}, {
  closed: reason => emit('closed', reason),
  error: error => emit('error', error),
})

defineExpose({ show, close })
</script>

<template>
  <slot name="trigger" :open="show" :visible="open">
    <SNativeButton v-if="triggerLabel" ref="trigger" :label="triggerLabel" @tap="show(() => trigger?.focus())" />
  </slot>
</template>
