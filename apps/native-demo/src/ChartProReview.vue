<script setup lang="ts">
import { onBeforeUnmount, ref } from 'nativescript-vue'
import {
  SNativeAreaChart, SNativeBarChart, SNativeButton, SNativeComposedChart, SNativeLineChart, SNativeLiveChart,
  SNativePieChart, SNativeRadarChart, SNativeRadialChart, SNativeStackedMeter, SNativeSurface,
  type ChartDatum, type ChartSeries, type NativeChartSample,
} from '@syntrofic/ui-native'
defineProps<{ id: string }>()
const series: ChartSeries[] = [
  { key: 'received', label: '接收', color: '#668471', curve: 'smooth', dots: true },
  { key: 'complete', label: '归档', color: '#a46f69', curve: 'smooth' },
]
const data: ChartDatum[] = [
  { label: '周一', values: { received: 24, complete: 17, band: [15, 30] } },
  { label: '周二', values: { received: 32, complete: 20, band: [22, 37] } },
  { label: '周三', values: { received: 30, complete: null, band: [20, 35] } },
  { label: '周四', values: { received: 45, complete: 28, band: [34, 52] } },
  { label: '周五', values: { received: 41, complete: 36, band: [32, 48] } },
]
const continuous = data.map((row, index) => ({ ...row, x: [0, 2, 3, 7, 9][index] }))
const slices = [
  { id: 'visual', label: '图稿', value: 46 }, { id: 'text', label: '文本', value: 28 }, { id: 'licenses', label: '授权', value: 14 },
]
const radar = [
  { label: '清晰度', values: { received: 8, complete: 6 } }, { label: '完整度', values: { received: 7, complete: 8 } },
  { label: '规范', values: { received: 9, complete: 7 } }, { label: '出处', values: { received: 5, complete: 7 } },
  { label: '可复用', values: { received: 8, complete: 5 } },
]
const horizontal = ref(false)
const paused = ref(false)
const disconnected = ref(false)
const start = new Date(2026, 10, 21, 10, 30).getTime()
const samples = ref<NativeChartSample[]>([2, 4, 3, 7, 5, 12, 8, 11].map((value, index) => ({ value, time: start + index * 1000 })))
let interval: ReturnType<typeof setInterval> | undefined
function stop() { clearInterval(interval); interval = undefined }
function append() {
  const index = samples.value.length
  samples.value = [...samples.value, { time: start + index * 1000, value: 6 + (index * 7) % 13 }]
}
function stream() { if (interval) stop(); else interval = setInterval(append, 1200) }
onBeforeUnmount(stop)
const common = { height: 174, locale: 'zh-CN', dataLabel: '查看数据', emptyText: '暂无数据' } as const
</script>

<template>
  <SNativeSurface :padding="9">
    <SNativeAreaChart v-if="id === 'NP.area-chart'" v-bind="common" label="材料接收范围" :data="data"
      :series="[{ key: 'band', label: '预估范围' }, series[0]]" />
    <StackLayout v-else-if="id === 'NP.bar-chart'">
      <SNativeBarChart v-bind="common" label="接收与归档" :data="data" :series="series.map(item => ({ ...item, stack: 'assets' }))"
        :orientation="horizontal ? 'horizontal' : 'vertical'" />
      <SNativeButton label="切换方向" size="sm" variant="secondary" @tap="horizontal = !horizontal" />
    </StackLayout>
    <SNativeComposedChart v-else-if="id === 'NP.composed-chart'" v-bind="common" label="交付与归档对照" :data="continuous"
      :x-domain="[0, 10]" :x-format="value => value + ' 日'" :references="[{ x: 3, endX: 5, label: '复核期间' }]"
      :series="[{ ...series[0], mark: 'bar' }, { ...series[1], mark: 'line', axis: 'right', connectNulls: true }]" />
    <SNativeLineChart v-else-if="id === 'NP.line-chart'" v-bind="common" label="本周处理趋势" :data="data" :series="series" />
    <StackLayout v-else-if="id === 'NP.live-chart'">
      <SNativeLiveChart v-bind="common" label="每秒处理量" valueLabel="最新处理量" :samples="samples" :window="12000"
        :paused="paused" :disconnected="disconnected" disconnectedLabel="等待重新连接" />
      <WrapLayout marginTop="5">
        <SNativeButton label="追加样本" size="sm" variant="secondary" @tap="append" />
        <SNativeButton label="切换采样" size="sm" variant="ghost" @tap="stream" />
        <SNativeButton label="暂停预览" size="sm" variant="ghost" :pressed="paused" @tap="paused = !paused" />
        <SNativeButton label="切换连接" size="sm" variant="ghost" :pressed="disconnected" @tap="disconnected = !disconnected" />
      </WrapLayout>
    </StackLayout>
    <SNativePieChart v-else-if="id === 'NP.pie-chart'" v-bind="common" label="交付物构成" :data="slices" :innerRadius=".54" centerLabel="文件总数" />
    <SNativeRadarChart v-else-if="id === 'NP.radar-chart'" v-bind="common" label="复核维度" :data="radar" :series="series" :domain="[0, 10]" />
    <SNativeRadialChart v-else-if="id === 'NP.radial-chart'" v-bind="common" label="分类目标进度" :data="slices" :max="50" centerLabel="目标" :centerValue="50" />
    <SNativeStackedMeter v-else-if="id === 'NP.stacked-meter'" label="本周文件类型" :segments="slices" :max="100" />
  </SNativeSurface>
</template>
