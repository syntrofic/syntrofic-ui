<script setup lang="ts">
import type { EventData, TextField } from '@nativescript/core'
import { onBeforeUnmount, useTemplateRef, watch } from 'nativescript-vue'
import { installCollectionKeys, type NativeCollectionNavigation } from '../collection-keys'
import { useNativeEditable } from '../editable'
import type { NativeInputOptions } from '../form'
import { centerNativeText } from '../text-alignment'

const props = defineProps<NativeInputOptions & { navigate?: (key: NativeCollectionNavigation) => boolean }>()
const value = defineModel<string>({ default: '' })
const emit = defineEmits<{ focus: []; blur: []; submit: [value: string] }>()
const input = useTemplateRef<{ nativeView: TextField }>('input')
const { appearance, disabled: inactive, readonly: readOnly, edit, updateFocus, focus, dismissKeyboard } = useNativeEditable(
  props, () => input.value?.nativeView, () => value.value, text => { value.value = text },
  active => active ? emit('focus') : emit('blur'),
)

defineExpose({ focus, dismissKeyboard })
let removeKeys: (() => void) | undefined
function unload() {
  removeKeys?.()
  removeKeys = undefined
}
function bindKeys() {
  unload()
  const field = input.value?.nativeView
  if (props.navigate && field?.isLoaded) removeKeys = installCollectionKeys(field, key => props.navigate?.(key) ?? false)
}
function loaded(event: EventData) {
  centerNativeText(event)
  bindKeys()
}
watch(() => Boolean(props.navigate), bindKeys)
onBeforeUnmount(unload)
</script>

<template>
  <TextField
    ref="input"
    :text="value"
    :hint="placeholder"
    :accessibilityLabel="label ?? placeholder"
    :accessibilityHint="hint"
    :accessibilityRole="accessibilityRole"
    :isEnabled="!inactive"
    :editable="!readOnly"
    :secure="secure"
    :secureWithoutAutofill="secureWithoutAutofill"
    :keyboardType="keyboardType"
    :returnKeyType="returnKeyType"
    :autocapitalizationType="autocapitalizationType"
    :autofillType="autofillType"
    :autocorrect="autocorrect"
    :maxLength="maxLength"
    v-bind="appearance"
    @textChange="edit"
    @focus="updateFocus(true)"
    @blur="updateFocus(false)"
    @loaded="loaded"
    @unloaded="unload"
    @returnPress="!inactive && emit('submit', value)"
  />
</template>
