<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { SAvatar, SBadge, SButton, SIcon, SList, SListItem, SMotionText, type ReorderMove } from '../src'

const selected = ref('inbox')
const note = ref('')
const rows = ref([
  { id: 'inbox', title: '发布通知', detail: '今天有 3 条未读提醒', count: 3, name: '林舟' },
  { id: 'team', title: '团队消息', detail: '陈禾补充了交付记录', count: 1, name: '陈禾' },
  { id: 'archive', title: '已归档邮件', detail: '历史对话存放在归档区', count: 0, name: '方以' },
])
const preparation = ['确认发布记录', '整理预览', '发送复核通知']
function move({ key, target, placement }: ReorderMove) {
  const from = rows.value.findIndex(row => row.id === key)
  if (from < 0 || !rows.value.some(row => row.id === target)) return
  const [row] = rows.value.splice(from, 1)
  const index = rows.value.findIndex(entry => entry.id === target) + Number(placement === 'after')
  rows.value.splice(index, 0, row)
  note.value = row.title + '已移到第 ' + (index + 1) + ' 位'
}
function canMove({ target }: ReorderMove) { return target !== 'archive' }

async function read(row: typeof rows.value[number], event: MouseEvent) {
  const item = (event.currentTarget as HTMLElement).closest('li')
  row.count = 0
  row.detail = '已读'
  note.value = '已标记' + row.title
  await nextTick()
  item?.querySelector<HTMLElement>('.sy-list-item__control')?.focus({ preventScroll: true })
}
</script>

<template>
  <section class="semantic-list-scenarios" aria-label="基础列表与编号">
    <SList header="通知偏好" dividers>
      <SListItem label="接收通知" description="设置发布与复核提醒" />
      <SListItem label="隐私选项" description="控制资料的可见范围" />
      <SListItem label="账号安全" description="管理登录确认和设备" />
    </SList>
    <SList header="交付前检查" list-style="disc" density="compact">
      <SListItem v-for="item in preparation" :key="item" :label="item" />
    </SList>
    <SList header="接续发布步骤" list-style="decimal" :start="4">
      <SListItem label="确认资源" description="核对本次发布包" />
      <SListItem label="确认权限" description="为复核成员授权" />
      <SListItem label="通知验收" description="发送带链接的交付摘要" />
    </SList>
  </section>
  <section class="semantic-list-scenarios" aria-label="消息列表与条目操作">
    <SList header="交付消息分组" density="compact" dividers reorderable :can-move="canMove" @reorder="move">
      <SListItem v-for="row in rows" :key="row.id" :item-key="row.id" :label="row.title" :description="row.detail" interactive
        :selected="selected === row.id" :disabled="row.id === 'archive'"
        @activate="selected = row.id; note = '已选中' + row.title">
        <template #start><SAvatar :name="row.name" size="sm" :tooltip="false" /></template>
        <template #end>
          <SBadge v-if="row.count" tone="blue"><SMotionText :value="String(row.count)" motion="roll" /></SBadge>
          <SButton v-if="row.id !== 'archive'" data-reorder-handle icon-only variant="ghost" size="sm" :aria-label="'排序 ' + row.title"
            aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"><template #start><SIcon name="arrowsUpDown" size="sm" /></template></SButton>
          <SButton v-if="row.count" icon-only variant="ghost" size="sm" :aria-label="'标记已读 ' + row.title" @click="read(row, $event)">
            <template #start><SIcon name="check" size="sm" /></template>
          </SButton>
        </template>
      </SListItem>
    </SList>
    <output aria-label="列表操作结果"><SMotionText :value="note" wrap /></output>
  </section>
</template>

<style scoped>
.semantic-list-scenarios { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-3); min-inline-size: 0; }
.semantic-list-scenarios :deep(.sy-list-item[data-sy-reordering]) { z-index: 2; background: var(--sy-canvas); box-shadow: var(--sy-shadow-md); }
.semantic-list-scenarios :deep([data-reorder-handle]) { cursor: grab; touch-action: none; }
</style>
