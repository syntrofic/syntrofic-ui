<script setup lang="ts">
import { useAttrs, useId, type HTMLAttributes } from 'vue'
import { joinIds } from '../internal/field'
import SDescription from './SDescription.vue'
import SFieldError from './SFieldError.vue'
import SFieldStatus from './SFieldStatus.vue'
import SInfoTip from './SInfoTip.vue'
import { useInputStatusIcon, type FieldStatus } from '../internal/status-icon'

defineOptions({ inheritAttrs: false })
const props = defineProps<{
  legend?: string
  description?: string
  error?: string
  disabled?: boolean
  status?: FieldStatus
  hideLegend?: boolean
  legendTooltip?: string
}>()
const id = useId()
const attrs = useAttrs() as HTMLAttributes
const legendId = `sy-fieldset-${id}-legend`
const hintId = `sy-fieldset-${id}-hint`
const errorId = `sy-fieldset-${id}-error`
const { id: statusId, describedBy, variant, statusIcon } = useInputStatusIcon(() => props.status)
</script>

<template>
  <fieldset
    class="sy-fieldset"
    v-bind="$attrs"
    :disabled="disabled"
    :aria-labelledby="attrs['aria-labelledby'] ?? (legendTooltip && legend ? legendId : undefined)"
    :aria-invalid="status?.type === 'error' ? true : attrs['aria-invalid']"
    :aria-describedby="joinIds($attrs['aria-describedby'], (description || $slots.description) && hintId, error && errorId, describedBy)"
  >
    <legend v-if="legend || $slots.legend" class="sy-field__label" :class="{ 'sy-visually-hidden': hideLegend }">
      <span v-if="legendTooltip" :id="legendId"><slot name="legend">{{ legend }}</slot></span>
      <slot v-else name="legend">{{ legend }}</slot>
      <SInfoTip v-if="legendTooltip && !hideLegend" :text="legendTooltip" />
    </legend>
    <SDescription v-if="description || $slots.description" :id="hintId">
      <slot name="description">{{ description }}</slot>
    </SDescription>
    <div class="sy-fieldset__body"><slot /></div>
    <SFieldError v-if="error" :id="errorId">{{ error }}</SFieldError>
    <component :is="statusIcon" v-if="variant === 'tooltip' && statusIcon" />
    <Transition name="sy-choice-feedback"><SFieldStatus v-if="status && variant !== 'tooltip'" v-bind="status" :id="statusId" /></Transition>
  </fieldset>
</template>
