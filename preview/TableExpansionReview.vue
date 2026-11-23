<script setup lang="ts">
import { computed, h, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { SButton, SCheckbox, STable, useAnimatedLayout, useTablePagination, useTableRowExpansion, useTableRowIndex, useTableSortableState, useTableTreeData, useTableTreeState,
  type TableColumn, type TableKey, type TableSort } from '../src'

interface FileRow { id: string; title: string; size: number; children?: readonly FileRow[] }
const files = ref<FileRow[]>([
  { id: 'design', title: '设计资料', size: 20, children: [{ id: 'colors', title: '颜色变量', size: 17 }, { id: 'keyboard', title: '键盘规范', size: 3 }] },
  { id: 'build', title: '构建资料', size: 8 },
])
const loaded = [{ id: 'reports', title: '验收报告', size: 8 }]
const columns: TableColumn<FileRow>[] = [
  { key: 'title', label: '文件名', rowHeader: true, value: row => row.title },
  { key: 'size', label: '文件大小', value: row => row.size, sortable: true, align: 'end' },
]
const treeSort = ref<TableSort | null>(null)
const treeKeys = ref<ReadonlySet<TableKey>>(new Set(['design']))
const selected = ref<readonly TableKey[]>([])
const flat = ref(false)
const sorting = useTableSortableState(() => ({ data: files.value, columns, sort: treeSort.value ? [treeSort.value] : [] }))
const treeState = useTableTreeState<FileRow>(() => ({
  data: flat.value ? loaded : files.value,
  idKey: 'id',
  expandedIds: treeKeys.value,
  onExpandedIdsChange(keys) {
    treeKeys.value = keys
    if (keys.has('build') && !files.value[1].children) files.value[1] = { ...files.value[1], children: loaded }
  },
  isItemExpandable: row => row.id === 'build' || Boolean(row.children?.length),
  sortSiblings: sorting.applySort,
  treeColumnKey: 'title',
}))
const tree = useTableTreeData(() => ({ ...treeState.treeConfig.value,
  hasExpandAllControl: true, hasRowClickExpansion: true, getRowLabel: row => row.title,
  getToggleLabel: (row, open) => `${open ? '收起' : '展开'}${row.title}`,
  expandAllLabel: '展开全部目录', collapseAllLabel: '收起全部目录',
}))
const keyOf = (row: FileRow) => row.id
const detailScope = useTemplateRef<HTMLElement>('detailScope')
const motion = useAnimatedLayout({ scope: detailScope })
const virtual = ref(false)
const expanded = ref<ReadonlySet<TableKey>>(new Set())
const detailIndex = useTableRowIndex<FileRow>({ label: '行号', startFrom: 10 })
const detailRows = computed(() => virtual.value ? Array.from({ length: 120 }, (_, index) => ({ id: 'asset-' + index,
  title: '版本 ' + (index + 1), size: index + 5 })) : [
  { id: 'asset-0', title: '素材清单', size: 12 }, { id: 'asset-1', title: '交付报告', size: 15 }, { id: 'asset-2', title: '发布说明', size: 8 },
])
function toggleDetail(id: TableKey) {
  const next = new Set(expanded.value)
  if (!next.delete(id)) next.add(id)
  expanded.value = next
}
const expansion = useTableRowExpansion(() => ({
  expandedKeys: expanded.value, onToggle: toggleDetail, getRowKey: keyOf,
  getRowLabel: row => row.title, getIsItemExpandable: row => row.id !== 'asset-1',
  getToggleLabel: (row, open) => `${open ? '收起' : '查看'}${row.title}详情`,
  renderExpanded: row => h('div', { class: 'review__stack' }, [
    h('p', `${row.title}共有 ${row.size} 项条目。`),
    h(SButton, { size: 'sm', variant: 'secondary', onClick: () => toggleDetail(row.id) }, () => '关闭当前详情'),
  ]),
  hasRowClickExpansion: true, panelVariant: 'muted', animatedLayout: motion.around,
}))

const records = Array.from({ length: 9 }, (_, index) => ({ id: String(index + 1), title: '归档记录 ' + (index + 1), size: index + 1 }))
const knownTotal = ref(false)
const loadingPage = ref(false)
const currentPage = ref(1)
const pageSize = ref(3)
const pageRows = computed(() => records.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
const archiveIndex = useTableRowIndex<FileRow>({ label: '序号' })
let pageTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(pageTimer))
const pagination = useTablePagination(() => ({
  page: currentPage.value, pageSize: pageSize.value, loading: loadingPage.value,
  totalItems: knownTotal.value ? records.length : undefined, hasMore: currentPage.value * pageSize.value < records.length,
  label: '归档分页', position: 'both', align: 'start', variant: knownTotal.value ? 'count' : 'compact', pageSizeOptions: [2, 3, 5],
  onPageChange(page) {
    loadingPage.value = true
    pageTimer = setTimeout(() => { currentPage.value = page; loadingPage.value = false }, 200)
  },
  onPageSizeChange(size) { pageSize.value = size; currentPage.value = 1 },
}))
</script>

<template>
  <div class="review__stack">
    <SCheckbox v-model="flat">单层资料</SCheckbox>
    <STable v-model:sort="treeSort" v-model:selected="selected" select-all-label="选择可见资料" selection-mode="multiple"
      label="文件目录示例" :rows="treeState.visibleData.value" :columns="columns" :row-key="keyOf" :row-label="row => row.title" :tree="tree" />
    <section ref="detailScope" class="review__stack" aria-label="展开详情示例">
      <SCheckbox v-model="virtual" @update:model-value="expanded = new Set()">虚拟详情列表</SCheckbox>
      <STable label="资料详情示例" :rows="detailRows" :columns="columns" :row-key="keyOf" :row-expansion="expansion" :row-index="detailIndex"
        :virtual="virtual ? { height: 220, estimatedRowHeight: 42 } : undefined" />
      <p>当前表格展示资料的摘要信息。</p>
    </section>
    <section class="review__stack" aria-label="归档分页示例">
      <SCheckbox v-model="knownTotal">显示归档总数</SCheckbox>
      <STable label="归档记录" :rows="pageRows" :columns="columns" :row-key="keyOf" :pagination="pagination" :row-index="archiveIndex" locale="zh-CN" column-layout="fixed"
        page-size-label="每页记录数" previous-label="上一页" next-label="下一页"
        :pagination-label="(label, position) => `${label}（${position === 'above' ? '顶部' : '底部'}）`" />
    </section>
  </div>
</template>
