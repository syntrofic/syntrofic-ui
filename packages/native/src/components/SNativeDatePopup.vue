<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { useTemplateRef } from 'nativescript-vue'
import type { NativeCalendarOptions } from '../calendar-state'
import type { NativeDialogCloseReason, NativeRestoreFocus } from '../modal'
import type { NativePopoverOptions } from '../popover-state'
import type { NativeSheetDetent } from '../sheet-state'
import SNativeButton from './SNativeButton.vue'
import SNativeCalendar from './SNativeCalendar.vue'
import SNativePopover from './SNativePopover.vue'

const props = withDefaults(defineProps<{
  date?: CalendarDate
  options?: NativeCalendarOptions
  disabled?: boolean
  closeOnSelect?: boolean
  doneLabel?: string
  anchorAlign?: 'start' | 'end'
  overlay?: NativePopoverOptions
  detents?: readonly NativeSheetDetent[]
}>(), { closeOnSelect: true, doneLabel: 'Done', anchorAlign: 'start' })
const emit = defineEmits<{ select: [date: CalendarDate]; opened: []; closed: [reason: NativeDialogCloseReason]; error: [error: unknown] }>()
const open = defineModel<boolean>('open', { default: false })
const dialog = useTemplateRef<InstanceType<typeof SNativePopover>>('dialog')
function select(date: CalendarDate) {
  emit('select', date)
  if (props.closeOnSelect) dialog.value?.close('confirm')
}
defineExpose({
  show: (focus?: NativeRestoreFocus) => dialog.value?.show(focus),
  close: (reason?: NativeDialogCloseReason) => dialog.value?.close(reason),
})
</script>

<template>
  <SNativePopover ref="dialog" v-model:open="open" :width="336" :align="anchorAlign" :max-height="454" :detents="detents"
    v-bind="overlay" :disabled="disabled" stretchTrigger @opened="emit('opened')" @closed="emit('closed', $event)" @error="emit('error', $event)">
    <template #trigger="controls"><slot name="trigger" v-bind="controls" /></template>
    <template #default>
      <SNativeCalendar :model-value="date" v-bind="options" @select="select">
        <template v-if="$slots.day" #day="day"><slot name="day" v-bind="day" /></template>
      </SNativeCalendar>
    </template>
    <template v-if="!closeOnSelect" #footer="{ close }">
      <SNativeButton :label="doneLabel" fullWidth size="sm" @tap="close('confirm')" />
    </template>
  </SNativePopover>
</template>
