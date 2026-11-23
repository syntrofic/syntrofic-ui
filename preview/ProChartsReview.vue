<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SAreaChart, SBarChart, SChartAxis, SChartGrid, SChartTooltip, SComposedChart, SLineChart, SPieChart, SRadarChart, SRadialChart,
  SButton, SSegment, SSwitch, type ChartDatum, type ChartSeries, type ChartSlice, type ChartTooltipItem, type ChartValue, type RadialValue,
} from '../src'

defineProps<{ id: string }>()
const chartCopy = { locale: 'zh-CN', emptyText: '暂无数据', missingText: '无记录', dataLabel: '查看数据', legendLabel: '系列', categoryLabel: '类别' }
const batchState = ref('empty')
const batchStates = [{ value: 'empty', label: '空数据' }, { value: 'loading', label: '载入中' }, { value: 'ready', label: '已就绪' }]
const colors = {
  sage: 'var(--sy-chart-sage)', clay: 'var(--sy-chart-clay)', blue: 'var(--sy-chart-blue)', plum: 'var(--sy-chart-plum)', ochre: 'var(--sy-chart-ochre)',
}
const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const asRows = (labels: readonly string[], values: readonly Readonly<Record<string, ChartValue>>[]): ChartDatum[] =>
  labels.map((label, index) => ({ id: String(index), label, values: values[index] ?? {} }))
const byWeek = (input: Record<string, readonly ChartValue[]>) =>
  asRows(names, names.map((_, index) => Object.fromEntries(Object.entries(input).map(([key, values]) => [key, values[index]]))))
const deliveries = byWeek({ guides: [24, 31, 28, 40, 37, 35, 42], resources: [16, 18, 23, 20, 28, 24, 31] })
const bands = byWeek({ range: [[18, 37], [22, 44], null, [33, 59], [34, 62], [31, 54], [30, 62]] })
const areaSeries: readonly ChartSeries[] = [
  { label: '使用规范', key: 'guides', stack: 'delivery', color: colors.sage, curve: 'smooth', unit: '份' },
  { label: '源文件', key: 'resources', stack: 'delivery', color: colors.blue, curve: 'smooth', gradient: true, unit: '份' },
]
const bandSeries: readonly ChartSeries[] = [{ label: '日交付区间', key: 'range', color: colors.plum, curve: 'smooth', unit: '份' }]

const groups = asRows(['品牌', '产品', '研发', '运营'], [
  { planned: 12, done: 10 }, { planned: 25, done: 22 }, { planned: 18, done: 15 }, { planned: 16, done: 14 },
])
const signed = asRows(['品牌', '产品', '研发', '运营'], [
  { created: 18, archived: -5, restored: 5 }, { created: 24, archived: -8, restored: 11 },
  { created: 20, archived: -16, restored: 6 }, { created: 17, archived: -11, restored: 8 },
])
const barSeries: readonly ChartSeries[] = [
  { key: 'planned', label: '计划', color: colors.blue, unit: '项' },
  { key: 'done', label: '完成', color: colors.sage, unit: '项' },
]
const signedSeries: readonly ChartSeries[] = [
  { key: 'created', label: '新增', stack: 'changes', color: colors.sage, unit: '项' },
  { key: 'restored', label: '恢复', stack: 'changes', color: colors.blue, unit: '项' },
  { key: 'archived', label: '归档', stack: 'changes', color: colors.clay, unit: '项' },
]

