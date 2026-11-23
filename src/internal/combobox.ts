import { computed, nextTick, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { isRtl } from './collection-focus'
import { useTypeahead } from './typeahead'

export interface ComboboxOption { value: string; disabled?: boolean }
export interface MultiComboboxOption extends ComboboxOption { label: string }
export type MultiComboboxCell = 'option' | 'action'
interface ComboboxBase<T extends ComboboxOption> {
  selectableItems: readonly T[]
  listboxId: string
  isOpen: boolean
  isDisabled?: boolean
  hasSearch?: boolean
  onOpen: () => unknown
  onClose: () => void
  onClear?: () => void
}
export interface ComboboxOptions<T extends ComboboxOption = ComboboxOption> extends ComboboxBase<T> {
  value?: string
  onSelect?: (value: string) => void
  onSearchSeed?: (text: string) => void
}
export interface MultiComboboxOptions<T extends MultiComboboxOption = MultiComboboxOption> extends ComboboxBase<T> {
  onToggle: (value: string) => void
  hasValue?: boolean
  isGrid?: boolean
  rowHasAction?: (index: number) => boolean
  onActivateAction?: (index: number) => void
}

type SelectionOptions<T extends ComboboxOption> = ComboboxOptions<T>
  & Partial<Pick<MultiComboboxOptions, 'onToggle' | 'hasValue' | 'isGrid' | 'rowHasAction' | 'onActivateAction'>>
type FieldHandlers = { onKeyDown?: (event: KeyboardEvent) => void }

function combobox<T extends ComboboxOption>(options: MaybeRefOrGetter<SelectionOptions<T>>, multiple: boolean) {
  const config = () => toValue(options)
  const highlight = shallowRef<{ value: string; cell: MultiComboboxCell }>()
  const items = () => config().selectableItems
  const enabled = computed(() => items().flatMap((item, index) => item.disabled ? [] : [index]))
  const hasAction = (index: number) => index >= 0 && multiple && config().isGrid === true && config().rowHasAction?.(index) === true
  const highlightedIndex = computed(() => {
    const active = highlight.value
    if (!active) return -1
    return items().findIndex((item, index) => item.value === active.value && (active.cell === 'action' ? hasAction(index) : !item.disabled))
  })
  const highlightedCell = computed(() => highlightedIndex.value < 0 ? 'option' : highlight.value?.cell ?? 'option')
  const getItemId = (index: number) => config().listboxId + '-item-' + index
  const getActionCellId = (index: number) => getItemId(index) + '-action'
  const activeDescendantId = computed(() => config().isOpen && highlightedIndex.value >= 0
    ? (highlightedCell.value === 'action' ? getActionCellId : getItemId)(highlightedIndex.value) : undefined)
  let root: Document | ShadowRoot | undefined

  function rememberRoot(event: KeyboardEvent) {
    const node = event.currentTarget instanceof Element ? event.currentTarget : event.target
    const tree = node instanceof Node ? node.getRootNode() : undefined
    if (tree instanceof Document || tree instanceof ShadowRoot) root = tree
  }
  function highlightAt(index: number, cell: MultiComboboxCell, scroll: boolean) {
    const item = items()[index]
    if (!item || (cell === 'action' ? !hasAction(index) : item.disabled)) { highlight.value = undefined; return }
    const active = { value: item.value, cell }
    highlight.value = active
    if (!scroll) return
    void nextTick(() => {
      const id = activeDescendantId.value
      if (!id || highlight.value !== active) return
      const tree = root ?? (typeof document !== 'undefined' ? document : undefined)
      const list = tree?.getElementById(config().listboxId)
      const option = tree?.getElementById(id)
      if (!list || !option || !list.contains(option) || list.clientHeight >= list.scrollHeight) return
      const outer = list.getBoundingClientRect()
      const inner = option.getBoundingClientRect()
      const top = outer.top + list.clientTop
      const bottom = top + list.clientHeight
      if (inner.top < top) list.scrollTop -= top - inner.top
      else if (inner.bottom > bottom) list.scrollTop += inner.bottom - bottom
    })
  }
  const setHighlightedIndex = (index: number) => highlightAt(index, 'option', true)
  const typeahead = useTypeahead({
    getItemLabels: () => items().map(item => 'label' in item && typeof item.label === 'string' ? item.label : undefined),
    isDisabled: index => items()[index]?.disabled === true,
    getCurrentIndex: () => config().isOpen ? highlightedIndex.value : -1,
    onMatch: index => { if (config().isOpen || config().onOpen() !== false) setHighlightedIndex(index) },
  })
  function close() {
    typeahead.reset()
    setHighlightedIndex(-1)
    config().onClose()
  }
  watch(() => config().isOpen, open => {
    if (!open) { typeahead.reset(); setHighlightedIndex(-1) }
  })
  function edge(last: boolean) {
    const indices = enabled.value
    return indices[last ? indices.length - 1 : 0] ?? -1
  }
  function open(last: boolean, keyboard: boolean, field = false) {
    if (config().onOpen() === false) return false
    if (keyboard || !config().hasSearch) {
      const selected = field || multiple ? -1 : items().findIndex(item => !item.disabled && item.value === config().value)
      setHighlightedIndex(selected < 0 ? edge(last) : selected)
    }
    return true
  }
  function move(last: boolean, wrap: boolean) {
    const indices = enabled.value
    if (!indices.length) return
    const current = indices.indexOf(highlightedIndex.value)
    if (current < 0) { setHighlightedIndex(edge(last)); return }
    const next = current + (last ? -1 : 1)
    setHighlightedIndex(indices[wrap ? (next + indices.length) % indices.length : Math.max(0, Math.min(indices.length - 1, next))])
  }
  function onTriggerClick() {
    if (config().isDisabled) return
    if (config().isOpen) close()
    else open(false, false)
  }
  function onItemSelect(item: T) {
    if (config().isDisabled || item.disabled) return
    if (multiple) { config().onToggle?.(item.value); return }
    config().onSelect?.(item.value)
    close()
  }
  function onItemMouseEnter(item: T, index: number, cell: MultiComboboxCell = 'option') {
    if (config().isDisabled || !config().isOpen || items()[index]?.value !== item.value
      || (cell === 'action' ? !hasAction(index) : item.disabled)) return
    highlightAt(index, cell, false)
  }

  function onKeyDown(event: KeyboardEvent, field = false) {
    const { key } = event
    const current = config()
    if (event.defaultPrevented || current.isDisabled) return
    if (event.isComposing || event.keyCode === 229) {
      if (field && key === 'Escape' && current.isOpen) event.stopPropagation()
      return
    }
    if (field && key !== 'Escape' && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey)) return
    rememberRoot(event)
    if (key === 'Escape' && current.isOpen) {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (current.isOpen) {
        event.preventDefault()
        move(key === 'ArrowUp', field)
      } else if (!field) {
        event.preventDefault()
        open(key === 'ArrowUp', true)
      } else if (key === 'ArrowDown' && items().length && open(false, true, true)) event.preventDefault()
      return
    }
    const index = highlightedIndex.value
    const item = items()[index]
    if (key === 'Enter' || key === ' ' && !current.hasSearch && !field) {
      if (!current.isOpen && !field) {
        event.preventDefault()
        open(false, false)
      } else if (current.isOpen && item && (highlightedCell.value === 'action' || !item.disabled)) {
        event.preventDefault()
        if (highlightedCell.value === 'action') current.onActivateAction?.(index)
        else onItemSelect(item)
      }
      return
    }
    if (field) return
    if (multiple && !current.hasSearch && key !== ' ' && typeahead.onKeyDown(event)) return
    if (current.isOpen && hasAction(index) && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      const rtl = isRtl(event.currentTarget instanceof HTMLElement ? event.currentTarget : null)
      const cell = key === (rtl ? 'ArrowLeft' : 'ArrowRight') ? 'action' : 'option'
      if (cell !== highlightedCell.value && (cell === 'action' || !item?.disabled)) {
        event.preventDefault()
        highlightAt(index, cell, true)
      }
      return
    }
    if (key === 'Tab' && current.isOpen) { close(); return }
    if (current.isOpen && ['Home', 'End', 'PageUp', 'PageDown'].includes(key)) {
      event.preventDefault()
      setHighlightedIndex(edge(key === 'End' || key === 'PageDown'))
      return
    }
    if (!current.hasSearch && !current.isOpen && (key === 'Delete' || key === 'Backspace')
      && current.onClear && (multiple ? current.hasValue : current.value != null)) {
      event.preventDefault()
      current.onClear()
      return
    }
    const shortcut = event.metaKey || (event.ctrlKey || event.altKey) && !event.getModifierState('AltGraph')
    if (current.hasSearch && current.onSearchSeed && !shortcut && key !== ' ' && Array.from(key).length === 1
      && (current.isOpen || open(false, false))) {
      event.preventDefault()
      current.onSearchSeed(key)
    }
  }

  const getFieldProps = (handlers: FieldHandlers = {}) => {
    const expanded = config().isOpen && items().length > 0
    return {
      role: 'combobox' as const,
      'aria-autocomplete': 'list' as const,
      'aria-expanded': expanded,
      'aria-controls': expanded ? config().listboxId : undefined,
      'aria-activedescendant': activeDescendantId.value,
      onKeydown(event: KeyboardEvent) {
        onKeyDown(event, true)
        if (!event.defaultPrevented) handlers.onKeyDown?.(event)
      },
    }
  }
  const getListboxProps = () => ({
    id: config().listboxId,
    role: 'listbox' as const,
    onMousedown(event: MouseEvent) { if (event.button === 0) event.preventDefault() },
  })
  const getOptionProps = (index: number) => {
    const item = items()[index]
    return {
      id: getItemId(index),
      role: 'option' as const,
      'aria-selected': index === highlightedIndex.value,
      'aria-disabled': item?.disabled || undefined,
      onPointermove(event: PointerEvent) { if (item && event.pointerType !== 'touch') onItemMouseEnter(item, index) },
      onClick() { if (item) onItemSelect(item) },
    }
  }

  return { highlightedIndex, highlightedCell, activeDescendantId, setHighlightedIndex, getItemId, getActionCellId,
    onTriggerClick, onKeyDown: (event: KeyboardEvent) => onKeyDown(event), onItemSelect, onItemMouseEnter,
    getFieldProps, getListboxProps, getOptionProps }
}

