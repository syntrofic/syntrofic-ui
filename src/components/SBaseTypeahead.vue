<script setup lang="ts">
import { computed, mergeProps, nextTick, useId, useTemplateRef, watch } from 'vue'
import { useFilter } from 'reka-ui'
import type { SelectOption } from '../types'
import { useCombobox } from '../internal/combobox'
import { useCollectionContentMotion } from '../internal/collection-motion'
import { useQueryResults, type QuerySource } from '../internal/query-results'
import SPopover from './SPopover.vue'
import SSpinner from './SSpinner.vue'
import STypeaheadItem from './STypeaheadItem.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  options?: readonly SelectOption[]
  search?: QuerySource<SelectOption>
  searchDelay?: number
  label: string
  placeholder?: string
  anchor?: HTMLElement | null
  disabled?: boolean
  openOnFocus?: boolean
  clearOnSelect?: boolean
  maxResults?: number
  emptyText?: string
  loadingText?: string
  errorText?: string
  menuRole?: 'listbox' | 'dialog'
  menuLabel?: string
}>(), { options: () => [], emptyText: 'No results', loadingText: 'Searching…', errorText: 'Search unavailable',
  menuRole: 'listbox', searchDelay: 140 })
const emit = defineEmits<{ select: [option: SelectOption]; searchError: [error: unknown] }>()
const query = defineModel<string>({ default: '' })
const open = defineModel<boolean>('open', { default: false })
const id = 'sy-base-typeahead-' + useId()
const menuId = id + '-menu'
const input = useTemplateRef<HTMLInputElement>('input')
const root = useTemplateRef<HTMLElement>('root')
const resultFrame = useTemplateRef<HTMLElement>('resultFrame')
const editor = useTemplateRef<HTMLElement>('editor')
const anchorElement = computed(() => props.anchor ?? root.value ?? null)
const { contains } = useFilter({ sensitivity: 'base' })
const dialog = computed(() => props.menuRole === 'dialog')
const { results: remote, pending, failed } = useQueryResults({
  query, source: () => props.search, active: () => open.value && !dialog.value, delay: () => props.searchDelay,
  onError: error => emit('searchError', error),
})
const results = computed(() => {
  const term = query.value.trim()
  const matches = props.search && term ? remote.value
    : props.options.filter(item => !term || contains(item.label, term) || item.description && contains(item.description, term))
  return props.maxResults === undefined ? matches : matches.slice(0, Math.max(0, props.maxResults))
})
let origin: HTMLElement | undefined
let restoring = false
let choosing = false

function show(trigger?: HTMLElement) {
  if (props.disabled) return false
  const active = input.value?.ownerDocument.activeElement
  if (trigger || !open.value) origin = trigger ?? (active instanceof HTMLElement && active !== active.ownerDocument.body ? active : input.value ?? undefined)
  open.value = true
  return true
}

function hide(restore = true) {
  open.value = false
  if (!restore) return
  const target = origin
  void nextTick(() => {
    if (open.value) return
    restoring = true
    const destination = target?.isConnected ? target : input.value
    destination?.focus({ preventScroll: true })
    restoring = false
  })
}

const controls = useCombobox(() => ({
  selectableItems: results.value, listboxId: id, isOpen: open.value && !dialog.value, hasSearch: true, isDisabled: props.disabled,
  onOpen: () => !dialog.value && show(),
  onClose: () => {
    if (!choosing) hide()
    else {
      choosing = false
      void nextTick(() => { if (!dialog.value && open.value) hide() })
    }
  },
  onSelect: value => {
    const item = results.value.find(item => item.value === value)
    if (!item) return
    choosing = true
    query.value = props.clearOnSelect ? '' : item.label
    emit('select', item)
  },
}))
const field = computed(() => ({
  ...controls.getFieldProps(), 'aria-expanded': open.value,
  'aria-haspopup': dialog.value ? 'dialog' as const : 'listbox' as const,
  'aria-controls': open.value ? dialog.value ? menuId : id : undefined,
}))
const resultMessage = computed(() => pending.value ? props.loadingText : failed.value ? props.errorText : props.emptyText)
useCollectionContentMotion(resultFrame,
  () => results.value.length ? 'results' : `${pending.value ? 'loading' : failed.value ? 'error' : 'empty'}:${resultMessage.value}`,
  { items: () => results.value })
watch([open, dialog, editor], ([visible, custom, element]) => {
  if (visible && custom && element && !element.contains(element.ownerDocument.activeElement)) {
    const target = element.querySelector<HTMLElement>('[autofocus], input:not(:disabled), button:not(:disabled), select, textarea') ?? element
    target.focus({ preventScroll: true })
  }
}, { flush: 'post' })
watch(() => props.disabled, disabled => { if (disabled) hide(false) })

function edit(event: Event) {
  const field = event.target as HTMLInputElement
  if ((event as InputEvent).isComposing) return
  query.value = field.value
  controls.setHighlightedIndex(-1)
  if (!dialog.value) show()
}

defineExpose({ open: show, close: hide, focus: () => input.value?.focus() })
</script>

<template>
  <div ref="root" class="sy-base-typeahead" :data-search="Boolean(search) || undefined">
    <input ref="input" v-bind="mergeProps($attrs, field)" :value="query" :placeholder="placeholder" :aria-label="label"
      :disabled="disabled" :aria-busy="pending || undefined" autocomplete="off" class="sy-base-typeahead__input" @input="edit" @compositionend="edit"
      @focus="openOnFocus && !restoring && show()" @click="openOnFocus && show()" />
    <Transition name="sy-field-feedback">
      <SSpinner v-if="pending" class="sy-base-typeahead__spinner" decorative size="sm" />
    </Transition>
    <SPopover :open="open" :anchor="anchorElement" :label="menuLabel ?? label" :menu="!dialog" :content-id="menuId"
      :autofocus="false" :restore-focus="false" :dismiss-on-escape="false" :tab-behavior="dialog ? undefined : 'pageOrder'"
      @update:open="$event ? show() : hide(false)">
      <div v-if="dialog" ref="editor" tabindex="-1" class="sy-base-typeahead__editor" @keydown.esc.stop.prevent="hide()">
        <slot name="dialog" :close="hide" />
      </div>
      <div v-else class="sy-base-typeahead__results">
        <slot name="list-start" :query="query" />
        <div ref="resultFrame" class="sy-collection-content">
          <div class="sy-collection-content__body">
            <div v-bind="controls.getListboxProps()" class="sy-base-typeahead__options" :aria-label="menuLabel ?? label">
              <div v-for="(option, index) in results" :key="option.value" v-bind="controls.getOptionProps(index)"
                :aria-label="option.label" :aria-describedby="option.description ? id + '-description-' + index : undefined"
                :data-highlighted="controls.highlightedIndex.value === index || undefined" class="sy-collection__option">
                <slot name="option" :option="option"><STypeaheadItem :item="option" /></slot>
                <span v-if="option.description" :id="id + '-description-' + index" hidden>{{ option.description }}</span>
              </div>
            </div>
            <p v-if="!results.length" class="sy-base-typeahead__empty" role="status">{{ resultMessage }}</p>
          </div>
        </div>
        <slot name="list-end" :query="query" />
      </div>
    </SPopover>
  </div>
</template>
