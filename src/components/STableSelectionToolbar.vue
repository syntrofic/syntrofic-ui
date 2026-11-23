<script setup lang="ts">
import { provide } from 'vue'
import SActionBar, { type ActionBarAction } from './SActionBar.vue'
import { buttonGroup } from '../internal/button-group'
import type { TableSelectionState } from '../internal/table-state'

const props = withDefaults(defineProps<{
  selection: TableSelectionState
  label?: string
  clearLabel?: string
  renderSelectionLabel?: (count: number) => string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'muted' | 'raised'
  disabled?: boolean
  actions?: readonly ActionBarAction[]
  returnFocus?: () => HTMLElement | null
}>(), { label: 'Bulk actions', clearLabel: 'Clear selection', size: 'sm', variant: 'muted' })

const emit = defineEmits<{ action: [action: ActionBarAction, event: MouseEvent] }>()
provide(buttonGroup, { get size() { return props.size }, get disabled() { return props.disabled }, variant: 'ghost' })
</script>

<template>
  <SActionBar class="sy-table-selection-toolbar" :data-variant="variant" position="inline" count-position="end"
    :attached="variant === 'muted'" :count="selection.hasSelection ? selection.selectedCount : 0" :label="label"
    :clear-label="clearLabel" :size="size" :disabled="disabled" :return-focus="returnFocus" :actions="actions"
    :render-selection-label="renderSelectionLabel ?? (count => `${count} selected`)" @clear="selection.clearSelection()"
    @action="(action, event) => emit('action', action, event)">
    <template v-if="$slots.default" #default="scope"><slot v-bind="scope" /></template>
  </SActionBar>
</template>
