<script setup lang="ts">
import { useId } from 'vue'
import SKpiSparkline from '../internal/SKpiSparkline.vue'
import type { KpiDatum, KpiTrend, SparkPoint } from '../internal/kpi'
import type { MeasurementProps } from '../internal/measurement'
import SNumberValue from './SNumberValue.vue'
import SProgressBar from './SProgressBar.vue'
import SSeparator from './SSeparator.vue'
import STrendChip from './STrendChip.vue'

withDefaults(defineProps<{
  title?: string
  label?: string
  value?: number | bigint
  prefix?: string
  suffix?: string
  locale?: string | string[]
  formatOptions?: Intl.NumberFormatOptions
  reserve?: number
  motion?: 'roll' | 'reveal' | 'none'
  announce?: boolean
  trend?: KpiTrend
  progress?: MeasurementProps & { indeterminate?: boolean }
  chart?: readonly KpiDatum[]
  chartPlacement?: 'inline' | 'bottom'
  chartLabel?: string
  chartFormatOptions?: Intl.NumberFormatOptions
  chartMissingLabel?: string
  chartConnectNulls?: boolean
  chartInspect?: boolean
  chartFade?: number
  tone?: 'neutral' | 'sage' | 'blue' | 'sand'
  iconTone?: 'success' | 'warning' | 'danger'
  divider?: boolean
}>(), { reserve: 6, motion: 'roll', tone: 'neutral', chartPlacement: 'bottom', chartInspect: true })
defineSlots<{
  title(): unknown
  icon(): unknown
  prefix(): unknown
  suffix(): unknown
  value(props: { value?: number | bigint }): unknown
  trend(): unknown
  actions(): unknown
  default(): unknown
  progress(): unknown
  chart(props: { placement: 'inline' | 'bottom' }): unknown
  'chart-tooltip'(props: { point: SparkPoint; text: string }): unknown
  footer(): unknown
}>()
const id = `sy-kpi-${useId()}`
</script>

<template>
  <article class="sy-kpi" :data-tone="tone" :aria-label="label" :aria-labelledby="!label && (title || $slots.title) ? id : undefined">
    <div class="sy-kpi__summary">
      <dl class="sy-kpi__metric">
        <dt :id="id" class="sy-kpi__title">
          <span v-if="$slots.icon" class="sy-kpi__icon" :data-tone="iconTone" aria-hidden="true"><slot name="icon" /></span>
          <span><slot name="title">{{ title }}</slot></span>
        </dt>
        <dd class="sy-kpi__numbers">
          <span class="sy-kpi__value">
            <slot name="value" :value="value">
              <SNumberValue v-if="value !== undefined" :value="value" :prefix="prefix" :suffix="suffix" :locale="locale"
                :format-options="formatOptions" :reserve="reserve" :motion="motion" :announce="announce">
                <template v-if="$slots.prefix" #prefix><slot name="prefix" /></template>
                <template v-if="$slots.suffix" #suffix><slot name="suffix" /></template>
              </SNumberValue>
            </slot>
          </span>
          <span v-if="trend || $slots.trend" class="sy-kpi__trend">
            <slot name="trend"><STrendChip v-if="trend" :locale="locale" variant="plain" :indicator="false" v-bind="trend" /></slot>
          </span>
        </dd>
      </dl>
      <div v-if="$slots.actions" class="sy-kpi__actions"><slot name="actions" /></div>
    </div>
    <div v-if="$slots.default" class="sy-kpi__context"><slot /></div>
    <div v-if="progress || $slots.progress" class="sy-kpi__progress">
      <slot name="progress"><SProgressBar v-if="progress" size="sm" :label="title" v-bind="progress" /></slot>
    </div>
    <div v-if="chart || $slots.chart" class="sy-kpi__chart" :data-placement="chartPlacement">
      <slot name="chart" :placement="chartPlacement">
        <SKpiSparkline v-if="chart" :data="chart" :label="chartLabel ?? title ?? 'Trend'" :locale="locale"
          :format-options="chartFormatOptions" :missing-label="chartMissingLabel" :connect-nulls="chartConnectNulls"
          :inspect="chartInspect" :fade="chartFade">
          <template v-if="$slots['chart-tooltip']" #tooltip="scope"><slot name="chart-tooltip" v-bind="scope" /></template>
        </SKpiSparkline>
      </slot>
    </div>
    <SSeparator v-if="divider" decorative />
    <div v-if="$slots.footer" class="sy-kpi__footer"><slot name="footer" /></div>
  </article>
</template>
