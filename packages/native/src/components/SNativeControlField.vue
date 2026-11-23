<script setup lang="ts">
import { useTemplateRef } from 'nativescript-vue'
import type { NativeChoiceOptions } from '../choice'
import { nextChoiceState, type NativeCheckState, type NativeChoiceKind } from '../control-state'
import SNativeChoice from './SNativeChoice.vue'

const props = withDefaults(defineProps<NativeChoiceOptions & { kind?: NativeChoiceKind; mixedLabel?: string }>(), {
  kind: 'switch', indicatorPlacement: 'end',
})
const value = defineModel<NativeCheckState>({ default: false })
const choice = useTemplateRef<InstanceType<typeof SNativeChoice>>('choice')
defineExpose({ focus: () => choice.value?.focus() ?? false })
</script>

<template>
  <SNativeChoice ref="choice" v-bind="props" :state="value" @activate="value = nextChoiceState(value, kind)">
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <template v-if="$slots.description" #description><slot name="description" /></template>
    <template v-if="$slots.indicator" #indicator="state"><slot name="indicator" v-bind="state" /></template>
  </SNativeChoice>
</template>
