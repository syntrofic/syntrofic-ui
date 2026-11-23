<script setup lang="ts">
import { computed, provide, useId, useTemplateRef } from 'vue'
import { radioGroup } from '../internal/choice-group'
import { useChoiceListValidity } from '../internal/choice-list-validity'
import { onFormReset } from '../internal/form-reset'
import SFieldset from './SFieldset.vue'
import type { ChoiceListProps } from '../types'

const props = withDefaults(defineProps<ChoiceListProps>(), { orientation: 'vertical' })
const model = defineModel<string>()
const initial = model.value
const fieldset = useTemplateRef<InstanceType<typeof SFieldset>>('fieldset')
const id = `sy-radio-${useId()}`
const element = () => (fieldset.value?.$el as HTMLFieldSetElement | undefined) ?? null

provide(radioGroup, {
  value: model, initial,
  name: computed(() => props.name || id),
  required: computed(() => Boolean(props.required && !props.disabled && !props.readOnly)), presentation: computed(() => props),
})
useChoiceListValidity(element, 'radio', () => {
  void model.value
  return { disabled: props.disabled, readOnly: props.readOnly, requiredMessage: props.required ? props.requiredMessage : undefined,
    error: props.status?.type === 'error' ? props.status.message : undefined }
})
onFormReset(element, () => { model.value = initial })
</script>

<template>
  <SFieldset
    ref="fieldset"
    class="sy-choice-group"
    role="radiogroup"
    :aria-required="required || undefined"
    :aria-invalid="Boolean(error) || undefined"
    :data-orientation="orientation"
    :data-density="density"
    :data-dividers="dividers || undefined"
    :style="{ inlineSize: typeof width === 'number' ? width + 'px' : width }"
    :legend="label"
    :hide-legend="hideLabel"
    :legend-tooltip="labelTooltip"
    :description="description"
    :error="error"
    :status="status"
    :disabled="disabled && !disabledMessage"
  ><slot /></SFieldset>
</template>
