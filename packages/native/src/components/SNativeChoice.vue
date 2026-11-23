<script setup lang="ts">
import { AccessibilityRole, AccessibilityState } from '@nativescript/core'
import { computed, useTemplateRef } from 'nativescript-vue'
import type { NativeChoiceOptions } from '../choice'
import { useNativeUI } from '../context'
import type { NativeCheckState, NativeChoiceKind } from '../control-state'
import SNativeChoiceIndicator from './SNativeChoiceIndicator.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativeFieldError from './SNativeFieldError.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<NativeChoiceOptions & {
  kind: NativeChoiceKind
  state: NativeCheckState
  mixedLabel?: string
}>(), { indicatorPlacement: 'start', mixedLabel: 'Partially checked' })
const emit = defineEmits<{ activate: [] }>()
const control = useTemplateRef<InstanceType<typeof SNativePressableFeedback>>('control')
const { theme, direction } = useNativeUI()
const indicatorAtEnd = computed(() => (props.indicatorPlacement === 'end') !== (direction.value === 'rtl'))
const roles = { radio: AccessibilityRole.RadioButton, checkbox: AccessibilityRole.Checkbox, switch: AccessibilityRole.Switch }
const state = computed(() => props.state === 'mixed' ? undefined
  : props.state ? AccessibilityState.Checked : AccessibilityState.Unchecked)
const hint = computed(() => [props.description, props.error].filter(Boolean).join(' ') || undefined)

defineExpose({ focus: () => control.value?.focus() ?? false })
</script>

<template>
  <StackLayout>
    <SNativePressableFeedback
      ref="control"
      :label="label"
      :role="roles[kind]"
      :disabled="disabled"
      :accessibilityState="state"
      :accessibilityHint="hint"
      :accessibilityValue="props.state === 'mixed' ? mixedLabel : undefined"
      :paddingInline="theme.geometry.space2"
      fill="transparent"
      @tap="!readonly && emit('activate')"
    >
      <GridLayout :columns="hideLabel ? '*' : indicatorAtEnd ? '*,auto' : 'auto,*'" direction="ltr">
        <GridLayout :col="hideLabel ? 0 : indicatorAtEnd ? 1 : 0">
          <slot name="indicator" :state="props.state" :disabled="disabled">
            <SNativeChoiceIndicator :kind="kind" :state="props.state" :invalid="invalid || Boolean(error)" />
          </slot>
        </GridLayout>
        <StackLayout
          v-if="!hideLabel"
          :col="indicatorAtEnd ? 0 : 1"
          :marginLeft="indicatorAtEnd ? 0 : theme.geometry.space2"
          :marginRight="indicatorAtEnd ? theme.geometry.space2 : 0"
          verticalAlignment="middle"
        >
          <slot name="label"><SNativeText :text="label" emphasized /></slot>
          <slot name="description">
            <SNativeDescription v-if="description" :text="description" :marginTop="2" />
          </slot>
        </StackLayout>
      </GridLayout>
    </SNativePressableFeedback>
    <SNativeFieldError v-if="error !== undefined" :text="error" :minHeight="16" />
  </StackLayout>
</template>
