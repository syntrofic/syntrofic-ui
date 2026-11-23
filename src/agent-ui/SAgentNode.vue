<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import type { ChartDatum, ChartSeries } from '../charts/types'
import SAreaChart from '../components/SAreaChart.vue'
import SBarChart from '../components/SBarChart.vue'
import SButton from '../components/SButton.vue'
import SChip from '../components/SChip.vue'
import SComposedChart from '../components/SComposedChart.vue'
import SKpi from '../components/SKpi.vue'
import SLineChart from '../components/SLineChart.vue'
import SPieChart from '../components/SPieChart.vue'
import SProgressBar from '../components/SProgressBar.vue'
import SRadarChart from '../components/SRadarChart.vue'
import SRadialChart from '../components/SRadialChart.vue'
import SRating from '../components/SRating.vue'
import STable from '../components/STable.vue'
import { customPlots } from './plots'
import SAgentFields from './SAgentFields.vue'
import SAgentPlot from './SAgentPlot.vue'
import type { AgentActionEvent, AgentEntry, AgentNode } from './schema'

defineOptions({ name: 'SAgentNode' })
const props = defineProps<{ node: AgentNode }>()
const emit = defineEmits<{ action: [event: AgentActionEvent] }>()
const MapView = defineAsyncComponent(() => import('../components/SMap.vue'))
const Code = defineAsyncComponent(() => import('../components/SCodeBlock.vue'))
const children = computed(() => props.node.children ?? [])
const entries = computed(() => props.node.values ?? [])
const title = computed(() => props.node.title ?? props.node.label ?? '')
const tab = ref<string>()
const rating = ref(props.node.value ?? 0)
watch(() => props.node.value, value => { rating.value = value ?? 0 })
const shownTab = computed(() => children.value.find(child => child.id === tab.value) ?? children.value[0])
const layout = new Set(['dashboard', 'generated-composition', 'composition-api', 'row', 'column', 'grid'])
const cards = new Set(['card', 'product-card', 'record-card', 'item-card', 'item-card-group', 'product-signals'])
const lists = new Set(['list', 'list-block', 'comparison-list', 'meter-list', 'steps'])
const actionKinds = new Set(['action-group', 'follow-up', 'button'])
const cartesian = { 'line-chart': SLineChart, 'area-chart': SAreaChart, 'bar-chart': SBarChart, 'composed-chart': SComposedChart, 'radar-chart': SRadarChart }
const plot = computed(() => cartesian[props.node.kind as keyof typeof cartesian])
const keys = computed(() => [...new Set(entries.value.flatMap(entry => Object.keys(entry.values ?? {})))])
const data = computed<ChartDatum[]>(() => entries.value.map(entry => ({
  id: entry.id, label: entry.label, values: Object.fromEntries(keys.value.map(key => [key, number(entry.values?.[key]) ?? null])),
})))
const series = computed<ChartSeries[]>(() => keys.value.map((key, index) => ({ key, label: key,
  mark: props.node.kind === 'composed-chart' ? index % 2 ? 'line' : 'bar' : undefined })))
const slices = computed(() => entries.value.map(entry => ({ id: entry.id, label: entry.label, value: number(entry.value) ?? null })))
const columns = computed(() => [
  { key: 'label', label: props.node.label ?? '项目', value: (entry: AgentEntry) => entry.label, sortable: true, rowHeader: true },
  ...keys.value.map(key => ({ key, label: key, value: (entry: AgentEntry) => display(entry.values?.[key]), sortable: true })),
])
const mapMarkers = computed(() => entries.value.flatMap(entry => {
  const lng = number(entry.values?.longitude), lat = number(entry.values?.latitude)
  return lng !== undefined && lat !== undefined && Math.abs(lng) <= 180 && Math.abs(lat) <= 85
    ? [{ id: entry.id, location: [lng, lat] as [number, number], label: entry.label }] : []
}))
const mapStyle = { version: 8 as const, sources: {}, layers: [{ id: 'background', type: 'background' as const, paint: { 'background-color': '#e0e6db' } }] }
function display(value: unknown) { return value == null ? '—' : String(value) }
function number(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : undefined }
function action(id: string, value?: number) { emit('action', { node: props.node.id, action: id, values: value === undefined ? {} : { value } }) }
</script>

