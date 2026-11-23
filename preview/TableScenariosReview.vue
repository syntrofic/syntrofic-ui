<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useTemplateRef } from 'vue'
import {
  SAvatar, SBadge, SButton, SCard, SCheckbox, SLink, SMotionText, SSegment, STable, STableSelectionToolbar,
  toSearchFilters, useContainerReveal, usePowerSearchConfig, useTableFiltering, useTableFilterState, useTableGroupedRows, useTableSelectionState, useTableSortableState,
  type ActionBarAction, type SearchField, type TableColumn, type TableFilterVariant, type TableKey, type TableRowStatus, type TableSort,
} from '../src'

const assets = [
  { id: 'guide', name: '交付指南', owner: '林舟', handle: 'lin', team: '设计组', quantity: 24, status: 'ready' },
  { id: 'brand', name: '品牌资产', owner: '周昱', handle: 'zhou', team: '设计组', quantity: 12, status: 'review' },
  { id: 'release', name: '上线记录', owner: '方宁', handle: 'fang', team: '工程组', quantity: 16, status: 'failed' },
  { id: 'qa', name: '验收附件', owner: '林舟', handle: 'lin', team: '工程组', quantity: 7, status: 'queued' },
]
type Asset = (typeof assets)[number]
const keyOf = (row: Asset) => row.id
const columns: TableColumn<Asset>[] = [
  { key: 'name', label: '资料', value: row => row.name, sortable: true, rowHeader: true, width: '42%' },
  { key: 'owner', label: '负责人', value: row => row.owner, sortable: true, filter: 'owner', width: '160px' },
  { key: 'team', label: '团队', value: row => row.team, filter: 'team' },
  { key: 'quantity', label: '条目数', value: row => row.quantity, sortable: true, align: 'end', filter: { field: 'quantity', operator: 'gte' }, width: '84px' },
]
const status: Record<string, TableRowStatus> = {
  ready: { status: 'success', label: '完成交付' }, review: { status: 'warning', label: '等待复核' },
  failed: { status: 'error', label: '发布中断' }, queued: { color: 'var(--sy-accent)', label: '已排入队列' },
}
const fields: SearchField[] = [
  { key: 'owner', label: '负责人' },
  { key: 'team', label: '团队', options: ['设计组', '工程组'].map(value => ({ value, label: value })) },
  { key: 'quantity', label: '条目数', type: 'number' },
]
const search = useTableFilterState()
const { config } = usePowerSearchConfig(fields)
const filterVariant = ref<TableFilterVariant>('popover')
const filterStyles = [{ value: 'popover', label: '浮层筛选' }, { value: 'inline', label: '表头内筛选' }]
const columnFiltering = useTableFiltering(() => ({ filters: search.columnFilters.value, onFilterChange: search.onFilterChange,
  searchConfig: config.value, variant: filterVariant.value, locale: 'zh-CN', getLabel: label => '筛选' + label,
  labels: { apply: '应用筛选', clear: '清除筛选', choose: '选择团队' } }))
const filtered = useTableFiltering({ rows: assets, fields, getText: row => row.name,
  state: () => ({ query: '', filters: toSearchFilters(search.columnFilters.value, columns, config.value) }),
  getField: (row, key) => columns.find(column => column.key === key)?.value(row) })
const sorts = shallowRef<readonly TableSort[]>([])
const sorting = useTableSortableState(() => ({ data: filtered.value, columns, sort: sorts.value, locale: 'zh-CN' }))
const ordered = sorting.sortedData
const sortLabel = computed(() => sorts.value.length ? sorts.value.map(sort => `${columns.find(column => column.key === sort.key)?.label} ${sort.direction === 'ascending' ? '升序' : '降序'}`).join('、') : '按资料录入顺序')
const grouped = ref(false)
const groupRows = useTableGroupedRows(() => ({ data: ordered.value, groupBy: row => row.team, getGroupLabel: (team, count) => `${team} · ${count} 条资料` }))
const dividers = ref<'none' | 'rows' | 'grid'>('none')
const striped = ref(true)

const bulkRows = shallowRef(Array.from({ length: 16 }, (_, index) => ({ ...assets[index % assets.length], id: `delivery-${index}`,
  name: `第 ${index + 1} 批 ${assets[index % assets.length].name}` })))
