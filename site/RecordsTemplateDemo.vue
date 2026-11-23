<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBadge, SButton, SCanvasEditor, SDialog, SInput, SKanban, SMetadataList, SSelect, STimeline, STimelineItem,
  type CanvasDocument } from '../src'
import deliveryArea from '../preview/assets/delivery-area.png'

defineProps<{ kind: string }>()
const designs = ref<readonly CanvasDocument[]>([
  { id: 'cover', label: '交付封面', width: 360, height: 220, layers: [
    { id: 'panel', label: '底色卡片', kind: 'shape', x: 24, y: 26, width: 310, height: 164, fill: '#e9eee8' },
    { id: 'title', label: '封面标题', kind: 'text', x: 48, y: 65, width: 220, height: 40, text: '交付指南', fill: '#263a2c', fontSize: 27 },
    { id: 'caption', label: '封面说明', kind: 'text', x: 48, y: 114, width: 228, height: 26, text: '产品和工程团队 · 11 月', fill: '#565b52', fontSize: 14 },
    { id: 'preview-image', label: '园区缩略图', kind: 'image', x: 242, y: 134, width: 72, height: 48, src: deliveryArea, fill: '#d4dfd2' },
  ] },
  { id: 'receipt', label: '物流回执', width: 340, height: 210, layers: [
    { id: 'panel', label: '浅蓝底卡', kind: 'shape', x: 28, y: 30, width: 284, height: 146, fill: '#e9edf4' },
    { id: 'title', label: '回执标题', kind: 'text', x: 48, y: 62, width: 190, height: 42, text: '物流回执', fill: '#384b58', fontSize: 24 },
  ] },
])
const lanes = [{ id: 'queue', title: '待处理' }, { id: 'doing', title: '进行中' }, { id: 'review', title: '评审中' }, { id: 'done', title: '已完成' }]
interface Task { id: string; title: string; lane: string; owner: string; detail: string }
const tasks = ref<readonly Task[]>([
  { id: 'notes', title: '整理主题交付记录', lane: 'queue', owner: '林舟', detail: '补充颜色变量和接入路径。' },
  { id: 'tests', title: '核对移动端验收', lane: 'doing', owner: '周昱', detail: '验证总体布局、浮层和独立滚动范围。' },
  { id: 'forms', title: '评审需求表单', lane: 'review', owner: '方宁', detail: '核对现场使用场景和字段校验。' },
  { id: 'outlines', title: '更新文档导航', lane: 'done', owner: '林舟', detail: '对应到组件库与模板目录。' },
])
let sequence = 0
const taskTitle = ref('')
const activeTask = ref<string>()
const task = computed(() => tasks.value.find(item => item.id === activeTask.value))
const dialog = ref(false)
function addTask() {
  const title = taskTitle.value.trim()
  if (!title) return
  tasks.value = [...tasks.value, { id: 'new-' + ++sequence, title, lane: 'queue', owner: '我', detail: '新建事项' }]
  taskTitle.value = ''
}
function selectTask(item: Task) { activeTask.value = item.id; dialog.value = true }
function moveLane(lane?: string) {
  if (lane && task.value) tasks.value = tasks.value.map(item => item.id === task.value?.id ? { ...item, lane } : item)
}

const orderLines = [{ id: 'map', label: '桌面园区地图', price: 68, quantity: 2 }, { id: 'leaflet', label: '访客折页', price: 12, quantity: 4 }]
const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })
const subtotal = orderLines.reduce((total, item) => total + item.price * item.quantity, 0)
const delivered = ref(false)
</script>

<template>
  <SCanvasEditor v-if="kind === 'canvas-editor'" v-model="designs" label="交付画板编辑器"
    :labels="{ documents: '画板', layers: '图层', properties: '图层属性', zoom: '缩放', x: '横向位置', y: '纵向位置', rotation: '旋转角度',
      size: '字号', text: '文字', opacity: '不透明度', blur: '模糊', contrast: '对比度', empty: '暂无画板' }" />

  <section v-else-if="kind === 'kanban-board'" class="records-template" aria-label="交付看板">
    <form class="records-template__toolbar" @submit.prevent="addTask">
      <SInput v-model="taskTitle" label="事项名称" required /><SButton type="submit">添加事项</SButton>
    </form>
    <SKanban v-model:items="tasks" label="交付事项" :columns="lanes" :get-key="item => item.id" :get-column="item => item.lane"
      :set-column="(item, lane) => ({ ...item, lane })" :get-title="item => item.title" column-width="12.5rem" column-height="13rem"
      empty-text="当前列暂无事项" move-label="移动事项" drop-text="拖动到这里" @activate="selectTask">
      <template #card="{ item }"><strong>{{ item.title }}</strong><p>{{ item.owner }}</p><span>{{ item.detail }}</span></template>
    </SKanban>
    <SDialog v-model:open="dialog" :title="task?.title ?? '事项详情'" dismiss-label="关闭" show-close-button>
      <div v-if="task" class="records-template"><p>{{ task.detail }}</p>
        <SSelect :model-value="task.lane" :options="lanes.map(lane => ({ value: lane.id, label: lane.title }))" label="处理状态" @update:model-value="moveLane" />
      </div>
    </SDialog>
  </section>

  <section v-else class="records-template" aria-label="交付订单详情">
    <header class="records-template__toolbar"><h2>交付订单 · 1068</h2><SBadge :tone="delivered ? 'success' : 'accent'">{{ delivered ? '已交付' : '配送中' }}</SBadge>
      <SButton variant="secondary" :disabled="delivered" @click="delivered = true">标记为已交付</SButton>
    </header>
    <div class="records-template__columns">
      <div class="records-template">
        <section class="records-template__panel"><h3>订单商品</h3>
          <ul><li v-for="line in orderLines" :key="line.id"><strong>{{ line.label }}</strong><span>× {{ line.quantity }}</span><span>{{ money.format(line.price * line.quantity) }}</span></li></ul>
        </section>
        <section class="records-template__panel"><h3>费用明细</h3>
          <SMetadataList :items="[{ id: 'subtotal', label: '商品小计', value: money.format(subtotal) }, { id: 'delivery', label: '配送', value: money.format(6) },
            { id: 'total', label: '订单合计', value: money.format(subtotal + 6) }]" />
        </section>
      </div>
      <aside class="records-template__panel" aria-label="订单活动"><h3>订单活动</h3>
        <STimeline>
          <STimelineItem title="订单已确认" datetime="2026-11-19" status="success" />
          <STimelineItem title="已交给配送" datetime="2026-11-20" :status="delivered ? 'success' : 'current'" />
          <STimelineItem v-if="delivered" title="交付已签收" datetime="2026-11-21" status="current" />
        </STimeline>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.records-template, .records-template__panel { display: grid; align-content: start; min-width: 0; gap: var(--sy-space-3); }
.records-template :is(h2, h3, p, ul) { margin: 0; }
.records-template__toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: var(--sy-space-3); }
.records-template__columns { display: grid; grid-template-columns: minmax(0, 3fr) minmax(12rem, 2fr); gap: var(--sy-space-3); align-items: start; }
.records-template__panel { border: 1px solid var(--sy-border); border-radius: var(--sy-radius-md); padding: var(--sy-space-4); }
.records-template__panel ul { padding: 0; list-style: none; }
.records-template__panel li { padding-block: var(--sy-space-2); display: grid; grid-template-columns: 1fr auto auto; gap: var(--sy-space-2); }
@media (max-width: 650px) { .records-template__columns { grid-template-columns: minmax(0, 1fr); } }
</style>
