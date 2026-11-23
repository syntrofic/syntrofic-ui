<script setup lang="ts">
import { computed, provide, ref } from 'nativescript-vue'
import { nativeRadioGroup } from '../choice'
import { useNativeUI } from '../context'
import type { NativeRadioOption, NativeRadioValue } from '../control-state'
import SNativeDescription from './SNativeDescription.vue'
import SNativeFieldError from './SNativeFieldError.vue'
import SNativeRadio from './SNativeRadio.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  label: string
  description?: string
  error?: string
  items?: readonly NativeRadioOption[]
  orientation?: 'vertical' | 'horizontal'
  disabled?: boolean
  readonly?: boolean
  invalid?: boolean
  required?: boolean
  requiredMessage?: string
}>(), { orientation: 'vertical', requiredMessage: 'Choose an option.' })
const value = defineModel<NativeRadioValue>()
const emit = defineEmits<{ change: [value: NativeRadioValue]; 'validation-change': [valid: boolean, error?: string] }>()
const { theme, direction } = useNativeUI()
const validated = ref(false)
const validation = computed(() => {
  if (props.disabled || props.readonly) return undefined
  if (props.error) return props.error
  const selected = value.value !== undefined && (!props.items || props.items.some(option =>
    !option.disabled && Object.is(option.value, value.value)))
  return props.required && !selected ? props.requiredMessage : undefined
})
const message = computed(() => props.error || (validated.value ? validation.value : undefined))

provide(nativeRadioGroup, {
  selected: () => value.value,
  select(next) {
    if (props.disabled || props.readonly || Object.is(value.value, next)) return
    value.value = next
    emit('change', next)
  },
  disabled: () => Boolean(props.disabled),
  readonly: () => Boolean(props.readonly),
  invalid: () => Boolean(props.invalid || message.value),
})

function check() {
  validated.value = true
  const error = validation.value
  const valid = !props.invalid && !error
  emit('validation-change', valid, error)
  return valid
}

defineExpose({ check })
</script>

<template>
  <StackLayout>
    <SNativeText :text="label" heading emphasized />
    <SNativeDescription v-if="description" :text="description" :marginTop="theme.geometry.space1" />
    <FlexboxLayout
      direction="ltr"
      :flexDirection="orientation === 'vertical' ? 'column' : direction === 'rtl' ? 'row-reverse' : 'row'"
      :flexWrap="orientation === 'horizontal' ? 'wrap' : 'nowrap'"
      :marginTop="theme.geometry.space1"
    >
      <slot>
        <SNativeRadio
          v-for="option in items"
          :key="option.value"
          :optionValue="option.value"
          :label="option.label"
          :description="option.description"
          :disabled="option.disabled"
        />
      </slot>
    </FlexboxLayout>
    <SNativeFieldError v-if="required || error !== undefined" :text="message" :minHeight="16" />
  </StackLayout>
</template>
