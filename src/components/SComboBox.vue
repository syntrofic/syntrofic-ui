<script setup lang="ts">
import SIcon from './SIcon.vue'
import { computed } from 'vue'
import { ComboboxAnchor, ComboboxCancel, ComboboxInput, ComboboxRoot, ComboboxTrigger, useFilter } from 'reka-ui'
import { useTextControl, type TextControlProps } from '../internal/field'
import type { SelectOption } from '../types'
import SCandidates from '../internal/SCandidates.vue'
import SLabel from './SLabel.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & {
  options: readonly SelectOption[]
  placeholder?: string
  name?: string
  clearable?: boolean
  remote?: boolean
  loading?: boolean
  loadingText?: string
  emptyText?: string
  clearLabel?: string
  triggerLabel?: string
}>(), { loadingText: 'Loading', emptyText: 'No results', clearLabel: 'Clear', triggerLabel: 'Show options' })
const value = defineModel<string>()
const query = defineModel<string>('query')
const open = defineModel<boolean>('open')
defineSlots<{ label?(): unknown; option?(scope: { option: SelectOption }): unknown }>()
const { id, hintId, errorId, required, disabled, invalid, controlAttrs } = useTextControl(props, 'sy-combo')
const { contains } = useFilter({ sensitivity: 'base' })
const result = computed(() => props.remote || !query.value || query.value === optionLabel(value.value)
  ? props.options : props.options.filter(option => contains(option.label, query.value ?? '')))

function optionLabel(key: unknown) {
  return props.options.find(option => option.value === key)?.label ?? (typeof key === 'string' ? key : '')
}
</script>

<template>
  <div class="sy-field">
    <SLabel v-if="label || $slots.label" :for="id"><slot name="label">{{ $props.label }}</slot></SLabel>
    <ComboboxRoot
      :model-value="value"
      :open="open"
      :required="required"
      :disabled="disabled"
      :name="name"
      ignore-filter
      open-on-click
      reset-model-value-on-clear
      @update:model-value="value = typeof $event === 'string' ? $event : undefined"
      @update:open="open = $event"
    >
      <ComboboxAnchor class="sy-combo">
        <ComboboxInput
          v-bind="controlAttrs()"
          :id="id"
          :model-value="query"
          :display-value="optionLabel"
          :placeholder="placeholder"
          :data-invalid="invalid || undefined"
          class="sy-field__control"
          data-sy-focus-target
          @update:model-value="query = $event"
        />
        <ComboboxCancel
          v-if="clearable"
          type="button"
          class="sy-combo__action"
          :aria-label="clearLabel"
          :data-hidden="!query || undefined"
        ><SIcon name="close" /></ComboboxCancel>
        <ComboboxTrigger class="sy-combo__action" :aria-label="triggerLabel">
          <span class="sy-disclosure__arrow" aria-hidden="true"></span>
        </ComboboxTrigger>
      </ComboboxAnchor>
      <SCandidates :options="result" :loading="loading" :loading-text="loadingText" :empty-text="emptyText">
        <template v-if="$slots.option" #option="scope"><slot name="option" v-bind="scope" /></template>
      </SCandidates>
    </ComboboxRoot>
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
  </div>
</template>
