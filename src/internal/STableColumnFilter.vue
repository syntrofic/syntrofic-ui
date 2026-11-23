<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import SButton from '../components/SButton.vue'
import SIcon from '../components/SIcon.vue'
import SPopover from '../components/SPopover.vue'
import STableFilterValue from './STableFilterValue.vue'
import { validColumnFilter, type TableColumnFilteringControl, type TableFilterFieldRef, type TableFilterValue } from './table-filtering'

const props = defineProps<{
  columnKey: string
  columnLabel: string
  definition: string | TableFilterFieldRef
  control: TableColumnFilteringControl
  disabled?: boolean
}>()
const config = computed(() => props.control.options.value)
const label = computed(() => config.value.getLabel?.(props.columnLabel) ?? `Filter ${props.columnLabel}`)
const editor = computed(() => props.control.fieldFor(props.definition))
const variant = computed(() => config.value.variant ?? 'popover')
const open = shallowRef(false)
const draft = shallowRef<TableFilterValue | null>(null)
const inline = useTemplateRef<HTMLDivElement>('inline')
const committed = computed({
  get: () => props.control.valueFor(props.columnKey) ?? null,
  set: value => props.control.change(props.columnKey, validColumnFilter(value) ? value : null),
})
const active = computed(() => validColumnFilter(committed.value))
watch(open, next => { if (next) draft.value = committed.value })

function apply() {
  committed.value = draft.value
  open.value = false
}
function clear() {
  if (!open.value) inline.value?.querySelector<HTMLElement>('[data-sy-focus-target], [role="spinbutton"]')?.focus({ preventScroll: true })
  committed.value = null
  open.value = false
}
</script>

<template>
  <template v-if="editor">
    <SPopover v-if="variant === 'popover'" v-model:open="open" :label="label" portal tab-behavior="contain">
      <template #trigger>
        <SButton class="sy-table__filter-toggle" size="sm" variant="ghost" :disabled="disabled" :aria-label="label"
          :data-filter-active="active || undefined">
          <SIcon name="funnel" size="sm" />
        </SButton>
      </template>
      <form class="sy-table__filter-dialog" @submit.prevent="apply">
        <STableFilterValue v-model="draft" :editor="editor" :config="config" :label="label" :disabled="disabled" />
        <div class="sy-table__filter-actions">
          <SButton v-if="active" type="button" size="sm" variant="ghost" :disabled="disabled" @click="clear">{{ config.labels?.clear ?? 'Clear' }}</SButton>
          <SButton type="submit" size="sm" :disabled="disabled">{{ config.labels?.apply ?? 'Apply' }}</SButton>
        </div>
      </form>
    </SPopover>
    <div v-else ref="inline" class="sy-table__filter-inline" :data-variant="variant">
      <STableFilterValue v-model="committed" :editor="editor" :config="config" :label="label" :disabled="disabled" />
      <SButton v-if="active" variant="ghost" size="sm" :aria-label="`${config.labels?.clear ?? 'Clear'} · ${columnLabel}`" :disabled="disabled" @click="clear"><SIcon name="close" /></SButton>
    </div>
  </template>
</template>