const throughputs = byWeek({
  total: [32, 27, 40, 37, 45, 44, 52], target: [30, 33, 36, 38, 41, 43, 45], rate: [63, 66, 72, 71, 78, 83, 92],
  expected: [[27, 34], [29, 37], [31, 40], [35, 41], [36, 46], [39, 47], [41, 49]],
  interval: [[29, 35], [23, 29], null, [33, 40], [40, 50], [42, 47], [48, 57]],
  audit: [null, null, 74, null, 80, null, 94],
})
const mixedSeries: readonly ChartSeries[] = [
  { key: 'target', label: '目标', mark: 'area', color: colors.blue, unit: '份', curve: 'smooth' },
  { key: 'total', label: '交付', mark: 'bar', color: colors.sage, unit: '份' },
  { key: 'rate', label: '通过率', mark: 'line', axis: 'right', color: colors.clay, dashed: true, dots: true, unit: '%' },
  { key: 'expected', label: '目标区间', mark: 'band', color: colors.blue, unit: '份' },
  { key: 'interval', label: '测量范围', mark: 'errorBar', alignToBar: 'total', color: colors.plum, unit: '份' },
  { key: 'audit', label: '抽查通过率', mark: 'dot', axis: 'right', color: colors.ochre, radius: 4, unit: '%' },
]
const gpuDots = ref(false)
const deliverySeries = computed<readonly ChartSeries[]>(() => gpuDots.value
  ? mixedSeries.map(entry => entry.mark === 'dot' ? { ...entry, renderer: 'webgl-interactive' } : entry)
  : mixedSeries)
const chartRate = (value: number) => `${Math.round(value)}%`
const start = Date.UTC(2026, 10, 20, 8)
const hour = 3_600_000
const timedSamples: readonly ChartDatum[] = [
  { id: 'before', label: '07:00', x: start - hour, values: { sample: 64 } },
  { id: 'last', label: '11:00', x: new Date(start + 3 * hour), values: { sample: 40 } },
  { id: 'start', label: '08:00', x: String(start), values: { sample: 20 } },
  { id: 'middle', label: '09:00', x: start + hour, values: { sample: 32 } },
]
const clearSamples = ref(false)
const zoomSamples = ref(false)
const timeWindow = computed<readonly [number, number]>(() => [start + (zoomSamples.value ? hour : 0), start + 3 * hour])
const sampleSeries: readonly ChartSeries[] = [{ key: 'sample', label: '通过量', mark: 'line', dots: true, unit: '份' }]
const sampleTick = (value: number) => new Date(value).toISOString().slice(11, 16)
const throughput = byWeek({ actual: [42, 53, null, 58, 70, 62, 74], reference: [40, 44, 50, 54, 57, 62, 68] })
const connected = ref(false)
const lineSeries = computed<readonly ChartSeries[]>(() => [
  { key: 'actual', label: '已完成', color: colors.sage, dots: true, curve: 'smooth', connectNulls: connected.value, unit: '份' },
  { key: 'reference', label: '参考线', color: colors.blue, dashed: true, unit: '份' },
])
const sparkSeries: readonly ChartSeries[] = [{ key: 'actual', label: '已完成', color: colors.sage, connectNulls: true }]

const samples = [
  { title: '上午批次', done: 1428, delay: 3.7, gap: null },
  { title: '下午批次', done: 1468, delay: 3.2, gap: 14 },
]
const alternate = ref(false)
const tooltipSample = computed(() => samples[alternate.value ? 1 : 0])
const tooltipRows = computed<readonly ChartTooltipItem[]>(() => [
  { key: 'done', label: '处理量', value: tooltipSample.value.done, unit: '份', color: colors.sage, indicator: 'dot' },
  { key: 'delay', label: '平均耗时', value: tooltipSample.value.delay, unit: '分钟', color: colors.blue, indicator: 'line' },
  { key: 'gap', label: '待补数据', value: tooltipSample.value.gap, unit: '份', color: colors.clay, indicator: 'dashed' },
])

