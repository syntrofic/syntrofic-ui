<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { DateFieldRoot, type DateValue } from 'reka-ui'
import { useMonthDates, type DateFieldOptions } from '../internal/date-controls'
import { useTextControl, type TextControlProps } from '../internal/field'
import { onFormReset } from '../internal/form-reset'
import SDateInputGroup from './SDateInputGroup.vue'
import SLabel from './SLabel.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<TextControlProps & DateFieldOptions & { name?: string }>()
const value = defineModel<DateValue>()
const placeholder = defineModel<DateValue>('placeholder')
const { locale: calendarLanguage, display, toDisplay, toModel, minValue, maxValue } = useMonthDates(
  props, () => value.value ?? placeholder.value ?? props.defaultPlaceholder,
)
const displayedValue = computed({
  get: () => value.value && toDisplay(value.value),
  set: date => { value.value = date && toModel(date) },
})
const displayedPlaceholder = computed({
  get: () => placeholder.value && toDisplay(placeholder.value),
  set: date => { placeholder.value = date && toModel(date) },
})
const defaultPlaceholder = computed(() => props.defaultPlaceholder && toDisplay(props.defaultPlaceholder))
const unavailable = computed(() => {
  const check = props.isDateUnavailable
  return check && ((date: DateValue) => check(toModel(date)))
})
const initial = value.value
const root = useTemplateRef<HTMLDivElement>('field')
const { id, hintId, errorId, disabled, required, invalid, controlAttrs } = useTextControl(props, 'sy-date')
onFormReset(() => root.value?.querySelector('input') ?? null, () => { value.value = initial })
</script>

<template>
  <div ref="field" class="sy-field" :data-invalid="invalid">
    <SLabel v-if="label" :id="`${id}-label`" :for="id">{{ label }}</SLabel>
    <DateFieldRoot
      v-slot="{ segments }"
      v-model="displayedValue"
      v-model:placeholder="displayedPlaceholder"
      v-bind="controlAttrs()"
      :id="id"
      class="sy-date-control"
      :data-calendar="display.identifier"
      :aria-labelledby="label ? `${id}-label` : undefined"
      :aria-required="required"
      :name="name"
      :disabled="disabled"
      :required="required"
      :readonly="readonly"
      :min-value="minValue"
      :max-value="maxValue"
      :default-placeholder="defaultPlaceholder"
      :is-date-unavailable="unavailable"
      :granularity="granularity"
      :hide-time-zone="hideTimeZone"
      :hour-cycle="hourCycle"
      :step="step"
      :step-snapping="stepSnapping"
      :locale="calendarLanguage"
      :dir="dir"
    >
      <SDateInputGroup :segments="segments" :locale="calendarLanguage" />
    </DateFieldRoot>
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
  </div>
</template>