const bulkSelected = shallowRef<readonly TableKey[]>([])
const bulkPage = ref(1)
const rowsPerPage = 8
const selection = useTableSelectionState(() => ({ data: bulkRows.value, rowKey: keyOf, selectedKeys: bulkSelected.value,
  onSelectionChange: keys => { bulkSelected.value = keys } }))
const all = selection.allSelected
const bulkArea = useTemplateRef<HTMLElement>('bulkArea')
const bulkMode = ref('inline')
const modes = [{ value: 'inline', label: '表格上方' }, { value: 'floating', label: '随滚动区悬浮' }]
const archive = shallowRef<readonly Asset[]>()
const bulkFeedback = ref('')
const bulkActions = computed<ActionBarAction[]>(() => [
  { id: 'archive', label: '归档选中记录', shortLabel: '归档' },
  { id: 'all', label: all.value ? '只保留本页' : '选中全部记录', shortLabel: all.value ? '仅本页' : '全选' },
])
function returnToTable() {
  return bulkArea.value?.querySelector<HTMLElement>('input[aria-label="选择本页交付记录"]:not(:disabled)')
    ?? bulkArea.value?.querySelector<HTMLElement>('.sy-table__scroll') ?? null
}
const toolbarProps = { selection: selection.selectionState, label: '交付批量操作', clearLabel: '清除选择', returnFocus: returnToTable,
  renderSelectionLabel: (count: number) => `已选 ${count} 条` }

function bulkAction(action: ActionBarAction) {
  if (action.id === 'all') {
    if (all.value) bulkSelected.value = bulkRows.value.slice((bulkPage.value - 1) * rowsPerPage, bulkPage.value * rowsPerPage).map(keyOf)
    else selection.selectAll(true)
    return
  }
  archive.value = bulkRows.value
  bulkRows.value = bulkRows.value.filter(row => !selection.selected.value.has(row.id))
  bulkFeedback.value = `已归档 ${archive.value.length - bulkRows.value.length} 条记录`
  selection.selectionState.clearSelection()
  bulkPage.value = Math.min(bulkPage.value, Math.max(1, Math.ceil(bulkRows.value.length / rowsPerPage)))
}
function undo() {
  if (!archive.value) return
  bulkRows.value = [...archive.value]
  archive.value = undefined
  bulkFeedback.value = '已恢复归档记录'
  void nextTick(() => returnToTable()?.focus({ preventScroll: true }))
}

const reveal = useContainerReveal()
const markSelection = useTableSelectionState({ data: assets, rowKey: keyOf })
const markColumns = columns.slice(0, 3).map(column => ({ ...column, sortable: false, filter: undefined }))
</script>

