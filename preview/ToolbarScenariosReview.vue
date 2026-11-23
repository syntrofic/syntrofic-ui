<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import {
  SAlertDialog, SButton, SCheckbox, SIcon, SInput, SMotionText, SOverflowList, SPopover, SSelect, SSurface,
  STable, STabs, SToolbar, SToolbarButton, type ButtonSize, type TableColumn, type TableKey,
} from '../src'

const subjects = [
  { id: 'brief', title: '发布简报' }, { id: 'guide', title: '资料手册' }, { id: 'review', title: '复核记录' },
] as const
const documentIndex = ref(1)
const title = computed(() => subjects[documentIndex.value].title)
const saved = ref('')
const sizes: { id: ButtonSize; label: string }[] = [{ id: 'sm', label: '紧凑工具栏' }, { id: 'md', label: '标准工具栏' }, { id: 'lg', label: '宽松工具栏' }]
const tab = ref<'draft' | 'released'>('draft')
const tabs = [{ value: 'draft', label: '待发布' }, { value: 'released', label: '已发布' }]
const releases = ref({ draft: ['共享图标包', '新版本说明'], released: ['品牌指南'] })
let draftNumber = 0
function addDraft() {
  tab.value = 'draft'
  releases.value.draft = [...releases.value.draft, `交付草稿 ${++draftNumber}`]
}

const sample = [
  { id: 'logo', title: '品牌字标', phase: '待审核', owner: '设计组', type: '图形' },
  { id: 'fonts', title: '字体授权', phase: '待审核', owner: '运营组', type: '授权' },
  { id: 'guide', title: '交付手册', phase: '已发布', owner: '设计组', type: '文档' },
  { id: 'audit', title: '发布检查表', phase: '草稿', owner: '运营组', type: '文档' },
  { id: 'kit', title: '图标素材包', phase: '已发布', owner: '开发组', type: '图形' },
]
type Entry = typeof sample[number]
const records = ref(sample)
const query = ref('')
const search = useTemplateRef('search')
const undoButton = useTemplateRef('undoButton')
let restoreToUndo = false
const filterFields = [
  { id: 'phase', label: '阶段', options: ['待审核', '已发布', '草稿'] },
  { id: 'owner', label: '负责团队', options: ['设计组', '运营组', '开发组'] },
  { id: 'type', label: '资料类型', options: ['图形', '文档', '授权'] },
] as const
type FilterField = typeof filterFields[number]['id']
const filters = ref<Partial<Record<FilterField, string>>>({})
const columnOptions = [{ id: 'phase', label: '阶段' }, { id: 'owner', label: '负责团队' }, { id: 'type', label: '资料类型' }] as const
const hiddenColumns = ref<readonly string[]>([])
const columns: TableColumn<Entry>[] = [
  { key: 'title', label: '交付资料', value: row => row.title, rowHeader: true },
  ...columnOptions.map(column => ({ key: column.id, label: column.label, value: (row: Entry) => row[column.id] })),
]
const visibleColumns = computed(() => columns.filter(column => !hiddenColumns.value.includes(column.key)))
const visible = computed(() => records.value.filter(row => row.title.includes(query.value.trim())
  && filterFields.every(field => !filters.value[field.id] || filters.value[field.id] === row[field.id])))
const hasFilters = computed(() => Boolean(query.value || Object.values(filters.value).some(Boolean)))
function toggleColumn(id: string, show: boolean) {
  hiddenColumns.value = show ? hiddenColumns.value.filter(key => key !== id) : [...hiddenColumns.value, id]
}
function resetFilters() { search.value?.focus(); query.value = ''; filters.value = {} }

const selected = ref<readonly TableKey[]>([])
const confirm = ref(false)
const operation = ref<'archive' | 'remove'>('archive')
const batch = ref('')
const removed = ref<readonly Entry[]>([])
function prepare(action: 'archive' | 'remove') { operation.value = action; confirm.value = true }
function apply() {
  const ids = new Set(selected.value)
  if (!ids.size) return
  removed.value = records.value.filter(row => ids.has(row.id))
  records.value = records.value.filter(row => !ids.has(row.id))
  selected.value = []
  batch.value = `${operation.value === 'archive' ? '已归档' : '已移除'} ${removed.value.length} 条记录`
  restoreToUndo = true
}
function restoreBatchFocus() {
  if (!restoreToUndo) return
  restoreToUndo = false
  undoButton.value?.$el.focus({ preventScroll: true })
}
function clearSelection() { search.value?.focus(); selected.value = [] }
function undo() {
  const restored = new Set([...records.value, ...removed.value].map(row => row.id))
  records.value = sample.filter(row => restored.has(row.id))
  removed.value = []
  batch.value = '已恢复所选记录'
  void nextTick(() => search.value?.focus())
}
</script>

