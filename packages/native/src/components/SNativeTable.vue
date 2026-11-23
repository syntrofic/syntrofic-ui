<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'nativescript-vue'
import type { GridLayout } from '@nativescript/core'
import { isSelected, toggleCollectionSelection, type NativeCollectionKey, type NativeSelectionMode } from '../collection-state'
import { useNativeUI } from '../context'
import { nativeTableSort, nativeTableTracks, type NativeTableColumn, type NativeTableRow, type NativeTableSort, type NativeTableValue } from '../table-state'
import SNativeButton from './SNativeButton.vue'
import SNativeEmptyState from './SNativeEmptyState.vue'
import SNativeTableRow from './SNativeTableRow.vue'
import SNativeText from './SNativeText.vue'

const props = withDefaults(defineProps<{
  columns: readonly NativeTableColumn[]
  rows: readonly NativeTableRow[]
  label?: string
  selectionMode?: NativeSelectionMode
  localSort?: boolean
  bodyHeight?: number
  rowHeight?: number
  striped?: boolean
  emptyText?: string
  missingText?: string
  selectionLabel?: string
  ascendingLabel?: string
  descendingLabel?: string
  formatCell?: (value: NativeTableValue, column: NativeTableColumn, row: NativeTableRow) => string
}>(), { selectionMode: 'none', rowHeight: 46, emptyText: 'No rows', missingText: '—', selectionLabel: 'Select',
  ascendingLabel: 'Ascending', descendingLabel: 'Descending' })
const selected = defineModel<NativeCollectionKey[]>('selected', { default: () => [] })
const sort = defineModel<NativeTableSort>('sort')
const emit = defineEmits<{ activate: [row: NativeTableRow]; sort: [sort: NativeTableSort] }>()
defineSlots<{ cell(props: { row: NativeTableRow; column: NativeTableColumn; value: NativeTableValue }): unknown; empty(): unknown; footer(): unknown }>()
const { theme } = useNativeUI()
const host = useTemplateRef<{ nativeView: GridLayout }>('host')
const viewport = ref(0)
const selectable = computed(() => props.selectionMode !== 'none')
const geometry = computed(() => nativeTableTracks(props.columns, viewport.value, selectable.value ? 48 : 0))
const tracks = computed(() => [...(selectable.value ? [48] : []), ...geometry.value.tracks].join(',') || '*')
const rows = computed(() => props.localSort ? nativeTableSort(props.rows, sort.value) : [...props.rows])
function measure() { viewport.value = host.value?.nativeView.getActualSize()?.width ?? 0 }
function choose(column: NativeTableColumn) {
  const direction = sort.value?.column === column.key && sort.value.direction === 'ascending' ? 'descending' : 'ascending'
  sort.value = { column: column.key, direction }
  emit('sort', sort.value)
}
function select(row: NativeTableRow) {
  if (!row.disabled) selected.value = toggleCollectionSelection(selected.value, row.id, props.selectionMode)
}
function rowProps(row: NativeTableRow, index: number) {
  return { row, tracks: tracks.value, columns: props.columns, rowHeight: props.rowHeight, selectable: selectable.value,
    selected: isSelected(selected.value, row.id), striped: props.striped && index % 2 === 1, emptyText: props.missingText,
    selectionLabel: props.selectionLabel, formatCell: props.formatCell }
}
</script>

<template>
  <GridLayout ref="host" @layoutChanged="measure">
    <StackLayout>
      <SNativeText v-if="label" :text="label" heading marginBottom="5" />
      <ScrollView orientation="horizontal" :scrollBarIndicatorVisible="true" direction="ltr">
        <StackLayout :width="geometry.width">
          <GridLayout :columns="tracks" minHeight="44" :backgroundColor="theme.colors.surfaceSage" :borderRadius="theme.geometry.radiusSm" cornerShape="squircle">
            <GridLayout v-for="(column, index) in columns" :key="column.key" :col="index + Number(selectable)" padding="0 3">
              <SNativeButton v-if="column.sortable" :label="column.label" size="sm" variant="ghost" fullWidth
                :pressed="sort?.column === column.key"
                :accessibilityValue="sort?.column === column.key ? sort.direction === 'ascending' ? ascendingLabel : descendingLabel : undefined"
                @tap="choose(column)" />
              <SNativeText v-else :text="column.label" heading size="caption" verticalAlignment="middle" marginLeft="5" />
            </GridLayout>
          </GridLayout>
          <slot v-if="!rows.length" name="empty"><SNativeEmptyState :title="emptyText" marginTop="4" /></slot>
          <ListView v-else-if="bodyHeight" :items="rows" :height="bodyHeight" :rowHeight="rowHeight" separatorColor="transparent">
            <template #default="{ item, index }">
              <SNativeTableRow v-bind="rowProps(item, index)" @select="select(item)" @activate="!item.disabled && emit('activate', item)">
                <template v-if="$slots.cell" #cell="cell"><slot name="cell" v-bind="cell" /></template>
              </SNativeTableRow>
            </template>
          </ListView>
          <template v-else>
            <SNativeTableRow v-for="(row, index) in rows" :key="row.id" v-bind="rowProps(row, index)"
              @select="select(row)" @activate="!row.disabled && emit('activate', row)">
              <template v-if="$slots.cell" #cell="cell"><slot name="cell" v-bind="cell" /></template>
            </SNativeTableRow>
          </template>
        </StackLayout>
      </ScrollView>
      <slot name="footer" />
    </StackLayout>
  </GridLayout>
</template>
