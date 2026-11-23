<script setup lang="ts">
import { computed, provide, useTemplateRef } from 'vue'
import SFieldset from '../components/SFieldset.vue'
import type { MultipleChoiceListProps } from '../types'
import { checkboxGroup, switchGroup } from './choice-group'
import { useChoiceListValidity } from './choice-list-validity'
import { onFormReset } from './form-reset'

const props = withDefaults(defineProps<MultipleChoiceListProps & { kind: 'checkbox' | 'switch' }>(),
  { orientation: 'vertical', requiredMessage: 'Select at least one option.' })
const model = defineModel<readonly string[]>({ default: () => [] })
const initial = [...model.value]
const group = useTemplateRef<InstanceType<typeof SFieldset>>('group')
provide(props.kind === 'checkbox' ? checkboxGroup : switchGroup, {
  value: model, initial, name: computed(() => props.name),
  presentation: computed(() => props), action: computed(() => props.changeAction),
})

function fieldset() {
  return (group.value?.$el as HTMLFieldSetElement | undefined) ?? null
}
useChoiceListValidity(fieldset, 'checkbox', () => {
  void model.value
  return { disabled: props.disabled, readOnly: props.readOnly, requiredMessage: props.required ? props.requiredMessage : undefined,
    error: props.status?.type === 'error' ? props.status.message : undefined }
})
onFormReset(fieldset, () => {
  model.value = [...initial]
})
</script>

<template>
  <SFieldset
    ref="group"
    class="sy-choice-group"
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
  >
    <slot />
  </SFieldset>
</template>
