<script setup lang="ts" generic="Multiple extends boolean = false">
import type { SelectOption } from '../types'
import SSelect from './SSelect.vue'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  label: string
  options: readonly SelectOption[]
  placeholder?: string
  disabled?: boolean
  name?: string
  form?: string
  required?: boolean
  multiple?: Multiple & boolean
  width?: string
  locale?: string
  direction?: 'ltr' | 'rtl'
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}>(), { width: '9rem', align: 'end' })
defineSlots<{
  value(props: { text: string; selected: string | string[] | undefined }): unknown
  indicator(props: { open: boolean }): unknown
}>()
const model = defineModel<Multiple extends true ? string[] : string>()
const open = defineModel<boolean>('open')
</script>

<template>
  <span class="sy-inline-select" :style="{ '--sy-inline-select-width': width }">
    <!-- @vue-generic {Multiple} -->
    <SSelect inline v-model="model" v-model:open="open" v-bind="$attrs" :aria-label="label" :options="options" :multiple="multiple"
      :disabled="disabled" :name="name" :form="form" :required="required" :placeholder="placeholder"
      :locale="locale" :direction="direction" :side="side" :align="align">
      <template v-if="$slots.value" #value="scope"><slot name="value" v-bind="scope" /></template>
      <template v-if="$slots.indicator" #indicator="scope"><slot name="indicator" v-bind="scope" /></template>
    </SSelect>
  </span>
</template>