<template>
  <section class="toolbar-review" aria-label="工具栏布局与操作示例">
    <SSurface class="toolbar-review__card" tone="neutral">
      <SToolbar label="交付文档操作" :dividers="['bottom']">
        <template #start>
          <SToolbarButton icon-only :disabled="documentIndex === 0" @click="documentIndex--">
            <template #start><SIcon name="chevronLeft" /></template>上一份文档
          </SToolbarButton>
        </template>
        <template #center><h3><SMotionText :value="title" /></h3></template>
        <template #end>
          <SToolbarButton variant="secondary" @click="saved = '已保留已发布版本'">舍弃修改</SToolbarButton>
          <SToolbarButton variant="primary" @click="saved = `已保存 ${title}`">保存文档</SToolbarButton>
        </template>
      </SToolbar>
      <div class="toolbar-review__card-body"><SMotionText :value="saved || '等待文档操作'" announce /></div>
    </SSurface>

    <div class="toolbar-review__sizes">
      <SSurface v-for="size in sizes" :key="size.id" class="toolbar-review__card" tone="neutral">
        <SToolbar :label="size.label" :size="size.id" :dividers="['bottom']">
          <template #start><h3>{{ size.label }}</h3></template>
          <template #end>
            <SInput :label="size.label + '搜索'" :placeholder="'搜索'" hide-label start-icon="search" type="search" />
            <SToolbarButton icon-only @click="saved = `${size.label}操作已执行`">
              <template #start><SIcon name="plus" /></template>{{ size.label }}新增
            </SToolbarButton>
          </template>
        </SToolbar>
      </SSurface>
    </div>

    <STabs v-model="tab" class="toolbar-review__tabs" label="发布状态" toolbar-label="发布视图操作" :tabs="tabs">
      <template #actions><SToolbarButton variant="primary" @click="addDraft">新建发布草稿</SToolbarButton></template>
      <template #panel="{ tab: item }">
        <TransitionGroup tag="ul" name="toolbar-review-row" class="toolbar-review__release-list">
          <li v-for="entry in releases[item.value as keyof typeof releases]" :key="entry">{{ entry }}</li>
        </TransitionGroup>
      </template>
    </STabs>

    <div class="toolbar-review__table">
      <SToolbar label="交付资料筛选" class="toolbar-review__filters" :dividers="['bottom']">
        <template #start><SInput ref="search" v-model="query" type="search" label="搜索交付资料" placeholder="搜索资料" hide-label start-icon="search" /></template>
        <SOverflowList class="toolbar-review__clauses" :items="filterFields" label="字段筛选" more-label="更多筛选" :gap="5">
          <template #item="{ item }">
            <SSelect v-model="filters[item.id]" :label="`筛选${item.label}`" :placeholder="item.label" hide-label
              :options="item.options.map(option => ({ value: option, label: option }))" :data-set="filters[item.id] ? '' : undefined">
              <template #value="{ text, selected: value }"><SMotionText :value="value ? `${item.label} · ${text}` : item.label" /></template>
            </SSelect>
          </template>
          <template #indicator="{ count }"><SMotionText :value="`+${count}`" motion="roll" /></template>
          <template #overflow="{ item }">
            <SSelect v-model="filters[item.id]" :label="`筛选${item.label}`" :placeholder="item.label"
              :options="item.options.map(option => ({ value: option, label: option }))" />
          </template>
        </SOverflowList>
        <template #end>
          <span class="toolbar-review__count"><SMotionText :value="`${visible.length} 条记录`" motion="roll" announce /></span>
          <SToolbarButton variant="ghost" :disabled="!hasFilters" @click="resetFilters">清除筛选</SToolbarButton>
          <SPopover label="选择可见列" align="end">
            <template #trigger><SToolbarButton icon-only><template #start><SIcon name="viewColumns" /></template>选择列</SToolbarButton></template>
            <div class="toolbar-review__column-picker">
              <SCheckbox v-for="column in columnOptions" :key="column.id" :label="`显示${column.label}`"
                :model-value="!hiddenColumns.includes(column.id)" @update:model-value="toggleColumn(column.id, $event === true)" />
            </div>
          </SPopover>
        </template>
      </SToolbar>
      <div class="toolbar-review__bulk" :data-open="selected.length || removed.length ? '' : undefined"
        :inert="!selected.length && !removed.length" :aria-hidden="!selected.length && !removed.length || undefined">
        <div>
          <SToolbar label="批量操作" variant="muted">
            <template #start><SMotionText :value="selected.length ? `已选 ${selected.length} 条` : batch" motion="roll" announce /></template>
            <template #end>
              <SToolbarButton v-if="selected.length" @click="prepare('archive')">归档所选</SToolbarButton>
              <SToolbarButton v-if="selected.length" variant="danger" @click="prepare('remove')">移除所选</SToolbarButton>
              <SToolbarButton v-if="selected.length" @click="clearSelection">清除选择</SToolbarButton>
              <SToolbarButton v-if="removed.length" ref="undoButton" variant="secondary" @click="undo">撤销批量操作</SToolbarButton>
            </template>
          </SToolbar>
        </div>
      </div>
      <STable v-model:selected="selected" label="交付资料列表" :rows="visible" :columns="visibleColumns" :row-key="row => row.id"
        :row-label="row => row.title" selection-mode="multiple" select-all-label="选择全部交付资料" empty-text="没有符合条件的资料" />
      <p class="toolbar-review__count"><SMotionText :value="batch" announce /></p>
      <SAlertDialog v-model:open="confirm" :title="operation === 'archive' ? '归档所选记录？' : '移除所选记录？'"
        description="操作只影响当前预览中的资料。" cancel-label="取消批量操作" confirm-label="确认批量操作" @confirm="apply" @close="restoreBatchFocus" />
    </div>
  </section>
