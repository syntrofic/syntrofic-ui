<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import {
  SBadge, SButton, SCheckbox, SDataGrid, SDisclosure, SFilteredTable, SHoverCard, SLineChart, SListItem, SMarkdown, SMenu, SMenuItem, SMetadataList, SMotionText,
  SPopover, SResizable, SSearchField, SSegment, SSelect, STable, STextArea,
  toSearchFilters, useAnimatedLayout, usePowerSearchConfig, useTableColumnSettings, useTableColumnSettingsState, useTableFiltering, useTableFilterState, useTableGroupedRows, useTableRowExpansion, useTableRowIndex,
  type DataGridColumn, type SearchField, type TableColumn, type TableKey, type TableRowStatus,
} from '../src'
import { useShellCompact } from '../src/internal/shell-layout'

interface DeliveryRow { id: string; title: string; team: string; owner: string; files: number; registered: string; note: string; children?: readonly DeliveryRow[] }
const props = defineProps<{ kind: string }>()
const entries = ref<DeliveryRow[]>([
  { id: 'guide', title: '团队交付指南', team: '设计组', owner: '林舟', files: 12, registered: '2026-11-19', note: '补充了键盘与窄屏验收步骤。' },
  { id: 'assets', title: '品牌资料归档', team: '设计组', owner: '方宁', files: 23, registered: '2026-11-20', note: '颜色变量与图标已进入归档。' },
  { id: 'schema', title: '发布接口摘要', team: '工程组', owner: '周昱', files: 8, registered: '2026-11-20', note: '准备验证报告，等待团队评审。' },
  { id: 'checks', title: '上线检查记录', team: '工程组', owner: '方宁', files: 15, registered: '2026-11-21', note: '需要核对 Nuxt 的服务端渲染。' },
])
const titles = { table: '资料记录', 'table-page': '资料目录', 'table-grouped': '分组交付记录', 'table-collapsible': '各团队资料概况',
  'table-inbox': '交付收件箱', 'table-tree': '资料仓库' } as Record<string, string>
const title = computed(() => titles[props.kind])
const keyOf = (row: DeliveryRow) => row.id
const statusOf = (row: DeliveryRow): TableRowStatus => row.files > 10 ? { status: 'success', label: '资料充足' } : { status: 'warning', label: '待补资料' }
const textOf = (row: DeliveryRow) => [row.title, row.team, row.owner, row.note].join(' ')
const columns: TableColumn<DeliveryRow>[] = [
  { key: 'title', label: '名称', value: row => row.title, sortable: true, rowHeader: true },
  { key: 'owner', label: '负责人', value: row => row.owner, sortable: true },
  { key: 'registered', label: '更新日期', value: row => row.registered, sortable: true },
  { key: 'files', label: '文件数', value: row => row.files, sortable: true, align: 'end' },
  { key: 'actions', label: '操作', value: () => null },
]
const searchableWidths: Record<string, number> = { title: 152, owner: 122, registered: 140, files: 122, actions: 100 }
const searchableColumns = columns.map(column => ({ ...column, minWidth: searchableWidths[column.key],
  width: column.key === 'actions' ? '110px' : column.key === 'title' ? '1.35fr' : undefined,
  filter: column.key === 'actions' ? undefined : column.key === 'files' ? { field: 'files', operator: 'gte' as const } : column.key,
}))
const gridColumns: DataGridColumn<DeliveryRow>[] = [
  { ...columns[0], width: 172, pinned: 'start' },
  { ...columns[2], width: 124 },
  { ...columns[3], width: '1fr' },
]
const fieldOptions: SearchField[] = [
  { key: 'owner', label: '负责人', options: ['林舟', '方宁', '周昱'].map(label => ({ value: label, label })) },
  { key: 'files', label: '文件数', type: 'number', operators: ['is', 'gt', 'gte', 'lt'] },
  { key: 'title', label: '名称' },
  { key: 'registered', label: '更新日期', type: 'date' },
]
const getField = (row: DeliveryRow, key: string) => columns.find(column => column.key === key)?.value(row)
const panels = [{ id: 'table', label: '记录列表', defaultSize: 62, minSize: '240px' },
  { id: 'inspector', label: '详情面板', defaultSize: 38, minSize: '220px' }]
