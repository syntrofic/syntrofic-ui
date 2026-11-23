<script setup lang="ts">
import { AccessibilityRole } from '@nativescript/core'
import { computed } from 'nativescript-vue'
import { chartInk } from '../chart-plot'
import { useNativeUI } from '../context'
import { nativeFeedbackFormatter } from '../feedback'
import SNativeText from './SNativeText.vue'

export interface NativeMeterSegment { id: string; label: string; value: number; color?: string }
const props = withDefaults(defineProps<{
  segments: readonly NativeMeterSegment[]
  label?: string
  max?: number
  size?: number
  locale?: string
  showLegend?: boolean
  missingText?: string
  formatValue?: (value: number, fraction: number) => string
}>(), { size: 11, showLegend: true, missingText: 'No values' })
defineSlots<{ marker(props: { segment: NativeMeterSegment; color: string; fraction: number }): unknown }>()
const { theme, direction } = useNativeUI()
const percent = computed(() => nativeFeedbackFormatter(props.locale, { style: 'percent', maximumFractionDigits: 1 }))
const segments = computed(() => props.segments.map((segment, index) => ({ ...segment,
  amount: Number.isFinite(segment.value) ? Math.max(0, segment.value) : 0, ink: chartInk(segment.color, index),
})))
const sum = computed(() => segments.value.reduce((total, item) => total + item.amount, 0))
const size = computed(() => Math.max(3, Math.min(35, props.size)))
const max = computed(() => Math.max(sum.value, Number.isFinite(props.max) ? props.max! : 0, Number.EPSILON))
const series = computed(() => segments.value.map(segment => {
  const fraction = segment.amount / max.value
  return { ...segment, fraction, text: props.formatValue?.(segment.amount, fraction) ?? percent.value.format(fraction) }
}))
const visible = computed(() => {
  const shown = series.value.filter(segment => segment.amount > 0)
  const leftover = Math.max(0, max.value - sum.value)
  if (leftover && Number.isFinite(leftover)) shown.push({ id: '__remaining', label: '', value: leftover, amount: leftover, fraction: leftover / max.value, ink: 'transparent', text: '' })
  return direction.value === 'rtl' ? shown.reverse() : shown
})
const columns = computed(() => visible.value.map(item => `${item.fraction}*`).join(',') || '*')
const summary = computed(() => sum.value ? series.value.map(item => `${item.label} ${item.text}`).join(' · ') : props.missingText)
</script>

<template>
  <StackLayout>
    <SNativeText v-if="label" :text="label" heading marginBottom="6" />
    <GridLayout :height="size" :borderRadius="size / 2" :columns="columns" direction="ltr" :clipToBounds="true"
      :backgroundColor="theme.colors.surfaceMuted" :accessible="true" :accessibilityRole="AccessibilityRole.StaticText"
      :accessibilityValue="summary" :accessibilityLabel="label">
      <GridLayout v-for="(segment, index) in visible" :key="segment.id" :col="index" :backgroundColor="segment.ink" :accessibilityHidden="true">
        <slot v-if="segment.label" name="marker" :segment="segment" :color="segment.ink" :fraction="segment.fraction" />
      </GridLayout>
    </GridLayout>
    <StackLayout v-if="showLegend" marginTop="4">
      <GridLayout v-for="segment in series" :key="segment.id" columns="11,*,auto" marginTop="3">
        <ContentView :backgroundColor="segment.ink" width="7" height="7" borderRadius="4" verticalAlignment="middle" :accessibilityHidden="true" />
        <SNativeText col="1" :text="segment.label" size="caption" />
        <SNativeText col="2" :text="segment.text" tone="muted" size="caption" />
      </GridLayout>
    </StackLayout>
  </StackLayout>
</template>
