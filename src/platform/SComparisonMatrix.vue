<script lang="ts">
export interface ComparisonCandidate {
  id: string
  label: string
  description?: string
  values: Readonly<Record<string, string | number | boolean | null | undefined>>
}
export interface ComparisonCriterion {
  id: string
  title: string
  direction?: 'higher' | 'lower'
  format?: (value: string | number | boolean) => string
}
export interface ComparisonGroup { id: string; label: string; criteria: readonly ComparisonCriterion[] }
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SButton from '../components/SButton.vue'
import SSelect from '../components/SSelect.vue'
import SSwitch from '../components/SSwitch.vue'

const props = defineProps<{
  label: string
  candidates: readonly ComparisonCandidate[]
  groups: readonly ComparisonGroup[]
  initialCandidates?: number
  maxCandidates?: number
  labels?: Partial<Record<'criterion' | 'add' | 'addAction' | 'swap' | 'remove' | 'best' | 'enableBest' | 'empty', string>>
}>()
const picked = defineModel<string[]>()
const highlight = ref(true)
const next = ref<string>()
const text = computed(() => ({
  criterion: 'Criteria', add: 'Available candidates', addAction: 'Add column', swap: 'Change column',
  remove: 'Remove', best: 'Best in this row', enableBest: 'Highlight best values', empty: 'No candidates to compare',
  ...props.labels,
}))
const limit = computed(() => Math.max(1, Math.trunc(props.maxCandidates ?? props.candidates.length)))
const candidatesById = computed(() => new Map(props.candidates.map(candidate => [candidate.id, candidate])))
const selection = computed(() => {
  const ids = picked.value ?? props.candidates.slice(0, Math.max(1, props.initialCandidates ?? 2)).map(candidate => candidate.id)
  return [...new Set(ids)].flatMap(id => {
    const item = candidatesById.value.get(id)
    return item ? [item] : []
  }).slice(0, limit.value)
})
const unused = computed(() => props.candidates.filter(candidate => !selection.value.includes(candidate)))
const chosen = computed(() => selection.value.map(candidate => candidate.id))
const addOptions = computed(() => unused.value.map(candidate => ({ value: candidate.id, label: candidate.label })))
watch(addOptions, options => { if (!options.some(option => option.value === next.value)) next.value = undefined })

function swapOptions(current: ComparisonCandidate) {
  return [{ value: current.id, label: current.label }, ...addOptions.value]
}
function replace(index: number, id: string | undefined) {
  if (!id || !candidatesById.value.has(id) || chosen.value.includes(id)) return
  const ids = [...chosen.value]
  ids[index] = id
  picked.value = ids
}
function add() {
  if (!next.value || !addOptions.value.some(option => option.value === next.value) || chosen.value.length >= limit.value) return
  picked.value = [...chosen.value, next.value]
  next.value = undefined
}
function remove(id: string) {
  if (chosen.value.length > 1) picked.value = chosen.value.filter(key => key !== id)
}
function value(candidate: ComparisonCandidate, item: ComparisonCriterion) {
  const result = candidate.values[item.id]
  return result == null ? '—' : item.format?.(result) ?? (typeof result === 'boolean' ? result ? '✓' : '—' : String(result))
}
const best = computed(() => {
  const result = new Map<string, number>()
  if (!highlight.value) return result
  for (const item of props.groups.flatMap(group => group.criteria)) {
    if (!item.direction) continue
    const values = selection.value.map(candidate => candidate.values[item.id])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    if (values.length > 1) result.set(item.id, item.direction === 'higher' ? Math.max(...values) : Math.min(...values))
  }
  return result
})
function isBest(candidate: ComparisonCandidate, item: ComparisonCriterion) {
  return best.value.has(item.id) && candidate.values[item.id] === best.value.get(item.id)
}
</script>

<template>
  <section class="sy-comparison-matrix" :aria-label="label">
    <div class="sy-comparison-matrix__actions">
      <SSwitch v-model="highlight">{{ text.enableBest }}</SSwitch>
      <div v-if="addOptions.length && selection.length < limit" class="sy-comparison-matrix__add">
        <SSelect v-model="next" :label="text.add" :options="addOptions" />
        <SButton size="sm" variant="secondary" :disabled="!next" @click="add">{{ text.addAction }}</SButton>
      </div>
    </div>
    <p v-if="!selection.length" role="status">{{ text.empty }}</p>
    <div v-else class="sy-comparison-matrix__scroll" tabindex="0" role="region" :aria-label="label">
      <table>
        <caption class="sy-visually-hidden">{{ label }}</caption>
        <thead>
          <tr>
            <th scope="col">{{ text.criterion }}</th>
            <th v-for="(candidate, index) in selection" :key="candidate.id" scope="col">
              <span>{{ candidate.label }}</span>
              <span v-if="candidate.description" class="sy-comparison-matrix__note">{{ candidate.description }}</span>
              <div class="sy-comparison-matrix__column-actions">
                <SSelect v-if="unused.length" :aria-label="`${text.swap} · ${candidate.label}`" :model-value="candidate.id"
                  :options="swapOptions(candidate)" @update:model-value="replace(index, $event)" />
                <SButton v-if="selection.length > 1" size="sm" variant="ghost" :aria-label="`${text.remove} · ${candidate.label}`"
                  @click="remove(candidate.id)">{{ text.remove }}</SButton>
              </div>
            </th>
          </tr>
        </thead>
        <tbody v-for="group in groups" :key="group.id">
          <tr><th scope="rowgroup" :colspan="selection.length + 1" class="sy-comparison-matrix__group">{{ group.label }}</th></tr>
          <tr v-for="item in group.criteria" :key="item.id">
            <th scope="row">{{ item.title }}</th>
            <td v-for="candidate in selection" :key="candidate.id" :data-best="isBest(candidate, item) || undefined">
              <span v-if="isBest(candidate, item)" class="sy-visually-hidden">{{ text.best }} </span>
              <slot name="cell" :candidate="candidate" :criterion="item" :best="isBest(candidate, item)">{{ value(candidate, item) }}</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
