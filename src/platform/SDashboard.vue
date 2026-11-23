<script lang="ts">
import type { CartesianChartProps, ChartSlice } from '../charts/types'
import type { BadgeTone, SelectOption } from '../types'
import type { KpiTrend } from '../internal/kpi'

export interface DashboardMetric {
  id: string
  label: string
  value: number
  unit?: string
  trend?: KpiTrend
  comparisons?: readonly (KpiTrend & { id: string; label: string })[]
  history?: readonly (number | null)[]
  chartPlacement?: 'inline' | 'bottom'
  description?: string
  tone?: BadgeTone
}
export interface DashboardRow {
  id: string
  label: string
  value: string
  progress?: number
  context?: string
  tone?: BadgeTone
}
export interface DashboardNote { id: string; title: string; body: string; time?: Date | number | string; tone?: BadgeTone }
export interface DashboardSchedule { id: string; label: string; start: string; end: string; context?: string }
export interface DashboardCohort { id: string; label: string; rates: readonly (number | null)[] }
export interface DashboardSnapshot {
  metrics: readonly DashboardMetric[]
  charts?: readonly CartesianChartProps[]
  rows?: readonly DashboardRow[]
  notes?: readonly DashboardNote[]
  completion?: readonly ChartSlice[]
  funnel?: readonly { id: string; label: string; count: number }[]
  cohorts?: { periods: readonly string[]; rows: readonly DashboardCohort[] }
  schedule?: { items: readonly DashboardSchedule[]; marker?: string }
}
</script>

<script setup lang="ts">
import { computed, useId } from 'vue'
import SBadge from '../components/SBadge.vue'
import SComposedChart from '../components/SComposedChart.vue'
import SKpi from '../components/SKpi.vue'
import SIcon from '../components/SIcon.vue'
import SPieChart from '../components/SPieChart.vue'
import SProgressBar from '../components/SProgressBar.vue'
import SScrollableArea from '../components/SScrollableArea.vue'
import SSelect from '../components/SSelect.vue'
import STimestamp from '../components/STimestamp.vue'
import STrendChip from '../components/STrendChip.vue'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  snapshot: DashboardSnapshot
  periods?: readonly SelectOption[]
  dimensions?: readonly SelectOption[]
  stickyFilters?: boolean
  chartLayout?: 'stack' | 'grid'
  notesMaxHeight?: string
  locale?: string
  labels?: Partial<Record<'period' | 'dimension' | 'rows' | 'notes' | 'completion' | 'funnel' | 'cohorts' | 'schedule' |
    'name' | 'value' | 'context' | 'progress' | 'drop' | 'notAvailable' | 'marker' | 'chartData' | 'chartEmpty', string>>
}>(), { periods: () => [], dimensions: () => [] })
const period = defineModel<string>('period')
const dimension = defineModel<string>('dimension')
const id = useId()
const text = computed(() => ({
  period: 'Period', dimension: 'Segment', rows: 'Breakdown', notes: 'Notes', completion: 'Completion',
  funnel: 'Funnel', cohorts: 'Cohorts', schedule: 'Schedule', name: 'Name', value: 'Value', context: 'Detail',
  progress: 'Progress', drop: 'drop-off', notAvailable: '—', marker: 'Today', chartData: 'View data', chartEmpty: 'No data',
  ...props.labels,
}))
const format = computed(() => new Intl.NumberFormat(props.locale))
const percentage = computed(() => new Intl.NumberFormat(props.locale, { style: 'percent', maximumFractionDigits: 1 }))
const date = computed(() => new Intl.DateTimeFormat(props.locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }))
const day = (value: string) => Date.parse(value)
const funnel = computed(() => (props.snapshot.funnel ?? []).map((stage, index, stages) => {
  const largest = Math.max(1, ...stages.map(item => item.count))
  const previous = stages[index - 1]?.count
  return { ...stage, width: Math.max(0, stage.count / largest), dropOff: previous ? (previous - stage.count) / previous : undefined }
}))
const schedule = computed(() => {
  const data = props.snapshot.schedule
  const items = (data?.items ?? []).map(item => ({ ...item, from: day(item.start), to: day(item.end) }))
    .filter(item => Number.isFinite(item.from) && Number.isFinite(item.to) && item.from <= item.to)
  if (!items.length) return
  const min = Math.min(...items.map(item => item.from))
  const max = Math.max(min + 86400000, ...items.map(item => item.to))
  const marker = data?.marker && day(data.marker)
  const span = max - min
  const position = (value: number) => (value - min) / span * 100
  return {
    min, max, marker: typeof marker === 'number' && marker >= min && marker <= max ? position(marker) : undefined,
    items: items.map(item => ({ ...item, left: position(item.from), width: position(item.to) - position(item.from) })),
  }
})
function tone(tone?: BadgeTone) {
  return tone === 'success' ? 'sage' : tone === 'warning' || tone === 'danger' ? 'sand' : tone === 'accent' ? 'blue' : 'neutral'
}
const metricIcons = { neutral: undefined, accent: undefined, success: 'success', warning: 'warning', danger: 'error' } as const
</script>

