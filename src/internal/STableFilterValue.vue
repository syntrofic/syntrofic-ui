<script setup lang="ts">
import { computed } from 'vue'
import SDatePicker from '../components/SDatePicker.vue'
import SInput from '../components/SInput.vue'
import SNumberField from '../components/SNumberField.vue'
import SSelect from '../components/SSelect.vue'
import { readSearchDate, searchDateZone, storeSearchDate } from './search-dates'
import type { TableFilterEditor, TableFilterValue, TableColumnFilteringOptions } from './table-filtering'

const props = defineProps<{
  editor: TableFilterEditor
  config: TableColumnFilteringOptions
  label: string
  disabled?: boolean
}>()
const value = defineModel<TableFilterValue | null>({ required: true })
const text = computed(() => typeof value.value === 'string' ? value.value : undefined)
const number = computed(() => typeof value.value === 'number' ? value.value : undefined)
const selected = computed(() => Array.isArray(value.value) ? [...value.value] : undefined)
const dateOnly = computed(() => props.editor.field.dateOnly !== false)
const zone = computed(() => searchDateZone(props.config.searchConfig.timeZone, dateOnly.value))
const date = computed(() => typeof value.value === 'string' || typeof value.value === 'number'
  ? readSearchDate(value.value, zone.value, dateOnly.value) : undefined)
</script>

<template>
  <SSelect v-if="editor.type === 'multiple'" multiple :model-value="selected" :options="editor.options" :disabled="disabled"
    :aria-label="label" :placeholder="config.labels?.choose ?? 'Choose'" @update:model-value="value = $event ?? null" />
  <SSelect v-else-if="editor.type === 'select'" :model-value="text" :options="editor.options" :disabled="disabled"
    :aria-label="label" :placeholder="config.labels?.choose ?? 'Choose'" @update:model-value="value = $event ?? null" />
  <SDatePicker v-else-if="editor.type === 'date'" :model-value="date" :aria-label="label" :disabled="disabled"
    :locale="config.locale" :granularity="dateOnly ? 'day' : 'minute'"
    :trigger-label="config.labels?.calendar ?? 'Choose date'" :trigger-text="config.labels?.calendar ?? 'Calendar'"
    @update:model-value="value = storeSearchDate($event, zone, dateOnly, editor.field.dateStorage) ?? null" />
  <SNumberField v-else-if="editor.type === 'number'" hide-controls :step-snapping="false" :model-value="number"
    :aria-label="label" :locale="config.locale" :disabled="disabled" :format-options="{ maximumFractionDigits: 12 }"
    @update:model-value="value = Number.isFinite($event) ? ($event ?? null) : null" />
  <SInput v-else :aria-label="label" :disabled="disabled" :model-value="text" @update:model-value="value = $event ?? null" />
</template>
