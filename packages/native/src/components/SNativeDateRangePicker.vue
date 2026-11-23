<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { computed, ref, shallowRef, useTemplateRef, watch } from 'nativescript-vue'
import { nativeDateLabel } from '../calendar-format'
import type { NativeCalendarOptions } from '../calendar-state'
import type { NativeDialogCloseReason } from '../modal'
import { nativeOrderedDates, nativeRangeIssue, type NativeDateRange, type NativeDateRangeRules } from '../range-state'
import { nativeTemporalField, type NativeTemporalPickerOptions } from '../temporal-picker'
import SNativeButton from './SNativeButton.vue'
import SNativeDateField from './SNativeDateField.vue'
import SNativeFieldError from './SNativeFieldError.vue'
import SNativeRangeCalendar from './SNativeRangeCalendar.vue'
import SNativeReveal from './SNativeReveal.vue'
import SNativeTemporalPickerField from './SNativeTemporalPickerField.vue'

const props = withDefaults(defineProps<NativeTemporalPickerOptions & NativeCalendarOptions & NativeDateRangeRules & {
  startPrompt?: string
  endPrompt?: string
  startLabel?: string
  endLabel?: string
  manualLabel?: string
  calendarLabel?: string
  editable?: boolean
  invalidRangeText?: string
  format?: (range: NativeDateRange) => string
}>(), {
  placeholder: 'Choose a date range', locale: 'en-US', showOutsideMonth: undefined, fixedWeeks: undefined,
  yearPicker: undefined, selectOutsideMonth: undefined, closeOnSelect: true, editable: true,
  startLabel: 'Start date', endLabel: 'End date', manualLabel: 'Enter dates', calendarLabel: 'Use calendar',
  doneLabel: 'Done', clearLabel: 'Clear dates', requiredMessage: 'Choose dates.',
  invalidRangeText: 'Choose an available range.',
})
const value = defineModel<NativeDateRange>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ change: [range?: NativeDateRange]; opened: []; closed: [reason: NativeDialogCloseReason]; popupError: [error: unknown] }>()
const picker = useTemplateRef<InstanceType<typeof SNativeTemporalPickerField>>('picker')
const first = useTemplateRef<InstanceType<typeof SNativeDateField>>('first')
const last = useTemplateRef<InstanceType<typeof SNativeDateField>>('last')
const start = shallowRef<CalendarDate>()
const end = shallowRef<CalendarDate>()
const manual = ref(false)
const checked = ref(false)
const problem = ref('')
const display = computed(() => {
  const range = value.value
  if (!range) return props.placeholder
  return props.format?.(range) ?? `${nativeDateLabel(range.start, props.locale, 'short')} – ${nativeDateLabel(range.end, props.locale, 'short')}`
})
const status = computed(() => props.error || (checked.value ? message() : ''))
const options = computed(() => ({
  locale: props.locale, weekStartsOn: props.weekStartsOn, fixedWeeks: props.fixedWeeks, showOutsideMonth: props.showOutsideMonth,
  selectOutsideMonth: props.selectOutsideMonth, yearPicker: props.yearPicker, defaultMonth: props.defaultMonth,
  minDate: props.minDate, maxDate: props.maxDate, isDateDisabled: props.isDateDisabled, isDateUnavailable: props.isDateUnavailable,
  previousMonthLabel: props.previousMonthLabel, nextMonthLabel: props.nextMonthLabel, yearPickerLabel: props.yearPickerLabel,
  closeYearPickerLabel: props.closeYearPickerLabel, minimumDays: props.minimumDays, maximumDays: props.maximumDays,
  allowNonContiguousRanges: props.allowNonContiguousRanges,
}))
function message() {
  return value.value ? nativeRangeIssue(value.value, props) ? props.invalidRangeText : '' : props.required ? props.requiredMessage : ''
}
function prepare() {
  start.value = value.value?.start
  end.value = value.value?.end
  manual.value = false
  problem.value = ''
}
function pick(next?: NativeDateRange) {
  if (props.disabled || props.readonly) return
  value.value = next
  start.value = next?.start
  end.value = next?.end
  problem.value = ''
  emit('change', next)
  if (next && props.closeOnSelect && !manual.value) picker.value?.close('confirm')
}
function finish() {
  if (manual.value) {
    const validStart = first.value?.check()
    const validEnd = last.value?.check()
    if (!validStart || !validEnd || !start.value || !end.value) return
    const next = nativeOrderedDates(start.value, end.value)
    if (nativeRangeIssue(next, props)) { problem.value = props.invalidRangeText; return }
    pick(next)
  } else if (!check()) return
  picker.value?.close('confirm')
}
function check() {
  checked.value = true
  return !props.error && !message()
}
watch(open, shown => { if (shown) prepare() }, { immediate: true })
defineExpose({ check, show: () => picker.value?.show(), clear: () => pick() })
</script>

<template>
  <SNativeTemporalPickerField ref="picker" v-model:open="open" v-bind="nativeTemporalField(props)" :display="display" :hasValue="Boolean(value)" :status="status"
    @opening="prepare" @clear="pick()" @opened="emit('opened')" @closed="emit('closed', $event)" @error="emit('popupError', $event)">
    <template v-if="$slots.end" #end><slot name="end" /></template>
    <SNativeReveal :transition-key="manual ? 1 : 0">
      <StackLayout v-if="manual">
        <SNativeDateField ref="first" v-model="start" :locale="locale" :min-date="minDate" :max-date="maxDate" :is-date-unavailable="isDateUnavailable" :label="startLabel" :picker="false" required :required-message="requiredMessage" />
        <SNativeDateField ref="last" v-model="end" :locale="locale" :min-date="minDate" :max-date="maxDate" :is-date-unavailable="isDateUnavailable" :label="endLabel" :picker="false" required :required-message="requiredMessage" marginTop="5" />
        <SNativeFieldError :text="problem" :minHeight="16" />
      </StackLayout>
      <SNativeRangeCalendar v-else :model-value="value" v-bind="options" :start-prompt="startPrompt" :end-prompt="endPrompt"
        :invalid-range-text="invalidRangeText" @select="pick">
        <template v-if="$slots.day" #day="day"><slot name="day" v-bind="day" /></template>
      </SNativeRangeCalendar>
    </SNativeReveal>
    <template v-if="editable || !closeOnSelect" #footer>
      <GridLayout :columns="editable ? '*,*' : '*'">
        <SNativeButton v-if="editable" :label="manual ? calendarLabel : manualLabel" size="sm" variant="ghost"
          fullWidth @tap="manual = !manual; problem = ''" />
        <SNativeReveal :col="editable ? 1 : 0" :open="manual || !closeOnSelect">
          <SNativeButton :label="doneLabel" size="sm" fullWidth @tap="finish" />
        </SNativeReveal>
      </GridLayout>
    </template>
  </SNativeTemporalPickerField>
</template>
