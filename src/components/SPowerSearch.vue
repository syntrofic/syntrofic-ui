<script lang="ts">
import type { Component } from 'vue'
import type { SelectOption } from '../types'

export type SearchOperator = 'is' | 'is-not' | 'contains' | 'starts-with' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'in' | 'not-in' | 'exists' | 'missing' | 'last' | 'next'
export type SearchValueType = 'text' | 'number' | 'date' | 'time' | 'boolean' | 'enum' | 'entity' | 'list' | 'range' | 'relative-date' | 'empty' | 'custom' | 'nested'
export type SearchDateUnit = 'days' | 'weeks' | 'months'
export interface SearchOperatorOption {
  key: SearchOperator
  label?: string
  type?: SearchValueType
  options?: readonly SelectOption[]
  editor?: Component
  validate?: (value: string) => boolean
  format?: (value: string) => string
  match?: (value: unknown, filter: SearchFilter) => boolean
}
export interface SearchField {
  key: string
  label: string
  type?: SearchValueType
  icon?: string
  group?: string
  description?: string
  typeaheadAliases?: readonly string[]
  typeaheadMinQueryLength?: number
  isValueMatchAllowed?: boolean
  defaultOperator?: SearchOperator
  options?: readonly SelectOption[]
  operators?: readonly (SearchOperator | SearchOperatorOption)[]
  fields?: readonly SearchField[]
  dateOnly?: boolean
  dateStorage?: 'iso' | 'epoch'
  search?: (query: string, signal: AbortSignal) => readonly SelectOption[] | Promise<readonly SelectOption[]>
}
export interface SearchFilter {
  field: string
  operator: SearchOperator
  value: string
  endValue?: string
  values?: readonly string[]
  children?: readonly SearchFilter[]
  unit?: SearchDateUnit
  readonly?: boolean
}
export interface PowerSearchConfig { name?: string; fields: readonly SearchField[]; contentSearchFieldKey?: string; timeZone?: string }
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import type { DateValue } from '@internationalized/date'
import { useMediaQuery } from '../internal/interaction'
import { layoutSize, type LayoutSize } from '../internal/layout-spacing'
import { foldSearch, formatSearchFilter, searchOperatorLabels, searchOperators } from '../internal/search-filters'
import { searchScore, useSearchSuggestions, type SearchSuggestion } from '../internal/search-suggestions'
import { readSearchDate, searchDateKey, searchDateZone, storeSearchDate } from '../internal/search-dates'
import { localeContext } from '../rac/locale'
import type { FieldStatus } from '../internal/status-icon'
import SButton from './SButton.vue'
import SCloseButton from './SCloseButton.vue'
import SComboBox from './SComboBox.vue'
import SDatePicker from './SDatePicker.vue'
import SFieldStatus from './SFieldStatus.vue'
import SIcon from './SIcon.vue'
import SInfoTip from './SInfoTip.vue'
import SInput from './SInput.vue'
import SSelect from './SSelect.vue'
import SSearchField from './SSearchField.vue'
import SPopover from './SPopover.vue'
import SSheet from './SSheet.vue'
import STokenizer from './STokenizer.vue'
import STypeaheadItem from './STypeaheadItem.vue'

type ChangeType = 'add' | 'edit' | 'remove'
type SheetStage = 'filters' | 'add' | 'value' | 'clear' | 'discard'
interface Change {
  type: ChangeType
  previous?: SearchFilter
  next?: SearchFilter
}

const props = withDefaults(defineProps<{
  fields?: readonly SearchField[]
  config?: PowerSearchConfig
  label?: string
  placeholder?: string
  disabled?: boolean
  disabledMessage?: string
  readonly?: boolean
  labelHidden?: boolean
  autofocus?: boolean
  fieldSuggestions?: boolean
  clearable?: boolean
  status?: FieldStatus
  statusVariant?: 'attached' | 'detached' | 'tooltip'
  startIcon?: string
  resultCount?: number | string
  resultCountLabel?: (count: number) => string
  size?: 'sm' | 'md' | 'lg'
  maxTokenLength?: number
  maxOperatorMenuItems?: number
  maxSearchResults?: number
  menuWidth?: LayoutSize
  tokenOverflowBehavior?: 'none' | 'unfocusedInline' | 'unfocusedLayer'
  presentation?: 'popover' | 'bottom-sheet' | 'adaptive'
  labels?: Partial<Record<'add' | 'apply' | 'applyNested' | 'cancel' | 'remove' | 'clear' | 'field' | 'operator' | 'value' | 'end' | 'more' | 'yes' | 'no'
    | 'filters' | 'done' | 'back' | 'discard' | 'confirmDiscard' | 'confirmClear' | 'empty' | 'unit' | 'calendar' | SearchDateUnit, string>>
  operatorLabels?: Partial<Record<SearchOperator, string>>
}>(), { label: 'Search', clearable: true, size: 'md', maxTokenLength: 40, maxOperatorMenuItems: 10, maxSearchResults: 10,
  presentation: 'adaptive', tokenOverflowBehavior: 'none' })
