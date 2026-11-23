<script lang="ts">
import type { SearchFilter } from '../components/SPowerSearch.vue'
import type { TableColumnFilters } from '../internal/table-filtering'
import type { TableDensity } from '../types'

export interface TableViewSettings {
  columns?: readonly string[]
  density?: TableDensity
  sticky?: 'none' | 'start' | 'end' | 'both'
  groupBy?: string
}

export interface TableSavedView {
  id: string
  label: string
  query: string
  filters: readonly SearchFilter[]
  expression?: string
  columnFilters?: TableColumnFilters
  settings?: TableViewSettings
}
</script>

<script setup lang="ts" generic="Row extends object">
import { computed, nextTick, ref, shallowRef, useId, useSlots, useTemplateRef, watch } from 'vue'
import SAdaptiveDialog from '../components/SAdaptiveDialog.vue'
import SButton from '../components/SButton.vue'
import SInput from '../components/SInput.vue'
import SMetadataList from '../components/SMetadataList.vue'
import SMotionText from '../components/SMotionText.vue'
import SSelect from '../components/SSelect.vue'
import SResizable from '../components/SResizable.vue'
import SScrollShadow from '../components/SScrollShadow.vue'
import SSheet from '../components/SSheet.vue'
import SPowerSearch, { type SearchField } from '../components/SPowerSearch.vue'
import STable from '../components/STable.vue'
import SToggleButtonGroup from '../components/SToggleButtonGroup.vue'
import { useCollectionContentMotion } from '../internal/collection-motion'
import { documentFocus } from '../internal/focus-order'
import { useAnimatedLayout } from '../internal/motion'
import { useShellCompact } from '../internal/shell-layout'
import { treeElementKey } from '../internal/tree-data'
import type { SheetHeight } from '../internal/panel'
import type { ResizablePanel } from '../internal/resizable'
import type { TableCell, TableColumn, TableKey } from '../types'
import type { TableGroupedRowsControl, TableRowStatus } from '../internal/table-features'
import type { TableColumnSettingsControl } from '../internal/table-column-settings'
import type { TableStickyColumnsControl } from '../internal/table-column-sticky'
import { formatSearchFilter, usePowerSearchConfig } from '../internal/search-filters'
import { compileSearchExpression } from '../internal/search-expression'
import { setTableColumnFilter, toSearchFilters, useTableFiltering, validColumnFilter,
  type TableColumnFilteringOptions, type TableFilterVariant } from '../internal/table-filtering'