<template>
  <section class="sy-dashboard-template" :aria-labelledby="id">
    <header class="sy-dashboard-template__header" :data-sticky="stickyFilters || undefined">
      <div><h2 :id="id">{{ title }}</h2><p v-if="description">{{ description }}</p></div>
      <div v-if="periods.length || dimensions.length || $slots.filters" class="sy-dashboard-template__filters" :data-sticky="stickyFilters || undefined">
        <SSelect v-if="periods.length" v-model="period" :label="text.period" :options="periods" />
        <SSelect v-if="dimensions.length" v-model="dimension" :label="text.dimension" :options="dimensions" />
        <slot name="filters" />
      </div>
    </header>
    <div class="sy-dashboard-template__grid" :data-rail="Boolean(snapshot.notes?.length || $slots.rail) || undefined">
      <div class="sy-dashboard-template__main">
        <div v-if="snapshot.metrics.length" class="sy-dashboard-template__metrics">
          <SKpi v-for="metric in snapshot.metrics" :key="metric.id" :title="metric.label" :value="metric.value"
            :suffix="metric.unit" :trend="metric.trend" :tone="tone(metric.tone)" :chart="metric.history"
            :chart-placement="metric.chartPlacement" :locale="locale" :chart-inspect="false">
            <template v-if="metric.tone && metricIcons[metric.tone]" #icon>
              <SIcon :name="metricIcons[metric.tone]" :color="metricIcons[metric.tone]" />
            </template>
            <template v-if="metric.description || metric.comparisons?.length" #default>
              <p v-if="metric.description">{{ metric.description }}</p>
              <dl v-if="metric.comparisons?.length" class="sy-dashboard-template__comparisons">
                <div v-for="{ id: key, label, ...trend } in metric.comparisons" :key="key">
                  <dt>{{ label }}</dt><dd><STrendChip variant="plain" v-bind="trend" :locale="locale" /></dd>
                </div>
              </dl>
            </template>
          </SKpi>
        </div>
        <section v-if="snapshot.completion?.length" class="sy-dashboard-template__panel">
          <h3>{{ text.completion }}</h3>
          <SPieChart :data="snapshot.completion" :label="text.completion" :data-label="text.chartData" :height="220" :inner-radius="0.65" />
        </section>
        <div v-if="snapshot.charts?.length" class="sy-dashboard-template__charts" :data-layout="chartLayout">
          <section v-for="chart in snapshot.charts" :key="chart.label" class="sy-dashboard-template__panel">
            <h3>{{ chart.label }}</h3>
            <SComposedChart :locale="locale" :data-label="text.chartData" :empty-text="text.chartEmpty" v-bind="chart" />
          </section>
        </div>
        <section v-if="funnel.length" class="sy-dashboard-template__panel">
          <h3>{{ text.funnel }}</h3>
          <ol class="sy-dashboard-template__funnel">
            <li v-for="stage in funnel" :key="stage.id">
              <div><strong>{{ stage.label }}</strong><span>{{ format.format(stage.count) }}</span></div>
              <SProgressBar :value="stage.width" :max="1" :label="stage.label" :show-value="false" />
              <small v-if="stage.dropOff !== undefined">{{ text.drop }} {{ percentage.format(stage.dropOff) }}</small>
            </li>
          </ol>
        </section>
        <section v-if="snapshot.cohorts?.rows.length" class="sy-dashboard-template__panel">
          <h3>{{ text.cohorts }}</h3>
          <div class="sy-dashboard-template__table" tabindex="0" role="region" :aria-label="text.cohorts">
            <table>
              <thead><tr><th scope="col">{{ text.name }}</th><th v-for="column in snapshot.cohorts.periods" :key="column" scope="col">{{ column }}</th></tr></thead>
              <tbody>
                <tr v-for="row in snapshot.cohorts.rows" :key="row.id">
                  <th scope="row">{{ row.label }}</th>
                  <td v-for="(column, index) in snapshot.cohorts.periods" :key="column"
                    :style="{ '--sy-dashboard-rate': `${Math.max(0, Math.min(1, row.rates[index] ?? 0)) * 42}%` }">
                    {{ row.rates[index] == null ? text.notAvailable : percentage.format(row.rates[index]!) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section v-if="schedule" class="sy-dashboard-template__panel">
          <h3>{{ text.schedule }}</h3>
          <div class="sy-dashboard-template__timeline-range"><span>{{ date.format(schedule.min) }}</span><span>{{ date.format(schedule.max) }}</span></div>
          <p v-if="schedule.marker !== undefined" class="sy-dashboard-template__marker-label">{{ text.marker }}</p>
          <ul class="sy-dashboard-template__timeline" role="list">
            <li v-for="item in schedule.items" :key="item.id">
              <span>{{ item.label }} <small>{{ date.format(item.from) }}–{{ date.format(item.to) }}</small></span>
              <div aria-hidden="true">
                <span :style="{ insetInlineStart: item.left + '%', inlineSize: item.width + '%' }" />
                <i v-if="schedule.marker !== undefined" :style="{ insetInlineStart: schedule.marker + '%' }" />
              </div>
            </li>
          </ul>
        </section>
        <section v-if="snapshot.rows?.length" class="sy-dashboard-template__panel">
          <h3>{{ text.rows }}</h3>
          <div class="sy-dashboard-template__table" tabindex="0" role="region" :aria-label="text.rows">
            <table>
              <thead><tr><th scope="col">{{ text.name }}</th><th scope="col">{{ text.value }}</th><th scope="col">{{ text.context }}</th></tr></thead>
              <tbody>
                <tr v-for="row in snapshot.rows" :key="row.id">
                  <th scope="row">{{ row.label }}</th>
                  <td>
                    <SBadge v-if="row.tone" :tone="row.tone">{{ row.value }}</SBadge><span v-else>{{ row.value }}</span>
                    <SProgressBar v-if="row.progress !== undefined" :value="row.progress" :label="row.label + ' · ' + text.progress" size="sm" />
                  </td>
                  <td>{{ row.context }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <slot />
      </div>
      <aside v-if="snapshot.notes?.length || $slots.rail" class="sy-dashboard-template__rail" :aria-label="text.notes">
        <h3>{{ text.notes }}</h3>
        <SScrollableArea :label="text.notes" class="sy-dashboard-template__notes" overscroll="contain" :style="{ '--sy-dashboard-notes-height': notesMaxHeight }">
          <slot name="rail" :notes="snapshot.notes ?? []">
            <ul role="list">
              <li v-for="note in snapshot.notes" :key="note.id">
                <SBadge :tone="note.tone">{{ note.title }}</SBadge>
                <p>{{ note.body }}</p>
                <STimestamp v-if="note.time" :value="note.time" :locale="locale" :tooltip="false" format="date_time" />
              </li>
            </ul>
          </slot>
        </SScrollableArea>
      </aside>
    </div>
  </section>
</template>
