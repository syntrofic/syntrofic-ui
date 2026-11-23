<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { SAssetGallery, SButton, SCheckbox, SCloseButton, SDialog, SFileInput, SFilteredTable, SFormWizard, SInput, SMetadataList, SPopover, SSearchField, SSegment, SSelect,
  useTableColumnSettings, useTableGroupedRows, useTableStickyColumns } from '../src'
import type { GalleryAsset, SearchField, SearchFilter, TableColumn, TableColumnFilters, TableDensity, TableFilterVariant, TableKey, TableSavedView,
  TableViewSettings, WizardStep } from '../src'
import deliveryPreview from '../preview/assets/delivery-preview.mp4'
import deliveryCaptions from '../preview/assets/delivery-preview.vtt?url'

type Template = 'form-wizard' | 'form-wizard-inline' | 'form-wizard-vertical' | 'form-wizard-dialog' |
  'classic-gallery' | 'mixed-gallery' | 'side-gallery' | 'gallery-hero' | 'table-filter'
const props = defineProps<{ kind: Template }>()
const wizard = computed(() => props.kind.startsWith('form-wizard'))
const layouts = { 'classic-gallery': 'classic', 'mixed-gallery': 'mixed', 'side-gallery': 'side', 'gallery-hero': 'hero' } as const
const galleryLayout = computed(() => layouts[props.kind as keyof typeof layouts] ?? 'classic')
const open = ref(false)
const result = ref('')
const project = ref('')
const email = ref('')
const channel = ref('private')
const wizardFiles = ref<File[]>([])
const wizardStep = ref<string>()
const steps: WizardStep[] = [
  { id: 'project', title: '项目资料', description: '填写用于交付记录的项目名称。' },
  { id: 'contact', title: '联系信息', description: '填写项目负责人邮箱。' },
  { id: 'publish', title: '发布范围', description: '选择谁可以查看这项交付。' },
]
const wizardSteps = computed(() => props.kind === 'form-wizard-inline' ? [...steps, {
  id: 'checks', title: '接入检查', description: '依次检查项目名称和联系邮箱。', autoSubmit: true,
  tasks: [
    { id: 'project-label', title: '核对项目名称', run: () => project.value.trim().length >= 2 ? undefined : '项目名称至少需要两个字符。' },
    { id: 'email-address', title: '核对联系邮箱', run: () => email.value.includes('@') ? undefined : '请填写有效的联系邮箱。' },
  ],
}] : steps)
const guidance: Record<string, string> = {
  project: '使用团队在其他交付记录中采用的项目名。', email: '团队会使用这份记录对应的工作邮箱。', '发布范围': '外部协作者需要先加入指定的项目。',
  reference: '附上 PDF 或图片，帮助评审者核对交付范围。',
}
const channels = [{ value: 'private', label: '仅团队' }, { value: 'public', label: '团队与外部协作者' }]
const assets = shallowRef<readonly GalleryAsset[]>([])
const galleryCategories = ['地图', '资源', '项目']
const galleryLoading = ref(true)
const galleryError = ref('')
const media = new Map<string, Pick<GalleryAsset, 'src' | 'type' | 'poster' | 'tracks'>>([
  ['delivery', { src: '/demo-data/delivery-map.jpg' }],
  ['resources', { src: '/previews/dashboard-comparison.webp' }],
  ['version', { src: deliveryPreview, type: 'video', poster: '/previews/table-page.webp',
    tracks: [{ src: deliveryCaptions, language: 'zh', label: '中文' }] }],
])
let galleryRequest: AbortController | undefined

async function loadGallery() {
  galleryRequest?.abort()
  const controller = new AbortController()
  galleryRequest = controller
  galleryLoading.value = true
  galleryError.value = ''
  try {
    const response = await fetch('/demo-data/delivery-gallery.json', { signal: controller.signal })
    if (!response.ok) throw new Error('Gallery request failed')
    const records = await response.json() as Omit<GalleryAsset, 'src'>[]
    const next = records.map(record => {
      const asset = media.get(record.id)
      if (!asset) throw new Error('Unknown gallery asset')
      return { ...record, ...asset }
    })
    if (!controller.signal.aborted) assets.value = next
  } catch {
    if (!controller.signal.aborted) galleryError.value = '图集加载失败，请重试。'
  } finally {
    if (galleryRequest === controller) {
      galleryRequest = undefined
      galleryLoading.value = false
    }
  }
}
onMounted(() => { if (Object.hasOwn(layouts, props.kind)) void loadGallery() })
onScopeDispose(() => { galleryRequest?.abort(); galleryRequest = undefined })
type Delivery = { id: string; title: string; owner: string; files: number; stage: string; registered: string }
const rows = shallowRef<readonly Delivery[]>([])
const tableLoading = ref(true)
const tableError = ref('')
const archived = new Set<TableKey>()
let tableRequest: AbortController | undefined

