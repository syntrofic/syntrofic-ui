<script setup lang="ts">
import { onBeforeUnmount, ref } from 'nativescript-vue'
import {
  SNativeButton, SNativeMotionText, SNativeNumberValue, SNativeProgressBar, SNativeSwipeableRow, SNativeTable,
  SNativeText, SNativeTimeline, SNativeWidget, type NativeCollectionKey, type NativeSwipeSide,
  type NativeTableColumn, type NativeTableRow, type NativeTimelineItem,
} from '@syntrofic/ui-native'
defineProps<{ id: string }>()
const side = ref<NativeSwipeSide | null>('end')
const action = ref('')
const columns: NativeTableColumn[] = [
  { key: 'name', label: '文件', sortable: true, minWidth: 93 },
  { key: 'version', label: '版本', sortable: true, width: 82, align: 'end' },
  { key: 'status', label: '状态', minWidth: 92 },
]
const rows: NativeTableRow[] = [
  { id: 'brand', label: '品牌规范', cells: { name: '品牌规范', version: 3, status: '已复核' } },
  { id: 'proof', label: '版式样张', cells: { name: '版式样张', version: 2, status: '待复核' } },
  { id: 'license', label: '授权说明', cells: { name: '授权说明', version: 1, status: '已归档' } },
]
const selected = ref<NativeCollectionKey[]>([])
const events: NativeTimelineItem[] = [
  { id: 1, time: '09:10', label: '接收文件', description: '资产清单与初稿', tone: 'success' },
  { id: 2, time: '10:35', label: '开始复核', description: '确认版式和字体', tone: 'accent' },
  { id: 3, time: '14:00', label: '等待归档', status: '待确认', tone: 'warning' },
]
const horizontal = ref(false)
const state = ref<'ready' | 'loading' | 'empty' | 'error'>('ready')
let timer: ReturnType<typeof setTimeout> | undefined
function set(next: typeof state.value) {
  clearTimeout(timer)
  state.value = next
  if (next === 'loading') timer = setTimeout(() => { state.value = 'ready' }, 900)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <StackLayout v-if="id === 'NP.swipeable-row'">
    <SNativeSwipeableRow v-model="side" label="品牌资源库" menuLabel="更多"
      :start="[{ id: 'pin', label: '置顶' }]" :end="[{ id: 'archive', label: '归档' }]"
      @action="action = $event.label" />
    <SNativeMotionText v-if="action" :value="'已' + action" announce marginTop="6" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.table'">
    <SNativeTable :columns="columns" :rows="rows" v-model:selected="selected" selectionMode="multiple"
      label="交付文件" selectionLabel="选择" ascendingLabel="升序" descendingLabel="降序" :bodyHeight="138" localSort striped />
    <SNativeMotionText :value="`已选 ${selected.length} 项`" marginTop="8" announce />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.timeline'">
    <SNativeTimeline :items="events" label="归档进度" :orientation="horizontal ? 'horizontal' : 'vertical'" compact />
    <SNativeButton label="切换方向" size="sm" variant="ghost" :pressed="horizontal" @tap="horizontal = !horizontal" />
  </StackLayout>

  <StackLayout v-else-if="id === 'NP.widget'">
    <SNativeWidget title="复核进度" description="本周材料" :state="state" :minimumHeight="132"
      emptyLabel="本周暂无材料" errorLabel="读取数据失败" retryLabel="重试" @retry="set('loading')">
      <template #tools><SNativeButton label="刷新" size="sm" variant="ghost" @tap="set('loading')" /></template>
      <SNativeNumberValue :value="36" suffix=" 份" label="已复核" :size="22" />
      <SNativeProgressBar :value="72" label="复核比例" marginTop="5" />
      <template #footer><SNativeText text="最近更新 10:35" size="caption" tone="muted" /></template>
    </SNativeWidget>
    <GridLayout columns="*,*" marginTop="6">
      <SNativeButton label="空状态" size="sm" variant="secondary" marginRight="3" @tap="set('empty')" />
      <SNativeButton col="1" label="错误状态" size="sm" variant="secondary" marginLeft="3" @tap="set('error')" />
    </GridLayout>
  </StackLayout>
</template>