const filters = defineModel<SearchFilter[]>({ default: () => [] })
const query = defineModel<string>('query', { default: '' })
const emit = defineEmits<{ search: [value: { query: string; filters: SearchFilter[] }]; change: [filters: SearchFilter[], type: ChangeType, index: number] }>()
const inputId = 'sy-search-value-' + useId()
const root = useTemplateRef<HTMLElement>('root')
const locale = inject(localeContext, undefined)
const search = useTemplateRef<InstanceType<typeof SSearchField>>('search')
const open = ref(false)
const stage = ref<SheetStage>('filters')
const stageBody = useTemplateRef<HTMLElement>('stageBody')
const draft = shallowRef<SearchFilter[]>()
let pending: Change[] = []
const editing = ref(-1)
const editingOriginal = shallowRef<SearchFilter>()
const field = ref<string>()
const operator = ref<string>()
const value = ref<string>()
const valueEnd = ref<string>()
const values = ref<string[]>([])
const children = ref<SearchFilter[]>([])
const dateUnit = ref<SearchDateUnit>('days')
const pickerLocale = computed(() => {
  const name = locale?.locale.value ?? 'en'
  const calendar = locale?.calendar?.value
  try { return calendar ? new Intl.Locale(name, { calendar }).toString() : name }
  catch { return name }
})
const fieldQuery = ref('')
const valueQuery = ref('')
const querying = ref(false)
const remoteOptions = shallowRef<readonly SelectOption[]>([])
const remoteLabels = new Map<string, string>()
const searchFocused = ref(false)
const entryFocused = ref(false)
const suggestionsDismissed = ref(false)
const activeSuggestion = ref<string>()
const showAll = ref(false)
const fields = computed(() => props.fields ?? props.config?.fields ?? [])
const contentField = computed(() => fields.value.find(item => item.key === props.config?.contentSearchFieldKey))
const resultText = computed(() => typeof props.resultCount === 'number'
  ? props.resultCountLabel?.(props.resultCount) ?? (props.resultCount === 1 ? '1 result' : props.resultCount + ' results')
  : props.resultCount)
