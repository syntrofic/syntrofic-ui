<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { SButton, SDialog, SInput, SMotionText, SSwitch, useAnnounce, useCombobox, useMultiCombobox } from '../src'

defineProps<{ multiple?: boolean }>()
const records = [
  { value: 'brand', label: '品牌手册' },
  { value: 'archive', label: '归档模板', disabled: true },
  { value: 'grid', label: '版式网格' },
  { value: 'tokens', label: '颜色令牌' },
]
const dialog = ref(false)
const query = ref('')
const open = ref(false)
const rtl = ref(false)
const selected = ref<string[]>([])
const result = ref('')
const listId = 'review-options-' + useId()
const options = computed(() => records.filter(item => item.label.includes(query.value.trim())))
const choose = useCombobox(() => ({
  selectableItems: options.value, listboxId: listId, isOpen: open.value, hasSearch: true,
  onOpen: () => { open.value = true; return true },
  onClose: () => { open.value = false },
  onSelect: value => { result.value = records.find(item => item.value === value)?.label ?? '' },
}))
const announce = useAnnounce(() => typeof document === 'undefined' ? null : document.getElementById(listId + '-field'))
watch(query, () => {
  if (!dialog.value) return
  open.value = true
  choose.setHighlightedIndex(-1)
  announce(options.value.length ? `找到 ${options.value.length} 项文件` : '没有匹配的文件')
})
watch(dialog, shown => {
  if (!shown) { query.value = ''; open.value = false }
})
const multi = useMultiCombobox(() => ({
  selectableItems: records, listboxId: listId, isOpen: open.value, isGrid: true, hasValue: selected.value.length > 0,
  onOpen: () => { open.value = true },
  onClose: () => { open.value = false },
  onToggle: value => { selected.value = selected.value.includes(value) ? selected.value.filter(item => item !== value) : [...selected.value, value] },
  onClear: () => { selected.value = [] },
  rowHasAction: () => true,
  onActivateAction: index => { result.value = `查看${records[index].label}` },
}))
const { highlightedIndex, highlightedCell, activeDescendantId } = multi
function leaveGrid(event: FocusEvent) {
  if (!(event.relatedTarget instanceof Node) || !(event.currentTarget as HTMLElement).contains(event.relatedTarget)) open.value = false
}
</script>

<template>
  <template v-if="!multiple">
    <SButton type="button" variant="secondary" size="sm" @click="dialog = true">查找文件</SButton>
    <SDialog v-model:open="dialog" title="选择文件" description="按文件名查找并选择。">
      <SInput v-model="query" v-bind="choose.getFieldProps({ onKeyDown: event => {
        if (event.key === 'Enter') result = '保留查询'
      } })" :id="listId + '-field'" label="文件名" autofocus @blur="open = false" />
      <ul v-if="open && options.length" v-bind="choose.getListboxProps()" aria-label="匹配的文件" class="review-combobox__popup">
        <li v-for="(item, index) in options" :key="item.value" v-bind="choose.getOptionProps(index)"
          class="review-combobox__option">{{ item.label }}</li>
      </ul>
      <p v-else-if="open" class="review-combobox__empty">没有匹配的文件</p>
      <output aria-label="文件操作结果"><SMotionText :value="result" /></output>
    </SDialog>
  </template>
  <div v-else class="review-combobox" role="region" aria-label="自定义多选网格">
    <SSwitch v-model="rtl">从右向左</SSwitch>
    <div :dir="rtl ? 'rtl' : 'ltr'" class="review-combobox__field" @focusout="leaveGrid">
      <SButton type="button" variant="secondary" size="sm" role="combobox" aria-label="选择资源"
        aria-haspopup="grid" :aria-expanded="open" :aria-controls="open ? listId : undefined" :aria-activedescendant="activeDescendantId"
        @click="multi.onTriggerClick" @keydown="multi.onKeyDown">
        {{ selected.length ? `已选 ${selected.length} 项` : '选择资源' }}
      </SButton>
      <div v-if="open" :id="listId" role="grid" aria-multiselectable="true" aria-label="资源选择" class="review-combobox__popup"
        @mousedown.left.prevent>
        <div v-for="(item, index) in records" :key="item.value" role="row" :aria-selected="selected.includes(item.value)"
          class="review-combobox__row">
          <div :id="multi.getItemId(index)" role="gridcell" :aria-disabled="item.disabled || undefined" class="review-combobox__option"
            :data-active="index === highlightedIndex && highlightedCell === 'option' || undefined"
            @pointermove="multi.onItemMouseEnter(item, index)" @click="multi.onItemSelect(item)">
            {{ item.label }}<span v-if="selected.includes(item.value)" aria-hidden="true">✓</span>
          </div>
          <div :id="multi.getActionCellId(index)" role="gridcell" :aria-label="`查看${item.label}`" class="review-combobox__option"
            :data-active="index === highlightedIndex && highlightedCell === 'action' || undefined"
            @pointermove="multi.onItemMouseEnter(item, index, 'action')" @click="result = `查看${item.label}`">
            查看
          </div>
        </div>
      </div>
    </div>
    <output aria-label="资源操作结果"><SMotionText :value="result" /></output>
  </div>
</template>

<style scoped>
.review-combobox { display: grid; justify-items: start; min-inline-size: 0; gap: var(--sy-space-2); }
.review-combobox__field { display: grid; justify-items: start; min-inline-size: 0; }
.review-combobox__popup { margin: var(--sy-space-2) 0 0; padding: 4px; max-block-size: 8rem; overflow: auto; min-inline-size: min(11rem, 100%); border: 1px solid var(--sy-border); border-radius: var(--sy-radius-md); background: var(--sy-canvas); }
.review-combobox__row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px; }
.review-combobox__option { display: flex; justify-content: space-between; align-items: center; gap: 8px; min-block-size: 2rem; padding: 0 8px; border-radius: var(--sy-radius-sm); cursor: pointer; transition: background-color var(--sy-duration) var(--sy-ease-settle); }
.review-combobox__option[data-active], .review-combobox__option[aria-selected='true'] { background: var(--sy-accent-soft); }
.review-combobox__option[aria-disabled='true'], .review-combobox__empty { color: var(--sy-text-muted); }
</style>
