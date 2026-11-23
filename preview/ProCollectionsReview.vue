<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  SActionBar, SButton, SDataGrid, SEmptyState, SFileTree, SFloatingToc, SMotionText, SSearchField, SSwitch,
  type ActionBarAction, type DataGridColumn, type DataGridEdit, type DataGridReorder, type FileTreeMove,
  type FileTreeNode, type FileTreeSection, type TableKey, type TocItem,
} from '../src'
import CollectionFocusReview from './CollectionFocusReview.vue'

defineProps<{ id: string }>()

interface Asset {
  id: string
  name: string
  owner: string
  pages: number
  status: '待评审' | '已确认'
  children?: Asset[]
}

const data = ref<readonly Asset[]>([
  { id: 'brand', name: '品牌交付', owner: '林芷', pages: 28, status: '待评审', children: [
    { id: 'manual', name: '品牌手册', owner: '林芷', pages: 16, status: '已确认' },
    { id: 'layout', name: '排版规范', owner: '陈明', pages: 12, status: '待评审' },
  ] },
  { id: 'resources', name: '组件清单', owner: '陈明', pages: 42, status: '待评审' },
  { id: 'review', name: '评审记录', owner: '许澄', pages: 8, status: '已确认' },
])
const rowKey = (item: Asset) => item.id
const assetChildren = (item: Asset) => item.children
const replaceAssetChildren = (item: Asset, children: readonly Asset[]) => ({ ...item, children: [...children] })
const columns: DataGridColumn<Asset>[] = [
  { key: 'name', label: '资料', value: row => row.name, rowHeader: true, pinned: 'start', sortable: true, width: 137, minWidth: 108, maxWidth: 230 },
  { key: 'owner', label: '负责人', value: row => row.owner, sortable: true, editable: true, width: '1fr', minWidth: 92 },
  { key: 'pages', label: '页数', value: row => row.pages, sortable: true, editable: true, input: 'number', align: 'end', width: 72, minWidth: 60 },
  { key: 'status', label: '状态', value: row => row.status, pinned: 'end', align: 'center', minWidth: 68, width: 68, resizable: false },
]
const selectedRows = ref<readonly TableKey[]>([])
const filter = ref('')
const longGrid = ref(false)
const batches = ref(0)
const fetching = ref(false)
const feedback = ref('')
let loadTimer: ReturnType<typeof setTimeout> | undefined
const generated = computed<readonly Asset[]>(() => Array.from({ length: 96 + batches.value * 24 }, (_, index) => ({
  id: `item-${index + 1}`, name: `设计记录 ${index + 1}`, owner: index % 2 ? '陈明' : '林芷',
  pages: (index * 7 % 44) + 1, status: index % 3 ? '待评审' : '已确认',
})))
const modified = ref<Record<string, Partial<Asset>>>({})
const gridRows = computed(() => longGrid.value ? generated.value.map(item => modified.value[item.id] ? { ...item, ...modified.value[item.id] } : item) : data.value)
const actions: ActionBarAction[] = [{ id: 'confirm', label: '确认选中项', shortLabel: '确认', variant: 'secondary' }]

function updateRows(rows: readonly Asset[], update: (item: Asset) => Asset): Asset[] {
  return rows.map(row => update(row.children ? { ...row, children: updateRows(row.children, update) } : row))
}

function edit(change: DataGridEdit<Asset>) {
  if (change.column.key !== 'owner' && change.column.key !== 'pages') return
  const key = change.row.id
  const patch = change.column.key === 'owner' ? { owner: String(change.value) } : { pages: Number(change.value) }
  if (longGrid.value) modified.value = { ...modified.value, [key]: { ...modified.value[key], ...patch } }
  else data.value = updateRows(data.value, row => row.id === key ? { ...row, ...patch } : row)
  feedback.value = `已更新${change.column.label}`
}

function confirm() {
  const keys = new Set(selectedRows.value)
  if (longGrid.value) {
    const patch = { ...modified.value }
    for (const key of keys) patch[String(key)] = { ...patch[String(key)], status: '已确认' }
    modified.value = patch
  } else data.value = updateRows(data.value, row => keys.has(row.id) ? { ...row, status: '已确认' } : row)
  feedback.value = `已确认 ${keys.size} 项`
  selectedRows.value = []
}

function between(next: boolean | undefined) {
  longGrid.value = Boolean(next)
  selectedRows.value = []
  feedback.value = ''
  clearTimeout(loadTimer)
  fetching.value = false
}

function loadMore() {
  if (fetching.value || batches.value >= 2) return
  fetching.value = true
  loadTimer = setTimeout(() => {
    batches.value++
    fetching.value = false
  }, 270)
}

function rearrange(change: DataGridReorder<Asset>) {
  if (!longGrid.value) data.value = change.rows
}

const tree: readonly FileTreeSection[] = [
  { id: 'workspace', label: '工作区', items: [
    { id: 'design', label: '设计资料', kind: 'folder', children: [
      { id: 'brand-book', label: '品牌手册', description: 'PDF' },
      { id: 'reference', label: '参考资料', kind: 'folder', children: [
        { id: 'colors', label: '配色记录', description: 'MD' },
        { id: 'sample', label: '初稿样张', description: 'PNG' },
      ] },
    ] },
    { id: 'publish', label: '发布目录', kind: 'folder', children: [
      { id: 'notes', label: '发布说明', description: 'MD' },
    ] },
    { id: 'summary', label: '项目概览', description: 'MD' },
  ] },
  { id: 'archive', label: '归档', items: [{ id: 'previous', label: '上一版手册', description: '只读', disabled: true }] },
]
const folders = ref(tree)
const picked = ref<readonly string[]>([])
const openedFile = ref('')
function moveFile(change: FileTreeMove) {
  folders.value = change.sections
  openedFile.value = `已移动 ${change.keys.length} 项`
}
function announceMove(keys: readonly string[], target: FileTreeNode | null) {
  return target ? `${keys.length} 项 · ${target.label}` : `移动 ${keys.length} 项`
}

