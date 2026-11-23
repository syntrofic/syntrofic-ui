import { computed, markRaw, ref, shallowRef, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'

export interface TableColumnsState { order?: readonly string[]; hidden?: readonly string[] }

export interface TableColumnSettingsOption<Key extends string = string> {
  key: Key
  label: string
  isAlwaysVisible?: boolean
  group?: string
}

export interface TableColumnSettingsOptions<Key extends string = string> {
  columns: readonly TableColumnSettingsOption<Key>[]
  activeColumnKeys?: readonly Key[]
  defaultColumnKeys?: readonly Key[]
  onChangeActiveColumnKeys?: (keys: readonly Key[]) => void
}

function legacyColumnState(initial: TableColumnsState) {
  const defaults = { order: [...initial.order ?? []], hidden: [...initial.hidden ?? []] }
  const state = ref<TableColumnsState>({ ...defaults })
  function show(key: string, visible: boolean) {
    const hidden = new Set(state.value.hidden)
    if (visible) hidden.delete(key)
    else hidden.add(key)
    state.value = { ...state.value, hidden: [...hidden] }
  }
  function reorder(keys: readonly string[]) { state.value = { ...state.value, order: [...new Set(keys)] } }
  return { state, show, reorder, reset: () => { state.value = { ...defaults } } }
}

function activeColumnState<Key extends string>(input: MaybeRefOrGetter<TableColumnSettingsOptions<Key>>) {
  const options = computed(() => toValue(input))
  const configured = computed(() => new Map(options.value.columns.map(column => [column.key, column])))
  const initial = () => [...(options.value.defaultColumnKeys ?? configured.value.keys())]
  const local = shallowRef<readonly Key[]>(initial())
  function normalize(keys: readonly string[]) {
    const requested = new Set(keys)
    const known = keys.flatMap(key => {
      const column = configured.value.get(key as Key)
      return column ? [column.key] : []
    })
    const required = options.value.columns.filter(column => column.isAlwaysVisible && !requested.has(column.key)).map(column => column.key)
    return [...new Set([...required, ...known])]
  }
  const activeColumnKeys = computed(() => normalize(options.value.activeColumnKeys ?? local.value))
  const active = computed(() => new Set(activeColumnKeys.value))
  const isColumnActive = (key: Key) => active.value.has(key)
  const isColumnToggleable = (key: Key) => configured.value.has(key) && !configured.value.get(key)?.isAlwaysVisible
  function setActiveColumnKeys(keys: readonly string[]) {
    const next = normalize(keys)
    if (next.length === activeColumnKeys.value.length && next.every((key, index) => key === activeColumnKeys.value[index])) return
    if (options.value.activeColumnKeys === undefined) local.value = next
    options.value.onChangeActiveColumnKeys?.(next)
  }
  function toggleColumn(key: Key) {
    if (!isColumnToggleable(key)) return
    setActiveColumnKeys(isColumnActive(key) ? activeColumnKeys.value.filter(value => value !== key) : [...activeColumnKeys.value, key])
  }
  const columnSettingsConfig = computed<TableColumnSettingsOptions<Key>>(() => ({ ...options.value,
    activeColumnKeys: activeColumnKeys.value, onChangeActiveColumnKeys: setActiveColumnKeys,
  }))
  return { columnSettingsConfig, activeColumnKeys, toggleColumn, isColumnActive, isColumnToggleable, setActiveColumnKeys,
    showAllColumns: () => setActiveColumnKeys([...configured.value.keys()]), resetToDefault: () => setActiveColumnKeys(initial()) }
}

export function useTableColumnSettingsState<Key extends string>(options: MaybeRefOrGetter<TableColumnSettingsOptions<Key>>): ReturnType<typeof activeColumnState<Key>>
export function useTableColumnSettingsState(initial?: TableColumnsState): ReturnType<typeof legacyColumnState>
export function useTableColumnSettingsState<Key extends string>(input: TableColumnsState | MaybeRefOrGetter<TableColumnSettingsOptions<Key>> = {}) {
  const options = toValue(input)
  return 'columns' in options ? activeColumnState(input as MaybeRefOrGetter<TableColumnSettingsOptions<Key>>) : legacyColumnState(options)
}

export interface TableColumnSettingsControl {
  applyColumns: <Column extends { key: string }>(columns: readonly Column[]) => Column[]
}

function activeColumnSettings<Key extends string>(input: MaybeRefOrGetter<TableColumnSettingsOptions<Key>>) {
  const state = activeColumnState(input)
  const options = computed(() => toValue(input))
  const pickerOptions = computed(() => options.value.columns.map(column => ({ value: column.key, label: column.label,
    disabled: column.isAlwaysVisible, group: column.group,
  })))
  const control = markRaw<TableColumnSettingsControl>({
    applyColumns(columns) {
      const source = new Map(columns.map(column => [column.key, column]))
      return state.activeColumnKeys.value.flatMap(key => {
        const column = source.get(key)
        return column ? [column] : []
      })
    },
  })
  return { ...state, pickerOptions, control }
}

export function useTableColumnSettings<Key extends string>(options: MaybeRefOrGetter<TableColumnSettingsOptions<Key>>): ReturnType<typeof activeColumnSettings<Key>>
export function useTableColumnSettings<Column extends { key: string }>(source: MaybeRefOrGetter<readonly Column[]>, state: MaybeRefOrGetter<TableColumnsState>): ComputedRef<Column[]>
export function useTableColumnSettings<Key extends string, Column extends { key: string }>(
  input: MaybeRefOrGetter<readonly Column[]> | MaybeRefOrGetter<TableColumnSettingsOptions<Key>>, state?: MaybeRefOrGetter<TableColumnsState>,
) {
  if (state === undefined) return activeColumnSettings(input as MaybeRefOrGetter<TableColumnSettingsOptions<Key>>)
  return computed(() => {
    const { hidden, order } = toValue(state)
    const excluded = new Set(hidden)
    const visible = new Map(toValue(input as MaybeRefOrGetter<readonly Column[]>).filter(column => !excluded.has(column.key)).map(column => [column.key, column]))
    const columns: Column[] = []
    for (const key of order ?? []) {
      const column = visible.get(key)
      if (column) { columns.push(column); visible.delete(key) }
    }
    return [...columns, ...visible.values()]
  })
}