const statuses = [{ value: 'all', label: '全部团队' }, { value: '设计组', label: '设计组' }, { value: '工程组', label: '工程组' }]
const dateRanges = [{ value: '7', label: '最近 7 天' }, { value: '30', label: '最近 30 天' }]
const period = ref('7')
const search = useTableFilterState()
const query = search.query
const filters = search.filters
const columnFilters = search.columnFilters
const { config: powerConfig, applyFilters } = usePowerSearchConfig(fieldOptions)
const scope = ref('all')
const scopedRows = computed(() => entries.value.filter(row => scope.value === 'all' || row.team === scope.value))
const filtered = useTableFiltering({ rows: scopedRows, fields: fieldOptions, state: () => ({ query: query.value, filters: filters.value }), getField, getText: textOf })
const columnFiltered = computed(() => applyFilters(toSearchFilters(columnFilters.value, searchableColumns, powerConfig.value), filtered.value, getField))
const restricted = computed(() => scope.value !== 'all' || Boolean(query.value.trim() || filters.value.length || Object.keys(columnFilters.value).length))
const latestEntry = computed(() => entries.value.reduce((latest, row) => row.registered > latest ? row.registered : latest, ''))
const facts = computed(() => [
  { id: 'teams', label: '团队', value: new Set(entries.value.map(row => row.team)).size },
  { id: 'updated', label: '最近更新', value: latestEntry.value || '—' },
])
const grouped = useTableGroupedRows(filtered, row => row.team)
const inlineGroups = useTableGroupedRows(() => ({ data: filtered.value, groupBy: (row: DeliveryRow) => row.team,
  groupOrder: ['设计组', '工程组'], getGroupLabel: (group, count) => `${group} · ${count} 条记录` }))
const repositoryGroups = useTableGroupedRows(entries, row => row.team)
const findRow = useTableRowIndex(entries, keyOf)
const tree = computed<DeliveryRow[]>(() => repositoryGroups.value.map(group => ({
  id: group.key, title: group.key, team: group.key, owner: '—', note: '这是 ' + group.key + ' 的交付资料目录。',
  files: group.rows.reduce((sum, row) => sum + row.files, 0), registered: group.rows.reduce((latest, row) => row.registered > latest ? row.registered : latest, ''),
  children: group.rows,
})))
const root = useTemplateRef('root')
const tablePanel = useTemplateRef('tablePanel')
const expandLayout = useAnimatedLayout({ scope: root })
const openedHistory = ref<ReadonlySet<TableKey>>(new Set())
const historyExpansion = useTableRowExpansion(() => ({
  expandedKeys: openedHistory.value,
  getRowKey: keyOf,
  getToggleLabel: (row, open) => `${open ? '收起' : '展开'}历史趋势 · ${row.title}`,
  onToggle(key) {
    const next = new Set(openedHistory.value)
    if (!next.delete(key)) next.add(key)
    openedHistory.value = next
  },
  panelVariant: 'muted',
  hasRowClickExpansion: true,
  animatedLayout: expandLayout.around,
}))
const compact = useShellCompact(root, () => 640)
const activeColumns = ref<readonly string[]>(columns.map(column => column.key))
const columnSettings = useTableColumnSettingsState(() => ({
  columns: columns.map(column => ({ key: column.key, label: column.label, isAlwaysVisible: column.rowHeader || column.key === 'actions' })),
  activeColumnKeys: activeColumns.value,
  onChangeActiveColumnKeys(keys) { activeColumns.value = keys },
}))
const columnPicker = useTableColumnSettings(columnSettings.columnSettingsConfig)
const displayColumns = computed(() => columnPicker.control.applyColumns(columns))
const orderedPicker = computed(() => {
  const options = columnPicker.pickerOptions.value.filter(option => option.value !== 'actions')
  const rank = new Map(columnSettings.activeColumnKeys.value.map((key, index) => [key, index]))
  return options.sort((left, right) => (rank.get(left.value) ?? options.length + 1) - (rank.get(right.value) ?? options.length + 1))
})
const selected = ref<readonly TableKey[]>([])
const selectionCount = computed<number>(previous => selected.value.length || previous || 0)
const active = ref<string>()
const details = computed(() => active.value ? entries.value[findRow(active.value) ?? -1] ?? tree.value.find(group => group.id === active.value) : undefined)
const treeExpanded = ref<readonly TableKey[]>(['设计组'])
const treeSelection = computed<readonly TableKey[]>({ get: () => active.value ? [active.value] : [],
  set: values => { active.value = typeof values[0] === 'string' ? values[0] : undefined } })