const props = withDefaults(defineProps<{
  label: string
  rows: readonly Row[]
  columns: readonly TableColumn<Row>[]
  rowKey: (row: Row) => TableKey
  rowLabel?: (row: Row) => string
  rowStatus?: (row: Row) => TableRowStatus | null | undefined
  statusColumnLabel?: string
  selectAllLabel?: string
  fields: readonly SearchField[]
  getField: (row: Row, key: string) => TableCell
  getText: (row: Row) => string
  pageSize?: number
  columnLayout?: 'auto' | 'fixed'
  savedViewPresentation?: 'select' | 'strip'
  loading?: boolean
  error?: string
  rowGroups?: TableGroupedRowsControl<Row>
  columnSettings?: TableColumnSettingsControl
  stickyColumns?: TableStickyColumnsControl
  compactWidth?: number
  detailsHeight?: SheetHeight
  showSearch?: boolean
  advancedQuery?: boolean
  labels?: Partial<Record<'search' | 'views' | 'saveView' | 'removeView' | 'name' | 'save' | 'noResults' | 'loading' | 'retry' | 'clearColumnFilters'
    | 'advanced' | 'expression' | 'expressionHint' | 'applyExpression' | 'clearExpression' | 'invalidExpression'
    | 'unknownField' | 'unsupportedOperator' | 'invalidValue' | 'expressionResults'
    | 'details' | 'selectDetail' | 'closeDetails' | 'resizeDetails' | 'editView' | 'allViews' | 'viewContents' | 'closeView'
    | 'viewFilters' | 'viewColumns' | 'viewDensity' | 'viewGrouping' | 'viewPinned' | 'compact' | 'comfortable'
    | 'none' | 'pinStart' | 'pinEnd' | 'pinBoth', string>>
  filtersUI?: InstanceType<typeof SPowerSearch>['$props']['labels']
  operatorsUI?: InstanceType<typeof SPowerSearch>['$props']['operatorLabels']
  columnFilterVariant?: TableFilterVariant
  columnFilterLabels?: TableColumnFilteringOptions['labels']
  getColumnFilterLabel?: TableColumnFilteringOptions['getLabel']
  locale?: string
  timeZone?: string
}>(), { pageSize: 10, showSearch: true, compactWidth: 800, detailsHeight: 'capped', savedViewPresentation: 'select' })
const emit = defineEmits<{ retry: [] }>()
const slots = useSlots()
const id = useId()
const root = useTemplateRef<HTMLElement>('root')
const resultPanel = useTemplateRef<HTMLElement>('resultPanel')
const detailPane = useTemplateRef<HTMLElement>('detailPane')
const retainedError = useTemplateRef<HTMLElement>('retainedError')
const query = defineModel<string>('query', { default: '' })
const filters = defineModel<SearchFilter[]>('filters', { default: () => [] })
const expression = defineModel<string>('expression', { default: '' })
const columnFilters = defineModel<TableColumnFilters>('columnFilters', { default: () => ({}) })
const savedViews = defineModel<TableSavedView[]>('views', { default: () => [] })
const viewSettings = defineModel<TableViewSettings>('viewSettings')
const selected = defineModel<readonly TableKey[]>('selected', { default: () => [] })
const inspected = defineModel<TableKey>('inspected')
const active = ref<string>()
const page = ref(1)
type ViewSnapshot = Omit<TableSavedView, 'id' | 'label'>
const editor = ref<{ id?: string; name?: string; snapshot: ViewSnapshot }>()
const editorOpen = ref(false)
const layoutView = useAnimatedLayout({ scope: resultPanel })
const expressionOpen = ref(false)
const expressionDraft = ref<string>()
const submittedExpression = ref(false)
const expressionInput = useTemplateRef('expressionInput')
const expressionPanelId = id + '-expression'
let sequence = 0

const ui = computed(() => ({
  search: 'Search rows', views: 'Saved views', saveView: 'Save view', removeView: 'Remove selected view',
  name: 'View name', save: 'Save', noResults: 'No results', loading: 'Loading rows', retry: 'Retry', clearColumnFilters: 'Clear column filters',
  advanced: 'Query syntax', expression: 'Advanced query',
  expressionHint: 'Use field comparisons, AND, OR, NOT and parentheses. Put values containing spaces inside double quotes.',
  applyExpression: 'Apply query', clearExpression: 'Clear query', invalidExpression: 'Check the query syntax.',
  unknownField: 'Check the field names in the query.', unsupportedOperator: 'A field does not support the selected operator.',
  invalidValue: 'A value does not match its field.', expressionResults: '{count} results',
  details: 'Record details', selectDetail: 'Select a row to view its details.', closeDetails: 'Close details', resizeDetails: 'Resize record details',
  allViews: 'All records', editView: 'Edit saved view', closeView: 'Close saved view', viewContents: 'Saved settings',
  viewFilters: 'Filters', viewColumns: 'Columns', viewDensity: 'Density', viewGrouping: 'Grouping', viewPinned: 'Pinned columns',
  compact: 'Compact', comfortable: 'Comfortable', none: 'None', pinStart: 'Start', pinEnd: 'End', pinBoth: 'Both edges', ...props.labels,
}))
const compact = useShellCompact(computed(() => slots.details ? root.value : null), () => props.compactWidth)
const detailsId = id + '-details'
const sheetId = id + '-detail-sheet'
const panels = computed<ResizablePanel[]>(() => [
  { id: 'results', defaultSize: compact.value ? 100 : 72, minSize: compact.value ? undefined : '330px' },
  ...(compact.value ? [] : [{ id: 'details', label: ui.value.details, defaultSize: 28, minSize: '200px' as const }]),
])
const inspectedRow = computed(() => inspected.value === undefined ? undefined : props.rows.find(row => props.rowKey(row) === inspected.value))
const sheetOpen = computed(() => compact.value && Boolean(inspectedRow.value))
const sheetRow = shallowRef<Row>()
let opener: { key: TableKey; element: HTMLElement } | undefined

