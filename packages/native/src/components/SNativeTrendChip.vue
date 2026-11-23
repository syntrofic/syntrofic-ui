<script setup lang="ts">
import { AccessibilityLiveRegion, AccessibilityRole, Color, type GridLayout } from '@nativescript/core'
import { computed, useTemplateRef, watch } from 'nativescript-vue'
import { useNativeUI } from '../context'
import { nativeTrend } from '../feedback-state'
import { nativeFeedbackFormatter, type NativeProgressSize, type NativeTrendDirection } from '../feedback'
import { useNativeMotion } from '../motion'
import { nativeIconGlyphs } from '../icon-glyphs'
import SNativeMotionGlyph from './SNativeMotionGlyph.vue'
import SNativeNumberValue from './SNativeNumberValue.vue'

const props = withDefaults(defineProps<{
  value: number
  size?: NativeProgressSize
  prefix?: string
  suffix?: string
  direction?: NativeTrendDirection
  neutralThreshold?: number
  locale?: string
  formatOptions?: Intl.NumberFormatOptions
  format?: (value: number) => string
  variant?: 'soft' | 'solid' | 'plain' | 'outline'
  reserve?: number
  reserveFor?: number
  upLabel?: string
  downLabel?: string
  flatLabel?: string
  announce?: boolean
}>(), { variant: 'soft', size: 'sm', reserve: 4, upLabel: 'Increasing', downLabel: 'Decreasing', flatLabel: 'Unchanged' })
defineSlots<{ indicator(props: { direction: NativeTrendDirection; color: string }): unknown }>()
const { theme, direction } = useNativeUI()
const trend = computed(() => props.direction ?? nativeTrend(props.value, props.neutralThreshold))
const indicator = computed(() => nativeIconGlyphs[trend.value === 'up' ? 'arrow-up' : trend.value === 'down' ? 'arrow-down' : 'dot'])
const label = computed(() => trend.value === 'up' ? props.upLabel : trend.value === 'down' ? props.downLabel : props.flatLabel)
const options = computed(() => props.formatOptions ?? { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' } as const)
const formatter = computed(() => nativeFeedbackFormatter(props.locale, options.value))
function format(value: number) { return props.format?.(value) ?? formatter.value.format(value) }
const valueText = computed(() => `${props.prefix ?? ''}${Number.isFinite(props.value) ? format(props.value) : '—'}${props.suffix ?? ''}`)
const dimensions = { sm: [27, 13], md: [32, 15], lg: [38, 17] }
const height = computed(() => dimensions[props.size][0])
const textSize = computed(() => dimensions[props.size][1])
const saturated = computed(() => {
  const colors = theme.value.colors
  return trend.value === 'up' ? colors.success : trend.value === 'down' ? colors.danger : colors.textMuted
})
const fill = computed(() => {
  if (props.variant === 'solid') return saturated.value
  if (props.variant !== 'soft') return 'transparent'
  const colors = theme.value.colors
  return trend.value === 'up' ? colors.successSoft : trend.value === 'down' ? colors.dangerSoft : colors.surfaceMuted
})
const ink = computed(() => props.variant === 'solid' ? theme.value.colors.canvas : saturated.value)
const initialFill = fill.value
const surface = useTemplateRef<{ nativeView: GridLayout }>('surface')
const runMotion = useNativeMotion()
watch(fill, value => {
  runMotion(() => surface.value ? [{ target: surface.value.nativeView, backgroundColor: new Color(value) }] : [], 'state')
})
</script>

<template>
  <GridLayout ref="surface" :columns="`${textSize + 3},auto`" :minHeight="height" paddingLeft="8" paddingRight="9"
    :horizontalAlignment="direction === 'rtl' ? 'right' : 'left'"
    :borderRadius="theme.geometry.radiusSm" cornerShape="squircle" :backgroundColor="initialFill"
    :borderColor="saturated" :borderWidth="variant === 'outline' ? 1 : 0"
    :accessible="true" :accessibilityRole="AccessibilityRole.StaticText" :accessibilityLabel="label" :accessibilityValue="valueText"
    :accessibilityLiveRegion="announce ? AccessibilityLiveRegion.Polite : AccessibilityLiveRegion.None">
    <GridLayout :accessibilityHidden="true" verticalAlignment="middle">
      <slot name="indicator" :direction="trend" :color="ink">
        <SNativeMotionGlyph :text="indicator" :size="textSize" :cellWidth="textSize + 3" :color="ink" :numeric="false" vector />
      </slot>
    </GridLayout>
    <SNativeNumberValue col="1" :value="value" :format="format" :reserve="reserve" :reserveFor="reserveFor ?? -1" :prefix="prefix" :suffix="suffix"
      :size="textSize" :color="ink" verticalAlignment="middle" decorative />
  </GridLayout>
</template>
