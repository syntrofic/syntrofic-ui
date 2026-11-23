<script setup lang="ts">
import { AccessibilityRole, type GridLayout } from '@nativescript/core'
import { computed, useTemplateRef, watch } from 'nativescript-vue'
import type { NativeInputOptions } from '../form'
import { useNativeMotion } from '../motion'
import SNativeCloseButton from './SNativeCloseButton.vue'
import SNativeInputGroup from './SNativeInputGroup.vue'

const props = withDefaults(defineProps<Omit<NativeInputOptions, 'secure' | 'secureWithoutAutofill' | 'returnKeyType'> & {
  clearable?: boolean
  clearLabel?: string
}>(), { clearable: true, clearLabel: 'Clear search' })
const value = defineModel<string>({ default: '' })
const emit = defineEmits<{ search: [value: string]; clear: [previous: string]; focus: []; blur: [] }>()
const input = useTemplateRef<InstanceType<typeof SNativeInputGroup>>('input')
const clearView = useTemplateRef<{ nativeView: GridLayout }>('clearView')
const runMotion = useNativeMotion()
const canClear = computed(() => Boolean(value.value) && !props.disabled && !props.readonly)
const clearVisible = computed(() => props.clearable && canClear.value)
const initialOpacity = clearVisible.value ? 1 : 0
const initialScale = clearVisible.value ? 1 : 0.75

watch([clearVisible, clearView], ([visible]) => {
  runMotion(() => {
    const target = clearView.value?.nativeView
    const scale = visible ? 1 : 0.75
    return target ? [{ target, opacity: visible ? 1 : 0, scale: { x: scale, y: scale } }] : []
  }, visible ? 'enter' : 'exit')
}, { flush: 'post' })

function clear() {
  if (!canClear.value) return
  const previous = value.value
  value.value = ''
  input.value?.focus()
  emit('clear', previous)
}

defineExpose({ focus: () => input.value?.focus() ?? false, clear })
</script>

<template>
  <SNativeInputGroup
    ref="input"
    v-model="value"
    :label="label"
    :hint="hint"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :invalid="invalid"
    :variant="variant"
    :keyboardType="keyboardType"
    :autocapitalizationType="autocapitalizationType"
    :autofillType="autofillType"
    :autocorrect="autocorrect"
    :maxLength="maxLength"
    :accessibilityRole="AccessibilityRole.Search"
    returnKeyType="search"
    @focus="emit('focus')"
    @blur="emit('blur')"
    @submit="emit('search', $event)"
  >
    <template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
    <template v-if="clearable" #suffix>
      <GridLayout
        ref="clearView"
        :width="44"
        :opacity="initialOpacity"
        :scaleX="initialScale"
        :scaleY="initialScale"
        :accessibilityHidden="!clearVisible"
        :isUserInteractionEnabled="clearVisible"
      >
        <SNativeCloseButton :label="clearLabel" :disabled="!clearVisible" @tap="clear" />
      </GridLayout>
    </template>
  </SNativeInputGroup>
</template>
