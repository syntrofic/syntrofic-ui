<script setup lang="ts">
import { computed } from 'nativescript-vue'
import { useNativeUI } from '../context'
import type { NativeTableColumn, NativeTableRow, NativeTableValue } from '../table-state'
import SNativeCheckbox from './SNativeCheckbox.vue'
import SNativeText from './SNativeText.vue'

const props = defineProps<{
  row: NativeTableRow
  columns: readonly NativeTableColumn[]
  tracks: string
  rowHeight: number
  selectable: boolean
  selected?: boolean
  striped?: boolean
  emptyText: string
  selectionLabel: string
  formatCell?: (value: NativeTableValue, column: NativeTableColumn, row: NativeTableRow) => string
}>()
defineEmits<{ select: []; activate: [] }>()
defineSlots<{ cell(props: { row: NativeTableRow; column: NativeTableColumn; value: NativeTableValue }): unknown }>()
const { theme, direction } = useNativeUI()
const rtl = computed(() => direction.value === 'rtl')
function format(column: NativeTableColumn) {
  const value = props.row.cells[column.key]
  return props.formatCell?.(value, column, props.row) ?? (value == null ? props.emptyText : String(value))
}
</script>

<template>
  <GridLayout :columns="tracks" :height="rowHeight" :opacity="row.disabled ? .55 : 1"
    :backgroundColor="selected ? theme.colors.accentSoft : striped ? theme.colors.surfaceMuted : 'transparent'">
    <SNativeCheckbox v-if="selectable" col="0" :label="selectionLabel + ' ' + (row.label ?? row.id)"
      :modelValue="selected" :disabled="row.disabled" hideLabel @update:modelValue="$emit('select')" />
    <GridLayout v-for="(column, index) in columns" :key="column.key" :col="index + Number(selectable)" padding="3 8">
      <slot name="cell" :row="row" :column="column" :value="row.cells[column.key]">
        <SNativeText :text="format(column)" :accessibilityLabel="column.label + ' ' + format(column)" :wrap="false"
          :textAlignment="column.align === 'center' ? 'center' : (column.align === 'end') !== rtl ? 'right' : 'left'"
          size="caption" verticalAlignment="middle" @tap="$emit('activate')" />
      </slot>
    </GridLayout>
  </GridLayout>
</template>