const message = ref('')
const composer = ref(false)
const replyField = useTemplateRef('replyField')
const response = ref('')
const replies = ref<Record<string, string[]>>({})
const initialColumns = columns.filter(column => column.key !== 'actions')
const narrowInbox = useShellCompact(tablePanel, () => 420)
const compactRows = computed(() => props.kind === 'table-inbox' && narrowInbox.value)
const filterLabels = { add: '添加筛选', apply: '应用', cancel: '取消', clear: '清空筛选', remove: '移除筛选', field: '字段', operator: '条件', value: '值' }
const operations = { is: '等于', 'is-not': '不等于', contains: '包含', 'starts-with': '开头为', gt: '大于', lt: '小于' }
const repositoryReadme = `## README.md

交付资料按设计和工程分组。目录行汇总下属文件数量，并显示最近一次更新。

- 用搜索保留匹配记录和它所在的目录。
- 用方向键浏览单元格，按 Enter 查看当前记录。
- 在列标题排序后，每组记录仍留在所在目录。`
const repositoryFilter = computed(() => {
  const search = query.value.trim().toLocaleLowerCase('zh-CN')
  return search ? (row: DeliveryRow) => `${textOf(row)} ${row.registered} ${row.files}`.toLocaleLowerCase('zh-CN').includes(search) : undefined
})

watch(active, () => { composer.value = false; response.value = '' })
async function composeReply() {
  composer.value = true
  await nextTick()
  replyField.value?.focus()
}
function canMoveColumn(key: string, offset: number) {
  const keys = columnSettings.activeColumnKeys.value
  const position = keys.indexOf(key)
  const neighbor = keys[position + offset]
  return position >= 0 && Boolean(neighbor && columnSettings.isColumnToggleable(neighbor))
}
function moveColumn(key: string, offset: number) {
  if (!canMoveColumn(key, offset)) return
  const keys = [...columnSettings.activeColumnKeys.value]
  const position = keys.indexOf(key)
  keys.splice(position, 1)
  keys.splice(position + offset, 0, key)
  columnSettings.setActiveColumnKeys(keys)
}
function selectFolder(team?: string) {
  active.value = team
  query.value = ''
  if (team && !treeExpanded.value.includes(team)) treeExpanded.value = [...treeExpanded.value, team]
}
function archive(ids: readonly TableKey[]) {
  entries.value = entries.value.filter(row => !ids.includes(row.id))
  selected.value = selected.value.filter(id => !ids.includes(id))
  if (active.value && ids.includes(active.value)) active.value = undefined
  message.value = `已归档 ${ids.length} 条记录。`
}
function reply() {
  if (!details.value || !response.value.trim()) return
  const id = details.value.id
  replies.value[id] = [...replies.value[id] ?? [], response.value.trim()]
  composer.value = false
  response.value = ''
}
function history(row: DeliveryRow) {
  const length = Number(period.value)
  return Array.from({ length: length === 7 ? 4 : 6 }, (_, index) => ({
    label: `${index * (length === 7 ? 2 : 5) + 1} 日`, values: { files: Math.round(row.files * (.25 + index / (length === 7 ? 4 : 7))) },
  }))
}
</script>

