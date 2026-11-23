<script setup lang="ts">
import { AccessibilityRole, type GridLayout, type TapGestureEventData, type TouchGestureEventData } from '@nativescript/core'
import { computed, ref, useTemplateRef } from 'nativescript-vue'
import { nativeChartHTML } from '../chart-plot'
import type { ChartLegendItem, ChartSelection } from '../chart-model/types'
import { textValue } from '../chart-model/values'
import { useNativeUI } from '../context'
import { nativeFeedbackFormatter } from '../feedback'
import SNativeButton from './SNativeButton.vue'
import SNativeMotionText from './SNativeMotionText.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  label: string
  description?: string
  height: number
  width: number
  drawing: string
  isEmpty?: boolean
  options: readonly ChartSelection[]
  legend: readonly ChartLegendItem[]
  showLegend?: boolean
  showData?: boolean
  inspect?: boolean
  emptyText?: string
  missingText?: string
  locale?: string
  dataLabel?: string
  hit?: (x: number, y: number) => number | undefined
}>(), { showLegend: true, showData: true, inspect: true, isEmpty: undefined, emptyText: 'No data', missingText: '—', dataLabel: 'View values' })
defineSlots<{
  legend(props: { items: readonly ChartLegendItem[] }): unknown
  tooltip(props: { selection: ChartSelection; index: number }): unknown
  empty(): unknown
  data(props: { options: readonly ChartSelection[] }): unknown
  center(): unknown
}>()
const active = defineModel<number | undefined>('active')
const emit = defineEmits<{ measure: [width: number]; inspect: [selection: ChartSelection | undefined, index?: number] }>()
const plot = useTemplateRef<{ nativeView: GridLayout }>('plot')
const { theme } = useNativeUI()
const textFormatter = computed(() => nativeFeedbackFormatter(props.locale, { maximumFractionDigits: 2 }))
const details = ref(false)
const empty = computed(() => props.isEmpty ?? !props.drawing)
const selection = computed(() => active.value === undefined ? undefined : props.options[active.value])
const markup = computed(() => nativeChartHTML(props.width, props.height, props.drawing))
function measure() {
  const width = plot.value?.nativeView.getActualSize()?.width
  if (width && Math.abs(width - props.width) > .5) emit('measure', width)
}
function value(item: ChartSelection['items'][number]) { return textValue(item, textFormatter.value.format, props.missingText) }
function inspect(event: TapGestureEventData) {
  if (!props.inspect) return
  const index = props.hit?.(event.getX(), event.getY())
  if (active.value === index) return
  active.value = index
  emit('inspect', index === undefined ? undefined : props.options[index], index)
}
function scrub(event: TouchGestureEventData) {
  if (event.action === 'move') inspect(event)
}
</script>

<template>
  <StackLayout>
    <SNativeText :text="label" heading size="title" />
    <SNativeText v-if="description" :text="description" tone="muted" size="caption" />
    <GridLayout ref="plot" :height="height" marginTop="4" @layoutChanged="measure">
      <WebView v-if="drawing" :src="markup" :isUserInteractionEnabled="false" :accessibilityHidden="true" />
      <slot v-if="empty" name="empty">
        <SNativeText :text="emptyText" tone="muted" horizontalAlignment="center" verticalAlignment="middle" />
      </slot>
      <GridLayout horizontalAlignment="center" verticalAlignment="middle"><slot name="center" /></GridLayout>
      <ContentView v-if="inspect && !empty" backgroundColor="transparent" :accessibilityHidden="true" @tap="inspect" @touch="scrub" />
    </GridLayout>
    <slot v-if="showLegend && legend.length" name="legend" :items="legend">
      <WrapLayout>
        <GridLayout v-for="item in legend" :key="item.key" columns="10,auto" padding="4 9 4 0">
          <ContentView width="7" height="7" borderRadius="4" verticalAlignment="middle" :backgroundColor="item.color" :accessibilityHidden="true" />
          <SNativeText col="1" :text="item.label" size="caption" />
        </GridLayout>
      </WrapLayout>
    </slot>
    <GridLayout v-if="selection" :backgroundColor="theme.colors.surfaceSage" :borderRadius="theme.geometry.radiusSm" cornerShape="squircle" padding="6" marginTop="4">
      <slot name="tooltip" :selection="selection" :index="active!">
        <SNativeMotionText :value="[selection.label, ...selection.items.map(item => item.label + ' ' + value(item))].join(' · ')" announce />
      </slot>
    </GridLayout>
    <SNativeButton v-if="showData && options.length" :label="dataLabel" size="sm" variant="ghost"
      :pressed="details" @tap="details = !details" />
    <StackLayout v-if="details">
      <slot name="data" :options="options">
        <GridLayout v-for="entry in options" :key="entry.key" :accessible="true" :accessibilityRole="AccessibilityRole.StaticText"
          :accessibilityLabel="[entry.label, ...entry.items.map(item => item.label + ' ' + value(item))].join(' · ')" padding="3 0">
          <SNativeText :text="[entry.label, ...entry.items.map(item => item.label + ' ' + value(item))].join(' · ')" size="caption" :accessibilityHidden="true" />
        </GridLayout>
      </slot>
    </StackLayout>
  </StackLayout>
</template>
