<script setup lang="ts">
import { computed, useId } from 'vue'
import { useMeasurement, type MeasurementProps } from '../internal/measurement'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<MeasurementProps & {
  indeterminate?: boolean
  thickness?: string
}>(), { size: 'md', tone: 'accent' })

const labelId = `sy-ring-${useId()}`
const { value, display, bars, aria } = useMeasurement(props, true, true)
const pending = computed(() => props.indeterminate || value.value === undefined)
</script>

<template>
  <div
    class="sy-progress-circle"
    role="progressbar"
    :aria-labelledby="label || $slots.label ? labelId : undefined"
    v-bind="aria"
    :aria-valuenow="pending ? undefined : aria['aria-valuenow']"
    :aria-valuetext="pending ? undefined : aria['aria-valuetext']"
    :data-size="size"
    :data-tone="tone"
    :data-indeterminate="pending || undefined"
    :style="{ ...bars, '--sy-progress-thickness': thickness }"
  >
    <span class="sy-progress-circle__dial" aria-hidden="true">
      <span class="sy-progress-circle__track" />
      <span class="sy-progress-circle__arc" />
      <span v-if="showValue || $slots.value" class="sy-progress-circle__value">
        <slot name="value" :text="display" :value="value" :indeterminate="pending">
          <SMotionText :value="pending ? ' ' : display" motion="roll" />
        </slot>
      </span>
    </span>
    <span v-if="label || $slots.label" :id="labelId" class="sy-progress-circle__label"><slot name="label">{{ label }}</slot></span>
  </div>
</template>
