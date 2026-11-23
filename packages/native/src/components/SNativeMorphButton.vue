<script setup lang="ts">
import { computed, useTemplateRef } from 'nativescript-vue'
import { compactActionSize, type NativeMorphDirection } from '../action-state'
import type { NativeButtonSize, NativeButtonVariant } from '../button'
import type { NativeDialogCloseReason, NativeRestoreFocus } from '../modal'
import SNativeButton from './SNativeButton.vue'
import SNativePopover from './SNativePopover.vue'

const props = withDefaults(defineProps<{
  label: string
  title?: string
  direction?: NativeMorphDirection
  width?: number | 'content-fit'
  maxHeight?: number
  buttonWidth?: number
  defaultOpen?: boolean
  disabled?: boolean
  size?: NativeButtonSize
  variant?: NativeButtonVariant
  closeLabel?: string
  showClose?: boolean
  dismissOnOutside?: boolean
  initialFocus?: NativeRestoreFocus
}>(), { direction: 'bottom', width: 'content-fit', size: 'md', variant: 'primary', showClose: true, dismissOnOutside: true })
const open = defineModel<boolean | undefined>('open', { default: undefined })
const visible = computed({ get: () => open.value ?? props.defaultOpen ?? false, set: value => { open.value = value } })
const emit = defineEmits<{ opened: []; closed: [reason: NativeDialogCloseReason]; error: [error: unknown] }>()
defineSlots<{
  start(props: { color: string }): unknown
  label(props: { label: string; color: string; size: number }): unknown
  default(props: { close: (reason?: NativeDialogCloseReason) => void }): unknown
}>()
const popover = useTemplateRef<InstanceType<typeof SNativePopover>>('popover')
const trigger = useTemplateRef<InstanceType<typeof SNativeButton>>('trigger')
const dimensions = computed(() => compactActionSize([props.label], props.size))
const collapsedWidth = computed(() => props.buttonWidth ?? dimensions.value.width)
const focus = () => trigger.value?.focus() ?? false
defineExpose({ open: () => popover.value?.show(focus), close: () => popover.value?.close(), focus })
</script>

<template>
  <SNativePopover ref="popover" v-model:open="visible" :disabled="disabled" :morphDirection="direction" :width="width" :anchorWidth="collapsedWidth"
    :maxHeight="maxHeight" :dismissOnOutside="dismissOnOutside" :initialFocus="initialFocus"
    :title="title" :showClose="showClose" :closeLabel="closeLabel"
    @opened="emit('opened')" @closed="emit('closed', $event)" @error="emit('error', $event)">
    <template #trigger="{ open: show, visible: expanded }">
      <SNativeButton ref="trigger" :label="label" :size="size" :variant="variant" :disabled="disabled" :pressed="expanded" @tap="show(focus)">
        <template v-if="$slots.start" #start="state"><slot name="start" v-bind="state" /></template>
        <template v-if="$slots.label" #label="state"><slot name="label" v-bind="state" /></template>
      </SNativeButton>
    </template>
    <template #default="{ close }"><slot :close="close" /></template>
  </SNativePopover>
</template>
