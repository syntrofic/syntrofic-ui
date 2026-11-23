<script lang="ts">
import type { TimestampFormat } from './STimestamp.vue'
import type { DateValue } from 'reka-ui'
export type DatePickerFormat = Extract<TimestampFormat, 'date' | 'date_long' | 'date_weekday' | 'system_date'> | ((value: DateValue) => string)
</script>

<script setup lang="ts">
import { useLayerCollisionPadding } from '../internal/layer-context'
import { useLayerFocus } from '../internal/layer-focus'
import { toCalendarDate } from '@internationalized/date'
import { computed, inject, nextTick, useTemplateRef } from 'vue'
import {
  DatePickerRoot, DatePickerAnchor, DatePickerField, DatePickerTrigger,
  DatePickerContent,
} from 'reka-ui'
import { focusPeriodOnOpen, pickerCalendarOptions, useCalendarLocale, type DatePickerOptions } from '../internal/date-controls'
import { dialogContainer } from '../internal/dialog-container'
import { useTextControl, type TextControlProps } from '../internal/field'
import { useControlStatus, type FieldStatus, type FieldStatusVariant } from '../internal/status-icon'
import { onFormReset } from '../internal/form-reset'
import { useMediaQuery } from '../internal/interaction'
import { useTranslator } from '../rac/locale'
import SDateWheel from '../internal/SDateWheel.vue'
import SCalendar from './SCalendar.vue'
import SDateInputGroup from './SDateInputGroup.vue'
import SLabel from './SLabel.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'
import SFieldStatus from './SFieldStatus.vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'
import STimestamp from './STimestamp.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & DatePickerOptions & {
  name?: string
  status?: FieldStatus
  statusVariant?: FieldStatusVariant
  clearable?: boolean
  clearLabel?: string
  format?: DatePickerFormat
  presentation?: 'calendar' | 'wheel' | 'adaptive-wheel'
  applyLabel?: string
  haptics?: boolean
}>(), { triggerText: 'Calendar', triggerLabel: 'Choose date', applyLabel: 'Apply date', fixedWeeks: true, closeOnSelect: true, pagedNavigation: undefined })
const value = defineModel<DateValue>()
const placeholder = defineModel<DateValue>('placeholder')
const open = defineModel<boolean>('open', { default: false })
const initial = value.value
const container = inject(dialogContainer, null)
const root = useTemplateRef<HTMLDivElement>('field')
const focus = useLayerFocus({ open, origin: () => root.value,
  trigger: () => root.value?.querySelector('.sy-calendar-trigger') })
const emit = defineEmits<{ clear: [] }>()
const { id, hintId, errorId, disabled, required, invalid, controlAttrs } = useTextControl(props, 'sy-date-picker')
const { id: statusId, status: fieldStatus, variant, statusIcon, isInvalid: statusInvalid, attrs: inputAttrs } = useControlStatus(
  () => props.status && { ...props.status, variant: props.statusVariant ?? props.status.variant }, controlAttrs)
const calendar = computed(() => pickerCalendarOptions(props, value.value))
const calendarLanguage = useCalendarLocale(props)
const coarse = useMediaQuery('(pointer: coarse)')
const wheel = computed(() => props.presentation === 'wheel' || props.presentation === 'adaptive-wheel' && coarse.value)
const shown = computed(() => value.value && props.format ? (typeof props.format === 'function' ? props.format(value.value) : toCalendarDate(value.value).toDate('UTC')) : undefined)
const clearVisible = computed(() => Boolean(value.value && !disabled.value && !props.readonly))
const translate = useTranslator({ 'date.clear': 'Clear date' })
onFormReset(() => root.value?.querySelector('input') ?? null, () => { value.value = initial })

function focusEditing() {
  if (!disabled.value) root.value?.querySelector<HTMLElement>('.sy-date-control__field [role="spinbutton"]')?.focus({ preventScroll: true })
}
function clear() {
  if (!clearVisible.value) return
  value.value = undefined
  open.value = false
  void nextTick(focusEditing)
  emit('clear')
}

