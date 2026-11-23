<script setup lang="ts">
import type { TextView } from '@nativescript/core'
import { computed, useTemplateRef } from 'nativescript-vue'
import { useNativeEditable } from '../editable'
import type { NativeInputOptions } from '../form'

const props = withDefaults(defineProps<Omit<NativeInputOptions, 'secure' | 'secureWithoutAutofill' | 'returnKeyType'> & {
  rows?: number
  maxRows?: number
  autoGrow?: boolean
}>(), { rows: 3, autoGrow: true })
const value = defineModel<string>({ default: '' })
const emit = defineEmits<{ focus: []; blur: [] }>()
const input = useTemplateRef<{ nativeView: TextView }>('input')
const { appearance, disabled: inactive, readonly: readOnly, edit, updateFocus, focus, dismissKeyboard } = useNativeEditable(
  props, () => input.value?.nativeView, () => value.value, text => { value.value = text },
  active => active ? emit('focus') : emit('blur'), true,
)

const minRows = computed(() => Number.isFinite(props.rows) ? Math.max(1, Math.floor(props.rows)) : 3)
const fixedHeight = computed(() => appearance.value.padding * 2 + minRows.value * 21)
const ceiling = computed(() => typeof props.maxRows === 'number' && Number.isFinite(props.maxRows)
  ? appearance.value.padding * 2 + Math.max(minRows.value, Math.floor(props.maxRows)) * 21 : undefined)

defineExpose({ focus, dismissKeyboard })
</script>

<template>
  <TextView
    ref="input"
    v-bind="appearance"
    :text="value"
    :hint="placeholder"
    :accessibilityLabel="label ?? placeholder"
    :accessibilityHint="hint"
    :accessibilityRole="accessibilityRole"
    :isEnabled="!inactive"
    :editable="!readOnly"
    :minHeight="fixedHeight"
    :height="autoGrow ? undefined : fixedHeight"
    :maxHeight="autoGrow ? ceiling : undefined"
    :keyboardType="keyboardType"
    :autocapitalizationType="autocapitalizationType"
    :autofillType="autofillType"
    :autocorrect="autocorrect"
    :maxLength="maxLength"
    @textChange="edit"
    @focus="updateFocus(true)"
    @blur="updateFocus(false)"
  />
</template>