<template>
  <section ref="root" class="table-template" :aria-label="title">
    <header class="table-template__actions">
      <h2>{{ title }}</h2>
      <SSelect v-if="kind === 'table-collapsible'" v-model="period" label="时间范围" :options="dateRanges" />
      <SSearchField v-if="['table-grouped', 'table-tree', 'table-inbox'].includes(kind)" v-model="query" label="搜索记录" />
    </header>

    <template v-if="kind === 'table' || kind === 'table-page'">
      <SMetadataList v-if="kind === 'table-page'" class="table-template__facts" :items="facts" orientation="horizontal" layout="inline" label-width="max-content" />
      <div class="table-template__actions table-template__filter">
        <SSegment v-if="kind === 'table-page'" v-model="scope" :items="statuses" label="团队范围" />
        <SPopover>
          <template #trigger><SButton variant="secondary" size="sm">显示列</SButton></template>
          <div class="table-template__columns">
            <div v-for="column in orderedPicker" :key="column.value" class="table-template__column">
              <SCheckbox :model-value="columnSettings.isColumnActive(column.value)" :disabled="column.disabled"
                @update:model-value="columnSettings.toggleColumn(column.value)">{{ column.label }}</SCheckbox>
              <div v-if="!column.disabled && columnSettings.isColumnActive(column.value)" class="table-template__column-actions">
                <SButton variant="ghost" size="sm" :aria-label="'前移列 · ' + column.label" :disabled="!canMoveColumn(column.value, -1)"
                  @click="moveColumn(column.value, -1)">前移</SButton>
                <SButton variant="ghost" size="sm" :aria-label="'后移列 · ' + column.label" :disabled="!canMoveColumn(column.value, 1)"
                  @click="moveColumn(column.value, 1)">后移</SButton>
              </div>
            </div>
            <SButton variant="ghost" size="sm" @click="columnSettings.resetToDefault">重置列</SButton>
          </div>
        </SPopover>
      </div>
      <div v-if="kind === 'table-page'" class="table-template__totals" role="status">
        <SMotionText :value="`${columnFiltered.length} / ${entries.length} 条记录 · ${columnFiltered.reduce((sum, row) => sum + row.files, 0)} 个文件`" />
        <SBadge v-if="restricted">当前筛选</SBadge>
      </div>
      <div class="table-template__table-wrap">
        <div class="table-template__selection" :data-expanded="selected.length > 0 || undefined" :inert="!selected.length">
          <div class="table-template__selection-track">
            <div class="table-template__actions">
              <SMotionText :value="`${selectionCount} 条已选`" announce />
              <SButton variant="secondary" size="sm" @click="archive(selected)">归档选中记录</SButton>
            </div>
          </div>
        </div>
        <component :is="kind === 'table' ? STable : SFilteredTable" v-model:selected="selected" v-model:query="query" v-model:filters="filters"
          v-bind="kind === 'table-page' ? { columnLayout: 'fixed', columnFilters, columnSettings: columnPicker.control, columnFilterLabels: { apply: '应用', clear: '清除', choose: '请选择', calendar: '选日期' },
            getColumnFilterLabel: (label: string) => '按' + label + '筛选', locale: 'zh-CN' } : {}"
          @update:column-filters="columnFilters = $event"
          :label="title" :columns="kind === 'table-page' ? searchableColumns : displayColumns" :rows="kind === 'table' ? entries : scopedRows" :row-key="keyOf" selection-mode="multiple"
          select-all-label="选择全部记录" status-column-label="记录状态" :row-status="statusOf" :row-label="row => row.title"
          :fields="fieldOptions" :get-field="getField" :get-text="textOf"
          :filtersUI="filterLabels" :operatorsUI="operations" :labels="{ search: '搜索资料', saveView: '保存视图', views: '已保存视图',
            editView: '编辑视图', allViews: '全部记录', closeView: '关闭视图', viewContents: '视图内容', viewFilters: '筛选条件', viewColumns: '显示列',
            viewDensity: '行距', viewGrouping: '分组', viewPinned: '固定列', compact: '紧凑', comfortable: '舒展', none: '无',
            pinStart: '起始侧', pinEnd: '结束侧', pinBoth: '两侧',
            removeView: '删除视图', save: '保存', name: '视图名称', noResults: '没有匹配记录。', clearColumnFilters: '清除列筛选' }">
          <template #cell="{ row, column, value }">
            <SMenu v-if="column.key === 'actions'" :menu-label="row.title">
              <template #trigger><SButton size="sm" variant="ghost" :aria-label="`操作 · ${row.title}`">···</SButton></template>
              <SMenuItem @select="archive([row.id])">归档该记录</SMenuItem>
            </SMenu>
            <SHoverCard v-else-if="kind === 'table-page' && column.rowHeader" :label="row.title + '详情'" :interactive="false">
              <template #trigger><button class="table-template__preview" type="button">{{ value }}</button></template>
              <div class="table-template__hover"><strong>{{ row.team }} · {{ row.owner }}</strong><p>{{ row.note }}</p></div>
            </SHoverCard>
            <template v-else>{{ value }}</template>
          </template>
        </component>
      </div>
      <p v-if="message" role="status">{{ message }}</p>
    </template>

    <template v-else-if="kind === 'table-collapsible'">
      <SDisclosure v-for="group in grouped" :key="group.key" :title="group.key" :default-open="true">
        <STable :label="group.key" :rows="group.rows" :row-key="keyOf" :row-expansion="historyExpansion"
          multi-sort allow-unsorted :sort-priority-label="(priority, direction) => `第 ${priority} 排序优先级，${direction === 'ascending' ? '升序' : '降序'}`"
          :columns="initialColumns.filter(column => column.key !== (group.key === '设计组' ? 'registered' : 'owner'))">
          <template #expanded="{ row }">
            <SLineChart :label="row.title + '历史趋势'" :series="[{ key: 'files', label: '文件数' }]"
              :data="history(row)" :height="140" locale="zh-CN" data-label="查看明细" />
          </template>
        </STable>
      </SDisclosure>
    </template>

    <component v-else :is="compact ? 'div' : SResizable" class="table-template__split"
      v-bind="compact ? {} : { label: title, panels, height: '29rem', resizeLabel: () => kind === 'table-inbox' ? '调整消息阅读区宽度' : '调整记录详情宽度' }">
      <template #default="area">
        <div v-if="!area?.panel || area.panel.id === 'table'" ref="tablePanel" class="table-template__table">
          <STable v-if="kind === 'table-grouped'" :label="title" :rows="filtered" :columns="initialColumns" :row-key="keyOf"
            :row-groups="inlineGroups.control" :page-size="3" pagination-variant="count" previous-label="上一页" next-label="下一页"
            page-label="交付记录分页" empty-text="没有匹配记录。">
            <template #cell="{ row, column, value }">
              <SButton v-if="column.rowHeader" size="sm" variant="ghost" :aria-pressed="active === row.id" @click="active = row.id">{{ row.title }}</SButton>
              <template v-else>{{ value }}</template>
            </template>
          </STable>
          <template v-else-if="kind === 'table-tree'">
            <nav aria-label="资料路径" class="table-template__path">
              <span v-if="!details" aria-current="page">资料仓库</span>
              <template v-else>
                <SButton size="sm" variant="ghost" @click="selectFolder()">资料仓库</SButton>
                <span aria-hidden="true">/</span>
                <SButton v-if="!details.children" size="sm" variant="ghost" @click="selectFolder(details.team)">{{ details.team }}</SButton>
                <span v-if="!details.children" aria-hidden="true">/</span>
                <span aria-current="page">{{ details.title }}</span>
              </template>
            </nav>
            <SDataGrid v-model:selected="treeSelection" v-model:expanded="treeExpanded" :label="title" :rows="tree" :columns="gridColumns" :row-key="keyOf"
              :get-children="row => row.children ?? []" :filter="repositoryFilter" column-resize :scroll-height="400" selection-mode="single"
              selection-behavior="replace" :show-selection-checkboxes="false" :resize-label="col => '调整宽度 · ' + col.label"
              :toggle-label="(row, open) => (open ? '收起 ' : '展开 ') + row.title" empty-text="没有匹配记录。" @row-action="row => active = row.id" />
          </template>
          <div v-else class="table-template__inbox" :data-stacked="compactRows || undefined">
            <p v-if="!filtered.length" role="status">没有匹配消息。</p>
            <SListItem v-for="row in filtered" :key="row.id" :label="row.title" :selected="active === row.id" interactive
              :description="compactRows ? `${row.owner} · ${row.registered}` : undefined" @activate="active = row.id">
              <template v-if="!compactRows" #end><small>{{ row.owner }} · {{ row.registered }}</small></template>
            </SListItem>
          </div>
        </div>
        <aside v-if="!area?.panel || area.panel.id === 'inspector'" class="table-template__inspector" :aria-label="kind === 'table-inbox' ? '消息内容' : '记录详情'">
          <template v-if="details">
            <h3>{{ details.title }}</h3>
            <template v-if="kind === 'table-inbox'">
              <SDisclosure :title="details.owner + '的消息'" :default-open="true"><p>{{ details.note }}</p></SDisclosure>
              <SDisclosure v-for="(comment, index) in replies[details.id]" :key="index" title="我的回复" :default-open="true"><p>{{ comment }}</p></SDisclosure>
              <Transition name="table-template-reply">
                <form v-if="composer" @submit.prevent="reply">
                  <STextArea ref="replyField" v-model="response" label="回复正文" required />
                  <SButton type="submit" size="sm">发送回复</SButton>
                </form>
              </Transition>
              <SButton v-if="!composer" size="sm" variant="secondary" @click="composeReply">回复</SButton>
            </template>
            <template v-else>
              <SBadge tone="accent">{{ details.team }}</SBadge>
              <p>{{ details.note }}</p>
              <SMetadataList :items="[{ id: 'owner', label: '负责人', value: details.owner }, { id: 'files', label: '文件数', value: details.files },
                { id: 'updated', label: '更新日期', value: details.registered }]" />
              <SMarkdown v-if="kind === 'table-tree' && details.children" :source="'## README.md\n\n' + details.note" />
            </template>
          </template>
          <SMarkdown v-else-if="kind === 'table-tree'" :source="repositoryReadme" />
          <p v-else>请选择一条记录。</p>
        </aside>
      </template>
    </component>
  </section>