const narrow = useMediaQuery('(max-width: 620px)')
const sheet = computed(() => props.presentation === 'bottom-sheet' || props.presentation === 'adaptive' && narrow.value)
const maybeWidth = computed(() => layoutSize(props.menuWidth))
const text = computed(() => ({
  add: 'Add filter', apply: 'Apply', applyNested: 'Apply condition', cancel: 'Cancel', remove: 'Remove filter', clear: 'Clear filters',
  field: 'Field', operator: 'Operator', value: 'Value', end: 'End value', more: 'More filters', yes: 'Yes', no: 'No',
  filters: 'Filters', done: 'Done', back: 'Back', discard: 'Discard', confirmDiscard: 'Discard changes?',
  confirmClear: 'Clear all editable filters?', empty: 'No filters yet', unit: 'Time unit', calendar: 'Choose date',
  days: 'days', weeks: 'weeks', months: 'months', ...props.labels,
}))
const stageTitle = computed(() => ({
  filters: text.value.filters, add: text.value.add, value: current.value?.label ?? text.value.field,
  clear: text.value.confirmClear, discard: text.value.confirmDiscard,
})[stage.value])
const operatorNames = computed(() => ({ ...searchOperatorLabels, ...props.operatorLabels }))
const dateOptions = computed(() => (['days', 'weeks', 'months'] as const).map(value => ({ value, label: text.value[value] })))
const current = computed(() => fields.value.find(item => item.key === field.value))
const fieldOptions = computed(() => fields.value.map(item => ({ value: item.key, label: item.label, icon: item.icon, group: item.group, description: item.description })))
const browsable = computed(() => {
  const keyword = foldSearch(fieldQuery.value.trim())
  if (!keyword) return fieldOptions.value.slice(0, 1000)
  const scores = new Map(fields.value.flatMap(item => {
    const terms = [item.label, ...(item.typeaheadAliases ?? [])].map(foldSearch)
    const match = terms.some(term => term === keyword) ? 2 : terms.some(term => term.startsWith(keyword)) ? 1
      : terms.some(term => term.includes(keyword)) ? 0 : undefined
    return match === undefined ? [] : [[item.key, match] as const]
  }))
  return fieldOptions.value.filter(item => scores.has(item.value)).sort((a, b) => scores.get(b.value)! - scores.get(a.value)!)
    .slice(0, Math.max(1, props.maxSearchResults))
})
const operatorOptions = computed(() => {
  return searchOperators(current.value).map(option => ({ value: option.key, label: option.label ?? operatorNames.value[option.key] }))
})
const chosenOperator = computed(() => searchOperators(current.value).find(option => option.key === operator.value))
const kind = computed(() => chosenOperator.value?.type ?? (operator.value === 'exists' || operator.value === 'missing' ? 'empty'
  : operator.value === 'between' ? 'range' : operator.value === 'in' || operator.value === 'not-in' ? 'list'
    : operator.value === 'last' || operator.value === 'next' ? 'relative-date' : current.value?.type ?? 'text'))
const staticOptions = computed(() => chosenOperator.value?.options ?? current.value?.options ?? (kind.value === 'boolean'
  ? [{ value: 'true', label: text.value.yes }, { value: 'false', label: text.value.no }] : undefined))
const inputType = computed(() => current.value?.type === 'date' || current.value?.type === 'time' || current.value?.type === 'number' ? current.value.type : 'text')
const dateOnly = computed(() => current.value?.dateOnly !== false)
const dateZone = computed(() => searchDateZone(props.config?.timeZone, dateOnly.value))
const dateGranularity = computed(() => dateOnly.value ? 'day' as const : 'minute' as const)
function decodeDate(raw?: string) {
  return raw ? readSearchDate(raw, dateZone.value, dateOnly.value, locale?.calendar?.value) : undefined
}
function encodeDate(next?: DateValue) {
  return storeSearchDate(next, dateZone.value, dateOnly.value, current.value?.dateStorage)
}
const enabled = computed(() => !props.disabled && !props.readonly)
const canSuggest = computed(() => Boolean(props.fieldSuggestions && enabled.value && !sheet.value))
const suggestions = useSearchSuggestions(fields, query, computed(() => canSuggest.value && entryFocused.value && !suggestionsDismissed.value),
  computed(() => props.maxSearchResults))
const suggestionsOpen = computed(() => suggestions.value.length > 0)
const suggestionsId = inputId + '-suggestions'
const activeSuggestionIndex = computed(() => suggestions.value.findIndex(item => item.key === activeSuggestion.value))
watch(query, () => { suggestionsDismissed.value = false; activeSuggestion.value = undefined })
const working = computed(() => draft.value ?? filters.value)
const valid = computed(() => {
  if (!current.value || !chosenOperator.value) return false
  if (kind.value === 'empty') return true
  if (kind.value === 'nested') return children.value.length > 0
  if (kind.value === 'list') return staticOptions.value || current.value.search ? values.value.length > 0 : Boolean(value.value?.split(',').some(value => value.trim()))
  if (kind.value === 'custom' && chosenOperator.value.validate) return chosenOperator.value.validate(value.value ?? '')
  if (!value.value?.trim()) return false
  if (kind.value === 'relative-date') return Number.isSafeInteger(Number(value.value)) && Number(value.value) > 0
  if (kind.value === 'range') {
    if (!valueEnd.value?.trim()) return false
    if (inputType.value === 'date') {
      const start = searchDateKey(value.value, dateZone.value, dateOnly.value)
      const end = searchDateKey(valueEnd.value, dateZone.value, dateOnly.value)
      return start !== undefined && end !== undefined && start <= end
    }
    return inputType.value === 'number' ? Number(value.value) <= Number(valueEnd.value) : value.value <= valueEnd.value
  }
  return kind.value !== 'number' || Boolean(staticOptions.value) || Number.isFinite(Number(value.value))
})
const hiddenCount = computed(() => props.tokenOverflowBehavior !== 'none' && !searchFocused.value && !showAll.value
  ? Math.max(0, filters.value.length - 2) : 0)
