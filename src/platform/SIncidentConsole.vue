<script lang="ts">
import type { BadgeTone } from '../types'
import type { MetadataEntry } from '../components/SMetadataList.vue'

export interface IncidentStatus { id: string; label: string; tone?: BadgeTone }
export interface IncidentItem {
  id: string
  title: string
  description?: string
  status: string
  severity: string
  tone?: BadgeTone
  time?: number | string | Date
  details?: readonly MetadataEntry[]
}
</script>

<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue'
import SBadge from '../components/SBadge.vue'
import SButton from '../components/SButton.vue'
import SPowerSearch, { type SearchField, type SearchFilter, type SearchOperator } from '../components/SPowerSearch.vue'
import SResizable from '../components/SResizable.vue'
import SSegment from '../components/SSegment.vue'
import SSheet from '../components/SSheet.vue'
import STimestamp from '../components/STimestamp.vue'
import SIncidentInspector from './SIncidentInspector.vue'
import { useShellCompact } from '../internal/shell-layout'
import { foldSearch, matchesSearch, searchTerms } from '../internal/search-filters'

const props = withDefaults(defineProps<{
  title: string
  items: readonly IncidentItem[]
  statuses: readonly IncidentStatus[]
  locale?: string
  compactWidth?: number
  labels?: Partial<Record<'search' | 'all' | 'status' | 'severity' | 'queue' | 'inspector' | 'empty' | 'unselected' | 'close', string>>
  labelsSearch?: InstanceType<typeof SPowerSearch>['$props']['labels']
  operatorLabels?: Partial<Record<SearchOperator, string>>
}>(), { compactWidth: 660 })

const active = defineModel<string>('selected')
const root = useTemplateRef<HTMLElement>('root')
const id = useId()
const view = ref('all')
const search = ref('')
const filters = ref<SearchFilter[]>([])
const sheet = ref(false)
const compact = useShellCompact(root, () => props.compactWidth)
const i18n = computed(() => ({
  search: 'Search incidents', all: 'All', status: 'Status', severity: 'Severity', queue: 'Incident queue',
  inspector: 'Incident details', empty: 'No incident matches the filters.', unselected: 'Select an incident to see its details.',
  close: 'Close', ...props.labels,
}))
const statusMap = computed(() => new Map(props.statuses.map(status => [status.id, status])))
const fields = computed<SearchField[]>(() => [
  { key: 'status', label: i18n.value.status, options: props.statuses.map(status => ({ value: status.id, label: status.label })) },
  { key: 'severity', label: i18n.value.severity, options: [...new Set(props.items.map(item => item.severity))].map(label => ({ value: label, label })) },
])
const viewOptions = computed(() => [{ value: 'all', label: i18n.value.all }, ...props.statuses.map(status => ({ value: status.id, label: status.label }))])
const terms = computed(() => searchTerms(search.value))
const matching = computed(() => props.items.filter(item => {
  if (view.value !== 'all' && item.status !== view.value) return false
  const description = foldSearch([item.title, item.description, item.severity, statusMap.value.get(item.status)?.label].join(' '))
  return terms.value.every(term => description.includes(term)) && filters.value.every(filter => {
    const field = fields.value.find(item => item.key === filter.field)
    if (!field) return true
    return matchesSearch(field, field.key === 'status' ? item.status : item.severity, filter)
  })
}))
const groups = computed(() => {
  const byStatus = new Map<string, IncidentItem[]>()
  for (const item of matching.value) {
    const items = byStatus.get(item.status) ?? []
    items.push(item)
    byStatus.set(item.status, items)
  }
  return [...byStatus].map(([status, items]) => ({ status, items }))
})
const selected = computed(() => matching.value.find(item => item.id === active.value))
const panels = computed(() => [{ id: 'queue', label: i18n.value.queue, defaultSize: 60, minSize: '255px' },
  { id: 'inspector', label: i18n.value.inspector, minSize: '220px' }])

function select(item: IncidentItem) {
  active.value = item.id
  if (compact.value) sheet.value = true
}
</script>

<template>
  <section ref="root" class="sy-incident-console" :aria-labelledby="id">
    <h2 :id="id">{{ title }}</h2>
    <SPowerSearch v-model="filters" v-model:query="search" :fields="fields" :label="i18n.search" :labels="labelsSearch" :operator-labels="operatorLabels" />
    <SSegment :model-value="view" :items="viewOptions" :label="i18n.status" @update:model-value="view = $event || 'all'" />
    <component :is="compact ? 'div' : SResizable" v-bind="compact ? {} : { label: title, panels, height: '32rem' }">
      <template #default="scope">
        <div v-if="!scope?.panel || scope.panel.id === 'queue'" class="sy-incident-console__queue" role="region" :aria-label="i18n.queue">
          <p v-if="!groups.length" role="status">{{ i18n.empty }}</p>
          <section v-for="group in groups" :key="group.status" :aria-label="statusMap.get(group.status)?.label ?? group.status">
            <h3>{{ statusMap.get(group.status)?.label ?? group.status }}</h3>
            <ul role="list">
              <li v-for="item in group.items" :key="item.id">
                <SButton variant="ghost" class="sy-incident-console__row" :aria-pressed="active === item.id" @click="select(item)">
                  <span>{{ item.title }}</span>
                  <SBadge :tone="item.tone" dot>{{ item.severity }}</SBadge>
                  <STimestamp v-if="item.time" :value="item.time" :locale="locale" :tooltip="false" format="date" />
                </SButton>
              </li>
            </ul>
          </section>
        </div>
        <section v-else class="sy-incident-console__desktop" :aria-label="i18n.inspector">
          <SIncidentInspector v-if="selected" :incident="selected" :status="statusMap.get(selected.status)"
            :locale="locale" :details-label="i18n.inspector">
            <slot name="inspector" :incident="selected" />
          </SIncidentInspector>
          <p v-else>{{ i18n.unselected }}</p>
        </section>
      </template>
    </component>
    <SSheet v-if="compact" :open="sheet && Boolean(selected)" :title="i18n.inspector" :dismiss-label="i18n.close"
      @update:open="sheet = $event">
      <SIncidentInspector v-if="selected" :incident="selected" :status="statusMap.get(selected.status)" :locale="locale" :details-label="i18n.inspector">
        <slot name="inspector" :incident="selected" />
      </SIncidentInspector>
    </SSheet>
  </section>
</template>