interface ReviewSection extends TocItem { body: string; point: string; children?: readonly ReviewSection[] }
const sections: readonly ReviewSection[] = [
  { id: 'toc-overview', label: '项目概览', body: '品牌资料库汇集设计规范、交付文件和发布记录。', point: '资料按用途整理，同一份资料保留一个维护入口。', children: [
    { id: 'toc-scope', label: '收录范围', body: '收录产品界面、市场物料和对外发布时要用的规范。', point: '试验稿放在各项目内，确认后再收录到资料库。' },
  ] },
  { id: 'toc-delivery', label: '交付与复核', body: '交付前核对文字、尺寸和授权信息。', point: '复核完成后，将对应资料标记为已确认。', children: [
    { id: 'toc-publish', label: '发布记录', body: '每次发布记录改动范围、负责人和生效日期。', point: '只更新本次受影响的条目，旧记录仍可查阅。' },
  ] },
  { id: 'toc-maintenance', label: '维护与归档', body: '按项目维护文件归属。保留可追溯的版本历史。', point: '过期资料从工作列表归档，必要时可恢复。' },
]
const longToc = ref(false)
const pressMode = ref(true)
const scroller = ref<HTMLElement | null>(null)
const contentRoot = ref<HTMLElement | null>(null)
const tocItems = computed<readonly ReviewSection[]>(() => longToc.value ? Array.from({ length: 48 }, (_, index) => ({
  id: `toc-note-${index + 1}`, label: `交付记录 ${index + 1}`, body: '记录资料的维护范围，便于在发布后回查。',
  point: '每条记录对应一组可追溯的变更。',
})) : sections)
const documentSections = computed(() => tocItems.value.flatMap(section => [section, ...(section.children ?? [])]))

onBeforeUnmount(() => clearTimeout(loadTimer))
</script>

<template>
  <template v-if="id === 'WP.data-grid'">
  <SDataGrid
    v-model:selected="selectedRows" v-bind="{ rows: gridRows, columns, rowKey }"
    :get-children="assetChildren" :with-children="replaceAssetChildren" :row-label="row => row.name" :query="filter"
    :default-expanded="['brand']" :scroll-height="305" :virtual="longGrid ? { height: 286, estimatedRowHeight: 35 } : undefined"
    :reorderable="!longGrid" :has-more="longGrid && batches < 2 && !filter" :loading-more="fetching"
    :resize-label="column => `调整${column.label}宽度`"
    :toggle-label="(row, expanded) => `${expanded ? '收起' : '展开'}${row.name}`"
    label="项目资料网格" locale="zh-CN" selection-mode="multiple" column-resize sticky-header
    select-all-label="全选当前资料" select-column-label="选择资料" reorder-label="移动资料" more-text="加载更多"
    loading-text="正在加载资料" @edit="edit" @reorder="rearrange" @load-more="loadMore"
  >
    <template #toolbar>
      <div class="review-grid-tools">
        <SSearchField v-model="filter" label="筛选资料" placeholder="搜索名称或负责人" />
        <SSwitch :model-value="longGrid" @update:model-value="between">长列表</SSwitch>
      </div>
    </template>
    <template #empty><SEmptyState title="没有匹配的资料" size="sm" /></template>
    <template #footer>
      <div class="review-grid-footer">
        <SActionBar
          label="资料批量操作" :actions="actions" :count="selectedRows.length" selected-label="已选" unit-label="项"
          clear-label="取消" position="inline" :count-digits="2" @clear="selectedRows = []" @action="confirm"
        />
        <output><SMotionText :value="feedback" /></output>
      </div>
    </template>
  </SDataGrid>
  <CollectionFocusReview variant="grid" />
  </template>
  <template v-else-if="id === 'WP.file-tree'">
    <div class="review-file-tree">
      <SFileTree
        v-model:selected="picked" :sections="folders" :default-expanded="['design']"
        label="项目文件" selection-mode="multiple" draggable size="sm"
        :move-label="announceMove" @move="moveFile" @activate="item => { openedFile = `已打开${item.label}` }"
      />
      <output><SMotionText :value="openedFile" /></output>
    </div>
    <CollectionFocusReview variant="tree" />
  </template>
  <div v-else class="review-toc">
    <div class="review-toc__tools">
      <SSwitch v-model="pressMode">点击展开</SSwitch>
      <SSwitch v-model="longToc">长目录</SSwitch>
    </div>
    <div class="review-toc__frame">
      <div ref="scroller" class="review-toc__scroll" role="region" aria-label="文档预览" tabindex="0">
        <article ref="contentRoot" class="review-toc__document">
          <section v-for="section in documentSections" :key="section.id">
            <h3 :id="section.id">{{ section.label }}</h3>
            <p>{{ section.body }}</p>
            <p>{{ section.point }}</p>
          </section>
        </article>
      </div>
      <SFloatingToc
        :items="tocItems" :trigger-mode="pressMode ? 'press' : 'hover'" :scroll-root="scroller" :content-root="contentRoot"
        :virtual="longToc" :max-height="194" :open-delay="100" :close-delay="170" label="文档目录"
        trigger-label="打开目录" position="inline"
      />
    </div>
  </div>
</template>