watch([sheetOpen, inspectedRow], ([open, row]) => {
  // Keep the last record readable until the sheet finishes exiting.
  if (open && row) sheetRow.value = row
}, { flush: 'pre', immediate: true })
useCollectionContentMotion(detailPane, () => inspectedRow.value ? treeElementKey(props.rowKey(inspectedRow.value)) : '', {
  content: panel => panel.querySelector(':scope > .sy-filtered-table__detail-content'),
})

function inspect(row: Row, event?: MouseEvent) {
  const key = props.rowKey(row)
  opener = event?.currentTarget instanceof HTMLElement ? { key, element: event.currentTarget } : undefined
  // WebKit does not focus a native button after a tap. Record it before the sheet captures focus.
  if (compact.value) opener?.element.focus({ preventScroll: true })
  inspected.value = key
}

function inspectionAttributes(row: Row) {
  const current = inspected.value === props.rowKey(row)
  return {
    'aria-controls': compact.value ? current && sheetOpen.value ? sheetId : undefined : detailsId,
    'aria-haspopup': compact.value ? 'dialog' as const : undefined,
    'aria-expanded': compact.value ? current && sheetOpen.value : undefined,
    'aria-pressed': compact.value ? undefined : current,
  }
}

function closeDetails() {
  const pane = detailPane.value
  if (!compact.value && pane?.contains(documentFocus(pane.ownerDocument) ?? null)) {
    const target = opener?.key === inspected.value && opener?.element.isConnected ? opener.element : root.value
    target?.focus({ preventScroll: true })
  }
  opener = undefined
  inspected.value = undefined
}
const { config, applyFilters } = usePowerSearchConfig(() => props.fields, () => ({ timeZone: props.timeZone }))
const columnFiltering = useTableFiltering(() => ({ filters: columnFilters.value, searchConfig: config.value,
  variant: props.columnFilterVariant, locale: props.locale, labels: props.columnFilterLabels, getLabel: props.getColumnFilterLabel,
  onFilterChange(key, value) { columnFilters.value = setTableColumnFilter(columnFilters.value, key, value) },
}))
const hasColumnFilters = computed(() => Object.values(columnFilters.value).some(validColumnFilter))
const supportsColumnFilters = computed(() => props.columns.some(column => columnFiltering.fieldFor(column.filter)))
const searchRows = useTableFiltering({ rows: () => props.rows, fields: () => props.fields,
  state: () => ({ query: query.value, filters: filters.value }), getField: (row, key) => props.getField(row, key), getText: row => props.getText(row),
  timeZone: () => props.timeZone })
const rules = computed(() => toSearchFilters(columnFilters.value, props.columns, config.value))
const compiled = computed(() => compileSearchExpression(expression.value, props.fields, props.timeZone))
const draft = computed(() => compileSearchExpression(expressionDraft.value ?? '', props.fields, props.timeZone))
const visibleExpressionError = computed(() => {
  const error = submittedExpression.value && draft.value.error
  if (!error) return
  const messages = { invalid: ui.value.invalidExpression, field: ui.value.unknownField, operator: ui.value.unsupportedOperator, value: ui.value.invalidValue }
  return { type: 'error' as const, message: messages[error] }
})
const rows = computed(() => {
  const filtered = rules.value.length ? applyFilters(rules.value, searchRows.value, props.getField) : searchRows.value
  const match = props.advancedQuery && expression.value ? compiled.value.match : undefined
  if (!match) return filtered
  const now = new Date()
  return filtered.filter(row => match(key => props.getField(row, key), props.getText(row), now))
})
const loadError = computed(() => props.loading ? undefined : props.error)
const refreshError = computed(() => rows.value.length > 0 && loadError.value)
watch(refreshError, next => {
  const notice = retainedError.value
  if (!next && notice?.contains(notice.ownerDocument.activeElement)) root.value?.focus({ preventScroll: true })
})
function columnSnapshot(values: TableColumnFilters = {}) {
  return JSON.stringify(Object.keys(values).sort().map(key => [key, values[key]]))
}
function copyFilters(values: readonly SearchFilter[]): SearchFilter[] {
  return values.map(filter => ({ ...filter, values: filter.values && [...filter.values], children: filter.children && copyFilters(filter.children) }))
}
function copyColumns(values: TableColumnFilters = {}): TableColumnFilters {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'object' ? [...value] : value]))
}
function copySettings(value?: TableViewSettings) {
  return value && { columns: value.columns && [...value.columns], density: value.density, sticky: value.sticky, groupBy: value.groupBy }
}
const currentView = computed(() => savedViews.value.find(view => view.id === active.value))
const items = computed(() => [{ value: 'all', label: ui.value.allViews },
  ...savedViews.value.map(view => ({ value: `view:${view.id}`, label: view.label }))])
