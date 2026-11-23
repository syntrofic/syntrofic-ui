<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { computed, ref, useTemplateRef } from 'nativescript-vue'
import { nativeDateLabel } from '../calendar-format'
import { nativeSelectableDate } from '../calendar-state'
import { useNativeUI } from '../context'
import { nativePopupCalendar, type NativeDatePickerOptions } from '../date-picker'
import type { NativeDialogCloseReason } from '../modal'
import SNativeButton from './SNativeButton.vue'
import SNativeDatePopup from './SNativeDatePopup.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeFieldError from './SNativeFieldError.vue'
import SNativeLabel from './SNativeLabel.vue'

const props = withDefaults(defineProps<NativeDatePickerOptions & { format?: (date: CalendarDate) => string }>(), {
  placeholder: 'Choose a date', clearLabel: 'Clear date', requiredMessage: 'Choose a date.', selectOutsideMonth: undefined,
  fixedWeeks: undefined, showOutsideMonth: undefined, yearPicker: undefined, closeOnSelect: true,
})
const date = defineModel<CalendarDate>()
const opened = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ change: [date?: CalendarDate]; opened: []; closed: [reason: NativeDialogCloseReason]; popupError: [error: unknown] }>()
const popup = useTemplateRef<InstanceType<typeof SNativeDatePopup>>('popup')
const trigger = useTemplateRef<InstanceType<typeof SNativeButton>>('trigger')
const { direction } = useNativeUI()
const inactive = computed(() => props.disabled || props.readonly)
const rtl = computed(() => direction.value === 'rtl')
const validated = ref(false)
const status = computed(() => props.error || (validated.value && !valid() ? props.requiredMessage : undefined))
const display = computed(() => date.value ? props.format?.(date.value) ?? nativeDateLabel(date.value, props.locale) : props.placeholder)

function valid() {
  return !props.error && (date.value ? nativeSelectableDate(date.value, props) : !props.required)
}
function choose(value?: CalendarDate) {
  if (inactive.value || (value && !nativeSelectableDate(value, props))) return
  if (value ? date.value?.compare(value) === 0 : !date.value) return
  date.value = value
  emit('change', value)
}
function check() { validated.value = true; return valid() }
function show() { popup.value?.show(() => trigger.value?.focus()) }
defineExpose({ check, clear: () => choose(), show })
</script>

<template>
  <StackLayout>
    <SNativeLabel :text="props.label" :required="required" :requiredLabel="requiredLabel" marginBottom="4" @tap="show" />
    <GridLayout :columns="clearable ? rtl ? '46,*' : '*,46' : '*'" direction="ltr">
      <SNativeDatePopup ref="popup" :col="clearable && rtl ? 1 : 0" v-model:open="opened" :date="date"
        :options="nativePopupCalendar(props)" :disabled="inactive" :close-on-select="closeOnSelect" :done-label="doneLabel"
        :overlay="overlay" :detents="detents" @select="choose" @opened="emit('opened')" @closed="emit('closed', $event)" @error="emit('popupError', $event)">
        <template #trigger="{ open, visible }">
          <SNativeButton ref="trigger" :label="display" :accessibilityLabel="props.label" :accessibilityValue="display"
            :disabled="inactive" :pressed="visible" variant="secondary" fullWidth @tap="open(() => trigger?.focus())">
            <template v-if="$slots.end" #end><slot name="end" /></template>
          </SNativeButton>
        </template>
        <template v-if="$slots.day" #day="day"><slot name="day" v-bind="day" /></template>
      </SNativeDatePopup>
      <SNativeButton v-if="clearable" :col="rtl ? 0 : 1" :label="clearLabel" icon="close" variant="ghost"
        size="sm" :disabled="inactive || !date" fullWidth @tap="choose()" />
    </GridLayout>
    <SNativeDescription v-if="description" :text="description" marginTop="4" />
    <SNativeFieldError v-if="required || error !== undefined" :text="status" :minHeight="16" />
  </StackLayout>
</template>
