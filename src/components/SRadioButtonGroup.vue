<script setup lang="ts">
import SChoiceButtonOptions, { type ChoiceButtonSlotProps } from '../internal/SChoiceButtonOptions.vue'
import SRadioGroup from './SRadioGroup.vue'
import type { ChoiceButtonGroupProps } from '../types'

withDefaults(defineProps<Omit<ChoiceButtonGroupProps, 'requiredMessage'>>(), { indicator: true })
defineSlots<{
  content(props: ChoiceButtonSlotProps): unknown
  icon(props: ChoiceButtonSlotProps): unknown
  indicator(props: ChoiceButtonSlotProps): unknown
}>()
const model = defineModel<string>()
</script>

<template>
  <SRadioGroup v-model="model" class="sy-choice-button-group" :name="name" :label="label" :description="description"
    :error="error" :disabled="disabled" :required="required" :orientation="orientation">
    <SChoiceButtonOptions kind="radio" :options="options" :selected="model === undefined ? [] : [model]" :layout="layout"
      :appearance="appearance" :indicator="indicator" :effect="effect" :disabled="disabled">
      <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
      <template v-if="$slots.icon" #icon="scope"><slot name="icon" v-bind="scope" /></template>
      <template v-if="$slots.indicator" #indicator="scope"><slot name="indicator" v-bind="scope" /></template>
    </SChoiceButtonOptions>
  </SRadioGroup>
</template>