<template>
  <section v-if="layout.has(node.kind)" class="sy-agent-section">
    <h2 v-if="title">{{ title }}</h2>
    <div class="sy-agent-layout" :data-layout="node.kind">
      <SAgentNode v-for="child in children" :key="child.id" :node="child" @action="emit('action', $event)" />
    </div>
  </section>
  <section v-else-if="node.kind === 'kpi-grid' || node.kind === 'metric-grid'" class="sy-agent-section">
    <h2 v-if="title">{{ title }}</h2>
    <div class="sy-agent-layout" data-layout="grid">
      <SKpi v-for="entry in entries" :key="entry.id" :title="entry.label" :value="number(entry.value)"
        :chart="node.kind === 'kpi-grid' ? entry.series : undefined" :chart-label="entry.label" tone="sage">{{ entry.detail }}</SKpi>
    </div>
  </section>
  <component v-else-if="plot" :is="plot" :label="title" :data="data" :series="series" :height="190" data-label="查看数据" empty-text="暂无数据" />
  <SPieChart v-else-if="node.kind === 'pie-chart' || node.kind === 'donut-chart'" :label="title" :data="slices"
    :inner-radius="node.kind === 'donut-chart' ? .55 : 0" :height="190" data-label="查看数据" empty-text="暂无数据" />
  <SRadialChart v-else-if="node.kind === 'radial-chart' || node.kind === 'gauge-chart'" :label="title"
    :data="node.kind === 'gauge-chart' ? [{ id: node.id, label: title, value: node.value ?? 0 }] : slices"
    :min="node.min" :max="node.max ?? 100" :height="190" :start-angle="node.kind === 'gauge-chart' ? -120 : undefined"
    :end-angle="node.kind === 'gauge-chart' ? 120 : undefined" data-label="查看数据" />
  <SAgentPlot v-else-if="customPlots.includes(node.kind)" :kind="node.kind" :label="title" :entries="entries" />
  <STable v-else-if="node.kind === 'data-table'" :rows="entries" :columns="columns" :row-key="row => row.id" :label="title" />
  <section v-else-if="cards.has(node.kind)" class="sy-agent-card">
    <h2 v-if="title">{{ title }}</h2>
    <img v-if="node.src" :src="node.src" :alt="node.label ?? ''" loading="lazy">
    <p v-if="node.text">{{ node.text }}</p>
    <dl v-if="entries.length"><div v-for="entry in entries" :key="entry.id"><dt>{{ entry.label }}</dt><dd>{{ display(entry.value) }}</dd></div></dl>
    <SAgentNode v-for="child in children" :key="child.id" :node="child" @action="emit('action', $event)" />
    <div v-if="node.actions?.length" class="sy-agent-actions">
      <SButton v-for="item in node.actions" :key="item.id" size="sm" :variant="item.intent === 'danger' ? 'danger' : 'secondary'" @click="action(item.id)">{{ item.label }}</SButton>
    </div>
  </section>
  <section v-else-if="lists.has(node.kind) || node.kind === 'accordion'" class="sy-agent-section">
    <h2 v-if="title">{{ title }}</h2>
    <div v-if="node.kind === 'accordion'">
      <details v-for="item in entries" :key="item.id"><summary>{{ item.label }}</summary><p>{{ item.detail || display(item.value) }}</p></details>
    </div>
    <ol v-else class="sy-agent-list" :data-kind="node.kind">
      <li v-for="item in entries" :key="item.id">
        <SProgressBar v-if="node.kind === 'meter-list'" :label="item.label" :value="number(item.value) ?? 0" :min="node.min" :max="node.max" />
        <template v-else><strong>{{ item.label }}</strong><span v-if="item.value != null">{{ display(item.value) }}</span></template>
        <small v-if="item.detail">{{ item.detail }}</small>
      </li>
    </ol>
  </section>
  <section v-else-if="node.kind === 'tabs'" class="sy-agent-section">
    <h2 v-if="title">{{ title }}</h2>
    <div class="sy-agent-actions" role="group" :aria-label="title">
      <SButton v-for="child in children" :key="child.id" size="sm" :variant="shownTab?.id === child.id ? 'primary' : 'secondary'"
        :aria-pressed="shownTab?.id === child.id" @click="tab = child.id">{{ child.label ?? child.title }}</SButton>
    </div>
    <SAgentNode v-if="shownTab" :key="shownTab.id" :node="shownTab" @action="emit('action', $event)" />
  </section>
  <section v-else-if="node.kind === 'form' || node.kind === 'switch-group' || node.kind === 'toggle-group'" class="sy-agent-section">
    <h2 v-if="title">{{ title }}</h2><SAgentFields :node="node" @action="emit('action', $event)" />
  </section>
  <div v-else-if="actionKinds.has(node.kind)" class="sy-agent-actions">
    <SButton v-for="item in node.actions ?? [{ id: 'activate', label: title, intent: undefined }]" :key="item.id" size="sm"
      :variant="item.intent === 'danger' ? 'danger' : node.kind === 'button' ? 'primary' : 'secondary'" @click="action(item.id)">{{ item.label }}</SButton>
  </div>
  <Code v-else-if="node.kind === 'code-block'" :code="node.text ?? ''" :label="title" copy-label="复制" copied-label="已复制" />
  <MapView v-else-if="node.kind === 'map'" :label="title" :center="mapMarkers[0]?.location" :markers="mapMarkers"
    :map-style="mapStyle" height="14rem" />
  <figure v-else-if="node.kind === 'image'" class="sy-agent-image">
    <img v-if="node.src" :src="node.src" :alt="node.label ?? title" loading="lazy">
    <figcaption v-if="title">{{ title }}</figcaption>
  </figure>
  <aside v-else-if="node.kind === 'callout'" class="sy-agent-card"><strong>{{ title }}</strong><p>{{ node.text }}</p></aside>
  <div v-else-if="node.kind === 'tag-list'" class="sy-agent-actions"><SChip v-for="entry in entries" :key="entry.id">{{ entry.label }}</SChip></div>
  <SChip v-else-if="node.kind === 'badge'">{{ title }}</SChip>
  <span v-else-if="node.kind === 'icon'" role="img" :aria-label="node.label">{{ node.text }}</span>
  <SRating v-else-if="node.kind === 'rating'" :label="title" v-model="rating" :count="node.max" :readonly="!node.actions?.length"
    @update:model-value="action(node.actions?.[0]?.id ?? 'rating', $event)" />
  <SProgressBar v-else-if="node.kind === 'progress'" :label="title" :value="node.value ?? 0" :min="node.min" :max="node.max" />
  <h2 v-else-if="node.kind === 'heading'">{{ title }}</h2>
  <hr v-else-if="node.kind === 'divider'" class="sy-agent-divider">
  <div v-else-if="node.kind === 'spacer'" aria-hidden="true" :style="{ blockSize: Math.min(80, Math.max(0, node.value ?? 16)) + 'px' }" />
  <p v-else>{{ node.text || title }}</p>
</template>