async function loadDeliveryTable() {
  if (tableRequest) return
  const controller = new AbortController()
  tableRequest = controller
  tableLoading.value = true
  tableError.value = ''
  try {
    const response = await fetch('/demo-data/delivery-table.json', { signal: controller.signal })
    if (!response.ok) throw new Error('Delivery table request failed')
    const latest = await response.json() as Delivery[]
    if (!controller.signal.aborted) rows.value = latest.filter(row => !archived.has(row.id))
  } catch {
    if (!controller.signal.aborted) tableError.value = '交付资料加载失败。'
  } finally {
    if (tableRequest === controller) {
      tableRequest = undefined
      tableLoading.value = false
    }
  }
}
onMounted(() => { if (props.kind === 'table-filter') void loadDeliveryTable() })
onScopeDispose(() => { tableRequest?.abort(); tableRequest = undefined })
const columns: TableColumn<Delivery>[] = [
  { key: 'title', label: '资料', value: row => row.title, filter: 'title', rowHeader: true, minWidth: 128 },
  { key: 'owner', label: '负责人', value: row => row.owner, filter: 'owner', sortable: true, minWidth: 122 },
  { key: 'files', label: '文件数', value: row => row.files, filter: { field: 'files', operator: 'gte' }, sortable: true, minWidth: 122 },
  { key: 'stage', label: '进度', value: row => row.stage, filter: 'stage', minWidth: 112 },
  { key: 'registered', label: '更新时间', value: row => row.registered, filter: 'registered', minWidth: 132 },
]
const fields: SearchField[] = [
  { key: 'owner', label: '负责人', type: 'enum', options: ['林舟', '周昱'].map(label => ({ value: label, label })) },
  { key: 'title', label: '资料' },
  { key: 'files', label: '文件数', type: 'number', operators: ['is', 'gt', 'gte', 'lte'] },
  { key: 'stage', label: '进度', type: 'list', operators: ['in', 'not-in', 'is'], options: ['归档', '评审', '发布'].map(label => ({ value: label, label })) },
  { key: 'registered', label: '更新时间', type: 'date' },
]
const criteria = { add: '添加筛选', apply: '应用', cancel: '取消', clear: '清空筛选', remove: '移除筛选', field: '字段', operator: '条件', value: '值' }
const operations = { is: '等于', 'is-not': '不等于', contains: '包含', 'starts-with': '开头为', gt: '大于', lt: '小于', gte: '至少', lte: '至多' }
const columnVariant = ref<TableFilterVariant>('popover')
const columnVariants: { value: TableFilterVariant; label: string }[] = [
  { value: 'popover', label: '弹出' }, { value: 'inline', label: '行内' }, { value: 'inline-compact', label: '紧凑' },
]
const columnUi = { apply: '应用', clear: '清除', choose: '请选择', calendar: '选日期' }
const query = ref('')
const filters = ref<SearchFilter[]>([])
const columnFilters = ref<TableColumnFilters>({})
const savedViews = ref<TableSavedView[]>([
  { id: 'delivery-lin', label: '林舟负责', query: '', filters: [{ field: 'owner', operator: 'is', value: '林舟' }],
    settings: { groupBy: 'stage', density: 'compact', sticky: 'start' } },
  { id: 'delivery-review', label: '待评审', query: '', filters: [{ field: 'stage', operator: 'in', value: '评审', values: ['评审'] }] },
])
const savedViewsStorage = 'syntrofic-template-table-views'
if (props.kind === 'table-filter') {
  onMounted(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(savedViewsStorage) ?? 'null')
      if (Array.isArray(stored)) {
        savedViews.value = stored.filter(view => typeof view?.id === 'string' && typeof view.label === 'string'
          && typeof view.query === 'string' && Array.isArray(view.filters) && view.filters.every((filter: unknown) => filter && typeof filter === 'object')
          && (view.expression === undefined || typeof view.expression === 'string'))
      }
    } catch { /* Keep views available in the current page if storage is unavailable. */ }
  })
  watch(savedViews, views => {
    try { window.localStorage.setItem(savedViewsStorage, JSON.stringify(views)) }
    catch { /* Keep the current in-memory views. */ }
  })
}
const advanced = ref(true)
function quickFilter(field: string) {
  return computed({
    get: () => filters.value.find(filter => filter.field === field && filter.operator === 'is')?.value,
    set: value => {
      const remaining = filters.value.filter(filter => filter.field !== field || filter.operator !== 'is')
      filters.value = value ? [...remaining, { field, operator: 'is', value }] : remaining
    },
  })
}
const quickOwner = quickFilter('owner')
const quickStage = quickFilter('stage')
const quickOwners = fields.find(field => field.key === 'owner')!.options!
const quickStages = fields.find(field => field.key === 'stage')!.options!
const choices = {
  groups: [{ value: 'none', label: '不分组' }, { value: 'owner', label: '按负责人' }, { value: 'stage', label: '按进度' }],
  densities: [{ value: 'comfortable', label: '舒展' }, { value: 'compact', label: '紧凑' }],
  pins: [{ value: 'none', label: '无固定列' }, { value: 'start', label: '起始侧' }, { value: 'end', label: '结束侧' }, { value: 'both', label: '两侧' }],
}
const settings = ref<TableViewSettings>()
const groupBy = computed({
  get: () => settings.value?.groupBy ?? 'none',
  set: value => { settings.value = { ...settings.value, groupBy: value } },
})
const layoutDensity = computed({
  get: () => settings.value?.density ?? 'comfortable',
  set: value => { settings.value = { ...settings.value, density: value as TableDensity } },
})
const layoutPin = computed({
  get: () => settings.value?.sticky ?? 'none',
  set: value => { settings.value = { ...settings.value, sticky: value } },
})
const columnSettings = useTableColumnSettings(() => ({
  columns: columns.map(column => ({ key: column.key, label: column.label, isAlwaysVisible: column.rowHeader })),
  activeColumnKeys: settings.value?.columns ?? columns.map(column => column.key),
  onChangeActiveColumnKeys(keys) { settings.value = { ...settings.value, columns: keys } },
}))
const pinColumns = useTableStickyColumns(() => {
  const active = columnSettings.activeColumnKeys.value
  return {
    startKeys: layoutPin.value === 'start' || layoutPin.value === 'both' ? [active[0]] : [],
    endKeys: layoutPin.value === 'end' || layoutPin.value === 'both' ? active.slice(-1) : [],
  }
})
const collapsed = ref<ReadonlySet<TableKey>>(new Set())
const groupRows = useTableGroupedRows(() => ({
  data: rows.value, groupBy: (row: Delivery) => groupBy.value === 'owner' ? row.owner : row.stage,
  collapsedGroups: collapsed.value, getGroupLabel: (key, count) => `${key} · ${count} 条资料`,
  onToggleGroup(key, next) {
    const updated = new Set(collapsed.value)
    if (next) updated.add(key)
    else updated.delete(key)
    collapsed.value = updated
  },
}))
watch(groupBy, () => { collapsed.value = new Set() })
const selected = ref<readonly TableKey[]>([])
const inspected = ref<TableKey>()
const actionMessage = ref('')
function archiveSelected() {
  const count = selected.value.length
  for (const key of selected.value) archived.add(key)
  rows.value = rows.value.filter(row => !selected.value.includes(row.id))
  if (inspected.value && selected.value.includes(inspected.value)) inspected.value = undefined
  selected.value = []
  actionMessage.value = `已归档 ${count} 条资料。`
}
function moveColumn(key: string, shift: number) {
  const keys = [...columnSettings.activeColumnKeys.value]
  const index = keys.indexOf(key)
  if (index < 1 || index + shift < 1 || index + shift >= keys.length) return
  keys.splice(index + shift, 0, ...keys.splice(index, 1))
  columnSettings.setActiveColumnKeys(keys)
}

