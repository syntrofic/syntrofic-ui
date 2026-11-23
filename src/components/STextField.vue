<script setup lang="ts">
import { computed, provide, useId, useSlots } from 'vue'
import { fieldContext, joinIds } from '../internal/field'
import { inputStatusGroup, useInputStatusIcon, type FieldStatus } from '../internal/status-icon'
import SFieldLabel from './SFieldLabel.vue'
import SFieldStatus from './SFieldStatus.vue'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'

const props = defineProps<{
  id?: string
  label?: string
  description?: string
  error?: string
  status?: FieldStatus
  disabled?: boolean
  required?: boolean
  optional?: boolean
  labelTooltip?: string
  labelTooltipLabel?: string
  labelIcon?: string
  descriptionPlacement?: 'label' | 'control'
}>()
const slots = useSlots()
const unique = `sy-text-field-${useId()}`
const hintId = `${unique}-hint`
const errorId = `${unique}-error`
const id = computed(() => props.id ?? unique)
const hasError = computed(() => Boolean(props.error || slots.error))
const invalid = computed(() => hasError.value || props.status?.type === 'error')
const { id: statusId, status, variant, statusIcon, describedBy: statusDescription } = useInputStatusIcon(() => props.status)
const describedBy = computed(() => joinIds(
  (props.description || slots.description) && hintId,
  hasError.value && errorId,
  statusDescription.value,
))
provide(fieldContext, {
  id, describedBy, invalid,
  disabled: computed(() => Boolean(props.disabled)),
  required: computed(() => Boolean(props.required)),
})
provide(inputStatusGroup, { status, describedBy: statusDescription })
</script>

<template>
  <div class="sy-field sy-text-field" :data-invalid="invalid" :data-field-status="status?.type">
    <SFieldLabel v-if="label || $slots.label" :for="id" :label="label" :required="required" :optional="optional"
      :disabled="disabled" :icon="labelIcon" :tooltip="labelTooltip" :tooltip-label="labelTooltipLabel"
      :description="descriptionPlacement === 'label' ? description : undefined" :description-id="hintId">
      <template v-if="$slots.label" #default><slot name="label" /></template>
      <template v-if="descriptionPlacement === 'label' && $slots.description" #description><slot name="description" /></template>
    </SFieldLabel>
    <slot :id="id" :described-by="describedBy" :invalid="invalid" :required="required" :disabled="disabled" />
    <Transition name="sy-field-feedback">
      <SFieldStatus v-if="status?.message && variant !== 'tooltip'" v-bind="status" :id="statusId" />
    </Transition>
    <component :is="statusIcon" v-if="variant === 'tooltip' && statusIcon" />
    <SDescription v-if="(description || $slots.description) && (descriptionPlacement !== 'label' || !(label || $slots.label))" :id="hintId">
      <slot name="description">{{ description }}</slot>
    </SDescription>
    <SFieldError v-if="hasError" :id="errorId"><slot name="error">{{ error }}</slot></SFieldError>
  </div>
</template>
