<script setup lang="ts">
import { computed } from 'vue'
import SCheckboxButtonGroup from './SCheckboxButtonGroup.vue'
import SRadioButtonGroup from './SRadioButtonGroup.vue'
import type { ChoiceButtonGroupProps } from '../types'

const props = withDefaults(defineProps<ChoiceButtonGroupProps & { mode?: 'single' | 'multiple' }>(), { mode: 'multiple' })
const model = defineModel<readonly string[]>({ default: () => [] })
const single = computed<string | undefined>({ get: () => model.value[0], set: value => { model.value = value === undefined ? [] : [value] } })
const fields = computed(() => {
  const { mode: _mode, ...fields } = props
  return fields
})
</script>

<template>
  <SRadioButtonGroup v-if="mode === 'single'" v-model="single" v-bind="fields" class="sy-selectable-card-group">
    <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
    <template v-if="$slots.icon" #icon="scope"><slot name="icon" v-bind="scope" /></template>
    <template v-if="$slots.indicator" #indicator="scope"><slot name="indicator" v-bind="scope" /></template>
  </SRadioButtonGroup>
  <SCheckboxButtonGroup v-else v-model="model" v-bind="fields" class="sy-selectable-card-group">
    <template v-if="$slots.content" #content="scope"><slot name="content" v-bind="scope" /></template>
    <template v-if="$slots.icon" #icon="scope"><slot name="icon" v-bind="scope" /></template>
    <template v-if="$slots.indicator" #indicator="scope"><slot name="indicator" v-bind="scope" /></template>
  </SCheckboxButtonGroup>
</template>
