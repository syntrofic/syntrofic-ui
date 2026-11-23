<script setup lang="ts">
import type { GridLayout } from '@nativescript/core'
import { computed, inject, provide, ref, useTemplateRef } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { nativeInputGroup } from '../editable'
import { nativeFocusGroup } from '../focus'
import type { NativeInputOptions } from '../form'
import SNativeInput from './SNativeInput.vue'

const props = defineProps<NativeInputOptions>()
const value = defineModel<string>({ default: '' })
const emit = defineEmits<{ focus: []; blur: []; submit: [value: string] }>()
const root = useTemplateRef<{ nativeView: GridLayout }>('root')
const input = useTemplateRef<InstanceType<typeof SNativeInput>>('input')
const focused = ref(false)
const focusGroup = inject(nativeFocusGroup, undefined)
const { theme, direction } = useNativeUI()
const border = computed(() => {
  const colors = theme.value.colors
  if (props.invalid) return colors.danger
  if (focused.value && !focusGroup) return colors.focus
  return props.variant === 'outline' ? colors.borderStrong : 'transparent'
})
provide(nativeInputGroup, {
  anchor: () => root.value?.nativeView,
  disabled: () => Boolean(props.disabled),
  readonly: () => Boolean(props.readonly),
  focus: active => { focused.value = active },
})

defineExpose({
  focus: () => input.value?.focus() ?? false,
  dismissKeyboard: () => input.value?.dismissKeyboard(),
})
</script>

<template>
  <GridLayout
    ref="root"
    columns="auto,*,auto"
    direction="ltr"
    :minHeight="44"
    :paddingLeft="theme.geometry.space1"
    :paddingRight="theme.geometry.space1"
    :backgroundColor="variant === 'outline' ? theme.colors.surface : theme.colors.control"
    :borderColor="border"
    :borderRadius="22"
    :borderWidth="1"
    :opacity="disabled ? 0.55 : 1"
  >
    <StackLayout v-if="$slots.prefix" :col="direction === 'rtl' ? 2 : 0" orientation="horizontal" verticalAlignment="middle">
      <slot name="prefix" :focused="focused" :disabled="disabled" />
    </StackLayout>
    <GridLayout col="1">
      <slot :focused="focused" :disabled="disabled">
        <SNativeInput
          ref="input"
          v-model="value"
          v-bind="props"
          @focus="emit('focus')"
          @blur="emit('blur')"
          @submit="emit('submit', $event)"
        />
      </slot>
    </GridLayout>
    <StackLayout v-if="$slots.suffix" :col="direction === 'rtl' ? 0 : 2" orientation="horizontal" verticalAlignment="middle">
      <slot name="suffix" :focused="focused" :disabled="disabled" />
    </StackLayout>
  </GridLayout>
</template>
