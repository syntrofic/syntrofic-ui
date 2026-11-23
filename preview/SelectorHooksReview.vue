<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import { SInput, SMotionText, STag, useCombobox, useMultiCombobox } from '../src'

const props = defineProps<{ multiple?: boolean }>()
const teammates = [
  { value: 'lin', label: '林舟', detail: '视觉设计' },
  { value: 'xu', label: '许然', detail: '组件开发' },
  { value: 'zhou', label: '周昱', detail: '项目负责人' },
]
const tags = [
  { value: 'motion', label: '动画', detail: '设计系统' },
  { value: 'a11y', label: '可访问性', detail: '工程质量' },
  { value: 'review', label: '待评审', detail: '交付状态' },
  { value: 'fix', label: '缺陷修复', detail: '工程质量' },
]
const root = useTemplateRef<HTMLElement>('root')
const listId = 'review-selector-hook-' + useId()
const query = ref('')
const open = ref(false)
const selected = ref<string>()
const selectedTags = ref<string[]>([])
const options = computed(() => (props.multiple ? tags : teammates)
  .filter(option => (option.label + ' ' + option.detail).includes(query.value.trim())))
const chosenTags = computed(() => tags.filter(tag => selectedTags.value.includes(tag.value)))
const config = () => ({
  selectableItems: options.value, listboxId: listId, isOpen: open.value, hasSearch: true,
  onOpen: () => { open.value = true; return true },
  onClose: () => { open.value = false },
})
const single = useCombobox(() => ({
  ...config(), value: selected.value,
  onSelect: value => {
    selected.value = value
    query.value = teammates.find(person => person.value === value)?.label ?? ''
  },
}))
const multi = useMultiCombobox(() => ({
  ...config(), hasValue: selectedTags.value.length > 0, onToggle: toggleTag,
}))
const controls = computed(() => props.multiple ? multi : single)
const activeId = computed(() => controls.value.activeDescendantId.value)
const selectedLabel = computed(() => teammates.find(person => person.value === selected.value)?.label ?? '')

function search(value: string | undefined) {
  query.value = value ?? ''
  if (!props.multiple) selected.value = undefined
  open.value = true
  controls.value.setHighlightedIndex(-1)
}
function toggleTag(value: string) {
  selectedTags.value = selectedTags.value.includes(value) ? selectedTags.value.filter(tag => tag !== value) : [...selectedTags.value, value]
}
function clearTag(value: string) {
  toggleTag(value)
  root.value?.querySelector('input')?.focus({ preventScroll: true })
  open.value = true
}
function focusLeft(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) open.value = false
}
</script>

<template>
  <section ref="root" class="review__stack hook-picker" :aria-label="multiple ? '工单标签' : '分配负责人'" @focusout="focusLeft">
    <h3>{{ multiple ? '工单标签' : '分配负责人' }}</h3>
    <TransitionGroup v-if="multiple" name="hook-tags" tag="div" class="review__row hook-picker__tags">
      <STag v-for="tag in chosenTags" :key="tag.value" :label="tag.label" removable :remove-label="'移除' + tag.label" @remove="clearTag(tag.value)" />
    </TransitionGroup>
    <SInput :model-value="query" :label="multiple ? '搜索标签' : '搜索负责人'" v-bind="controls.getFieldProps()"
      autocomplete="off" @update:model-value="search" />
    <Transition name="hook-results">
      <ul v-if="open" v-bind="controls.getListboxProps()" class="hook-picker__options"
        :aria-label="multiple ? '匹配的标签' : '匹配的成员'" :aria-multiselectable="multiple || undefined">
        <li v-for="(option, index) in options" :key="option.value" :id="controls.getItemId(index)" role="option"
          :aria-selected="multiple ? selectedTags.includes(option.value) : activeId === controls.getItemId(index)"
          :data-active="activeId === controls.getItemId(index) || undefined" class="hook-picker__option"
          @pointermove="$event.pointerType !== 'touch' && controls.onItemMouseEnter(option, index)"
          @click="controls.onItemSelect(option)">
          {{ option.label }} <small>{{ option.detail }}</small>
        </li>
      </ul>
    </Transition>
    <p v-if="open && !options.length" role="status" class="sy-field__hint">没有匹配结果</p>
    <output v-if="!multiple" aria-label="已分配的负责人"><SMotionText :value="selectedLabel" /></output>
  </section>
</template>

<style scoped>
.hook-picker__tags:empty { display: none; }
.hook-picker__options { list-style: none; margin: 0; padding: 4px; background: var(--sy-control); border-radius: var(--sy-radius-md); }
.hook-picker__options:empty { display: none; }
.hook-picker__option {
  display: flex; align-items: center; gap: 8px; min-block-size: 2rem; padding-inline: 8px; border-radius: var(--sy-radius-sm);
  cursor: pointer; transition: background-color var(--sy-duration) var(--sy-ease-settle);
}
.hook-picker__option small { color: var(--sy-text-muted); }
.hook-picker__option[aria-selected='true'] { color: var(--sy-accent-text); }
.hook-picker__option[data-active] { background: var(--sy-accent-soft); }
.hook-tags-move, .hook-tags-enter-active, .hook-tags-leave-active, .hook-results-enter-active, .hook-results-leave-active {
  transition: opacity var(--sy-motion-replace) var(--sy-ease-settle), transform var(--sy-motion-replace) var(--sy-ease-settle);
}
.hook-tags-enter-from, .hook-tags-leave-to, .hook-results-enter-from, .hook-results-leave-to { opacity: 0; transform: translateY(-4px); }
@media (prefers-reduced-motion: reduce) {
  .hook-tags-enter-from, .hook-tags-leave-to, .hook-results-enter-from, .hook-results-leave-to { transform: none; }
}
</style>
