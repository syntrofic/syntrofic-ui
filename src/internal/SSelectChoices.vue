<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import { ListboxContent, ListboxFilter, ListboxGroup, ListboxGroupLabel, ListboxItem, ListboxRoot } from 'reka-ui'
import SCheckbox from '../components/SCheckbox.vue'
import SSelectorOption from '../components/SSelectorOption.vue'
import { useTranslator } from '../rac/locale'
import type { SelectOption } from '../types'
import { groupOptions } from './collection'
import { useAnimatedLayout } from './motion'

const props = defineProps<{
  options: readonly SelectOption[]
  selection?: string | string[]
  multiple?: boolean
  searchable?: boolean
  focusSearch?: boolean
  selectAll?: boolean
  label: string
  searchLabel?: string
  selectAllLabel?: string
  emptyText: string
  direction?: 'ltr' | 'rtl'
  visibleItems?: number
}>()
const emit = defineEmits<{ change: [value: unknown] }>()
defineSlots<{ option?(props: { option: SelectOption; selected: boolean }): unknown }>()

const id = 'sy-select-choices-' + useId()
const query = ref('')
const rows = useTemplateRef<HTMLElement>('rows')
const translate = useTranslator({ 'select.search': 'Search options', 'select.all': 'Select all' })
const filtered = computed(() => {
  const value = query.value.trim().toLocaleLowerCase()
  if (!value) return props.options
  return props.options.filter(option => [option.label, option.description, option.group].some(part => part?.toLocaleLowerCase().includes(value)))
})
const groups = computed(() => groupOptions(filtered.value))
const chosen = computed(() => new Set(Array.isArray(props.selection) ? props.selection : [props.selection]))
const available = computed(() => filtered.value.filter(option => !option.disabled).map(option => option.value))
const allChecked = computed(() => available.value.length > 0 && available.value.every(value => chosen.value.has(value)))
const someChecked = computed(() => !allChecked.value && available.value.some(value => chosen.value.has(value)))
const capture = useAnimatedLayout()
watch(filtered, () => {
  if (!rows.value) return
  const current = new Set(filtered.value.map(option => option.value))
  const retained = [...rows.value.querySelectorAll<HTMLElement>('[data-select-value]')]
    .filter(row => current.has(row.dataset.selectValue!))
  void nextTick(capture(retained))
})

function setAll(checked: boolean) {
  const values = new Set(Array.isArray(props.selection) ? props.selection : [])
  for (const value of available.value) {
    if (checked) values.add(value)
    else values.delete(value)
  }
  emit('change', [...values])
}
</script>

<template>
  <ListboxRoot :model-value="selection" :multiple="multiple" :dir="direction" class="sy-select-choices" loop @update:model-value="emit('change', $event)">
    <ListboxFilter v-if="searchable" v-model="query" class="sy-field__control sy-select-choices__search" data-size="sm"
      role="combobox" aria-autocomplete="list" aria-expanded="true" :aria-controls="id"
      :aria-label="searchLabel ?? translate('select.search')" :placeholder="searchLabel ?? translate('select.search')"
      autocomplete="off" :auto-focus="focusSearch" />
    <SCheckbox v-if="multiple && selectAll" :model-value="allChecked" :indeterminate="someChecked"
      :disabled="!available.length" size="sm" @update:model-value="setAll(Boolean($event))">
      {{ selectAllLabel ?? translate('select.all') }}
    </SCheckbox>
    <ListboxContent :id="id" class="sy-select-choices__viewport" :aria-label="label"
      :style="{ '--sy-select-item-limit': visibleItems === undefined ? undefined : `calc(${Math.max(1, Math.trunc(visibleItems) || 1)} * var(--sy-select-option-height))` }"
      @mousedown.left="searchable && $event.preventDefault()">
      <div ref="rows">
        <ListboxGroup v-for="([group, items], index) in groups" :key="group ?? index" class="sy-select__group">
          <ListboxGroupLabel v-if="group" class="sy-select__group-label">{{ group }}</ListboxGroupLabel>
          <ListboxItem v-for="option in items" :key="option.value" :value="option.value" :disabled="option.disabled"
            :data-select-value="option.value" :aria-disabled="option.disabled || undefined" :aria-label="option.label"
            :aria-describedby="option.description ? id + '-' + encodeURIComponent(option.value) : undefined" class="sy-select__option">
            <slot name="option" :option="option" :selected="chosen.has(option.value)">
              <SSelectorOption :label="option.label" :icon="option.icon" :description="option.description" :end-label="option.endLabel" />
            </slot>
            <span v-if="option.description" :id="id + '-' + encodeURIComponent(option.value)" hidden>{{ option.description }}</span>
            <span class="sy-select__mark" :data-checked="chosen.has(option.value) || undefined" aria-hidden="true"></span>
          </ListboxItem>
        </ListboxGroup>
      </div>
    </ListboxContent>
    <p v-if="!filtered.length" class="sy-select__empty" role="status">{{ emptyText }}</p>
  </ListboxRoot>
</template>
