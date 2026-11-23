<script setup lang="ts">
import SLinearMeasurement from '../internal/SLinearMeasurement.vue'
import type { MeasurementProps } from '../internal/measurement'

withDefaults(defineProps<MeasurementProps & { indeterminate?: boolean }>(), { showValue: true })
</script>

<template>
  <SLinearMeasurement v-bind="$props" role="progressbar">
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <template v-if="$slots.value" #value="state"><slot name="value" v-bind="state" /></template>
  </SLinearMeasurement>
</template>
