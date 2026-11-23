import { computed, shallowRef, watch, type Ref } from 'vue'
import type { SearchField } from '../components/SPowerSearch.vue'
import type { SelectOption } from '../types'
import { foldSearch } from './search-filters'

export interface SearchSuggestion { key: string; field: SearchField; item: SelectOption; value?: string }

export function searchScore(terms: readonly string[], query: string) {
  const normalized = terms.map(foldSearch)
  if (normalized.some(term => term === query)) return 3
  if (normalized.some(term => term.startsWith(query))) return 2
  if (normalized.some(term => term.includes(query))) return 1
  return 0
}

function eligible(field: SearchField, query: string) {
  return Array.from(query).length >= (field.typeaheadMinQueryLength ?? 1)
}

export function useSearchSuggestions(fields: Readonly<Ref<readonly SearchField[]>>, query: Readonly<Ref<string>>, enabled: Readonly<Ref<boolean>>,
  limit: Readonly<Ref<number>>) {
  const normalized = computed(() => enabled.value ? foldSearch(query.value.trim()) : '')
  const remote = shallowRef(new Map<string, readonly SelectOption[]>())
  watch([fields, normalized], ([definitions, keyword], _, dispose) => {
    remote.value = new Map()
    if (!keyword) return
    const providers = definitions.filter(field => field.search && field.isValueMatchAllowed !== false && eligible(field, keyword))
    if (!providers.length) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      for (const field of providers) {
        void Promise.resolve().then(() => field.search?.(query.value.trim(), controller.signal)).then(items => {
          if (items && !controller.signal.aborted) remote.value = new Map(remote.value).set(field.key, items)
        }).catch(() => { /* Other fields can still supply results. */ })
      }
    }, 160)
    dispose(() => { clearTimeout(timer); controller.abort() })
  })
  return computed(() => {
    const keyword = normalized.value
    if (!keyword) return []
    const results: (SearchSuggestion & { score: number })[] = []
    for (const field of fields.value) {
      if (!eligible(field, keyword)) continue
      const score = searchScore([field.label, ...(field.typeaheadAliases ?? [])], keyword)
      if (score) results.push({ key: JSON.stringify([field.key]), field, score: score + .5,
        item: { value: field.key, label: field.label, icon: field.icon, description: field.description } })
      if (field.isValueMatchAllowed === false) continue
      const staticItems = field.options ?? field.operators?.flatMap(operator => typeof operator === 'string' ? [] : operator.options ?? []) ?? []
      const matches = new Set<string>()
      for (const item of [...staticItems, ...remote.value.get(field.key) ?? []]) {
        if (matches.has(item.value) || item.disabled) continue
        const score = searchScore([item.label, item.value], keyword)
        if (!score && !remote.value.get(field.key)?.includes(item)) continue
        matches.add(item.value)
        results.push({ key: JSON.stringify([field.key, item.value]), field, value: item.value, score: score || 1,
          item: { ...item, description: item.description ?? field.label, icon: item.icon ?? field.icon } })
      }
    }
    return results.sort((left, right) => right.score - left.score).slice(0, Math.max(1, limit.value))
  })
}