function finish(data: ReadonlyMap<string, FormData>) {
  const name = data.get('project')?.get('project')
  result.value = name ? '已完成 ' + String(name) + ' 的交付设置' : '已完成交付设置'
  open.value = false
}
function openWizard() { result.value = ''; wizardStep.value = undefined; open.value = true }
</script>

<template>
  <template v-if="wizard">
    <SButton v-if="kind === 'form-wizard-dialog'" @click="openWizard">配置交付</SButton>
    <component :is="kind === 'form-wizard-dialog' ? SDialog : 'div'"
      v-bind="kind === 'form-wizard-dialog' ? { title: '配置交付', open, size: 'md', showCloseButton: true, dismissLabel: '关闭' } : {}"
      @update:open="open = $event">
      <SFormWizard v-if="kind !== 'form-wizard-dialog' || open" v-model="wizardStep" :steps="wizardSteps" label="配置交付"
        :layout="kind === 'form-wizard-vertical' ? 'vertical' : kind === 'form-wizard-inline' ? 'inline' : 'horizontal'"
        previous-label="上一步" next-label="下一步" finish-label="确认交付" complete-label="已完成" pending-label="待填写" task-label="接入检查项目" @finish="finish">
        <template #default="{ step }">
          <template v-if="step.id === 'project'">
            <SInput v-model="project" label="项目名称" name="project" required />
            <SFileInput v-if="kind === 'form-wizard-vertical'" v-model="wizardFiles" label="交付参考" name="reference"
              browse-label="选择附件" accept="image/*,.pdf" multiple :max-files="4" />
          </template>
          <SInput v-else-if="step.id === 'contact'" v-model="email" label="联系邮箱" name="email" type="email" required />
          <template v-else-if="step.id === 'publish'">
            <SMetadataList v-if="kind === 'form-wizard-vertical'" label="交付预览" :items="[
              { id: 'project', label: '项目', value: project },
              { id: 'owner', label: '负责人邮箱', value: email },
              { id: 'files', label: '参考附件', value: wizardFiles.map(file => file.name).join('、') || '未附加文件' },
            ]" />
            <SSelect v-model="channel" :options="channels" label="发布范围" name="channel" required />
          </template>
        </template>
        <template #summary="{ saved }">{{ saved?.get('project') || saved?.get('email') || '已完成' }}</template>
        <template #guide="{ step, field }"><h3>填写指引</h3><p>{{ guidance[field ?? ''] ?? step.description }}</p></template>
      </SFormWizard>
    </component>
    <p v-if="result" role="status">{{ result }}</p>
  </template>
  <div v-else-if="kind === 'table-filter'" class="template-filter-demo">
    <div class="template-filter-demo__toolbar">
      <SSegment v-model="columnVariant" label="列筛选显示方式" :items="columnVariants" size="sm" />
      <SButton size="sm" variant="ghost" :aria-pressed="!advanced" @click="advanced = !advanced">快捷筛选</SButton>
    </div>
    <div v-if="!advanced" class="template-filter-demo__toolbar">
      <SSearchField v-model="query" label="搜索交付资料" />
      <SSelect v-model="quickOwner" :options="quickOwners" label="按负责人筛选" clearable clear-label="清除负责人筛选" />
      <SSelect v-model="quickStage" :options="quickStages" label="按进度筛选" clearable clear-label="清除进度筛选" />
    </div>
    <SFilteredTable v-model:inspected="inspected" v-model:selected="selected" v-model:view-settings="settings"
      v-model:query="query" v-model:filters="filters" v-model:column-filters="columnFilters" v-model:views="savedViews" :show-search="advanced"
      label="交付资料" :rows="rows" :columns="columns" :fields="fields" :column-settings="columnSettings.control" advanced-query
      column-layout="fixed" saved-view-presentation="strip" :loading="tableLoading" :error="tableError" @retry="loadDeliveryTable"
      :row-groups="groupBy === 'none' ? undefined : groupRows.control" :sticky-columns="pinColumns" :row-label="row => row.title"
      :row-key="row => row.id" :get-field="(row, key) => row[key as keyof typeof row]" :get-text="row => [row.title, row.owner].join(' ')"
      :labels="{ search: '搜索交付资料', views: '已保存视图', name: '视图名称', save: '保存', saveView: '保存视图', removeView: '删除视图',
        editView: '编辑视图', allViews: '全部资料', closeView: '关闭视图', viewContents: '视图内容', viewFilters: '筛选条件', viewColumns: '显示列',
        viewDensity: '行距', viewGrouping: '分组', viewPinned: '固定列', compact: '紧凑', comfortable: '舒展', none: '无',
        pinStart: '起始侧', pinEnd: '结束侧', pinBoth: '两侧',
        noResults: '没有资料符合筛选条件。', loading: '正在加载交付资料…', retry: '重试',
        details: '资料详情', selectDetail: '选择资料查看详情。', closeDetails: '关闭资料详情', resizeDetails: '调整资料详情宽度',
        clearColumnFilters: '清除列筛选', advanced: '查询语法', expression: '高级查询',
        expressionHint: '可使用字段名或列标题。示例：文件数 >= 6 AND (负责人 = 林舟 OR 进度 in (评审, 发布))。含空格的值用双引号。',
        applyExpression: '应用查询', clearExpression: '清除查询条件', invalidExpression: '请检查查询语法。',
        unknownField: '查询包含未知字段。', unsupportedOperator: '该字段不支持此运算符。',
        invalidValue: '查询值与字段类型或可选值不符。', expressionResults: '{count} 条查询结果' }"
      :filtersUI="criteria" :operatorsUI="operations" :column-filter-variant="columnVariant" :column-filter-labels="columnUi"
      :get-column-filter-label="label => '筛选 · ' + label" locale="zh-CN">
      <template #actions>
        <SPopover label="视图选项">
          <template #trigger><SButton variant="secondary" size="sm">视图选项</SButton></template>
          <div class="template-filter-demo__settings">
            <SSelect v-model="groupBy" :options="choices.groups" label="分组" />
            <SSelect v-model="layoutDensity" :options="choices.densities" label="行距" />
            <SSelect :model-value="layoutPin" :options="choices.pins" label="固定列"
              @update:model-value="layoutPin = $event as typeof layoutPin" />
            <div class="template-filter-demo__columns" role="group" aria-label="表格列">
              <div v-for="column in columnSettings.pickerOptions.value" :key="column.value" class="template-filter-demo__column">
                <SCheckbox :model-value="columnSettings.isColumnActive(column.value)" :disabled="column.disabled"
                  @update:model-value="columnSettings.toggleColumn(column.value)">{{ column.label }}</SCheckbox>
                <div v-if="!column.disabled && columnSettings.isColumnActive(column.value)">
                  <SButton size="sm" variant="ghost" :aria-label="'前移列 · ' + column.label" @click="moveColumn(column.value, -1)">↑</SButton>
                  <SButton size="sm" variant="ghost" :aria-label="'后移列 · ' + column.label" @click="moveColumn(column.value, 1)">↓</SButton>
                </div>
              </div>
            </div>
            <SButton size="sm" variant="ghost" @click="columnSettings.resetToDefault">恢复默认列</SButton>
          </div>
        </SPopover>
        <SButton size="sm" variant="ghost" :loading="tableLoading" @click="loadDeliveryTable">重新加载</SButton>
        <SButton v-if="selected.length" size="sm" variant="secondary" @click="archiveSelected">归档 {{ selected.length }} 条已选资料</SButton>
      </template>
      <template #cell="{ column, value, inspect, inspection }">
        <button v-if="column.rowHeader" type="button" class="template-filter-demo__inspect" v-bind="inspection"
          @click="inspect">{{ value }}</button>
        <template v-else>{{ value }}</template>
      </template>
      <template #details="{ row, compact, close }">
        <div class="template-filter-demo__detail-heading">
          <h3>{{ row.title }}</h3>
          <SCloseButton v-if="!compact" label="关闭资料详情" @click="close" />
        </div>
        <SMetadataList :items="[{ id: 'owner', label: '负责人', value: row.owner }, { id: 'files', label: '文件数', value: row.files },
          { id: 'stage', label: '进度', value: row.stage }, { id: 'registered', label: '更新时间', value: row.registered }]" />
      </template>
    </SFilteredTable>
    <p v-if="actionMessage" role="status">{{ actionMessage }}</p>
  </div>
  <SAssetGallery v-else label="交付资料图集" :layout="galleryLayout" :assets="assets" :categories="galleryCategories"
    :loading="galleryLoading" :error="galleryError" loading-label="正在加载图集…" retry-label="重试" @retry="loadGallery"
    search-label="搜索图集"
    categories-label="资料类型" all-label="全部" empty-label="没有匹配的资料。" view-label="查看" close-label="关闭" next-label="下一张" previous-label="上一张">
    <template #actions>
      <a v-if="kind === 'side-gallery' || kind === 'gallery-hero'" class="sy-button" data-variant="secondary" data-size="sm" href="/templates/product-detail/">查看地图介绍</a>
      <SButton size="sm" variant="ghost" :aria-disabled="galleryLoading" @click="!galleryLoading && loadGallery()">重新加载</SButton>
    </template>
  </SAssetGallery>
</template>

<style scoped>
.template-filter-demo { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.template-filter-demo__toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: var(--sy-space-2); }
.template-filter-demo__settings {
  display: grid;
  gap: var(--sy-space-2);
  min-inline-size: min(15rem, 76vw);
  max-block-size: calc(var(--reka-popover-content-available-height, 100dvh) - 24px);
  grid-template-rows: repeat(3, auto) minmax(0, 1fr) auto;
}
.template-filter-demo__columns { overflow-y: auto; padding: 2px; }
.template-filter-demo__column { display: flex; justify-content: space-between; align-items: center; }
.template-filter-demo__detail-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--sy-space-2); }
.template-filter-demo__detail-heading h3 { margin: 0; }
.template-filter-demo__inspect { border: 0; color: inherit; background: transparent; padding: .25rem 0; font: inherit; text-align: start; cursor: pointer; }
.template-filter-demo__inspect:is(:hover, :focus-visible, [aria-pressed="true"]) { color: var(--sy-accent-text); text-decoration: underline; }
</style>