const shownFilters = computed(() => hiddenCount.value ? filters.value.slice(0, 2) : filters.value)
const hasEditable = computed(() => working.value.some(filter => !filter.readonly))

const editorOpen = computed(() => open.value && (!sheet.value || stage.value === 'value'))
watch([current, valueQuery, editorOpen], ([definition, query, expanded], _, cleanup) => {
  remoteOptions.value = []
  querying.value = Boolean(expanded && definition?.search)
  if (!expanded || !definition?.search) return
  const controller = new AbortController()
  const timer = setTimeout(async () => {
    try {
      const items = await definition.search?.(query, controller.signal) ?? []
      if (controller.signal.aborted) return
      remoteOptions.value = items.slice(0, Math.max(1, props.maxSearchResults))
      for (const choice of remoteOptions.value) remoteLabels.set(`${definition.key}\n${choice.value}`, choice.label)
    } catch { /* An unavailable search leaves the value list empty. */ }
    finally { if (!controller.signal.aborted) querying.value = false }
  }, 160)
  cleanup(() => { clearTimeout(timer); controller.abort() })
})

function selectField(key: string | undefined) {
  field.value = key
  operator.value = current.value?.defaultOperator ?? operatorOptions.value[0]?.value
  resetValue()
}
function selectOperator(key: string | undefined) {
  const previous = kind.value
  operator.value = key
  if (previous !== kind.value) resetValue()
}
function resetValue() {
  value.value = undefined
  valueEnd.value = undefined
  values.value = []
  children.value = []
  dateUnit.value = 'days'
  valueQuery.value = ''
}
function beginSheet(next: SheetStage = 'filters') {
  if (!enabled.value) return
  if (!draft.value) {
    draft.value = [...filters.value]
    pending = []
  }
  stage.value = next
  open.value = true
}
function leaveSheet() {
  draft.value = undefined
  pending = []
  open.value = false
}
function dismissSheet() {
  if (stage.value === 'value') stage.value = editing.value < 0 ? 'add' : 'filters'
  else if (stage.value !== 'filters') stage.value = 'filters'
  else if (pending.length) stage.value = 'discard'
  else leaveSheet()
}
function panelVisibility(visible: boolean) {
  if (visible) {
    if (sheet.value) beginSheet()
    else edit()
  } else if (sheet.value) dismissSheet()
  else open.value = false
}
function edit(index = -1, key?: string) {
  if (!enabled.value || working.value[index]?.readonly) return
  if (sheet.value) beginSheet('value')
  editing.value = index
  const existing = working.value[index]
  editingOriginal.value = existing
  fieldQuery.value = ''
  selectField(existing?.field ?? key ?? fields.value[0]?.key)
  if (existing) {
    operator.value = existing.operator
    value.value = existing.value
    valueEnd.value = existing.endValue
    values.value = [...existing.values ?? (kind.value === 'list' ? existing.value.split(',').filter(Boolean) : [])]
    children.value = [...existing.children ?? []]
    dateUnit.value = existing.unit ?? 'days'
  }
  open.value = true
}
function update(next: SearchFilter[], changes: Change[]) {
  if (draft.value) {
    draft.value = next
    pending.push(...changes)
    return
  }
  replay(changes)
}
function replay(changes: readonly Change[]) {
  const next = [...filters.value]
  const applied: { filters: SearchFilter[]; type: ChangeType; index: number }[] = []
  for (const { type, previous, next: replacement } of changes) {
    const index = type === 'add' ? next.length : previous ? next.indexOf(previous) : -1
    if (index < 0 || next[index]?.readonly) continue
    next.splice(index, type === 'add' ? 0 : 1, ...(replacement ? [replacement] : []))
    applied.push({ filters: [...next], type, index })
  }
  if (!applied.length) return
  filters.value = next
  for (const change of applied) emit('change', change.filters, change.type, change.index)
}
function finishSheet() {
  if (!enabled.value) return
  replay(pending)
  leaveSheet()
}
function searchQuery(value: string) {
  const text = value.trim()
  const definition = contentField.value
  if (enabled.value && definition && text) {
    const compatible = searchOperators(definition).filter(option => ['is', 'contains', 'starts-with'].includes(option.key) && (!option.type || option.type === 'text'))
    const match = compatible.find(option => option.key === definition.defaultOperator) ?? compatible.find(option => option.key === 'contains') ?? compatible[0]
    if (match) {
      const filter: SearchFilter = { field: definition.key, operator: match.key, value: text }
      const next = [...working.value, filter]
      update(next, [{ type: 'add', next: filter }])
      query.value = ''
      emit('search', { query: text, filters: next })
      return
    }
  }
  emit('search', { query: value, filters: [...working.value] })
}
function acceptSuggestion(suggestion: SearchSuggestion) {
  const definition = suggestion.field
  query.value = ''
  activeSuggestion.value = undefined
  if (suggestion.value === undefined) { edit(-1, definition.key); return }
  const operators = searchOperators(definition)
  const option = operators.find(option => option.key === 'is' && (!option.options || option.options.some(item => item.value === suggestion.value)))
  const type = option?.type ?? definition.type ?? 'text'
  remoteLabels.set(`${definition.key}\n${suggestion.value}`, suggestion.item.label)
  if (option && ['text', 'number', 'enum', 'entity', 'boolean'].includes(type)) {
    const filter: SearchFilter = { field: definition.key, operator: option.key, value: suggestion.value }
    update([...working.value, filter], [{ type: 'add', next: filter }])
    return
  }
  edit(-1, definition.key)
  if (kind.value === 'list') values.value = [suggestion.value]
  else value.value = suggestion.value
}
function suggestionKey(event: KeyboardEvent) {
  if (!suggestionsOpen.value || event.isComposing || event.altKey || event.metaKey || event.ctrlKey) return
  const index = activeSuggestionIndex.value
  if (event.key === 'Escape') {
    suggestionsDismissed.value = true
    activeSuggestion.value = undefined
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    const length = suggestions.value.length
    const next = index < 0 ? event.key === 'ArrowDown' ? 0 : length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + length) % length
    activeSuggestion.value = suggestions.value[next]?.key
    void nextTick(() => root.value?.ownerDocument.getElementById(suggestionsId + '-' + next)?.scrollIntoView({ block: 'nearest' }))
  } else if (event.key === 'Enter' && index >= 0) acceptSuggestion(suggestions.value[index])
  else return
  event.preventDefault()
  event.stopImmediatePropagation()
}
function apply() {
  if (!enabled.value || !valid.value) return
  const next = [...working.value]
  const add = editing.value < 0
  const index = add ? next.length : editingOriginal.value ? next.indexOf(editingOriginal.value) : -1
  if (index < 0 || next[index]?.readonly) { if (sheet.value) dismissSheet(); else open.value = false; return }
  const list = kind.value === 'list' ? (staticOptions.value || current.value?.search ? values.value : value.value?.split(',').map(value => value.trim()).filter(Boolean)) : undefined
  const item: SearchFilter = { field: field.value!, operator: operator.value as SearchOperator,
    value: kind.value === 'empty' || kind.value === 'nested' ? '' : list ? list.join(',') : value.value?.trim() ?? '',
    ...(list ? { values: [...list] } : {}), ...(kind.value === 'range' ? { endValue: valueEnd.value } : {}),
    ...(kind.value === 'nested' ? { children: [...children.value] } : {}),
    ...(kind.value === 'relative-date' ? { unit: dateUnit.value } : {}),
  }
  const [previous] = next.splice(index, add ? 0 : 1, item)
  update(next, [{ type: add ? 'add' : 'edit', previous, next: item }])
  if (sheet.value) stage.value = 'filters'
  else open.value = false
}
function remove(index: number) {
  const previous = working.value[index]
  if (!enabled.value || !previous || previous.readonly) return
  update(working.value.filter((_, at) => at !== index), [{ type: 'remove', previous }])
}
function clear() {
  if (!enabled.value) return
  const current = working.value
  update(current.filter(item => item.readonly), current.filter(item => !item.readonly).reverse().map(previous => ({ type: 'remove', previous })))
  if (sheet.value) stage.value = 'filters'
}
function display(filter: SearchFilter, trim = false) {
  return formatSearchFilter(filter, fields.value, { operatorLabels: operatorNames.value, valueLabels: text.value,
    optionLabel: (field, key) => remoteLabels.get(`${field}\n${key}`),
    locale: pickerLocale.value, timeZone: props.config?.timeZone, limit: trim ? props.maxTokenLength : undefined })
}
function focusTypeahead() { search.value?.focus() }
function blurTypeahead() { search.value?.blur() }
function leaveSearch(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) searchFocused.value = false
}
onMounted(() => { if (props.autofocus && !props.disabled) focusTypeahead() })
watch(stage, () => { if (sheet.value && open.value) stageBody.value?.focus({ preventScroll: true }) }, { flush: 'post' })
watch(sheet, () => { if (open.value) leaveSheet() })
watch(enabled, yes => { if (!yes && open.value) leaveSheet() })
defineExpose({ focusTypeahead, blurTypeahead })
</script>

