<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import { SButton, SCheckbox, SEmptyState, SSegment, SSelect, STable, useTableColumnResize, useTableColumnSettings, useTableColumnSettingsState, useTableColumnsVirtualization, useTableInfiniteScroll, useTableRowsVirtualization, useTableStickyColumns,
  type DataGridWidths, type TableColumn, type TableTextOverflow } from '../src'

const source = Array.from({ length: 16 }, (_, index) => ({ id: index + 1, title: `发布日志 ${index + 1}`, revision: `r${index + 101}` }))
const columns: TableColumn<(typeof source)[number]>[] = [
  { key: 'title', label: '名称', rowHeader: true, value: row => row.title },
  { key: 'revision', label: '版本', value: row => row.revision },
]
const handoffRows = ref<typeof source>([])
const handoffLoading = ref(false)
let handoffTimer: ReturnType<typeof setTimeout>
function emptyHandoff() {
  clearTimeout(handoffTimer)
  handoffRows.value = []
  handoffLoading.value = false
}
function loadHandoff() {
  clearTimeout(handoffTimer)
  handoffLoading.value = true
  handoffTimer = setTimeout(() => {
    handoffRows.value = source.slice(0, 4)
    handoffLoading.value = false
  }, 360)
}
onScopeDispose(() => clearTimeout(handoffTimer))
const outcomes = [{ value: 'rows', label: '正常' }, { value: 'error', label: '失败' }, { value: 'empty', label: '空批次' }]
const loaded = ref(8)
const rows = computed(() => source.slice(0, loaded.value))
const outcome = ref('rows')
const requests = ref(0)
const loading = ref(false)
const failed = ref(false)
const bounded = ref(true)
const fixedRows = Array.from({ length: 1000 }, (_, index) => ({ id: index + 1, title: `资料记录 ${index + 1}`, revision: `r${index + 101}` }))
const timelineRows = fixedRows.slice(0, 100)
const fixedGeometry = useTableRowsVirtualization({ rowHeight: 40, initialViewportHeight: 200, overscan: 2 })
const rtl = ref(false)
const widths = ref<DataGridWidths>({})
const commits = ref(0)
const resizeColumns: TableColumn<(typeof source)[number]>[] = [
  { ...columns[0], width: '140px', minWidth: 100 }, { ...columns[1], width: '1fr', minWidth: 80 },
  { key: 'status', label: '状态', value: () => '已归档', width: '1fr', resizable: false },
]
const resize = useTableColumnResize(() => ({ columns: resizeColumns, columnWidths: widths.value,
  getResizeLabel: column => '调整列宽 · ' + column.label,
  onColumnResizeEnd(updates) { widths.value = { ...widths.value, ...updates }; commits.value++ },
}))
const resizeVisible = ref<readonly string[]>(resizeColumns.map(column => column.key))
const resizeSettingsState = useTableColumnSettingsState(() => ({
  columns: resizeColumns.map(column => ({ key: column.key, label: column.label, isAlwaysVisible: column.rowHeader,
    group: column.rowHeader ? '必显列' : '可选列' })),
  activeColumnKeys: resizeVisible.value, defaultColumnKeys: ['title', 'revision'],
  onChangeActiveColumnKeys(keys) { resizeVisible.value = keys },
}))
const resizeSettings = useTableColumnSettings(resizeSettingsState.columnSettingsConfig)
const headingOverflow = ref<TableTextOverflow>('truncate')
const headingModes = [{ value: 'truncate', label: '单行截断' }, { value: 'wrap', label: '自动换行' }]
const headingRows = [
  { id: 1, report: 'Monthly accessibility and localization review', approval: '完成', status: '已发布' },
  { id: 2, report: 'API', approval: '进行中', status: '待复核' },
]
const headingColumns: TableColumn<(typeof headingRows)[number]>[] = [
  { key: 'report', label: 'Monthly compliance report', value: row => row.report, width: '120px', minWidth: 80, rowHeader: true },
  { key: 'approval', label: 'Release اعتماد التقارير', value: row => row.approval, width: '112px', minWidth: 80, sortable: true },
  { key: 'status', label: '状态', value: row => row.status, width: '1fr', minWidth: 64, resizable: false },
]
const headingResize = useTableColumnResize({ columns: headingColumns, getResizeLabel: column => '调整列宽 · ' + column.label })
const stickyRtl = ref(false)
const sticky = useTableStickyColumns({ startKeys: ['revision'], endKeys: ['status'] })
const stickyColumns: TableColumn<(typeof source)[number]>[] = [
  { ...columns[0], width: '112px', minWidth: 90 },
  { ...columns[1], width: '82px', minWidth: 64 },
  { key: 'team', label: '负责团队', width: '154px', value: () => '设计标准' },
  { key: 'note', label: '发布说明', width: '210px', value: () => '更新组件使用指南' },
  { key: 'updated', label: '更新时间', width: '162px', value: () => '11月22日' },
  { key: 'status', label: '状态', width: '90px', value: () => '已归档', resizable: false },
]
const stickyResize = useTableColumnResize({ columns: stickyColumns, getResizeLabel: column => '调整列宽 · ' + column.label })
const insertColumn = ref(false)
const wrapTimeline = ref(false)
const timeline = useTableColumnsVirtualization({ initialViewportWidth: 560, overscan: 1 })
const timelinePins = useTableStickyColumns({ startKeys: ['title'], endKeys: ['revision'] })
const timelineMonths: TableColumn<(typeof fixedRows)[number]>[] = Array.from({ length: 120 }, (_, index) => ({
  key: 'month-' + (index + 1), label: '月份 ' + (index + 1), width: '108px', sortable: true,
  value: row => (row.id + index * 7) % 100,
}))
const timelineColumns = computed(() => [
  { ...columns[0], width: '110px' },
  ...(insertColumn.value ? [{ key: 'current', label: '本月', width: '108px', value: () => 18 }] : []),
  ...timelineMonths,
  { ...columns[1], width: '90px', wrap: wrapTimeline.value },
])
let active = true
onScopeDispose(() => { active = false })

