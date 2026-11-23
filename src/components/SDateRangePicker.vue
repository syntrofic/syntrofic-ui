<script lang="ts">
import type { DateValue } from 'reka-ui'

export interface DateRangePreset {
  id: string
  label: string
  getRange: () => { start: DateValue; end: DateValue }
}
</script>

<script setup lang="ts">
import { useLayerCollisionPadding } from '../internal/layer-context'
import { useLayerFocus } from '../internal/layer-focus'
import { toCalendarDate } from '@internationalized/date'
import { computed, inject, useTemplateRef } from 'vue'
import {
  DateRangePickerRoot, DateRangePickerAnchor, DateRangePickerField, DateRangePickerTrigger,
  DateRangePickerContent, type DateRange,
} from 'reka-ui'
import { focusPeriodOnOpen, pickerCalendarOptions, useCalendarLocale, type DatePickerOptions, type RangeDateMatcher, type RangeOptions } from '../internal/date-controls'
import { dialogContainer } from '../internal/dialog-container'
import { useTextControl, type TextControlProps } from '../internal/field'
import { onFormReset } from '../internal/form-reset'
import { useControlStatus, type FieldStatus, type FieldStatusVariant } from '../internal/status-icon'
import SButton from './SButton.vue'
import SFieldStatus from './SFieldStatus.vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'
import SRangeCalendar from './SRangeCalendar.vue'
import SDateInputGroup from './SDateInputGroup.vue'
import SLabel from './SLabel.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & Omit<DatePickerOptions, 'isDateUnavailable'> & {
  name?: string
  startLabel?: string
  endLabel?: string
  isDateUnavailable?: RangeDateMatcher
  presentation?: 'segments' | 'button'
  presets?: readonly DateRangePreset[]
  presetsLabel?: string
  status?: FieldStatus
  statusVariant?: FieldStatusVariant
} & RangeOptions>(), { triggerText: 'Calendar', triggerLabel: 'Choose date', fixedWeeks: true, closeOnSelect: true, startLabel: 'Start date', endLabel: 'End date', pagedNavigation: undefined })
const value = defineModel<DateRange>()
const emptyRange: DateRange = { start: undefined, end: undefined }
const placeholder = defineModel<DateValue>('placeholder')
const open = defineModel<boolean>('open', { default: false })
const initial = value.value
const container = inject(dialogContainer, null)
const root = useTemplateRef<HTMLDivElement>('field')
const focus = useLayerFocus({ open, origin: () => root.value,
  trigger: () => root.value?.querySelector('.sy-calendar-trigger, .sy-date-control__range-trigger') })
const { id, hintId, errorId, disabled, required, invalid, controlAttrs } = useTextControl(props, 'sy-range-picker')
const { id: statusId, status, variant, statusIcon, isInvalid: statusInvalid, attrs: fieldAttrs } = useControlStatus(
  () => props.status && { ...props.status, variant: props.statusVariant ?? props.status.variant }, controlAttrs)
const calendar = computed(() => pickerCalendarOptions(props, value.value?.start))
const calendarLanguage = useCalendarLocale(props)
const formatter = computed(() => new Intl.DateTimeFormat(calendarLanguage.value, { dateStyle: 'medium', timeZone: 'UTC' }))
onFormReset(() => root.value?.querySelector('input') ?? null, () => { value.value = initial })

const emit = defineEmits<{ 'start-change': [date: DateValue | undefined]; 'preset-select': [preset: string] }>()
const serialized = computed(() => {
  const { start, end } = value.value ?? {}
  return start && end && start.compare(end) <= 0 ? `${start.toString()}/${end.toString()}` : ''
})
const formatted = computed(() => {
  const { start, end } = value.value ?? {}
  if (!start || !end || start.compare(end) > 0) return props.triggerText
  return formatter.value.formatRange(toCalendarDate(start).toDate('UTC'), toCalendarDate(end).toDate('UTC'))
})
const presets = computed(() => !open.value ? [] : props.presets?.map(preset => {
  const range = preset.getRange()
  return { ...preset, range, disabled: !isSelectable(range),
    selected: value.value?.start?.compare(range.start) === 0 && value.value?.end?.compare(range.end) === 0 }
}) ?? [])
function focusStart() {
  root.value?.querySelector<HTMLElement>('.sy-date-control__field [role="spinbutton"], .sy-date-control__range-trigger')?.focus({ preventScroll: true })
}

function isSelectable({ start, end }: { start: DateValue; end: DateValue }) {
  if (disabled.value || props.readonly || start.compare(end) > 0
    || props.minValue && start.compare(props.minValue) < 0 || props.maxValue && end.compare(props.maxValue) > 0) return false
  const { start: currentStart, end: currentEnd } = value.value ?? {}
  if (props.fixedDate === 'start' && currentStart && start.compare(currentStart) !== 0
    || props.fixedDate === 'end' && currentEnd && end.compare(currentEnd) !== 0) return false
  const day = toCalendarDate(start)
  const last = toCalendarDate(end)
  const dayCount = last.calendar.toJulianDay(last) - day.calendar.toJulianDay(day) + 1
  if (props.maximumDays !== undefined && dayCount > props.maximumDays) return false
  const blocked = (date: DateValue) => props.isDateDisabled?.(date) || props.isDateUnavailable?.(date, props.fixedDate === 'end' ? end : start)
  if (blocked(start) || blocked(end)) return false
  if (props.allowNonContiguousRanges || !props.isDateDisabled && !props.isDateUnavailable) return true
  for (let offset = 1; offset < dayCount - 1; offset++) if (blocked(day.add({ days: offset }))) return false
  return true
}

