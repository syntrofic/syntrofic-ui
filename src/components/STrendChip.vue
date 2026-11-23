<script setup lang="ts">
import { computed } from 'vue'
import SChip from './SChip.vue'
import SNumberValue from './SNumberValue.vue'

type Trend = 'up' | 'down' | 'neutral'
const props = withDefaults(defineProps<{
  value: number
  trend?: Trend
  locale?: string | string[]
  formatOptions?: Intl.NumberFormatOptions
  prefix?: string
  suffix?: string
  directionLabels?: Partial<Record<Trend, string>>
  indicator?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'soft' | 'solid' | 'outline' | 'plain'
  positive?: 'up' | 'down'
  reserve?: number
}>(), { indicator: true, size: 'sm', variant: 'soft', positive: 'up', reserve: 0 })
const direction = computed<Trend>(() => props.trend ?? (props.value > 0 ? 'up' : props.value < 0 ? 'down' : 'neutral'))
const labels = { up: 'Increase', down: 'Decrease', neutral: 'No change' }
const tone = computed(() => direction.value === 'neutral' ? 'neutral' : direction.value === props.positive ? 'success' : 'danger')
</script>

<template>
  <SChip :tone="tone" class="sy-trend-chip" :data-trend="direction" :data-size="size" :data-variant="variant">
    <span class="sy-visually-hidden">{{ directionLabels?.[direction] ?? labels[direction] }}</span>
    <span class="sy-trend-chip__content">
      <span v-if="indicator || $slots.indicator" aria-hidden="true" class="sy-trend-chip__indicator">
        <slot name="indicator" :trend="direction"><span class="sy-trend-chip__arrow">↑</span></slot>
      </span>
      <SNumberValue :value="value" :locale="locale" :formatOptions="formatOptions" :prefix="prefix" :suffix="suffix" :reserve="reserve">
        <template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
        <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
      </SNumberValue>
    </span>
  </SChip>
</template>
