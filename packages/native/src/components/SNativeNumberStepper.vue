<script setup lang="ts">
import { computed } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { commitNativeNumber, nativeNumberAdapter, stepNativeNumber, type NativeNumberRange } from '../number-state'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativeNumberRepeat from './SNativeNumberRepeat.vue'

const props = withDefaults(defineProps<NativeNumberRange & {
  label?: string
  initialValue?: number
  locale?: string
  formatOptions?: Intl.NumberFormatOptions
  valueWidth?: number
  reserve?: number
  disabled?: boolean
  repeat?: boolean
  decreaseLabel?: string
  increaseLabel?: string
}>(), { initialValue: 0, valueWidth: 85, repeat: true, decreaseLabel: 'Decrease', increaseLabel: 'Increase' })
const model = defineModel<number | undefined>()
const emit = defineEmits<{ change: [value: number] }>()
defineSlots<{ value(props: { value: number; text: string; minimum: boolean; maximum: boolean }): unknown }>()
const { theme, direction } = useNativeUI()
const value = computed(() => commitNativeNumber(model.value ?? props.initialValue, props, false) ?? 0)
const adapter = computed(() => nativeNumberAdapter(props.locale, props.formatOptions))
const text = computed(() => adapter.value.format(value.value))
const smaller = computed(() => stepNativeNumber(value.value, -1, props))
const larger = computed(() => stepNativeNumber(value.value, 1, props))
const rtl = computed(() => direction.value === 'rtl')
const width = computed(() => Number.isFinite(props.valueWidth) ? Math.max(44, props.valueWidth) : 85)

function change(next?: number) {
  if (props.disabled || next === undefined || next === value.value) return
  model.value = next
  emit('change', next)
}
</script>

<template>
  <GridLayout :columns="`44,${width},44`" :width="88 + width" height="44" direction="ltr" :accessibilityLabel="label"
    :backgroundColor="theme.colors.surface" :borderRadius="theme.geometry.radiusMd" cornerShape="squircle"
    :horizontalAlignment="rtl ? 'right' : 'left'">
    <SNativeNumberRepeat :col="rtl ? 2 : 0" :label="decreaseLabel" symbol="−" :repeat="repeat" :disabled="disabled || smaller === value" @step="change(smaller)" />
    <GridLayout col="1" horizontalAlignment="center" verticalAlignment="middle">
      <slot name="value" :value="value" :text="text" :minimum="smaller === value" :maximum="larger === value">
        <SNativeMotionText :value="text" :reserve="reserve" horizontalAlignment="center" announce />
      </slot>
    </GridLayout>
    <SNativeNumberRepeat :col="rtl ? 0 : 2" :label="increaseLabel" symbol="+" :repeat="repeat" :disabled="disabled || larger === value" @step="change(larger)" />
  </GridLayout>
</template>
