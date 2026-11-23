<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { SActionBar, SButton, SInput, SKpi, SKpiGroup, SListView, SMotionText, STimeline, STimelineItem, SWidget,
  type TableKey, type TimelineStatus } from '../src'
import SemanticListScenariosReview from './SemanticListScenariosReview.vue'

defineProps<{ id: string }>()
const summary = ref('')
const query = ref('')
const selected = ref<readonly TableKey[]>([])
const files = [
  { id: 'colors', title: '品牌色板', detail: '11 月 20 日更新', group: '本次交付' },
  { id: 'spacing', title: '版式规范', detail: '11 月 18 日更新', group: '本次交付' },
  { id: 'draft', title: '待审草稿', detail: '提交审核后可选', group: '本次交付' },
  { id: 'export', title: '交付清单', detail: '包含资源索引', group: '本次交付' },
  ...Array.from({ length: 80 }, (_, index) => ({
    id: `file-${index + 1}`,
    title: `资源 ${String(index + 1).padStart(2, '0')}`,
    detail: index % 2 ? '文档快照' : '归档副本',
    group: '历史版本',
  })),
]
const visible = computed(() => {
  const term = query.value.trim()
  return files.filter(file => file.title.includes(term))
})
const events: { id: string; title: string; time: string; shown: string; description: string; status: TimelineStatus }[] = [
  { id: 'delivery', title: '发布交付包', time: '2026-11-20T16:30:00+08:00', shown: '16:30', description: '已整理色板、组件说明和源文件。', status: 'current' },
  { id: 'review', title: '完成设计复核', time: '2026-11-20T14:20:00+08:00', shown: '14:20', description: '确认浅色与深色对比度。', status: 'success' },
  { id: 'follow', title: '补记键盘交互', time: '2026-11-20T11:20:00+08:00', shown: '11:20', description: '等待补齐两个示例的快捷键。', status: 'warning' },
]
const milestones = [
  { id: 'launch', title: '整理资源', date: '2026-11-14', display: '11 月 14 日' },
  { id: 'mid', title: '走查细节', date: '2026-11-17', display: '11 月 17 日' },
  { id: 'end', title: '归档发布', date: '2026-11-20', display: '11 月 20 日' },
]
const widgetState = ref<'ready' | 'loading'>('ready')
const retryState = ref<'error' | 'loading' | 'empty'>('error')
const downloaded = ref(1428)
let refreshTimer: ReturnType<typeof setTimeout> | undefined
let retryTimer: ReturnType<typeof setTimeout> | undefined

function refresh() {
  if (widgetState.value === 'loading') return
  widgetState.value = 'loading'
  refreshTimer = setTimeout(() => {
    downloaded.value += 4
    widgetState.value = 'ready'
  }, 850)
}
function retry() {
  retryState.value = 'loading'
  retryTimer = setTimeout(() => { retryState.value = 'empty' }, 750)
}
onBeforeUnmount(() => {
  clearTimeout(refreshTimer)
  clearTimeout(retryTimer)
})
</script>

<template>
  <section v-if="id === 'WP.list-view'" class="review-list-view">
    <SInput v-model="query" label="筛选资源" placeholder="输入资源名称" />
    <SListView v-model:selected="selected" :items="visible" :get-key="file => file.id" :get-text="file => file.title"
      :get-description="file => file.detail" :get-group="file => file.group" :disabled-keys="['draft']"
      label="交付资源" selection-mode="multiple" variant="secondary" virtualized :height="255" pressable
      empty-text="没有匹配的资源" @action="file => summary = `正在查看${file.title}`">
      <template #action="{ item, disabled }">
        <SButton size="sm" variant="ghost" :disabled="disabled" :aria-label="`详情 ${item.title}`" @click="summary = `正在查看${item.title}`">详情</SButton>
      </template>
      <template #footer="{ selected: chosen, clear }">
        <div class="review-list-view__actions">
          <SActionBar :count="chosen.length" label="资源操作" selected-label="已选" unit-label="项" clear-label="清除"
            position="inline" :actions="[{ id: 'prepare', label: '准备导出' }]" @clear="clear" @action="summary = `已整理 ${chosen.length} 项`" />
        </div>
      </template>
    </SListView>
    <output class="review-list-view__result"><SMotionText :value="summary" /></output>
    <SemanticListScenariosReview />
  </section>

  <section v-else-if="id === 'WP.timeline'" class="review-timelines">
    <STimeline aria-label="交付经过" axis="center" placement="alternate" density="compact" class="review-timeline__history">
      <STimelineItem v-for="event in events" :key="event.id" :title="event.title" :datetime="event.time" :time-label="event.shown"
        :description="event.description" :status="event.status" :status-label="event.status === 'warning' ? '待补充' : undefined"
        :connector="event.status === 'warning' ? 'dashed' : 'solid'" />
    </STimeline>
    <STimeline aria-label="交付里程碑" orientation="horizontal" size="sm" class="review-timeline__milestones">
      <STimelineItem v-for="(event, index) in milestones" :key="event.id" :title="event.title" :datetime="event.date" :time-label="event.display"
        :status="index === 2 ? 'current' : 'success'" />
    </STimeline>
  </section>

  <section v-else class="review-widgets">
    <SWidget title="资源交付" description="近七日统计" tone="sage" :state="widgetState" status-label="正在刷新"
      class="review-widget__deliveries" min-content-height="6.25rem">
      <template #actions><SButton size="sm" variant="secondary" :loading="widgetState === 'loading'" @click="refresh">刷新</SButton></template>
      <SKpiGroup label="交付指标" :responsive="false" dividers>
        <SKpi title="下载量" :value="downloaded" :reserve="5" suffix="次" locale="zh-CN" tone="sage" />
        <SKpi title="校验完成" :value="72" :reserve="2" suffix="%" locale="zh-CN" tone="blue" />
      </SKpiGroup>
      <template #loading="{ label }"><span>{{ label }}</span></template>
      <template #footer><SMotionText :value="downloaded === 1428 ? '最后同步 16:30' : '最后同步 16:31'" /></template>
    </SWidget>
    <SWidget title="交付记录" tone="blue" :state="retryState"
      :status-label="retryState === 'error' ? '交付记录暂不可用' : retryState === 'loading' ? '正在读取' : '暂无交付记录'"
      :legend="[{ id: 'done', label: '已提交', color: 'var(--sy-accent)' }, { id: 'waiting', label: '待校验', color: 'var(--sy-danger)' }]"
      legend-label="记录状态" min-content-height="5.1rem" class="review-widget__records">
      <template #error="{ label }">
        <span>{{ label }}</span><SButton size="sm" variant="secondary" @click="retry">重试</SButton>
      </template>
    </SWidget>
  </section>
</template>
