<script setup lang="ts">
import { computed, ref, shallowRef, useAttrs, useTemplateRef, watch, watchPostEffect } from 'vue'
import { parseTime, toTime } from '@internationalized/date'
import { TimeFieldRoot, type TimeValue } from 'reka-ui'
import { useCalendarLocale, type DateFormatOptions } from '../internal/date-controls'
import { useTextControl, type TextControlProps } from '../internal/field'
import { useMediaQuery } from '../internal/interaction'
import { onFormReset } from '../internal/form-reset'
import { useControlStatus, type FieldStatus, type FieldStatusVariant } from '../internal/status-icon'
import { useTranslator } from '../rac/locale'
import SDateInputGroup from './SDateInputGroup.vue'
import SLabel from './SLabel.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'
import SFieldStatus from './SFieldStatus.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<TextControlProps & DateFormatOptions & {
  name?: string
  minValue?: TimeValue
  maxValue?: TimeValue
  defaultPlaceholder?: TimeValue
  granularity?: 'hour' | 'minute' | 'second'
  presentation?: 'segments' | 'native' | 'adaptive-native'
  status?: FieldStatus
  statusVariant?: FieldStatusVariant
}>()
const value = defineModel<TimeValue>()
const placeholder = defineModel<TimeValue>('placeholder')
const initial = value.value
const root = useTemplateRef<HTMLDivElement>('field')
const attrs = useAttrs()
const { id, hintId, errorId, disabled, required, invalid, controlAttrs } = useTextControl(props, 'sy-time')
const calendarLanguage = useCalendarLocale(props)
const coarse = useMediaQuery('(pointer: coarse)')
const native = computed(() => props.presentation === 'native' || props.presentation === 'adaptive-native' && coarse.value)
const translate = useTranslator({ 'time.outsideBounds': 'Choose a time within the available hours.', 'time.offStep': 'Choose an available time slot.' })
const bounded = computed(() => Boolean(props.minValue || props.maxValue))
const nativeDraft = ref<string>()
const nativeError = ref<'time.outsideBounds' | 'time.offStep'>()
const segmentDraft = shallowRef<TimeValue>()
const segmentValue = computed({
  get: () => segmentDraft.value ?? value.value,
  set: next => {
    segmentDraft.value = outsideBounds(next) ? next : undefined
    if (!segmentDraft.value) value.value = next
  },
})
const entryError = computed(() => native.value ? nativeError.value : outsideBounds(segmentValue.value) ? 'time.outsideBounds' : undefined)
const effectiveStatus = computed<FieldStatus | undefined>(() => {
  const status = props.status && { ...props.status, variant: props.statusVariant ?? props.status.variant }
  return entryError.value && !(status?.type === 'error' && status.message)
    ? { type: 'error', variant: props.statusVariant, message: translate(entryError.value) } : status
})
const { id: statusId, status, variant, statusIcon, isInvalid: statusInvalid, attrs: fieldAttrs } = useControlStatus(effectiveStatus, controlAttrs)
const nativeStep = computed(() => props.granularity === 'hour' ? (props.step?.hour ?? 1) * 3600
  : props.granularity === 'second' ? props.step?.second ?? 1 : (props.step?.minute ?? 1) * 60)
const form = computed(() => typeof attrs.form === 'string' ? attrs.form : undefined)

function clock(time: TimeValue) { return 'calendar' in time ? toTime(time) : time }
function outsideBounds(time?: TimeValue) {
  return Boolean(time && (props.minValue && clock(time).compare(clock(props.minValue)) < 0
    || props.maxValue && clock(time).compare(clock(props.maxValue)) > 0))
}

function nativeValue(time?: TimeValue) {
  if (!time) return
  return clock(time).toString().slice(0, props.granularity === 'second' || time.second ? 8 : 5)
}

function updateNative(event: Event) {
  if (disabled.value || props.readonly) return
  const input = event.currentTarget as HTMLInputElement
  const validity = input.validity
  nativeError.value = validity.rangeOverflow || validity.rangeUnderflow ? 'time.outsideBounds'
    : validity.stepMismatch && props.stepSnapping ? 'time.offStep' : undefined
  nativeDraft.value = nativeError.value ? input.value : undefined
  if (nativeError.value) return
  if (!input.value) { if (!validity.badInput) value.value = undefined; return }
  const time = parseTime(input.value)
  value.value = value.value?.set(time) ?? time
}
function clearDraft() { segmentDraft.value = undefined; nativeDraft.value = undefined; nativeError.value = undefined }
watch([value, native], clearDraft)
watchPostEffect(() => {
  const input = root.value?.querySelector<HTMLInputElement>('input:not([type="hidden"])')
  input?.setCustomValidity(entryError.value ? translate(entryError.value) : '')
})
onFormReset(() => root.value?.querySelector('input') ?? null, () => { value.value = initial; clearDraft() })
</script>

<template>
  <div ref="field" class="sy-field" :data-invalid="invalid || statusInvalid" :data-field-status="status?.type">
    <SLabel v-if="label" :id="`${id}-label`" :for="id">{{ label }}</SLabel>
    <div v-if="native" class="sy-date-control sy-date-control--native" :data-disabled="disabled || undefined">
      <input v-bind="fieldAttrs()" :id="id" type="time" class="sy-date-control__native-time" :value="nativeDraft ?? nativeValue(value) ?? ''"
        :name="name" :min="nativeValue(minValue)" :max="nativeValue(maxValue)" :step="nativeStep" :disabled="disabled" :readonly="readonly"
        :required="required" @input="updateNative" />
      <component :is="statusIcon" v-if="statusIcon" />
    </div>
    <TimeFieldRoot
      v-else
      v-slot="{ segments }"
      v-model="segmentValue"
      v-model:placeholder="placeholder"
      v-bind="fieldAttrs()"
      :id="id"
      class="sy-date-control"
      :aria-labelledby="label ? `${id}-label` : undefined"
      :aria-required="required"
      :name="bounded ? undefined : name"
      :disabled="disabled"
      :required="required"
      :readonly="readonly"
      :min-value="minValue"
      :max-value="maxValue"
      :default-placeholder="defaultPlaceholder"
      :granularity="granularity"
      :hide-time-zone="hideTimeZone"
      :hour-cycle="hourCycle"
      :step="step"
      :step-snapping="stepSnapping"
      :locale="calendarLanguage"
      :dir="dir"
    >
      <SDateInputGroup kind="time" :segments="segments" :locale="calendarLanguage" />
      <component :is="statusIcon" v-if="statusIcon" />
    </TimeFieldRoot>
    <input v-if="!native && bounded && name" type="hidden" :name="name" :value="value?.toString() ?? ''" :form="form" :disabled="disabled" />
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <Transition name="sy-time-feedback">
      <SFieldStatus v-if="status?.message && variant !== 'tooltip'" v-bind="status" :id="statusId" />
    </Transition>
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
  </div>
</template>
