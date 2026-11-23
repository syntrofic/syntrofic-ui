<script setup lang="ts">
import { computed } from 'vue'
import { AutocompleteAnchor, AutocompleteInput, AutocompleteRoot, ComboboxCancel, useFilter } from 'reka-ui'
import type { SelectOption } from '../types'
import { useTextControl, type TextControlProps } from '../internal/field'
import SCandidates from '../internal/SCandidates.vue'
import { useControlStatus, type FieldStatus } from '../internal/status-icon'
import SFieldLabel from './SFieldLabel.vue'
import SFieldStatus from './SFieldStatus.vue'
import SIcon from './SIcon.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<TextControlProps & {
  options: readonly SelectOption[]
  placeholder?: string
  name?: string
  remote?: boolean
  loading?: boolean
  loadingText?: string
  emptyText?: string
  clearable?: boolean
  clearLabel?: string
  openOnFocus?: boolean
  maxResults?: number
  startIcon?: string
  status?: FieldStatus
}>(), { loadingText: 'Loading', emptyText: 'No results', clearLabel: 'Clear' })
const text = defineModel<string>()
const open = defineModel<boolean>('open')
const emit = defineEmits<{ select: [option: SelectOption] }>()
defineSlots<{ option?(scope: { option: SelectOption }): unknown; start?(): unknown }>()
const { id, hintId, errorId, required, disabled, controlAttrs } = useTextControl(props, 'sy-autocomplete')
const { id: statusId, attrs, status, variant, statusIcon } = useControlStatus(() => props.status, controlAttrs)
const { contains } = useFilter({ sensitivity: 'base' })
const result = computed(() => {
  const options = props.remote || !text.value ? props.options : props.options.filter(option => contains(option.label, text.value ?? ''))
  return props.maxResults === undefined ? options : options.slice(0, Math.max(0, props.maxResults))
})
</script>

<template>
  <div class="sy-field">
    <SFieldLabel v-if="label" :for="id" :label="label" :required="required" :disabled="disabled" />
    <AutocompleteRoot
      :model-value="text"
      :open="open"
      :disabled="disabled"
      :required="required"
      :name="name"
      :open-on-focus="openOnFocus"
      ignore-filter
      open-on-click
      @update:model-value="text = $event"
      @update:open="open = $event"
    >
      <AutocompleteAnchor class="sy-combo">
        <slot name="start"><SIcon v-if="startIcon" :name="startIcon" size="sm" /></slot>
        <AutocompleteInput
          v-bind="attrs()"
          :id="id"
          :placeholder="placeholder"
          class="sy-field__control"
          data-sy-focus-target
        />
        <ComboboxCancel
          v-if="clearable"
          type="button"
          class="sy-combo__action"
          :aria-label="clearLabel"
          :data-hidden="!text || undefined"
        ><SIcon name="close" /></ComboboxCancel>
        <component :is="statusIcon" v-if="statusIcon && variant === 'tooltip'" />
      </AutocompleteAnchor>
      <SCandidates :options="result" :loading="loading" :loading-text="loadingText" :empty-text="emptyText" use-label-for-value @select="emit('select', $event)">
        <template v-if="$slots.option" #option="scope"><slot name="option" v-bind="scope" /></template>
      </SCandidates>
    </AutocompleteRoot>
    <Transition name="sy-field-feedback">
      <SFieldStatus v-if="status?.message && variant !== 'tooltip'" v-bind="status" :id="statusId" />
    </Transition>
    <SDescription v-if="description" :id="hintId">{{ description }}</SDescription>
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
  </div>
</template>