<template>
  <section class="review__stack" aria-label="表格外观与筛选">
    <SSegment :model-value="filterVariant" :items="filterStyles" label="筛选位置" size="sm" @update:model-value="filterVariant = $event as TableFilterVariant" />
    <div class="review__row">
      <SCheckbox v-model="striped">交替行底色</SCheckbox>
      <SCheckbox :model-value="dividers === 'grid'" @update:model-value="dividers = $event ? 'grid' : 'none'">网格线</SCheckbox>
      <SCheckbox v-model="grouped">按团队分组</SCheckbox>
    </div>
    <SCard class="table-catalog-card">
      <template #header><strong>团队交付清单</strong></template>
      <STable v-model:sorts="sorts" label="团队交付清单" :rows="ordered" :columns="columns" :row-key="keyOf" :row-status="row => status[row.status]"
        status-column-label="交付状态" empty-text="没有匹配的交付资料" density="compact" :striped="striped" :dividers="dividers" highlight-on-hover
        :row-groups="grouped ? groupRows.control : undefined" :column-filtering="columnFiltering" sort-mode="manual" multi-sort allow-unsorted>
        <template #cell="{ row, column, value }">
          <SLink v-if="column.key === 'owner'" :href="`mailto:${row.handle}@example.test`">{{ value }}</SLink>
          <SBadge v-else-if="column.key === 'team'" :tone="row.team === '设计组' ? 'accent' : 'neutral'">{{ value }}</SBadge>
          <template v-else>{{ value }}</template>
        </template>
      </STable>
      <template #footer><SMotionText :value="sortLabel" announce /></template>
    </SCard>
  </section>

  <section ref="bulkArea" class="review__stack" aria-label="批量选择与操作">
    <SSegment v-model="bulkMode" :items="modes" label="批量操作条位置" size="sm" />
    <STableSelectionToolbar v-if="bulkMode === 'inline'" v-bind="toolbarProps" :actions="bulkActions" @action="bulkAction" />
    <div class="table-catalog-scroll" :data-floating="bulkMode === 'floating' || undefined">
      <div v-if="bulkMode === 'floating'" class="table-catalog-summary">待核对批次 <SMotionText :value="String(bulkRows.length)" motion="roll" /></div>
      <STable v-model:selected="bulkSelected" v-model:page="bulkPage" label="待核对交付记录" :rows="bulkRows" :columns="columns.slice(0, 3)"
        :row-key="keyOf" :row-label="row => `选择${row.name}`" selection-mode="multiple" :page-size="rowsPerPage" locale="zh-CN"
        page-label="交付记录分页" previous-label="交付上一页" next-label="交付下一页" select-all-label="选择本页交付记录" empty-text="暂无交付记录" />
      <div v-if="bulkMode === 'floating'" class="table-catalog-dock">
        <STableSelectionToolbar v-bind="toolbarProps" :actions="bulkActions" variant="raised" @action="bulkAction" />
      </div>
    </div>
    <div class="review__row"><SMotionText :value="bulkFeedback" announce /><SButton v-if="archive" size="sm" variant="ghost" @click="undo">撤销本次归档</SButton></div>
  </section>

  <section class="review__stack" aria-label="头像位置选择">
    <STable label="资料负责人" :rows="assets" :columns="markColumns" :row-key="keyOf">
      <template #column-header="{ column }">
        <div v-if="column.key === 'name'" class="table-catalog-leading">
          <SCheckbox :model-value="markSelection.allSelected.value" :indeterminate="markSelection.someSelected.value" aria-label="选择所有资料负责人"
            @update:model-value="markSelection.selectAll(Boolean($event))" />{{ column.label }}
        </div>
        <template v-else>{{ column.label }}</template>
      </template>
      <template #cell="{ row, column, value }">
        <div v-if="column.key === 'name'" class="table-catalog-leading">
          <span class="table-catalog-mark" v-bind="reveal.getContainerProps()">
            <span class="table-catalog-mark__avatar" v-bind="reveal.getContentRevealProps({ inverted: true, forceVisibility: markSelection.selectionState.hasSelection ? 'hidden' : undefined })">
              <SAvatar :name="row.owner" size="sm" aria-hidden="true" />
            </span>
            <span class="table-catalog-mark__checkbox" v-bind="reveal.getContentRevealProps({ forceVisibility: markSelection.selectionState.hasSelection ? 'shown' : undefined })">
              <SCheckbox :aria-label="`选择${row.name}负责人`" :model-value="markSelection.selected.value.has(row.id)"
                @update:model-value="markSelection.select(row, Boolean($event))" />
            </span>
          </span>
          {{ value }}
        </div>
        <template v-else>{{ value }}</template>
      </template>
    </STable>
  </section>
</template>

<style scoped>
.table-catalog-card :deep(.sy-card__body) { padding-inline: 0; }
.table-catalog-card :deep(.sy-table__scroll) { border-radius: 0; }
.table-catalog-scroll[data-floating] { position: relative; max-block-size: 360px; min-inline-size: 0; overflow: auto; }
.table-catalog-scroll[data-floating] > .sy-table { margin-block-end: 68px; }
.table-catalog-summary { padding: var(--sy-space-3); margin-block-end: var(--sy-space-2); border-radius: var(--sy-radius-md); background: var(--sy-surface-blue); }
.table-catalog-dock { position: sticky; inset-block-end: 16px; z-index: 5; block-size: 0; pointer-events: none; }
.table-catalog-dock > * { position: absolute; inset-inline: 8px; inset-block-end: 0; }
.table-catalog-leading { display: flex; align-items: center; gap: var(--sy-space-2); }
.table-catalog-mark { display: inline-grid; flex: none; inline-size: 26px; block-size: 26px; place-items: center; }
.table-catalog-mark > span { grid-area: 1 / 1; display: grid; place-items: center; }
.table-catalog-mark__checkbox { inline-size: 26px; block-size: 26px; border-radius: 50%; background: var(--sy-surface); }
@media (pointer: coarse) { .table-catalog-mark__avatar { opacity: 0; } }
</style>
