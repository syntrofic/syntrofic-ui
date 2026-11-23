<script setup lang="ts">
import { useId } from 'vue'
import type { SelectOption } from '../types'
import SSelect from './SSelect.vue'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  label: string
  description?: string
  options: readonly SelectOption[]
  name?: string
  form?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  variant?: 'default' | 'secondary'
  direction?: 'ltr' | 'rtl'
}>(), { variant: 'default' })
defineSlots<{
  value(props: { text: string; selected: string | string[] | undefined }): unknown
  indicator(props: { open: boolean }): unknown
}>()
const emit = defineEmits<{ commit: [value: string | undefined] }>()
const value = defineModel<string>()
const open = defineModel<boolean>('open')
const id = useId()

function choose(next: string | undefined) {
  if (next === value.value) return
  value.value = next
  emit('commit', next)
}
</script>

<template>
  <div class="sy-settings-cell sy-cell-select" :data-variant="variant">
    <SSelect v-model:open="open" v-bind="$attrs" :model-value="value" :options="options"
      :name="name" :form="form" :required="required" :disabled="disabled" :error="error" :direction="direction"
      :aria-labelledby="id" :description="description" :placeholder="placeholder" align="end"
      @update:model-value="choose">
      <template #leading><span :id="id" class="sy-settings-cell__label">{{ label }}</span></template>
      <template v-if="$slots.value" #value="scope"><slot name="value" v-bind="scope" /></template>
      <template v-if="$slots.indicator" #indicator="scope"><slot name="indicator" v-bind="scope" /></template>
    </SSelect>
  </div>
</template>
