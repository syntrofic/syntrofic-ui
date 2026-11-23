<script setup lang="ts">
import { computed } from 'vue'
import SMotionText from './SMotionText.vue'
import SChartSwatch from './SChartSwatch.vue'
import type { ChartFormatter, ChartIndicator, ChartTooltipItem } from '../charts/types'
import { textValue } from '../charts/values'

const props = withDefaults(defineProps<{
  title?: string
  items?: readonly ChartTooltipItem[]
  label?: string
  locale?: string
  format?: ChartFormatter
  indicator?: ChartIndicator
  hideLabel?: boolean
  missingText?: string
  announce?: boolean
}>(), { items: () => [], indicator: 'dot', missingText: 'No data' })
defineSlots<{
  header(props: { title?: string }): unknown
  item(props: { item: ChartTooltipItem; text: string }): unknown
  footer(): unknown
}>()
const fallback = computed(() => new Intl.NumberFormat(props.locale, { maximumFractionDigits: 3 }))
const rows = computed(() => props.items.map(item => ({ item, text: textValue(item, props.format ?? (value => fallback.value.format(value)), props.missingText) })))
</script>

<template>
  <div class="sy-chart-tooltip" :role="announce ? 'status' : 'tooltip'" :aria-label="label">
    <div v-if="!hideLabel && (title || $slots.header)" class="sy-chart-tooltip__header">
      <slot name="header" :title="title"><SMotionText :value="title ?? ''" /></slot>
    </div>
    <dl v-if="rows.length" class="sy-chart-tooltip__rows">
      <div v-for="{ item, text } in rows" :key="item.key" class="sy-chart-tooltip__row">
        <slot name="item" :item="item" :text="text">
          <dt>
            <SChartSwatch :variant="item.indicator ?? indicator" :color="item.color" />
            <span>{{ item.label }}</span>
          </dt>
          <dd><SMotionText :value="text" motion="roll" /></dd>
        </slot>
      </div>
    </dl>
    <div v-if="$slots.footer" class="sy-chart-tooltip__footer"><slot name="footer" /></div>
  </div>
</template>