const share: ChartSlice[] = [
  { id: 'guide', label: '规范', value: 52, color: colors.sage },
  { id: 'source', label: '源文件', value: 28, color: colors.blue },
  { id: 'examples', label: '案例', value: 19, color: colors.clay },
  { id: 'other', label: '其他', value: 1, color: colors.ochre },
]
const comparison = [{ id: 'prior', label: '上一版', data: [
  { ...share[0], value: 43 }, { ...share[1], value: 32 }, { ...share[2], value: 23 }, { ...share[3], value: 2 },
] }]
const emptyPie = share.map(entry => ({ ...entry, value: entry.id === 'other' ? null : 0 }))
const scores = asRows(['可读', '完整', '效率', '一致', '易维护'], [
  { current: 82, prior: 68 }, { current: 90, prior: 78 }, { current: 78, prior: 72 },
  { current: 91, prior: 64 }, { current: 73, prior: 67 },
])
const radarSeries: readonly ChartSeries[] = [
  { key: 'current', label: '本轮', color: colors.sage, unit: '分' },
  { key: 'prior', label: '上一轮', color: colors.clay, unit: '分' },
]
const dotsOnly = ref(false)
const regional = ref(false)
const gauges = computed<readonly RadialValue[]>(() => [
  { id: 'review', label: '复核', value: regional.value ? 88 : 84, color: colors.sage, unit: '%' },
  { id: 'deliver', label: '交付', value: regional.value ? 76 : 68, color: colors.blue, unit: '%' },
  { id: 'archive', label: '归档', value: regional.value ? 62 : 54, color: colors.clay, unit: '%' },
])
</script>