const selectedView = computed(() => currentView.value ? `view:${currentView.value.id}` :
  !query.value && !filters.value.some(filter => !filter.readonly) && !expression.value && !hasColumnFilters.value ? 'all' : undefined)
const viewSummary = computed(() => {
  const snapshot = editor.value?.snapshot
  if (!snapshot) return []
  const settings = snapshot.settings
  const columnLabels = new Map(props.columns.map(column => [column.key, column.label]))
  const labels = ui.value
  const clauses = [...snapshot.filters, ...toSearchFilters(snapshot.columnFilters ?? {}, props.columns, config.value)]
    .map(filter => formatSearchFilter(filter, props.fields, { operatorLabels: props.operatorsUI, valueLabels: props.filtersUI,
      locale: props.locale, timeZone: props.timeZone }))
  const grouping = settings?.groupBy
  const pinned = settings?.sticky && { none: labels.none, start: labels.pinStart, end: labels.pinEnd, both: labels.pinBoth }[settings.sticky]
  return [
    { id: 'query', label: labels.search, value: snapshot.query },
    { id: 'filters', label: labels.viewFilters, value: clauses.join(' · ') },
    { id: 'expression', label: labels.expression, value: snapshot.expression },
    { id: 'columns', label: labels.viewColumns, value: (settings?.columns ?? [...columnLabels.keys()]).map(key => columnLabels.get(key) ?? key).join(', ') },
    { id: 'density', label: labels.viewDensity, value: settings?.density === 'compact' ? labels.compact : labels.comfortable },
    { id: 'grouping', label: labels.viewGrouping, value: grouping && grouping !== 'none' ? columnLabels.get(grouping) ?? grouping : labels.none },
    { id: 'pinned', label: labels.viewPinned, value: pinned || labels.none },
  ].flatMap(({ id, label, value }) => value ? [{ id, label, value }] : [])
})
watch([query, filters, expression, columnFilters, () => viewSettings.value?.groupBy], () => { page.value = 1 }, { deep: true })
watch([query, filters, expression, columnFilters, viewSettings, savedViews], () => {
  const saved = currentView.value
  if (!saved || saved.query !== query.value || (saved.expression ?? '') !== expression.value || JSON.stringify(saved.filters) !== JSON.stringify(filters.value)
    || columnSnapshot(saved.columnFilters) !== columnSnapshot(columnFilters.value)
    || JSON.stringify(copySettings(saved.settings)) !== JSON.stringify(copySettings(viewSettings.value))) active.value = undefined
}, { deep: true })
watch(expression, next => { expressionDraft.value = next; submittedExpression.value = false })

async function toggleExpression() {
  expressionOpen.value = !expressionOpen.value
  expressionDraft.value = expression.value
  submittedExpression.value = false
  if (expressionOpen.value) {
    await nextTick()
    expressionInput.value?.focus()
  }
}
function applyExpression() {
  submittedExpression.value = true
  if (draft.value.match) expression.value = expressionDraft.value?.trim() ?? ''
}
function clearExpression() {
  expression.value = ''
  expressionDraft.value = ''
  submittedExpression.value = false
}

