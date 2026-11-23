<script setup lang="ts">
import { AccessibilityRole, AccessibilityState } from '@nativescript/core'
import { computed, useTemplateRef } from 'nativescript-vue'
import type { NativeButtonSize } from '../button'
import type { NativeCollectionNavigation } from '../collection-keys'
import { nativeTextStyle, useNativeUI } from '../context'
import { centerNativeText } from '../text-alignment'
import SNativePressableFeedback from './SNativePressableFeedback.vue'

const props = withDefaults(defineProps<{
  label: string
  accessibilityLabel?: string
  defaultSelected?: boolean
  disabled?: boolean
  fullWidth?: boolean
  iconOnly?: boolean
  size?: NativeButtonSize
  variant?: 'solid' | 'ghost'
  selectedFill?: string
  selectedColor?: string
  radius?: number
  navigate?: (key: NativeCollectionNavigation) => boolean
}>(), { size: 'md', variant: 'solid' })
const model = defineModel<boolean | undefined>('selected', { default: undefined })
const emit = defineEmits<{ change: [selected: boolean]; 'accessibility-focus-change': [focused: boolean] }>()
defineSlots<{ start(state: { selected: boolean; color: string }): unknown; end(state: { selected: boolean; color: string }): unknown }>()
const { theme, direction, fontFamily } = useNativeUI()
const control = useTemplateRef<InstanceType<typeof SNativePressableFeedback>>('control')
const selected = computed(() => model.value ?? props.defaultSelected ?? false)
const dimensions = computed(() => ({ sm: { height: 44, text: 14 }, md: { height: 48, text: 15 }, lg: { height: 54, text: 17 } })[props.size])
const fill = computed(() => selected.value ? props.selectedFill ?? theme.value.colors.accentSoft
  : props.variant === 'ghost' ? 'transparent' : theme.value.colors.surfaceMuted)
const ink = computed(() => selected.value ? props.selectedColor ?? theme.value.colors.accentText : theme.value.colors.text)

function toggle() {
  if (props.disabled) return
  const next = !selected.value
  model.value = next
  emit('change', next)
}
defineExpose({ focus: () => control.value?.focus() ?? false })
</script>

<template>
  <SNativePressableFeedback ref="control"
    :label="accessibilityLabel ?? label" :disabled="disabled" :role="AccessibilityRole.Button"
    :accessibilityState="selected ? AccessibilityState.Selected : undefined" :fill="fill" :pressFill="theme.colors.surfaceSage"
    :radius="radius" :minHeight="dimensions.height" :minWidth="dimensions.height" :paddingInline="iconOnly ? 0 : 9"
    :horizontalAlignment="fullWidth ? 'stretch' : direction === 'rtl' ? 'right' : 'left'" :navigate="navigate"
    @tap="toggle" @accessibility-focus-change="emit('accessibility-focus-change', $event)">
    <GridLayout columns="auto,auto,auto" horizontalAlignment="center" verticalAlignment="middle">
      <ContentView v-if="$slots.start" col="0" :margin="iconOnly ? '0' : '0 3'">
        <slot name="start" :selected="selected" :color="ink" />
      </ContentView>
      <Label v-if="!iconOnly || !$slots.start && !$slots.end" col="1" :text="label" :color="ink" :fontSize="dimensions.text"
        :style="nativeTextStyle(label, fontFamily, '600')" :iosAccessibilityAdjustsFontSize="true" textWrap="true"
        textAlignment="center" verticalAlignment="middle" @loaded="centerNativeText" />
      <ContentView v-if="$slots.end" col="2" :margin="iconOnly ? '0' : '0 3'">
        <slot name="end" :selected="selected" :color="ink" />
      </ContentView>
    </GridLayout>
  </SNativePressableFeedback>
</template>
