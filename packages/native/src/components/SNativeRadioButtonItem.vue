<script setup lang="ts">
import { AccessibilityRole, AccessibilityState } from '@nativescript/core'
import { computed, inject, useTemplateRef } from 'nativescript-vue'
import { nativeRadioGroup } from '../choice'
import { useNativeUI } from '../context'
import type { NativeRadioValue } from '../control-state'
import { nativeRadioButtonVariant, type NativeRadioButtonVariant } from '../radio-button'
import SNativeChoiceIndicator from './SNativeChoiceIndicator.vue'
import SNativeDescription from './SNativeDescription.vue'
import SNativePressableFeedback from './SNativePressableFeedback.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  value: NativeRadioValue
  label: string
  description?: string
  variant?: NativeRadioButtonVariant
  disabled?: boolean
  readonly?: boolean
  indicatorPlacement?: 'start' | 'end'
}>(), { indicatorPlacement: 'end' })
const emit = defineEmits<{ select: [value: NativeRadioValue] }>()
const checked = defineModel<boolean>({ default: false })
const group = inject(nativeRadioGroup, undefined)
const groupVariant = inject(nativeRadioButtonVariant, undefined)
const { direction, theme } = useNativeUI()
const button = useTemplateRef<InstanceType<typeof SNativePressableFeedback>>('button')
const selected = computed(() => group ? Object.is(group.selected(), props.value) : checked.value)
const inactive = computed(() => props.disabled || group?.disabled())
const appearance = computed(() => props.variant ?? groupVariant?.value ?? 'primary')
const indicatorAtEnd = computed(() => (props.indicatorPlacement === 'end') !== (direction.value === 'rtl'))
const fill = computed(() => {
  const colors = theme.value.colors
  if (selected.value) return colors.accentSoft
  return appearance.value === 'secondary' ? colors.surfaceMuted : colors.surface
})

function select() {
  if (inactive.value || props.readonly || group?.readonly() || selected.value) return
  if (group) group.select(props.value)
  else checked.value = true
  emit('select', props.value)
}

defineExpose({ focus: () => button.value?.focus() ?? false })
</script>

<template>
  <SNativePressableFeedback
    ref="button"
    :label="label"
    :role="AccessibilityRole.RadioButton"
    :accessibilityState="selected ? AccessibilityState.Checked : AccessibilityState.Unchecked"
    :accessibilityHint="description"
    :disabled="inactive"
    :fill="fill"
    :pressFill="theme.colors.surfaceSage"
    :paddingInline="theme.geometry.space2"
    @tap="select"
  >
    <template v-if="$slots.background" #background="state">
      <slot name="background" :selected="selected" :variant="appearance" v-bind="state" />
    </template>
    <GridLayout :columns="indicatorAtEnd ? '*,26' : '26,*'" direction="ltr">
      <StackLayout :col="indicatorAtEnd ? 0 : 1" verticalAlignment="middle">
        <slot :selected="selected" :variant="appearance">
          <SNativeText :text="label" emphasized />
          <SNativeDescription v-if="description" :text="description" :marginTop="2" />
        </slot>
      </StackLayout>
      <GridLayout :col="indicatorAtEnd ? 1 : 0" verticalAlignment="middle">
        <slot name="indicator" :selected="selected">
          <SNativeChoiceIndicator kind="radio" :state="selected" :invalid="group?.invalid()" />
        </slot>
      </GridLayout>
    </GridLayout>
  </SNativePressableFeedback>
</template>
