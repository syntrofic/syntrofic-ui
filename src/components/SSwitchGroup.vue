<script setup lang="ts">
import SMultipleChoiceGroup from '../internal/SMultipleChoiceGroup.vue'
import type { MultipleChoiceListProps } from '../types'

defineProps<MultipleChoiceListProps>()
const model = defineModel<readonly string[]>({ default: () => [] })
</script>

<template>
  <SMultipleChoiceGroup v-bind="$props" v-model="model" kind="switch"><slot /></SMultipleChoiceGroup>
</template>