</template>

<style scoped>
.toolbar-review { display: grid; inline-size: 100%; min-inline-size: 0; gap: var(--sy-space-4); }
.toolbar-review__card { padding: var(--sy-space-2); }
.toolbar-review__card :deep(.sy-toolbar) { padding-block-end: var(--sy-space-2); }
.toolbar-review__card h3 { margin: 0; overflow-wrap: anywhere; font-size: .92rem; }
.toolbar-review__card-body { padding: var(--sy-space-2); font-size: .85rem; }
.toolbar-review__sizes, .toolbar-review__column-picker { display: grid; gap: var(--sy-space-2); }
.toolbar-review__sizes :deep(.sy-field) { inline-size: min(32vw, 9rem); }
.toolbar-review__tabs, .toolbar-review__table { min-inline-size: 0; }
.toolbar-review__release-list { display: grid; gap: var(--sy-space-1); margin: 0; padding: 0; list-style: none; }
.toolbar-review__release-list > li { padding: var(--sy-space-2); border-radius: var(--sy-radius-sm); background: var(--sy-surface-muted); }
.toolbar-review-row-enter-active, .toolbar-review-row-move { transition: opacity var(--sy-duration) var(--sy-ease-settle), transform var(--sy-motion-replace) var(--sy-ease-settle); }
.toolbar-review-row-enter-from { opacity: 0; transform: translateY(5px); }
.toolbar-review__filters { gap: var(--sy-space-1); padding-block-end: var(--sy-space-2); }
.toolbar-review__filters :deep(.sy-toolbar__start .sy-field) { inline-size: min(100%, 8.75rem); }
.toolbar-review__clauses { flex: 1 1 0; min-inline-size: 4.25rem; }
.toolbar-review__clauses :deep(.sy-field__control) { white-space: nowrap; padding-inline: 8px; }
.toolbar-review__clauses :deep([data-set] .sy-field__control) { background: var(--sy-accent-soft); }
.toolbar-review__count { margin: 0; color: var(--sy-text-muted); font-size: .82rem; }
.toolbar-review__bulk { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows var(--sy-motion-replace) var(--sy-ease-settle), opacity var(--sy-duration) var(--sy-ease-settle); }
.toolbar-review__bulk[data-open] { grid-template-rows: 1fr; opacity: 1; }
.toolbar-review__bulk > div { overflow: clip; min-block-size: 0; }
@media (prefers-reduced-motion: reduce) {
  .toolbar-review__bulk, .toolbar-review-row-enter-active, .toolbar-review-row-move { transition: none; }
}
</style>
