<script setup lang="ts">
import { AccessibilityRole, type TouchGestureEventData } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { useActionMeter } from '../action-motion'
import { useNativeUI } from '../context'
import type { NativeProgressSize } from '../feedback'
import { nativeRatingFill, nativeRatingTouch, nativeRatingValue } from '../feedback-state'
import SNativeIcon from './SNativeIcon.vue'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativeSliderAdjuster from './SNativeSliderAdjuster.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  label?: string
  size?: NativeProgressSize
  color?: string
  count?: number
  step?: number
  disabled?: boolean
  readOnly?: boolean
  allowClear?: boolean
  showValue?: boolean
  animated?: boolean
  formatValue?: (value: number, count: number) => string
}>(), { label: 'Rating', size: 'md', count: 5, step: 1, showValue: true, animated: true })
const model = defineModel<number>({ default: 0 })
const emit = defineEmits<{ change: [value: number] }>()
defineSlots<{ mark(props: { index: number; fill: number; filled: boolean }): unknown }>()
const { direction, theme } = useNativeUI()
const count = computed(() => Number.isFinite(props.count) ? Math.max(1, Math.min(10, Math.trunc(props.count))) : 5)
const step = computed(() => Number.isFinite(props.step) ? Math.max(.1, Math.min(1, props.step)) : 1)
const total = computed(() => Math.ceil(count.value / step.value))
const value = computed(() => props.readOnly && Number.isFinite(model.value)
  ? Math.max(0, Math.min(count.value, model.value)) : nativeRatingValue(model.value, count.value, step.value))
const position = computed(() => value.value === count.value ? total.value : Math.round(value.value / step.value))
const display = useActionMeter(value, computed(() => !props.animated))
const rendered = computed(() => props.formatValue?.(value.value, count.value) ?? `${value.value} / ${count.value}`)
const sizes = { sm: 21, md: 27, lg: 33 }
const edge = 44
const rtl = computed(() => direction.value === 'rtl')
const marks = computed(() => {
  const list = Array.from({ length: count.value }, (_, index) => index)
  return rtl.value ? list.reverse() : list
})
let start: { x: number; y: number } | undefined

function select(number: number, clear = false) {
  if (props.readOnly || props.disabled) return
  const bounded = nativeRatingValue(number, count.value, step.value)
  const next = clear && props.allowClear && bounded === value.value ? 0 : bounded
  if (next === value.value) return
  model.value = next
  emit('change', next)
}

function touch(event: TouchGestureEventData) {
  if (event.action === 'cancel') { start = undefined; return }
  const x = event.getX()
  const y = event.getY()
  if (event.action === 'down') { start = { x, y }; return }
  if (event.action !== 'up' || !start) return
  const initial = start
  start = undefined
  if (Math.abs(initial.x - x) > 12 || Math.abs(initial.y - y) > 12) return
  const local = rtl.value ? count.value * edge - x : x
  const slot = Math.max(0, Math.min(count.value - 1, Math.floor(local / edge)))
  select(nativeRatingTouch(slot, local / edge - slot, count.value, step.value), true)
}

defineExpose({ clear: () => select(0) })
</script>

<template>
  <StackLayout :accessible="readOnly" :accessibilityRole="readOnly ? AccessibilityRole.StaticText : undefined"
    :accessibilityLabel="readOnly ? label : undefined" :accessibilityValue="readOnly ? rendered : undefined">
    <GridLayout columns="*,auto" :accessibilityHidden="true">
      <SNativeText :text="label" emphasized verticalAlignment="middle" />
      <SNativeMotionText :animated="animated" v-if="showValue" col="1" :value="rendered" :size="13" :color="theme.colors.textMuted" verticalAlignment="middle" />
    </GridLayout>
    <ScrollView orientation="horizontal" :scrollBarIndicatorVisible="false" :accessibilityHidden="readOnly">
      <GridLayout :width="count * edge" :height="edge" :horizontalAlignment="rtl ? 'right' : 'left'" :opacity="disabled ? .6 : 1">
        <StackLayout orientation="horizontal" direction="ltr" :accessibilityHidden="true" :isUserInteractionEnabled="false">
          <GridLayout v-for="index in marks" :key="index" :width="edge" :height="edge">
            <slot name="mark" :index="index" :fill="nativeRatingFill(display, index)" :filled="nativeRatingFill(display, index) === 1">
              <SNativeIcon name="star-outline" :size="sizes[size]" :color="theme.colors.borderStrong" verticalAlignment="middle" horizontalAlignment="center" />
              <AbsoluteLayout :width="edge * nativeRatingFill(display, index)" :height="edge"
                :horizontalAlignment="rtl ? 'right' : 'left'" :clipToBounds="true">
                <GridLayout :left="rtl ? edge * (nativeRatingFill(display, index) - 1) : 0" :width="edge" :height="edge">
                  <SNativeIcon name="star" :size="sizes[size]" :color="color ?? theme.colors.accentText" verticalAlignment="middle" horizontalAlignment="center" />
                </GridLayout>
              </AbsoluteLayout>
            </slot>
          </GridLayout>
        </StackLayout>
        <SNativeSliderAdjuster v-if="!readOnly" :label="label" :valueText="rendered" :position="position" :lower="0"
          :upper="total" :vertical="false" :reverse="rtl" :disabled="disabled"
          @adjust="select($event >= total ? count : $event * step)" />
        <ContentView v-if="!readOnly && !disabled" :accessibilityHidden="true" backgroundColor="transparent" @touch="touch" />
      </GridLayout>
    </ScrollView>
  </StackLayout>
</template>