function selectPreset({ id, range }: { id: string; range: { start: DateValue; end: DateValue } }) {
  if (!isSelectable(range)) return
  value.value = range
  placeholder.value = range.start
  if (props.closeOnSelect) open.value = false
  emit('preset-select', id)
}

function unavailable(date: DateValue) {
  const { start, end } = value.value ?? {}
  const anchor = props.fixedDate === 'end' ? end : props.fixedDate === 'start' || !end ? start : undefined
  return props.isDateUnavailable?.(date, anchor) ?? false
}
const collisionPadding = useLayerCollisionPadding(8)
</script>

<template>
  <div ref="field" class="sy-field" :data-invalid="invalid || statusInvalid" :data-field-status="status?.type">
    <SLabel v-if="label" :id="`${id}-label`" :for="id">{{ label }}</SLabel>
    <DateRangePickerRoot
      :id="id"
      :model-value="value ?? emptyRange"
      v-model:placeholder="placeholder"
      v-model:open="open"
      :disabled="disabled || presentation === 'button' && readonly"
      :readonly="readonly"
      :min-value="minValue"
      :max-value="maxValue"
      :default-placeholder="defaultPlaceholder"
      :locale="calendarLanguage"
      :dir="dir"
      :granularity="granularity"
      :hide-time-zone="hideTimeZone"
      :hour-cycle="hourCycle"
      :step="step"
      :is-date-unavailable="unavailable"
      :close-on-select="closeOnSelect"
      :allow-non-contiguous-ranges="allowNonContiguousRanges"
      :maximum-days="maximumDays"
      @update:model-value="value = $event"
    >
      <DateRangePickerAnchor as-child>
        <div class="sy-date-control sy-date-control--picker" :data-disabled="disabled || undefined" :dir="dir">
          <DateRangePickerField v-if="presentation !== 'button'"
            v-slot="{ segments }"
            v-bind="fieldAttrs()"
            class="sy-date-control__field"
            :aria-labelledby="label ? `${id}-label` : undefined"
            :aria-required="required"
          >
            <SDateInputGroup :segments="segments.start" position="start" :label="startLabel" :locale="calendarLanguage" />
            <span class="sy-date-control__dash" aria-hidden="true">–</span>
            <SDateInputGroup :segments="segments.end" position="end" :label="endLabel" :locale="calendarLanguage" />
          </DateRangePickerField>
          <DateRangePickerTrigger v-if="presentation === 'button'" v-bind="fieldAttrs()" class="sy-date-control__range-trigger"
            :id="id" :aria-label="`${triggerLabel} · ${formatted}`">
            <slot name="trigger" :text="formatted">
              <SMotionText :value="formatted" />
              <SIcon name="calendar" size="sm" />
            </slot>
          </DateRangePickerTrigger>
          <component :is="statusIcon" v-if="statusIcon" />
          <DateRangePickerTrigger v-if="presentation !== 'button'" class="sy-field-action sy-calendar-trigger" :aria-label="triggerLabel">
            <slot name="trigger">{{ triggerText }}</slot>
          </DateRangePickerTrigger>
        </div>
      </DateRangePickerAnchor>
      <DateRangePickerContent
        class="sy-floating-panel sy-calendar-popup"
        :portal="{ disabled: !container, to: container ?? undefined }"
        :update-position-strategy="container ? 'always' : 'optimized'"
        :side="side ?? 'bottom'"
        :align="align ?? 'start'"
        :side-offset="6"
        :collision-padding="collisionPadding"
        @open-auto-focus="focus.opened($event); focusPeriodOnOpen($event)"
        @close-auto-focus="focus.finish"
        @escape-key-down.prevent="open = false"
      >
        <div v-if="presets.length" class="sy-date-range-presets" role="group" :aria-label="presetsLabel ?? 'Preset ranges'">
          <SButton v-for="preset in presets" :key="preset.id" size="sm" :variant="preset.selected ? 'secondary' : 'ghost'"
            :aria-pressed="preset.selected" :disabled="preset.disabled" @click="selectPreset(preset)">{{ preset.label }}</SButton>
        </div>
        <SRangeCalendar
          v-bind="calendar"
          v-model="value"
          v-model:placeholder="placeholder"
          :label="label"
          :disabled="disabled"
          :invalid="invalid || statusInvalid"
          :allow-non-contiguous-ranges="allowNonContiguousRanges"
          :maximum-days="maximumDays"
          :is-date-highlightable="isDateHighlightable"
          :fixed-date="fixedDate"
          :is-date-unavailable="isDateUnavailable"
          @start-change="emit('start-change', $event)"
        >
          <template v-if="$slots.indicator" #indicator="day"><slot name="indicator" v-bind="day" /></template>
        </SRangeCalendar>
      </DateRangePickerContent>
    </DateRangePickerRoot>
    <input
      v-if="name || required"
      type="text"
      class="sy-visually-hidden"
      aria-hidden="true"
      tabindex="-1"
      :value="serialized"
      :name="name"
      :required="required"
      :disabled="disabled"
      @focus="focusStart"
    />
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <SFieldStatus v-if="status?.message && variant !== 'tooltip'" v-bind="status" :id="statusId" />
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
  </div>
</template>