function pick(choice?: string) {
  const view = choice?.startsWith('view:') ? savedViews.value.find(view => view.id === choice.slice(5)) : undefined
  if (choice?.startsWith('view:') && !view) return
  const play = layoutView()
  active.value = view?.id
  query.value = view?.query ?? ''
  filters.value = view ? copyFilters(view.filters) : filters.value.filter(filter => filter.readonly)
  expression.value = view?.expression ?? ''
  expressionDraft.value = expression.value
  submittedExpression.value = false
  columnFilters.value = copyColumns(view?.columnFilters)
  if (view) viewSettings.value = copySettings(view.settings)
  page.value = 1
  void nextTick(play)
}
function captureView(): ViewSnapshot {
  return { query: query.value, filters: copyFilters(filters.value),
    ...(expression.value ? { expression: expression.value } : {}),
    ...(hasColumnFilters.value ? { columnFilters: copyColumns(columnFilters.value) } : {}),
    ...(viewSettings.value ? { settings: copySettings(viewSettings.value) } : {}) }
}
function openEditor(event: MouseEvent, view?: TableSavedView) {
  const trigger = event.currentTarget
  if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true })
  editor.value = { id: view?.id, name: view?.label, snapshot: view ?? captureView() }
  editorOpen.value = true
}
function save() {
  const draft = editor.value
  const label = draft?.name?.trim()
  if (!editorOpen.value || !draft || !label) return
  if (draft.id !== undefined) {
    savedViews.value = savedViews.value.map(view => view.id === draft.id ? { ...view, label } : view)
  } else {
    const next = { ...draft.snapshot, id: id + '-' + ++sequence + '-' + Date.now(), label }
    savedViews.value = [...savedViews.value, next]
    active.value = next.id
  }
  editorOpen.value = false
}
function remove() {
  const editing = editor.value?.id
  if (!editorOpen.value || editing === undefined) return
  savedViews.value = savedViews.value.filter(view => view.id !== editing)
  if (active.value === editing) active.value = undefined
  editorOpen.value = false
}
</script>

