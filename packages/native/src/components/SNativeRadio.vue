<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'nativescript-vue'
import { nativeRadioGroup, type NativeChoiceOptions } from '../choice'
import type { NativeRadioValue } from '../control-state'
import SNativeChoice from './SNativeChoice.vue'

const props = defineProps<NativeChoiceOptions & { optionValue?: NativeRadioValue }>()
const checked = defineModel<boolean>({ default: false })
const group = inject(nativeRadioGroup, undefined)
const choice = useTemplateRef<InstanceType<typeof SNativeChoice>>('choice')
const state = computed(() => group && props.optionValue !== undefined ? Object.is(group.selected(), props.optionValue) : checked.value)
const inactive = computed(() => props.disabled || group?.disabled())
const readOnly = computed(() => props.readonly || group?.readonly())
const invalid = computed(() => props.invalid || group?.invalid())

function select() {
  if (group && props.optionValue !== undefined) group.select(props.optionValue)
  else checked.value = true
}

defineExpose({ focus: () => choice.value?.focus() ?? false })
</script>

<template>
  <SNativeChoice
    ref="choice"
    kind="radio"
    :label="label"
    :description="description"
    :disabled="inactive"
    :readonly="readOnly"
    :invalid="invalid"
    :error="error"
    :hideLabel="hideLabel"
    :indicatorPlacement="indicatorPlacement"
    :state="state"
    @activate="select"
  >
    <template v-if="$slots.indicator" #indicator="state"><slot name="indicator" v-bind="state" /></template>
  </SNativeChoice>
</template>
