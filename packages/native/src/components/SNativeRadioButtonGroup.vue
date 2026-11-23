<script setup lang="ts">
import { computed, provide, useTemplateRef } from 'nativescript-vue'
import type { NativeRadioValue } from '../control-state'
import { nativeRadioButtonVariant, type NativeRadioButtonOption, type NativeRadioButtonVariant } from '../radio-button'
import SNativeRadioButtonItem from './SNativeRadioButtonItem.vue'
import SNativeRadioGroup from './SNativeRadioGroup.vue'

const props = withDefaults(defineProps<{
  label: string
  description?: string
  error?: string
  items?: readonly NativeRadioButtonOption[]
  orientation?: 'vertical' | 'horizontal'
  variant?: NativeRadioButtonVariant
  disabled?: boolean
  readonly?: boolean
  invalid?: boolean
  required?: boolean
  requiredMessage?: string
}>(), { orientation: 'vertical', variant: 'primary' })
const value = defineModel<NativeRadioValue>()
const emit = defineEmits<{ change: [value: NativeRadioValue]; 'validation-change': [valid: boolean, error?: string] }>()
const group = useTemplateRef<InstanceType<typeof SNativeRadioGroup>>('group')
provide(nativeRadioButtonVariant, computed(() => props.variant))
defineExpose({ check: () => group.value?.check() ?? false })
</script>

<template>
  <SNativeRadioGroup
    ref="group"
    v-model="value"
    :label="label"
    :description="description"
    :items="items"
    :error="error"
    :orientation="orientation"
    :disabled="disabled"
    :readonly="readonly"
    :invalid="invalid"
    :required="required"
    :required-message="requiredMessage"
    @change="emit('change', $event)"
    @validation-change="(valid, message) => emit('validation-change', valid, message)"
  >
    <slot>
      <SNativeRadioButtonItem
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        :label="item.label"
        :description="item.description"
        :variant="item.variant"
        :disabled="item.disabled"
        :marginRight="orientation === 'horizontal' ? 4 : 0"
        :marginBottom="4"
        :flexGrow="orientation === 'horizontal' ? 1 : 0"
      />
    </slot>
  </SNativeRadioGroup>
</template>