<template>
  <section ref="root" class="sy-filtered-table" :aria-label="label" tabindex="-1"
    :data-details-layout="$slots.details ? (compact ? 'compact' : 'split') : undefined">
    <component :is="$slots.details ? SResizable : 'div'" class="sy-filtered-table__layout"
      v-bind="$slots.details ? { label, panels, handle: 'grip', resizeLabel: () => ui.resizeDetails } : {}">
      <template #default="area">
        <div v-if="area?.panel?.id !== 'details'" ref="resultPanel" class="sy-filtered-table__results">
          <SPowerSearch v-if="showSearch" v-model="filters" v-model:query="query" :label="ui.search" :config="config"
            :labels="filtersUI" :operator-labels="operatorsUI" />
          <div v-if="advancedQuery" class="sy-filtered-table__query">
            <div class="sy-filtered-table__query-actions">
              <SButton size="sm" variant="ghost" :aria-expanded="expressionOpen" :aria-controls="expressionPanelId"
                @click="toggleExpression">{{ ui.advanced }}</SButton>
              <SMotionText v-if="expression" motion="roll" announce :value="ui.expressionResults.replace('{count}', String(rows.length))" />
              <SButton v-if="expression" size="sm" variant="ghost" @click="clearExpression">{{ ui.clearExpression }}</SButton>
            </div>
            <Transition name="sy-table-query">
              <form v-show="expressionOpen" :id="expressionPanelId" class="sy-filtered-table__expression" @submit.prevent="applyExpression">
                <SInput ref="expressionInput" v-model="expressionDraft" :label="ui.expression" :description="ui.expressionHint" :status="visibleExpressionError" />
                <SButton size="sm" type="submit">{{ ui.applyExpression }}</SButton>
              </form>
            </Transition>
          </div>
          <SScrollShadow v-if="savedViewPresentation === 'strip'" class="sy-filtered-table__view-strip" orientation="horizontal" hide-scroll-bar :size="14">
            <SToggleButtonGroup :model-value="selectedView" :items="items" :label="ui.views" :drag-selection="false" size="sm" @update:model-value="pick" />
          </SScrollShadow>
          <div class="sy-filtered-table__views">
            <div v-if="savedViewPresentation === 'select'" class="sy-filtered-table__picker">
              <SSelect size="sm" hide-label :model-value="selectedView" :label="ui.views" :options="items" @update:model-value="pick" />
            </div>
            <SButton size="sm" variant="secondary" aria-haspopup="dialog" @click="openEditor($event)">{{ ui.saveView }}</SButton>
            <SButton size="sm" variant="ghost" aria-haspopup="dialog" :aria-disabled="!currentView || undefined"
              @click="currentView && openEditor($event, currentView)">{{ ui.editView }}</SButton>
            <SButton v-if="supportsColumnFilters" :aria-disabled="!hasColumnFilters" size="sm" variant="ghost"
              @click="hasColumnFilters && (columnFilters = {})">{{ ui.clearColumnFilters }}</SButton>
            <slot name="actions" :rows="rows" :selected="selected" :loading="loading" />
          </div>
          <STable v-model:page="page" v-model:selected="selected" :label="label" :rows="rows" :columns="columns" :row-key="rowKey"
            :row-label="rowLabel" :row-status="rowStatus" :status-column-label="statusColumnLabel" :select-all-label="selectAllLabel"
            :page-size="pageSize" :loading="loading" :loading-text="ui.loading" :empty-text="loadError || ui.noResults"
            :column-filtering="columnFiltering" :row-groups="rowGroups" :column-settings="columnSettings"
            :density="viewSettings?.density" :sticky-columns="stickyColumns" :column-layout="columnLayout"
            selection-mode="multiple">
            <template v-if="$slots.cell" #cell="scope">
              <slot name="cell" v-bind="scope" :inspect="(event?: MouseEvent) => inspect(scope.row, event)"
                :inspection="$slots.details ? inspectionAttributes(scope.row) : undefined" />
            </template>
            <template v-if="loadError" #empty>
              <div class="sy-filtered-table__load-error">
                <span role="status">{{ loadError }}</span>
                <SButton size="sm" variant="secondary" @click="emit('retry')">{{ ui.retry }}</SButton>
              </div>
            </template>
          </STable>
          <Transition name="sy-table-query">
            <div v-if="refreshError" ref="retainedError" class="sy-filtered-table__load-error" data-retained>
              <span role="status">{{ refreshError }}</span>
              <SButton size="sm" variant="secondary" @click="emit('retry')">{{ ui.retry }}</SButton>
            </div>
          </Transition>
        </div>
        <aside v-else :id="detailsId" ref="detailPane" class="sy-filtered-table__details" :aria-label="ui.details">
          <div class="sy-filtered-table__detail-content">
            <slot v-if="inspectedRow" name="details" :row="inspectedRow" :compact="false" :close="closeDetails" />
            <slot v-else name="empty-details"><p>{{ ui.selectDetail }}</p></slot>
          </div>
        </aside>
      </template>
    </component>
    <SAdaptiveDialog v-model:open="editorOpen" :title="editor?.id === undefined ? ui.saveView : ui.editView" :dismiss-label="ui.closeView"
      :presentation="compact ? 'bottom-sheet' : undefined" touch-presentation="bottom-sheet" bottom-sheet-height="hug" purpose="form" show-close-button
      :width="416" max-height="min(38rem, 86dvh)">
      <form v-if="editor" class="sy-filtered-table__view-form" @submit.prevent="save">
        <SInput v-model="editor.name" :label="ui.name" name="view-name" autofocus required />
        <SMetadataList :items="viewSummary" :label="ui.viewContents" layout="stacked" />
        <div class="sy-filtered-table__view-form-actions">
          <SButton v-if="editor.id !== undefined" size="sm" variant="danger" @click="remove">{{ ui.removeView }}</SButton>
          <SButton size="sm" type="submit" :disabled="!editor.name?.trim()">{{ ui.save }}</SButton>
        </div>
      </form>
    </SAdaptiveDialog>
    <SSheet v-if="$slots.details" :open="sheetOpen" :content-id="sheetId" :title="ui.details" :height="detailsHeight"
      :dismiss-label="ui.closeDetails" @update:open="!$event && compact && closeDetails()">
      <slot v-if="sheetRow" name="details" :row="sheetRow" :compact="true" :close="closeDetails" />
    </SSheet>
  </section>
</template>
