<script setup lang="ts">
import { ref } from 'vue'
import { SAvatar, SButton, SHoloCard, SHoverCard, SKanban, SMotionText, SSwitch, useKanban,
  type KanbanColumn, type KanbanMove, type TableKey } from '../src'
import HoverToolsReview from './HoverToolsReview.vue'
import ReferenceScenariosReview from './ReferenceScenariosReview.vue'

defineProps<{ id: string }>()
const motion = ref(true)
const alternate = ref(false)
const previewResult = ref('')
const profiles = [
  { id: 'lin', name: '林芷', initials: '林', role: '品牌设计', project: '品牌资源库', detail: '维护配色和交付规范。' },
  { id: 'chen', name: '陈明', initials: '陈', role: '产品设计', project: '网站改版', detail: '负责页面布局和交互。' },
]
const forced = ref(false)

interface Task {
  id: string
  title: string
  detail: string
  state: string
  owner: string
  locked?: boolean
}
const columns: KanbanColumn[] = [
  { id: 'queue', title: '待处理', tone: 'neutral' },
  { id: 'doing', title: '进行中', tone: 'blue' },
  { id: 'done', title: '已完成', tone: 'sage' },
]
const getKey = (item: Task) => item.id
const getColumn = (item: Task) => item.state
const getTitle = (item: Task) => item.title
const setColumn = (item: Task, state: string) => ({ ...item, state })
const { items, addItem } = useKanban<Task>({
  getKey, getColumn, setColumn,
  initialItems: [
    { id: 'labels', title: '修订状态文案', detail: '整理加载和空状态', state: 'queue', owner: '陈明' },
    { id: 'intro', title: '补齐项目说明', detail: '补上发布入口', state: 'queue', owner: '周渝' },
    { id: 'colors', title: '复核品牌色', detail: '检查浅色与深色对比度', state: 'doing', owner: '林芷' },
    { id: 'notes', title: '更新交付记录', detail: '已纳入十一月版本', state: 'done', owner: '陈明', locked: true },
  ],
})
const selected = ref<readonly TableKey[]>([])
const stack = ref(false)
const boardResult = ref('')
let number = 0

function add(column: KanbanColumn) {
  const id = `task-${++number}`
  addItem({ id, title: `新任务 ${number}`, detail: '待补充说明', state: column.id, owner: '待分配' })
  boardResult.value = `已添加到${column.title}`
}

function report(move: KanbanMove<Task>) {
  const column = columns.find(item => item.id === move.to.column)
  boardResult.value = `已将 ${move.keys.length} 项移至${column?.title ?? move.to.column}`
}

function announce(tasks: readonly Task[], column: KanbanColumn, phase: 'grab' | 'target' | 'drop' | 'cancel') {
  if (phase === 'grab') return `已拾起 ${tasks.length} 项`
  if (phase === 'target') return `目标 ${column.title}`
  if (phase === 'drop') return `已移动到${column.title}`
  return '已取消移动'
}
</script>

<template>
  <section v-if="id === 'WP.holo-card'" class="review-holo">
    <div class="review-holo__controls">
      <SSwitch v-model="motion">互动</SSwitch>
      <SSwitch v-model="alternate">换配色</SSwitch>
    </div>
    <div class="review-holo__cards">
      <SHoloCard
        aria-label="品牌工作室成员证" class="review-holo__main" width="22rem" aspect="17 / 10" :interactive="motion"
        :background="alternate ? 'var(--sy-surface-blue)' : 'var(--sy-surface-sage)'" :max-tilt="10" :shine-opacity=".6"
      >
        <template #art><div class="review-holo__blocks" :data-blue="alternate || undefined" aria-hidden="true"><span /><span /></div></template>
        <template #texture><div class="review-holo__texture" /></template>
        <div class="review-holo__copy">
          <div><span>品牌工作室</span><strong>成员证</strong></div>
          <div><span>林芷</span><small>2026 / 11</small></div>
        </div>
      </SHoloCard>
      <SHoloCard aria-label="工作室访客证" class="review-holo__alternate" width="8.5rem" aspect="4 / 5"
        :activate-on-hover="true" :interactive="false" background="var(--sy-warning-soft)">
        <div class="review-holo__copy"><div><span>工作室</span><strong>访客证</strong></div></div>
      </SHoloCard>
    </div>
  </section>

  <section v-else-if="id === 'WP.hover-card'" class="review-hover">
    <div class="review-hover__row" aria-label="项目负责人">
      <SHoverCard
        v-for="(person, index) in profiles" :key="person.id"
        :label="`${person.name}预览`" :open-delay="220" :close-delay="180" :touch-delay="420"
        :arrow="index === 0" :side="index === 0 ? 'bottom' : 'right'"
      >
        <template #trigger="{ triggerProps }">
          <SButton v-bind="triggerProps" size="sm" variant="secondary">{{ person.name }}</SButton>
        </template>
        <template #default="{ close }">
          <div class="review-hover__preview">
            <div class="review-hover__profile"><SAvatar :name="person.name" :initials="person.initials" :tooltip="false" /><div><strong>{{ person.name }}</strong><small>{{ person.role }}</small></div></div>
            <div class="review-hover__description"><strong>{{ person.project }}</strong><span>{{ person.detail }}</span></div>
            <SButton size="sm" variant="secondary" @click="previewResult = `已打开${person.project}`; close()">查看项目</SButton>
          </div>
        </template>
      </SHoverCard>
      <SHoverCard v-model:open="forced" label="说明预览" trigger-label="制作说明"
        :interactive="false" :open-on-focus="false" :shared-warmup="false">
        <p class="review-hover__plain">维护信息随发布记录更新。</p>
      </SHoverCard>
    </div>
    <output class="review-hover__result"><SMotionText :value="previewResult" /></output>
    <HoverToolsReview />
    <ReferenceScenariosReview kind="hover" />
  </section>

  <section v-else class="review-kanban">
    <SSwitch v-model="stack">排列为单列</SSwitch>
    <SKanban
      v-model:items="items" v-model:selected="selected" :columns="columns" :get-key="getKey" :get-title="getTitle"
      :get-column="getColumn" :set-column="setColumn" :is-disabled="task => Boolean(task.locked)"
      :layout="stack ? 'stack' : 'scroll'" :announcement="announce" label="品牌项目看板"
      selection-mode="multiple" size="sm" move-label="移动" drop-text="移到这里" empty-text="暂无任务"
      @move="report" @activate="task => { boardResult = `已打开${task.title}` }"
    >
      <template #card="{ item }">
        <strong class="review-kanban__title">{{ item.title }}</strong>
        <span class="review-kanban__detail">{{ item.detail }}</span>
        <span class="review-kanban__owner">{{ item.owner }}</span>
      </template>
      <template #column-footer="{ column }">
        <SButton size="sm" variant="ghost" @click="add(column)">添加任务</SButton>
      </template>
    </SKanban>
    <output class="review-kanban__result"><SMotionText :value="boardResult" /></output>
  </section>
</template>