</template>

<style scoped>
.table-template, .table-template__table, .table-template__inspector, .table-template__columns, .table-template__inspector form {
  display: grid; gap: var(--sy-space-3); min-width: 0; align-content: start;
}
.table-template :is(h2, h3, p) { margin: 0; }
.table-template__actions { display: flex; align-items: end; justify-content: space-between; flex-wrap: wrap; gap: var(--sy-space-2); }
.table-template__facts :deep(.sy-metadata__entry), .table-template__filter {
  background: var(--surface);
  border-radius: var(--sy-radius-md);
}
.table-template__filter { padding: var(--site-inset); }
.table-template__table-wrap { min-inline-size: 0; }
.table-template__selection { display: grid; grid-template-rows: 0fr; opacity: 0; }
.table-template__selection[data-expanded] { grid-template-rows: 1fr; opacity: 1; }
.table-template__selection-track { min-block-size: 0; overflow: clip; }
.table-template__selection-track > .table-template__actions { padding-block-end: var(--sy-space-3); }
@media (prefers-reduced-motion: no-preference) {
  .table-template__selection {
    transition: grid-template-rows var(--sy-motion-replace) var(--sy-ease-settle),
      opacity var(--sy-motion-enter) var(--sy-ease-settle);
  }
}
.table-template__totals { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sy-space-2); }
.table-template__preview { border: 0; background: transparent; color: inherit; padding: .25rem 0; text-align: start; font: inherit; cursor: pointer; }
.table-template__preview:is(:hover, :focus-visible) { color: var(--sy-accent-text); text-decoration: underline; }
.table-template__hover { display: grid; gap: var(--sy-space-1); max-inline-size: 19rem; }
.table-template__columns { padding: var(--sy-space-3); }
.table-template__column { display: flex; align-items: center; justify-content: space-between; gap: var(--sy-space-2); }
.table-template__column-actions { display: flex; gap: var(--sy-space-1); }
.table-template__table, .table-template__inspector { padding: var(--sy-space-3); }
.table-template__inspector { min-height: 100%; justify-items: start; background: var(--sy-surface); }
.table-template__inspector form { width: 100%; justify-items: start; }
.table-template__path { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sy-space-1); color: var(--sy-text-muted); }
.table-template :deep(.sy-table__detail-content .sy-chart-frame) { max-width: min(100%, 44rem); }
.table-template__inbox { display: grid; gap: var(--sy-space-1); }
.table-template__inbox small { color: var(--sy-text-muted); pointer-events: none; }
.table-template-reply-enter-active, .table-template-reply-leave-active {
  transition: opacity var(--sy-motion-enter) var(--sy-ease-settle), transform var(--sy-motion-enter) var(--sy-ease-settle);
}
.table-template-reply-enter-from, .table-template-reply-leave-to { opacity: 0; transform: translateY(.25rem); }
</style>