function updateCalendar(date: DateValue | DateValue[] | undefined) {
  if (!Array.isArray(date)) value.value = date
}
function focusPicker(event: Event) {
  focus.opened(event)
  if (!wheel.value) { focusPeriodOnOpen(event); return }
  const initial = (event.target as HTMLElement | null)?.querySelector<HTMLElement>('.sy-picker-wheel')
  if (initial) { event.preventDefault(); initial.focus({ preventScroll: true }) }
}
function applyWheel(date: DateValue) {
  value.value = date
  if (props.closeOnSelect) open.value = false
}
const collisionPadding = useLayerCollisionPadding(8)
</script>

<template>
  <div ref="field" class="sy-field" :data-invalid="invalid || statusInvalid" :data-field-status="fieldStatus?.type">
    <SLabel v-if="label" :id="`${id}-label`" :for="id">{{ label }}</SLabel>
    <DatePickerRoot
      :id="id"
      v-model="value"
      v-model:placeholder="placeholder"
      v-model:open="open"
      :name="name"
      :required="required"
      :disabled="disabled"
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
      :is-date-unavailable="isDateUnavailable"
      :close-on-select="closeOnSelect"
    >
      <DatePickerAnchor as-child>
        <div class="sy-date-control sy-date-control--picker" :data-disabled="disabled || undefined" :dir="dir">
          <DatePickerField
            v-slot="{ segments }"
            v-bind="inputAttrs()"
            class="sy-date-control__field"
            :aria-labelledby="label ? `${id}-label` : undefined"
            :aria-required="required"
            :data-formatted="shown !== undefined || undefined"
            @click.self="format && focusEditing()"
          >
            <SDateInputGroup :segments="segments" :locale="calendarLanguage" />
            <span v-if="shown !== undefined" class="sy-date-control__formatted" aria-hidden="true">
              <SMotionText v-if="typeof shown === 'string'" :value="shown" />
              <STimestamp v-else-if="typeof format === 'string'" :value="shown" :format="format" :locale="calendarLanguage"
                time-zone="UTC" :tooltip="false" color="inherit" />
            </span>
          </DatePickerField>
          <component :is="statusIcon" v-if="statusIcon" />
          <button v-if="clearable" type="button" class="sy-field__affix sy-field__clear" :data-visible="clearVisible || undefined"
            :aria-label="clearLabel ?? translate('date.clear')" :aria-hidden="!clearVisible || undefined" :tabindex="clearVisible ? undefined : -1"
            @pointerdown.prevent @click="clear"><SIcon name="close" size="sm" /></button>
          <slot v-if="$slots['external-trigger']" name="external-trigger" :disabled="disabled" />
          <DatePickerTrigger v-else class="sy-field-action sy-calendar-trigger" :aria-label="triggerLabel">
            <slot name="trigger">{{ triggerText }}</slot>
          </DatePickerTrigger>
        </div>
      </DatePickerAnchor>
      <DatePickerContent
        v-if="!$slots['external-trigger']"
        class="sy-floating-panel sy-calendar-popup"
        :portal="{ disabled: !container, to: container ?? undefined }"
        :update-position-strategy="container ? 'always' : 'optimized'"
        :side="side ?? 'bottom'"
        :align="align ?? 'start'"
        :side-offset="6"
        :collision-padding="collisionPadding"
        @open-auto-focus="focusPicker"
        @close-auto-focus="focus.finish"
        @escape-key-down.prevent="open = false"
      >
        <SDateWheel v-if="wheel && open" v-bind="calendar" :locale="calendarLanguage" :value="value" :apply-label="applyLabel" :haptics="haptics"
          @apply="applyWheel" />
        <slot v-else-if="!wheel" name="picker-calendar" :options="calendar" :disabled="disabled" :invalid="invalid || statusInvalid">
          <SCalendar v-bind="calendar" :model-value="value" v-model:placeholder="placeholder" :label="label" :disabled="disabled"
            :invalid="invalid || statusInvalid" @update:model-value="updateCalendar">
            <template v-if="$slots.indicator" #indicator="day"><slot name="indicator" v-bind="day" /></template>
          </SCalendar>
        </slot>
        <slot name="picker-footer" />
      </DatePickerContent>
    </DatePickerRoot>
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <SFieldStatus v-if="fieldStatus?.message && variant !== 'tooltip'" v-bind="fieldStatus" :id="statusId" />
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
  </div>
</template>