<template>
  <section class="review-charts" :data-polar="['WP.pie-chart', 'WP.radar-chart', 'WP.radial-chart'].includes(id) || undefined">
    <template v-if="id === 'WP.area-chart'">
      <SAreaChart class="review-charts__main" v-bind="chartCopy" label="每日交付量" description="每日交付量"
        :data="deliveries" :series="areaSeries" :domain="[0, 80]" :height="232" />
      <SAreaChart class="review-charts__secondary" v-bind="chartCopy" label="交付量区间" description="交付量区间"
        :data="bands" :series="bandSeries" :domain="[0, 80]" :height="174" :show-data="false" />
    </template>

    <template v-else-if="id === 'WP.bar-chart'">
      <SBarChart class="review-charts__main" v-bind="chartCopy" label="各团队校验计划" description="各团队校验计划"
        :data="groups" :series="barSeries" :domain="[0, 28]" :height="218" />
      <SBarChart class="review-charts__secondary" v-bind="chartCopy" label="资源净变化" description="资源净变化"
        :data="signed" :series="signedSeries" orientation="horizontal" :domain="[-20, 40]" :ticks="4" :height="208" :show-data="false" />
    </template>

    <template v-else-if="id === 'WP.chart-tooltip'">
      <div class="review-tooltip-specimen">
        <SChartTooltip :title="tooltipSample.title" :items="tooltipRows" locale="zh-CN" missing-text="无记录" announce class="review-tooltip-card" />
        <SButton size="sm" variant="secondary" @click="alternate = !alternate">切换批次</SButton>
      </div>
      <SLineChart class="review-charts__main" v-bind="chartCopy" label="处理量趋势" description="处理量趋势"
        :data="throughput" :series="lineSeries" :height="206" :domain="[30, 80]" :show-data="false">
        <template #tooltip="{ selection }">
          <SChartTooltip :title="selection.label" :items="selection.items" locale="zh-CN" missing-text="无记录">
            <template #footer>当日校验快照</template>
          </SChartTooltip>
        </template>
      </SLineChart>
    </template>

    <template v-else-if="id === 'WP.composed-chart'">
      <SSwitch v-model="gpuDots">使用 WebGL 散点</SSwitch>
      <SComposedChart class="review-charts__main" v-bind="chartCopy"
        label="交付量与通过率" description="交付量与通过率" :data="throughputs" :series="deliverySeries"
        legend-position="top" legend-alignment="center"
        :references="[{ category: '周四', label: '评审日' }, { value: 80, endValue: 90, axis: 'right', label: '通过率目标', labelPosition: 'end' }]"
        :domain="[0, 60]" :right-domain="[50, 100]" :right-axis-format="chartRate" :height="256">
        <template #grid="{ plot }"><SChartGrid :plot="plot" vertical /></template>
        <template #axes="{ plot }">
          <SChartAxis :plot="plot" position="bottom" show-ticks :truncate="4" />
          <SChartAxis :plot="plot" position="left" />
          <SChartAxis :plot="plot" position="right" />
        </template>
      </SComposedChart>
      <div class="review-chart-controls">
        <SSwitch v-model="zoomSamples">缩小时间窗口</SSwitch>
        <SSwitch v-model="clearSamples">清空采样</SSwitch>
      </div>
      <SComposedChart class="review-charts__secondary" v-bind="chartCopy" label="实时采样" description="实时采样"
        :data="clearSamples ? [] : timedSamples" :series="sampleSeries" :show-legend="false" data-label="查看采样明细"
        x-scale="time" :x-domain="timeWindow" :x-ticks="4" :x-format="sampleTick" y-baseline="zero"
        :margin="{ left: 48, right: 24 }" :references="[{ x: start + hour, endX: start + 2 * hour, label: '观察窗口' }]">
        <template #grid="{ plot }"><SChartGrid :plot="plot" vertical :tick-count="4" /></template>
        <template #axes="{ plot }">
          <SChartAxis :plot="plot" position="bottom" :tick-count="4" :max-ticks="4" show-ticks />
          <SChartAxis :plot="plot" position="left" />
        </template>
        <template #interactions="{ plot }">
          <line v-if="!clearSamples" data-sample-marker :x1="plot.positionX?.(start + hour)" :x2="plot.positionX?.(start + hour)"
            :y1="plot.area.top" :y2="plot.positionY?.(32)" :stroke="colors.clay" stroke-dasharray="3 3" />
        </template>
      </SComposedChart>
    </template>

    <template v-else-if="id === 'WP.line-chart'">
      <div class="review-chart-controls"><SSwitch v-model="connected">连接缺失点</SSwitch></div>
      <SLineChart class="review-charts__main" v-bind="chartCopy" label="完成情况" description="完成情况"
        :data="throughput" :series="lineSeries" :domain="[30, 80]" :height="232"
        :references="[{ value: 60, label: '目标 60' }]" />
      <SLineChart class="review-charts__secondary" v-bind="chartCopy" label="完成量迷你趋势" description="完成量迷你趋势"
        :data="throughput" :series="sparkSeries" sparkline :height="74" :inspect="false" />
    </template>

    <template v-else-if="id === 'WP.pie-chart'">
      <SPieChart class="review-charts__main" v-bind="chartCopy" label="交付构成" description="交付构成"
        :data="share" :height="228" center-label="合计" value-label="份数" labels />
      <div class="review-chart-columns">
        <SPieChart class="review-charts__secondary" v-bind="chartCopy" label="两版构成" description="内环当前版 · 外环上一版"
          :data="share" :rings="comparison" :height="180" value-label="份数" :show-data="false" />
        <div class="review-charts__empty" role="group" aria-label="下一批数据预览">
          <SSegment v-model="batchState" size="sm" :items="batchStates" label="数据状态" />
          <SPieChart v-bind="chartCopy" label="下一批构成" description="下一批构成"
            :data="batchState === 'ready' ? share : emptyPie" :height="180" value-label="份数"
            :loading="batchState === 'loading'" loading-text="正在载入下一批数据"
            :show-legend="false" :show-data="batchState === 'ready'" />
        </div>
      </div>
    </template>

    <template v-else-if="id === 'WP.radar-chart'">
      <div class="review-chart-controls"><SSwitch v-model="dotsOnly">仅显示数据点</SSwitch></div>
      <SRadarChart class="review-charts__main" v-bind="chartCopy" label="交付评分分布" description="交付评分分布"
        :data="scores" :series="radarSeries" :domain="[0, 100]" :height="255" :dots-only="dotsOnly" radius-axis />
    </template>

    <template v-else>
      <div class="review-chart-controls"><SSwitch v-model="regional">查看本组进度</SSwitch></div>
      <SRadialChart class="review-charts__main" v-bind="chartCopy" label="项目推进" description="项目推进"
        :data="gauges" :height="222" :start-angle="-126" :end-angle="126" center-label="复核进度" value-label="完成率"
        :center-value="gauges[0].value" :format="chartRate" />
      <SRadialChart class="review-charts__secondary" v-bind="chartCopy" label="单项归档进度" description="单项归档进度"
        :data="[gauges[2]]" :height="153" :start-angle="0" :end-angle="360" center-label="归档进度"
        :center-value="gauges[2].value" :format="chartRate" :show-legend="false" :show-data="false" />
    </template>
  </section>
</template>
