<script setup lang="ts" generic="Multiple extends boolean = false">
import { computed } from 'vue'
import { ListboxContent, ListboxRoot, ListboxVirtualizer } from 'reka-ui'
import { groupOptions } from '../internal/collection'
import SListBoxItem from './SListBoxItem.vue'
import SListBoxSection from './SListBoxSection.vue'
import SEmptyState from './SEmptyState.vue'
import type { SelectOption } from '../types'

const props = withDefaults(defineProps<{
  options: readonly SelectOption[]
  label: string
  multiple?: Multiple & boolean
  disabled?: boolean
  highlightOnHover?: boolean
  virtual?: boolean
  direction?: 'ltr' | 'rtl'
  emptyText?: string
}>(), { emptyText: 'No options' })
type Selection = Multiple extends true ? string[] : string
const model = defineModel<Selection>()
const groups = computed(() => groupOptions(props.options))
const lookup = computed(() => new Map(props.options.map(item => [item.value, item])))
const virtualKeys = computed(() => props.options.map(item => item.value))
const virtual = computed(() => props.virtual && groups.value.every(([heading]) => heading === undefined))

function update(value: unknown) {
  const normalized = props.multiple
    ? Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
    : typeof value === 'string' ? value : undefined
  model.value = normalized as Selection | undefined
}
</script>

<template>
  <ListboxRoot :model-value="model" :multiple="Boolean(multiple)" :disabled="disabled" :dir="direction"
    :highlight-on-hover="highlightOnHover" loop @update:model-value="update">
    <ListboxContent class="sy-listbox" :aria-label="label">
      <ListboxVirtualizer v-if="virtual && options.length" :options="virtualKeys" :estimate-size="34" :text-content="key => lookup.get(key)?.label ?? key">
        <template #default="{ option: key }">
          <SListBoxItem :value="key" :label="lookup.get(key)?.label" :description="lookup.get(key)?.description" :disabled="lookup.get(key)?.disabled" />
        </template>
      </ListboxVirtualizer>
      <template v-else>
        <SListBoxSection v-for="([heading, items], index) in groups" :key="heading ?? index" :label="heading">
          <SListBoxItem v-for="item in items" :key="item.value" :value="item.value" :label="item.label" :description="item.description" :disabled="item.disabled">
            <slot name="item" :item="item">{{ item.label }}</slot>
          </SListBoxItem>
        </SListBoxSection>
        <SEmptyState v-if="!options.length" :title="emptyText" />
      </template>
    </ListboxContent>
  </ListboxRoot>
</template>
