<script setup lang="ts">
import { useTemplateRef } from 'nativescript-vue'
import type { NativeChoiceOptions } from '../choice'
import { nextChoiceState, type NativeCheckState } from '../control-state'
import SNativeChoice from './SNativeChoice.vue'

const props = defineProps<NativeChoiceOptions & { mixedLabel?: string }>()
const value = defineModel<NativeCheckState>({ default: false })
const choice = useTemplateRef<InstanceType<typeof SNativeChoice>>('choice')
defineExpose({ focus: () => choice.value?.focus() ?? false })
</script>

<template>
  <SNativeChoice ref="choice" v-bind="props" kind="checkbox" :state="value" @activate="value = nextChoiceState(value, 'checkbox')">
    <template v-if="$slots.indicator" #indicator="state"><slot name="indicator" v-bind="state" /></template>
  </SNativeChoice>
</template>
