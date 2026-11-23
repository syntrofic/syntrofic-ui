<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SContextMenu, SMotionText, SSegment, SStepper, type MenuEntry, type StepperItem } from '../src'
import MenuPresentationReview from './MenuPresentationReview.vue'
import SegmentScenariosReview from './SegmentScenariosReview.vue'
import CompoundMenuScenariosReview from './CompoundMenuScenariosReview.vue'
import StepperScenariosReview from './StepperScenariosReview.vue'

defineProps<{ id: string }>()

const ranges = [
  { value: 'today', label: '今天' }, { value: 'week', label: '最近一周' },
  { value: 'month', label: '本月' }, { value: 'year', label: '本年度', disabled: true },
]
const filters = [
  { value: 'draft', label: '草稿' }, { value: 'active', label: '进行中' }, { value: 'archived', label: '归档' },
]
const layouts = [{ value: 'list', label: '列表' }, { value: 'board', label: '看板' }]
const period = ref<string | null>('week')
const filter = ref<string | null>(null)

const publishing: StepperItem[] = [
  { value: 'details', label: '资料', description: '交付内容' }, { value: 'access', label: '权限', description: '可见范围' },
  { value: 'review', label: '确认', description: '检查预览' }, { value: 'release', label: '发布', description: '对外可见' },
]
const tracking: StepperItem[] = [
  { value: 'placed', label: '已接收任务', description: '设计组已确认交付要求' },
  { value: 'editing', label: '正在整理', description: '补齐目录和引用说明', progress: .42 },
  { value: 'sent', label: '交付完成', description: '待项目负责人签收' },
]
const status = { current: '当前步骤', complete: '已完成', pending: '待处理', unreachable: '暂不可达' }
const step = ref('access')
const current = computed(() => publishing.findIndex(item => item.value === step.value))
const maxReachable = ref(1)
function advance(direction: number) {
  const destination = publishing[current.value + direction]
  if (!destination) return
  maxReachable.value = Math.max(maxReachable.value, current.value + direction)
  step.value = destination.value
}

const menuOpen = ref(false)
const preferences = ref<readonly string[]>(['pin', 'summary'])
const commands: MenuEntry[] = [
  { id: 'details', label: '打开详情' },
  { id: 'pin', kind: 'checkbox', label: '固定到顶部' },
  { id: 'move', kind: 'submenu', label: '移动到', items: [
    { id: 'team', label: '团队目录' }, { id: 'archive', label: '归档区' }, { id: 'restricted', label: '受限目录', disabled: true },
  ] },
  { id: 'divider', kind: 'separator' },
  { id: 'preview', kind: 'radio-group', label: '预览方式', items: [
    { id: 'summary', label: '摘要' }, { id: 'complete', label: '完整内容' },
  ] },
  { id: 'delete', label: '移入回收站', tone: 'danger' },
]
const actionLabels: Record<string, string> = {
  details: '已打开详情', team: '已移动到团队目录', archive: '已移入归档区', delete: '已移入回收站',
}
const result = ref('')
function save(event: SubmitEvent) {
  const value = new FormData(event.currentTarget as HTMLFormElement).get('period')
  result.value = '已保存范围 · ' + (ranges.find(item => item.value === value)?.label ?? '')
}
</script>

<template>
  <form v-if="id === 'WP.segment'" class="navigation-review" @submit.prevent="save" @reset="result = ''">
    <div class="navigation-review__block">
      <p>统计范围</p>
      <SSegment v-model="period" label="统计范围" name="period" :items="ranges" full-width show-separators />
    </div>
    <div class="navigation-review__segment-options">
      <div class="navigation-review__block">
        <p>状态筛选</p>
        <SSegment v-model="filter" label="状态筛选" :items="filters" variant="ghost" size="sm" allow-empty />
      </div>
      <div class="navigation-review__block">
        <p>默认视图</p>
        <SSegment label="默认视图" default-value="list" :items="layouts" size="sm" orientation="vertical" disabled />
      </div>
    </div>
    <div class="review__row">
      <SButton type="submit" size="sm">保存统计范围</SButton>
      <SButton type="reset" size="sm" variant="secondary">恢复默认</SButton>
    </div>
    <p class="review__result"><SMotionText :value="result" announce /></p>
    <SegmentScenariosReview />
  </form>
  <div v-else-if="id === 'WP.stepper'" class="navigation-review">
    <div class="navigation-review__block">
      <p>发布流程</p>
      <SStepper v-model="step" label="发布流程" :steps="publishing" :max-reachable="publishing[maxReachable].value"
        :status-labels="status" interactive />
    </div>
    <div class="review__row">
      <SButton size="sm" variant="secondary" :disabled="current === 0" @click="advance(-1)">上一步</SButton>
      <SButton size="sm" :disabled="current === publishing.length - 1" @click="advance(1)">下一步</SButton>
    </div>
    <div class="navigation-review__block navigation-review__tracking">
      <p>交付记录</p>
      <SStepper label="交付记录" :steps="tracking" default-value="editing" marker="bullet" size="sm" orientation="vertical"
        :status-labels="status" style="--sy-step-active: var(--sy-warning); --sy-step-finished: var(--sy-warning); --sy-step-finished-surface: var(--sy-warning-soft)" />
    </div>
    <StepperScenariosReview />
  </div>
  <div v-else class="navigation-review">
    <SContextMenu v-model:open="menuOpen" v-model:selected="preferences" label="文件操作" trigger-label="品牌资源库"
      :items="commands" @action="result = actionLabels[$event] ?? ''">
      <template #trigger>
        <div class="navigation-review__resource">
          <strong>品牌资源库</strong>
          <span>右键、长按或按 Shift + F10 打开操作。</span>
        </div>
      </template>
    </SContextMenu>
    <SContextMenu label="归档记录操作" trigger-label="交付历史" :items="commands" disabled>
      <template #trigger>
        <div class="navigation-review__resource">
          <strong>交付历史</strong>
          <span>已锁定的归档记录</span>
        </div>
      </template>
    </SContextMenu>
    <div class="review__row"><SButton size="sm" variant="secondary" @click="menuOpen = true">打开文件操作</SButton></div>
    <p class="review__result"><SMotionText :value="result" announce /></p>
    <MenuPresentationReview kind="context" />
    <CompoundMenuScenariosReview kind="context" />
  </div>
</template>