const loader = useTableInfiniteScroll(() => ({
  hasMore: loaded.value < source.length,
  isLoading: loading.value,
  async onLoadMore() {
    requests.value++
    loading.value = true
    failed.value = false
    const response = outcome.value
    try {
      await new Promise(resolve => setTimeout(resolve, 220))
      if (!active) return
      if (response === 'error') {
        failed.value = true
        throw new Error('Sample batch failed')
      }
      if (response === 'rows') loaded.value = Math.min(source.length, loaded.value + 4)
    } finally { if (active) loading.value = false }
  },
}))
</script>

<template>
  <section class="review__stack" aria-label="表格加载过渡">
    <STable label="交付记录" :rows="handoffRows" :columns="columns" :row-key="row => row.id"
      :loading="handoffLoading" loading-text="正在读取交付记录…" highlight-on-hover>
      <template #empty>
        <SEmptyState title="暂无交付记录" size="sm" align="center">
          <template #actions><SButton size="sm" variant="secondary" @click="loadHandoff">加载交付记录</SButton></template>
        </SEmptyState>
      </template>
    </STable>
    <div class="review__row"><SButton size="sm" variant="ghost" :disabled="!handoffLoading && !handoffRows.length" @click="emptyHandoff">清空交付记录</SButton></div>
  </section>
  <section class="review__stack" aria-label="批量加载示例">
    <SSegment v-model="outcome" label="读取结果" :items="outcomes" size="sm" />
    <p>已显示 {{ rows.length }} 条记录 · 请求 {{ requests }} 次</p>
    <p v-if="failed" role="alert">读取失败，可重试。</p>
    <STable label="部署记录" :rows="rows" :columns="columns" :row-key="row => row.id" :infinite-scroll="loader"
      :virtual="{ height: 260, estimatedRowHeight: 38 }" load-more-label="加载更多记录" loading-more-label="正在加载下一批记录" />
  </section>
  <section class="review__stack" aria-label="按容器高度虚拟化示例">
    <SCheckbox v-model="bounded">限制滚动高度</SCheckbox>
    <div class="fixed-table-demo" :style="{ blockSize: bounded ? '240px' : undefined }">
      <STable label="资料滚动窗口" :rows="fixedRows" :columns="columns" :row-key="row => row.id" :virtualization="fixedGeometry" />
    </div>
  </section>
  <section class="review__stack table-resize-review" aria-label="列宽调整示例">
    <SCheckbox v-model="rtl">从右向左布局</SCheckbox>
    <div class="review__row">
      <SSelect label="选择表格列" side="top" multiple :options="resizeSettings.pickerOptions.value" :model-value="[...resizeSettings.activeColumnKeys.value]"
        @update:model-value="resizeSettings.setActiveColumnKeys($event ?? [])" />
      <SButton size="sm" variant="secondary" @click="resizeSettings.showAllColumns">显示所有列</SButton>
      <SButton size="sm" variant="ghost" @click="resizeSettings.resetToDefault">恢复默认列</SButton>
    </div>
    <STable label="可调列宽资料" :dir="rtl ? 'rtl' : 'ltr'" :columns="resizeColumns" :rows="source.slice(0, 3)"
      :row-key="row => row.id" :column-resize="resize" :column-settings="resizeSettings.control" />
    <p>已保存 {{ commits }} 次列宽</p>
    <SSegment :model-value="headingOverflow" :items="headingModes" label="窄列文字" size="sm"
      @update:model-value="headingOverflow = $event as TableTextOverflow" />
    <STable label="窄列发布检查" :dir="rtl ? 'rtl' : 'ltr'" :columns="headingColumns" :rows="headingRows"
      :row-key="row => row.id" :column-resize="headingResize" :text-overflow="headingOverflow" density="compact" />
  </section>
  <section class="review__stack" aria-label="固定列示例">
    <SCheckbox v-model="stickyRtl">从右向左布局</SCheckbox>
    <STable style="max-inline-size: 560px" label="跨列发布记录" :dir="stickyRtl ? 'rtl' : 'ltr'" :rows="source.slice(0, 3)"
      :columns="stickyColumns" :row-key="row => row.id" selection-mode="multiple" select-all-label="选择所有发布记录"
      :column-resize="stickyResize" :sticky-columns="sticky" />
  </section>
  <section class="review__stack" aria-label="双向虚拟化示例">
    <div class="review__row">
      <SCheckbox v-model="insertColumn">插入汇总列</SCheckbox>
      <SCheckbox v-model="wrapTimeline">允许版本文字换行</SCheckbox>
    </div>
    <div class="fixed-table-demo" style="block-size: 240px; max-inline-size: 560px">
      <STable label="资料月度趋势" :rows="timelineRows" :columns="timelineColumns" :row-key="row => row.id"
        :virtualization="[fixedGeometry, timeline]" :sticky-columns="timelinePins" />
    </div>
  </section>
</template>

<style scoped>
.table-resize-review { min-inline-size: 0; grid-template-columns: minmax(0, 1fr); }
.table-resize-review > .sy-table { inline-size: 100%; }
</style>
