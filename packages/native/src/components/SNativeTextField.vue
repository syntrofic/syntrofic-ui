<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'nativescript-vue'
import { useNativeUI } from '../context'
import type { NativeTextFieldOptions } from '../form'
import SNativeDescription from './SNativeDescription.vue'
import SNativeFieldError from './SNativeFieldError.vue'
import SNativeInput from './SNativeInput.vue'
import SNativeLabel from './SNativeLabel.vue'

const props = withDefaults(defineProps<NativeTextFieldOptions>(), { requiredLabel: 'Required', requiredMessage: 'This field is required.' })
const value = defineModel<string>({ default: '' })
const emit = defineEmits<{ submit: [value: string]; focus: []; blur: []; 'validation-change': [valid: boolean, error?: string] }>()
const control = useTemplateRef<InstanceType<typeof SNativeInput>>('control')
const checked = ref(false)
const { theme } = useNativeUI()
const validation = computed(() => {
  if (props.disabled || props.readonly) return undefined
  if (props.required && !value.value.trim()) return props.requiredMessage
  return props.validate?.(value.value)
})
const message = computed(() => props.error || (checked.value ? validation.value : undefined))
const invalid = computed(() => Boolean(props.invalid || message.value))
const hint = computed(() => [props.required ? props.requiredLabel : undefined, props.description, message.value].filter(Boolean).join(' '))

function focus() {
  return control.value?.focus() ?? false
}

function check() {
  checked.value = true
  const error = props.error || validation.value
  const valid = !props.invalid && !error
  emit('validation-change', valid, error)
  return valid
}

function submit(text: string) {
  if (check()) emit('submit', text)
  else focus()
}

defineExpose({ check, focus, dismissKeyboard: () => control.value?.dismissKeyboard() })
</script>

<template>
  <StackLayout>
    <SNativeLabel
      :text="label"
      :required="required"
      :requiredLabel="requiredLabel"
      :marginBottom="theme.geometry.space1"
      :accessibilityHidden="true"
      @tap="focus"
    />
    <SNativeInput
      ref="control"
      v-model="value"
      :label="label"
      :accessibilityRole="accessibilityRole"
      :hint="hint"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :invalid="invalid"
      :secure="secure"
      :secureWithoutAutofill="secureWithoutAutofill"
      :variant="variant"
      :keyboardType="keyboardType"
      :returnKeyType="returnKeyType"
      :autocapitalizationType="autocapitalizationType"
      :autofillType="autofillType"
      :autocorrect="autocorrect"
      :maxLength="maxLength"
      @submit="submit"
      @focus="emit('focus')"
      @blur="emit('blur')"
    />
    <SNativeDescription
      v-if="description"
      :text="description"
      :marginTop="theme.geometry.space1"
      :accessibilityHidden="true"
    />
    <SNativeFieldError
      v-if="required || validate || error !== undefined || invalid"
      :text="message"
      :minHeight="16"
      :marginTop="theme.geometry.space1"
    />
  </StackLayout>
</template>
