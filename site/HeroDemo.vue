<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import SBadge from '../src/components/SBadge.vue'
import SCheckbox from '../src/components/SCheckbox.vue'
import SLineChart from '../src/components/SLineChart.vue'
import SMotionText from '../src/components/SMotionText.vue'
import SProgressBar from '../src/components/SProgressBar.vue'
import SSegment from '../src/components/SSegment.vue'
import SSwitch from '../src/components/SSwitch.vue'
import type { ChartSeries } from '../src/charts/types'
import { siteText as t } from './locale'

const period = ref('week')
const periods = [{ value: 'week', label: t('本周', 'Week') }, { value: 'month', label: t('本月', 'Month') }]
const reminders = ref(true)
const completed = ref([true, false, false])
const tasks = [t('验收品牌规范', 'Review brand guidelines'), t('更新组件文档', 'Update component docs'), t('准备发布预览', 'Prepare the preview')]
const taskCount = computed(() => completed.value.filter(Boolean).length)
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => t('周' + '一二三四五六日'[index], day))
const monthly = [1, 5, 10, 15, 20, 25, 30].map(day => t(`${day} 日`, `Day ${day}`))
const rows = (amounts: number[], labels: string[]) => amounts.map((progress, index) => ({
  id: String(index), label: labels[index], values: { progress },
}))
const weekly = rows([24, 33, 30, 55, 51, 68, 76], weekdays)
const values = shallowRef(weekly)
const loading = ref(false)
const error = ref('')
const retryCount = ref(0)
let monthRows: typeof weekly | undefined

watch([period, retryCount], async ([range], _, cleanup) => {
  error.value = ''
  const cached = range === 'week' ? weekly : monthRows
  if (cached) {
    values.value = cached
    loading.value = false
    return
  }
  const request = new AbortController()
  cleanup(() => request.abort())
  loading.value = true
  try {
    const response = await fetch('/demo-data/monthly-delivery.json', { signal: request.signal })
    if (!response.ok) throw new Error('Delivery data is unavailable')
    const amounts: unknown = await response.json()
    if (!Array.isArray(amounts) || amounts.length !== monthly.length ||
      !amounts.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100)) {
      throw new Error('Invalid delivery data')
    }
    if (request.signal.aborted) return
    monthRows = rows(amounts, monthly)
    values.value = monthRows
  } catch {
    if (!request.signal.aborted) error.value = t('暂时无法更新进度。', 'Progress is unavailable.')
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
})
const percentage = computed(() => (values.value.at(-1)?.values.progress ?? 0) + '%')
const series: ChartSeries[] = [{ key: 'progress', label: t('项目进度', 'Project progress'), color: 'var(--sy-accent-text)', curve: 'smooth' }]
</script>

<template>
  <section class="demo-composition" :aria-label="t('交付工作台互动示例', 'Interactive delivery workspace')">
    <header class="dashboard-header">
      <strong>{{ t('交付工作台', 'Delivery workspace') }}</strong>
      <SBadge tone="success"><SMotionText :value="taskCount === tasks.length ? t('任务已完成', 'All tasks complete') : t('进行中', 'In progress')" announce /></SBadge>
    </header>
    <div class="dashboard-body">
      <div class="dashboard-card" role="group" :aria-label="t('项目进度', 'Project progress')">
        <div class="dashboard-top">
          <span class="dashboard-caption">{{ t('项目进度', 'Project progress') }}</span>
          <SSegment v-model="period" size="sm" :items="periods" :label="t('时间范围', 'Date range')" />
        </div>
        <div class="dashboard-pulse"><SMotionText :value="percentage" motion="roll" announce /></div>
        <SLineChart :label="t('项目进度趋势', 'Project progress trend')" :data="values" :series="series" :domain="[0, 100]"
          :height="100" :grid="false" :show-legend="false" :show-data="false" :axes="false"
          :loading="loading" :loading-text="t('正在更新进度', 'Updating progress')" :error="error" :retry="() => retryCount++" :retry-label="t('重试', 'Retry')" />
        <div class="dashboard-dates" aria-hidden="true">
          <SMotionText v-for="index in [0, 3, 6]" :key="index" :value="values[index].label" />
        </div>
      </div>
      <div class="task-card" role="group" :aria-label="t('本周任务', 'This week')">
        <div class="task-heading">
          <strong>{{ t('本周任务', 'This week') }}</strong>
          <span class="task-count"><SMotionText :value="`${taskCount}/${tasks.length}`" motion="roll" /></span>
        </div>
        <SProgressBar :aria-label="t('任务进度', 'Task progress')" :value="taskCount" :max="tasks.length" size="sm" :show-value="false" />
        <div class="task-items">
          <SCheckbox v-for="(task, index) in tasks" :key="task" v-model="completed[index]">{{ task }}</SCheckbox>
        </div>
        <div class="task-setting"><span>{{ t('进度提醒', 'Progress reminders') }}</span><SSwitch v-model="reminders" :aria-label="t('进度提醒', 'Progress reminders')" /></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.demo-composition {
  min-width: 0;
}
.dashboard-header, .dashboard-top, .dashboard-dates, .task-heading, .task-setting { display: flex; align-items: center; justify-content: space-between; gap: .45rem; }
.dashboard-header { justify-content: start; padding-block: .45rem; flex-wrap: wrap; }
.dashboard-header strong { margin-inline-end: auto; font-size: 1rem; }
.dashboard-caption, .task-count { font-size: .95rem; color: var(--muted); }
.dashboard-top { align-items: start; flex-wrap: wrap; }
.dashboard-pulse { margin-block: .1rem .2rem; font-size: clamp(2.5rem, 4.5vw, 3.65rem); font-weight: 750; letter-spacing: -.075em; line-height: 1.05; font-variant-numeric: tabular-nums; }
.dashboard-card :deep(.sy-chart__plot) { background: transparent; }
.dashboard-dates { margin-top: .2rem; font-size: .875rem; color: var(--muted); }
.task-card { border-radius: .85rem; background: var(--soft); display: grid; align-content: start; }
.task-heading { margin-bottom: .3rem; }
.task-heading strong { font-size: .92rem; }
.task-items { display: grid; gap: .2rem; margin-block: .45rem; }
.task-items :deep(.sy-choice__label), .task-setting { font-size: .95rem; }
.task-setting { margin-top: .15rem; }
@media (prefers-reduced-motion: no-preference) {
  .task-card { transition: background-color var(--site-enter) var(--site-ease); }
}
</style>