<template>
  <div ref="root" class="sy-power-search" role="group" :aria-label="label" :data-size="size" @focusout="leaveSearch">
    <div class="sy-power-search__entry">
    <SSearchField ref="search" v-model="query" :label="label" :label-hidden="labelHidden" :disabled="disabled" :disabled-message="disabledMessage"
      :readonly="readonly" :placeholder="placeholder" :aria-describedby="status?.message ? `${inputId}-status` : undefined"
      :aria-invalid="status?.type === 'error' || undefined" :role="canSuggest ? 'combobox' : undefined"
      :aria-expanded="canSuggest ? suggestionsOpen : undefined" :aria-controls="canSuggest ? suggestionsId : undefined"
      :aria-autocomplete="canSuggest ? 'list' : undefined" :aria-activedescendant="activeSuggestionIndex < 0 ? undefined : suggestionsId + '-' + activeSuggestionIndex"
      @focus="searchFocused = true; entryFocused = true; suggestionsDismissed = false" @blur="entryFocused = false" @keydown.capture="suggestionKey"
      @search="searchQuery">
      <template v-if="$slots.start || startIcon" #start><slot name="start"><SIcon :icon="startIcon" /></slot></template>
    </SSearchField>
    <ul v-if="canSuggest" v-show="suggestionsOpen" :id="suggestionsId" class="sy-power-search__suggestions" role="listbox" :aria-label="text.field">
      <li v-for="(item, index) in suggestions" :id="suggestionsId + '-' + index" :key="item.key" role="option"
        :aria-selected="activeSuggestionIndex === index" @pointerdown.prevent @pointermove="activeSuggestion = item.key" @click="acceptSuggestion(item)">
        <STypeaheadItem :item="item.item" />
      </li>
    </ul>
    </div>
    <component :is="sheet ? SSheet : SPopover" :open="open"
      v-bind="sheet ? { title: stageTitle, dismissLabel: stage === 'filters' ? text.cancel : text.back } : {}"
      @update:open="panelVisibility">
      <template #trigger>
        <SButton size="sm" variant="secondary" :disabled="!enabled || !fields.length">{{ sheet ? text.filters : text.add }}</SButton>
      </template>
      <div ref="stageBody" class="sy-power-search__editor" :data-sheet="sheet || undefined" :style="{ '--sy-search-menu-width': maybeWidth }" :tabindex="sheet ? -1 : undefined">
        <template v-if="sheet && stage === 'filters'">
          <ul v-if="working.length" class="sy-power-search__sheet-list" role="list">
            <li v-for="(filter, index) in working" :key="index">
              <SButton size="sm" variant="secondary" :disabled="filter.readonly" @click="edit(index)">{{ display(filter) }}</SButton>
              <SCloseButton v-if="!filter.readonly" :label="text.remove + ' ' + display(filter)" @click="remove(index)" />
            </li>
          </ul>
          <p v-else class="sy-power-search__results">{{ text.empty }}</p>
          <div class="sy-power-search__actions">
            <SButton v-if="clearable && hasEditable" size="sm" variant="ghost" @click="stage = 'clear'">{{ text.clear }}</SButton>
            <SButton size="sm" variant="secondary" @click="stage = 'add'; fieldQuery = ''">{{ text.add }}</SButton>
            <SButton size="sm" @click="finishSheet">{{ text.done }}</SButton>
          </div>
        </template>
        <template v-else-if="sheet && stage === 'add'">
          <SSearchField v-model="fieldQuery" :label="text.field" @search="browsable.length === 1 && edit(-1, browsable[0].value)" />
          <ul class="sy-power-search__sheet-list" role="list">
            <li v-for="choice in browsable" :key="choice.value">
              <SButton size="sm" variant="secondary" @click="edit(-1, choice.value)">
                <SIcon v-if="choice.icon" :icon="choice.icon" size="sm" />
                {{ choice.label }}
              </SButton>
            </li>
          </ul>
        </template>
        <template v-else-if="sheet && (stage === 'clear' || stage === 'discard')">
          <div class="sy-power-search__actions">
            <SButton size="sm" variant="secondary" @click="stage = 'filters'">{{ text.cancel }}</SButton>
            <SButton v-if="stage === 'clear'" size="sm" @click="clear">{{ text.clear }}</SButton>
            <SButton v-else size="sm" @click="leaveSheet">{{ text.discard }}</SButton>
          </div>
        </template>
        <template v-else>
        <template v-if="!sheet">
        <SComboBox v-if="config || fields.length > maxSearchResults" :model-value="field" v-model:query="fieldQuery" :label="text.field" :options="browsable"
          remote @update:model-value="selectField" />
        <SSelect v-else :model-value="field" :label="text.field" :options="fieldOptions" @update:model-value="selectField" />
        </template>
        <SSelect :model-value="operator" :label="text.operator" :options="operatorOptions" :visible-items="maxOperatorMenuItems"
          @update:model-value="selectOperator" />
        <slot v-if="kind !== 'empty'" name="value" :field="current" :operator="chosenOperator" :value="value" :end="valueEnd"
          :values="values" :children="children" :set-children="(next: SearchFilter[]) => { children = next }"
          :set-value="(next: string | undefined) => { value = next }" :set-end="(next: string | undefined) => { valueEnd = next }"
          :set-values="(next: string[]) => { values = next }">
          <SPowerSearch v-if="kind === 'nested' && current?.fields?.length" v-model="children" :fields="current.fields"
            :label="current.label" :labels="{ ...labels, apply: text.applyNested }" :operator-labels="operatorLabels" presentation="popover" />
          <component :is="chosenOperator.editor" v-else-if="kind === 'custom' && chosenOperator?.editor"
            :model-value="value" :label="text.value" :disabled="!enabled" @update:model-value="value = $event" />
          <SSelect v-else-if="kind === 'list' && staticOptions" v-model="values" multiple :label="text.value" :options="staticOptions" />
          <STokenizer v-else-if="kind === 'list' && current?.search" v-model="values" v-model:query="valueQuery" :label="text.value"
            :options="remoteOptions" remote :loading="querying" />
          <SSelect v-else-if="staticOptions" v-model="value" :label="text.value" :options="staticOptions" />
          <SComboBox v-else-if="current?.search" v-model="value" v-model:query="valueQuery" :label="text.value" :options="remoteOptions" remote :loading="querying" />
          <template v-else-if="kind === 'relative-date'">
            <label class="sy-field" :for="inputId"><span class="sy-field__label">{{ text.value }}</span>
              <input :id="inputId" :value="value" type="number" min="1" step="1" class="sy-field__control"
                @input="value = ($event.target as HTMLInputElement).value" @keydown.enter.prevent="apply">
            </label>
            <SSelect :model-value="dateUnit" :label="text.unit" :options="dateOptions" @update:model-value="dateUnit = ($event as SearchDateUnit) ?? 'days'" />
          </template>
          <template v-else-if="kind === 'range' && inputType === 'date'">
            <SDatePicker :model-value="decodeDate(value)" :label="text.value" :locale="pickerLocale" :granularity="dateGranularity"
              :trigger-label="text.calendar + ' · ' + text.value" hide-time-zone @update:model-value="value = encodeDate($event)" />
            <SDatePicker :model-value="decodeDate(valueEnd)" :label="text.end" :locale="pickerLocale" :granularity="dateGranularity"
              :trigger-label="text.calendar + ' · ' + text.end" hide-time-zone @update:model-value="valueEnd = encodeDate($event)" />
          </template>
          <template v-else-if="kind === 'range'">
            <label class="sy-field" :for="inputId"><span class="sy-field__label">{{ text.value }}</span>
              <input :id="inputId" :value="value" :type="inputType" class="sy-field__control"
                @input="value = ($event.target as HTMLInputElement).value" @keydown.enter.prevent="apply">
            </label>
            <label class="sy-field" :for="`${inputId}-end`"><span class="sy-field__label">{{ text.end }}</span>
              <input :id="`${inputId}-end`" :value="valueEnd" :type="inputType" class="sy-field__control"
                @input="valueEnd = ($event.target as HTMLInputElement).value" @keydown.enter.prevent="apply">
            </label>
          </template>
          <SDatePicker v-else-if="kind === 'date'" :model-value="decodeDate(value)" :label="text.value" :locale="pickerLocale"
            :granularity="dateGranularity" :trigger-label="text.calendar + ' · ' + text.value" hide-time-zone
            @update:model-value="value = encodeDate($event)" />
          <label v-else-if="kind === 'time'" class="sy-field" :for="inputId">
            <span class="sy-field__label">{{ text.value }}</span>
            <input :id="inputId" v-model="value" :type="kind" class="sy-field__control" @keydown.enter.prevent="apply">
          </label>
          <SInput v-else v-model="value" :label="text.value" :inputmode="kind === 'number' ? 'decimal' : undefined" @keydown.enter.prevent="apply" />
        </slot>
        <div class="sy-power-search__actions">
          <SButton v-if="!sheet" size="sm" variant="secondary" @click="open = false">{{ text.cancel }}</SButton>
          <SButton size="sm" :disabled="!valid" @click="apply">{{ text.apply }}</SButton>
        </div>
        </template>
      </div>
    </component>
    <SFieldStatus v-if="status && statusVariant !== 'tooltip'" v-bind="status" :id="`${inputId}-status`" :variant="statusVariant ?? status.variant" class="sy-power-search__status" />
    <div v-else-if="status?.message" class="sy-power-search__status">
      <span :id="`${inputId}-status`" hidden>{{ status.message }}</span>
      <SInfoTip :label="status.message" :text="status.message" />
    </div>
    <ul v-if="filters.length" class="sy-tokenizer__tokens sy-power-search__tokens" role="list">
      <li v-for="(filter, index) in shownFilters" :key="index" class="sy-power-search__token">
        <slot name="token" :filter="filter" :label="display(filter)" :edit="() => edit(index)" :remove="() => remove(index)">
          <SButton size="sm" variant="ghost" :aria-label="display(filter)" :title="display(filter)" :disabled="!enabled || filter.readonly" @click="edit(index)">{{ display(filter, true) }}</SButton>
          <SCloseButton v-if="enabled && !filter.readonly" :label="text.remove + ' ' + display(filter)" @click="remove(index)" />
        </slot>
      </li>
      <li v-if="filters.length > 2 && tokenOverflowBehavior === 'unfocusedInline' && !searchFocused">
        <SButton size="sm" variant="secondary" :aria-expanded="showAll" @click="showAll = !showAll">{{ text.more }} ({{ filters.length - 2 }})</SButton>
      </li>
      <li v-else-if="hiddenCount && tokenOverflowBehavior === 'unfocusedLayer'">
        <SPopover>
          <template #trigger><SButton size="sm" variant="secondary">{{ text.more }} ({{ hiddenCount }})</SButton></template>
          <template #default="{ close }">
            <ul class="sy-power-search__overflow" role="list">
              <li v-for="(filter, index) in filters.slice(2)" :key="index" class="sy-power-search__token">
                <SButton size="sm" variant="ghost" :disabled="!enabled || filter.readonly" @click="close(); edit(index + 2)">{{ display(filter) }}</SButton>
                <SCloseButton v-if="enabled && !filter.readonly" :label="text.remove + ' ' + display(filter)" @click="remove(index + 2)" />
              </li>
            </ul>
          </template>
        </SPopover>
      </li>
      <li v-if="enabled && clearable && hasEditable"><SButton size="sm" variant="ghost" @click="sheet ? beginSheet('clear') : clear()">{{ text.clear }}</SButton></li>
    </ul>
    <div v-if="resultCount !== undefined || $slots.end" class="sy-power-search__results" aria-live="polite" aria-atomic="true">
      <slot name="end" :count="resultCount">{{ resultText }}</slot>
    </div>
  </div>
</template>
