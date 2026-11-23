<script setup lang="ts">
import { useTemplateRef } from 'nativescript-vue'
import type { NativeChoiceOptions } from '../choice'
import SNativeChoice from './SNativeChoice.vue'

const props = withDefaults(defineProps<NativeChoiceOptions>(), { indicatorPlacement: 'end' })
const value = defineModel<boolean>({ default: false })
const choice = useTemplateRef<InstanceType<typeof SNativeChoice>>('choice')
defineExpose({ focus: () => choice.value?.focus() ?? false })
</script>

<template>
  <SNativeChoice ref="choice" v-bind="props" kind="switch" :state="value" @activate="value = !value">
    <template v-if="$slots.indicator" #indicator="state"><slot name="indicator" v-bind="state" /></template>
  </SNativeChoice>
</template>