export function useCombobox<T extends ComboboxOption>(options: MaybeRefOrGetter<ComboboxOptions<T>>) {
  const { highlightedIndex, activeDescendantId, setHighlightedIndex, getItemId, onTriggerClick, onKeyDown, onItemSelect,
    onItemMouseEnter, getFieldProps, getListboxProps, getOptionProps } = combobox<T>(options, false)
  return { highlightedIndex, activeDescendantId, setHighlightedIndex, getItemId, onTriggerClick, onKeyDown, onItemSelect,
    onItemMouseEnter: (item: T, index: number) => onItemMouseEnter(item, index), getFieldProps, getListboxProps, getOptionProps }
}

export function useMultiCombobox<T extends MultiComboboxOption>(options: MaybeRefOrGetter<MultiComboboxOptions<T>>) {
  const { highlightedIndex, highlightedCell, activeDescendantId, setHighlightedIndex, getItemId, getActionCellId,
    onTriggerClick, onKeyDown, onItemSelect, onItemMouseEnter, getFieldProps, getListboxProps } = combobox<T>(options, true)
  return { highlightedIndex, highlightedCell, activeDescendantId, setHighlightedIndex, getItemId, getActionCellId,
    onTriggerClick, onKeyDown, onItemSelect, onItemMouseEnter, getFieldProps, getListboxProps }
}
