<script setup lang="ts">
import { computed, ref } from 'vue'
import { SDashboard, SIncidentConsole, SSegment } from '../src'
import type { CartesianChartProps, ChartSeries, DashboardSnapshot, IncidentItem, IncidentStatus } from '../src'

const props = defineProps<{ kind: string }>()
const period = ref('week')
const dimension = ref('all')
const breakdown = ref('team')
const activeIncident = ref<string>('gateway')
const periods = [{ value: 'week', label: '最近 7 天' }, { value: 'month', label: '最近 30 天' }, { value: 'quarter', label: '最近 90 天' }]
const dimensions = [{ value: 'all', label: '全部团队' }, { value: 'design', label: '设计组' }, { value: 'engineering', label: '工程组' }]
const breakdowns = [{ value: 'team', label: '按团队' }, { value: 'service', label: '按服务' }]
const dayLabels = computed(() => period.value === 'week' ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  : period.value === 'month' ? ['第 1 周', '第 2 周', '第 3 周', '第 4 周'] : ['第 1 月', '第 2 月', '第 3 月'])
const scale = computed(() => (period.value === 'week' ? 1 : period.value === 'month' ? 4 : 12) * (dimension.value === 'all' ? 1 : dimension.value === 'design' ? .63 : .37))
const value = (n: number) => Math.round(n * scale.value)
function chart(label: string, series: readonly ChartSeries[], work: readonly (readonly number[])[], extra: Partial<CartesianChartProps> = {}): CartesianChartProps {
  const data = dayLabels.value.map((label, index) => ({
    label, values: Object.fromEntries(series.map(({ key }, seriesIndex) => [key, value(work[seriesIndex]?.[index] ?? 0)])),
  }))
  return { label, series, data, height: 232, ...extra }
}
const sources = [
  { id: 'sync', label: '同步', description: '比前一周期增加 4.8%', data: [8, 12, 10, 15, 18, 17, 22], change: 4.8 },
  { id: 'import', label: '导入', description: '比前一周期增加 2.1%', data: [4, 7, 8, 6, 9, 12, 10], change: 2.1 },
  { id: 'upload', label: '上传', description: '比前一周期增加 7.3%', data: [14, 19, 17, 20, 19, 24, 25], change: 7.3 },
] as const
const sum = (series: readonly number[]) => series.slice(0, dayLabels.value.length).reduce((subtotal, number) => subtotal + value(number), 0)
const titles: Record<string, string> = {
  'dashboard-alert-rail': '交付服务健康',
  'dashboard-cohort-funnel': '交付转化与留存',
  'dashboard-comparison': '团队交付对比',
  'dashboard-composition': '文档资产构成',
  'dashboard-progress': '版本计划与风险',
  'dashboard-scorecard': '团队交付评分卡',
}
const labels = {
  period: '时间范围', dimension: '团队范围', rows: '详细分解', notes: '团队动态', name: '项目', value: '当前值',
  context: '说明', completion: '任务完成情况', funnel: '交付漏斗', cohorts: '分组留存率', schedule: '阶段排期',
  marker: '状态截止日', chartData: '查看明细', drop: '较上一阶段流失', progress: '进度',
}
const statuses: IncidentStatus[] = [
  { id: 'investigating', label: '调查中', tone: 'warning' }, { id: 'watching', label: '观察中', tone: 'accent' }, { id: 'resolved', label: '已解决', tone: 'success' },
]
const issues: IncidentItem[] = [
  { id: 'gateway', title: '同步任务延迟升高', description: '归档服务积压了 18 个任务，团队正在分批恢复队列。', status: 'investigating', severity: '高', tone: 'danger', time: '2026-11-21T09:40:00+08:00',
    details: [{ id: 'service', label: '受影响服务', value: '资料同步' }, { id: 'owner', label: '负责人', value: '林舟' }] },
  { id: 'upload', title: '大文件上传偶发超时', description: '已增加并发配额，正在跟踪大于 50 MB 的文件。', status: 'watching', severity: '中', tone: 'warning', time: '2026-11-20T13:20:00+08:00',
    details: [{ id: 'service', label: '受影响服务', value: '上传' }, { id: 'owner', label: '负责人', value: '方宁' }] },
  { id: 'preview', title: '预览索引缺失', description: '索引重建完成，缺失资料已恢复可见。', status: 'resolved', severity: '低', tone: 'accent', time: '2026-11-19T11:15:00+08:00',
    details: [{ id: 'service', label: '受影响服务', value: '资料预览' }, { id: 'owner', label: '负责人', value: '周昱' }] },
]
const searchLabels = { add: '添加筛选', apply: '应用', cancel: '取消', clear: '清空筛选', remove: '移除', field: '字段', operator: '条件', value: '值' }
const operatorLabels = { is: '等于', 'is-not': '不等于', contains: '包含', 'starts-with': '开头为' }
const activityChart = computed(() => chart('资料活动趋势', sources.map(item => ({ key: item.id, label: item.label, mark: 'line' })), sources.map(item => item.data)))
const snapshots = computed<Record<string, DashboardSnapshot>>(() => {
  const metrics = sources.map(source => ({
    id: source.id, label: source.label + '资料', value: sum(source.data), history: source.data.slice(0, dayLabels.value.length).map(value),
    description: source.description, trend: { value: source.change, suffix: '%' },
  }))
  const rows = sources.map(item => ({ id: item.id, label: item.label, value: String(sum(item.data)), context: item.description }))
  const created = value(270)
  const resolved = value(187)
  const phases = [
    { id: 'requirements', label: '需求确认', start: '2026-11-05', end: '2026-11-12' },
    { id: 'build', label: '构建与集成', start: '2026-11-10', end: '2026-11-24' },
    { id: 'review', label: '验证与交付', start: '2026-11-19', end: '2026-11-28' },
  ]
  return {
    'dashboard-alert-rail': {
      metrics: metrics.map((metric, index) => ({ ...metric, tone: index ? 'success' : 'warning' })),
      charts: [activityChart.value],
      rows: issues.map(item => ({ id: item.id, label: item.details?.[0].value.toString() ?? item.title,
        value: statuses.find(status => status.id === item.status)?.label ?? item.status, context: item.title, tone: item.tone })),
      notes: issues.map(item => ({ id: item.id, title: item.title, body: item.description ?? '', tone: item.tone, time: item.time })),
    },
    'dashboard-cohort-funnel': {
      metrics, charts: [chart('成功交付趋势', [{ key: 'delivery', label: '完成', mark: 'line' }], [[2, 5, 6, 9, 8, 12, 14]])],
      funnel: [{ id: 'received', label: '接收申请', count: created }, { id: 'accepted', label: '进入评审', count: value(232) },
        { id: 'completed', label: '完成交付', count: resolved }, { id: 'archived', label: '完成归档', count: value(142) }],
      cohorts: { periods: ['第 1 周', '第 2 周', '第 3 周', '第 4 周'], rows: [
        { id: 'cohort-1', label: '第一批团队', rates: [1, .84, .71, .65] },
        { id: 'cohort-2', label: '第二批团队', rates: [1, .82, .76, null] },
        { id: 'cohort-3', label: '第三批团队', rates: [1, dimension.value === 'all' ? .88 : .91, null, null] },
      ] },
    },
    'dashboard-comparison': {
      metrics: metrics.map((metric, index) => ({
        ...metric, chartPlacement: 'inline',
        comparisons: [
          { id: 'previous', label: '前一周期', value: metric.trend.value, suffix: '%' },
          { id: 'goal', label: '本期目标', value: metric.value - value([100, 64, 130][index]), suffix: ' 项' },
        ],
      })), charts: [
        chart('本期与前期交付量', [{ key: 'current', label: '当前周期', mark: 'line' }, { key: 'prior', label: '前一周期', mark: 'line', dashed: true }],
          [[15, 12, 22, 19, 24, 32, 29], [11, 10, 18, 12, 22, 21, 16]]),
        breakdown.value === 'team'
          ? chart('团队贡献', [{ key: 'approved', label: '通过', mark: 'bar' }, { key: 'returned', label: '退回', mark: 'bar' }],
            [[10, 8, 16, 12, 21, 26, 28], [5, 4, 6, 7, 3, 6, 1]])
          : chart('服务贡献', sources.map(source => ({ key: source.id, label: source.label, mark: 'bar', stack: 'services' })),
            sources.map(source => source.data)),
      ], rows,
    },
    'dashboard-composition': {
      metrics,
      charts: [chart('来源构成趋势', sources.map(item => ({ key: item.id, label: item.label, stack: 'all', mark: 'area' })), sources.map(item => item.data))],
      rows: [...rows].sort((a, b) => Number(b.value) - Number(a.value)),
    },
    'dashboard-progress': {
      metrics: [{ id: 'progress', label: '已完成任务', value: resolved, tone: 'success' }, { id: 'open', label: '待完成任务', value: created - resolved },
        { id: 'risk', label: '有风险事项', value: value(12), tone: 'warning' }],
      completion: [{ id: 'done', label: '已完成', value: resolved }, { id: 'open', label: '待完成', value: created - resolved }],
      schedule: { items: phases, marker: '2026-11-22' },
      charts: [chart('版本燃尽趋势', [{ key: 'target', label: '计划剩余', mark: 'line', dashed: true },
        { key: 'open', label: '实际剩余', mark: 'line' }], [[90, 76, 64, 50, 38, 22, 8], [98, 86, 63, 57, 45, 24, 18]])],
      rows: phases.map((phase, index) => ({ id: phase.id, label: phase.label, value: ['完成', '进行中', '有风险'][index],
        progress: [100, 67, 25][index], context: ['林舟', '方宁', '周昱'][index], tone: index === 2 ? 'warning' : 'success' })),
      notes: [{ id: 'risk', title: '验证有风险', body: '移动端验收排期紧，优先走通交付主流程。', tone: 'warning' }],
    },
    'dashboard-scorecard': {
      metrics: metrics.map((metric, index) => ({ ...metric, tone: index === 1 ? 'warning' : 'success' })),
      charts: [activityChart.value, chart('准时交付趋势', [{ key: 'on-time', label: '按期交付', mark: 'line' }],
        [[8, 10, 16, 14, 19, 25, 28]])],
      rows: rows.map((row, index) => ({ ...row, progress: [92, 68, 86][index], context: '季度目标达成率', tone: index === 1 ? 'warning' : 'success' })),
      notes: [
        { id: 'progress', title: '按期交付', body: '本期优先交付资料迁移和项目检索。同步质量达到预定标准。', tone: 'success' },
        { id: 'watch', title: '待关注', body: '批量导入存在处理时间波动，建议下一周期检查大文件任务。', tone: 'warning' },
      ],
    },
  }
})
</script>

<template>
  <SIncidentConsole v-if="kind === 'incident-console'" v-model:selected="activeIncident" title="交付事件队列" :items="issues" :statuses="statuses"
    locale="zh-CN" :labels="{ search: '搜索事件', all: '全部事件', status: '事件状态', severity: '严重程度', queue: '事件队列',
      inspector: '事件详情', empty: '没有符合条件的事件。', unselected: '请选择一条事件。', close: '关闭' }"
    :labels-search="searchLabels" :operator-labels="operatorLabels" />
  <SDashboard v-else-if="snapshots[kind]" v-model:period="period" v-model:dimension="dimension" :title="titles[kind]"
    :snapshot="snapshots[kind]" :periods="periods" :dimensions="dimensions" locale="zh-CN" :labels="labels"
    :sticky-filters="kind === 'dashboard-comparison'" :notes-max-height="kind === 'dashboard-alert-rail' ? '12rem' : undefined"
    :chart-layout="kind === 'dashboard-scorecard' ? 'grid' : 'stack'">
    <template v-if="kind === 'dashboard-comparison'" #filters>
      <SSegment v-model="breakdown" :items="breakdowns" size="sm" label="贡献分组" />
    </template>
  </SDashboard>
</template>
