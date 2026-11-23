import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

export function useListLayout<Item>(options: {
  items: MaybeRefOrGetter<readonly Item[]>
  viewport: MaybeRefOrGetter<HTMLElement | null | undefined>
  estimateSize: (item: Item, index: number) => number
  itemKey: (item: Item, index: number) => string | number
  overscan?: number
}) {
  const rows = computed(() => toValue(options.items))
  const engine = useVirtualizer<HTMLElement, HTMLElement>(computed(() => {
    const viewport = toValue(options.viewport) ?? null
    const current = rows.value
    return {
      count: current.length,
      getScrollElement: () => viewport,
      estimateSize: index => options.estimateSize(current[index], index),
      getItemKey: index => options.itemKey(current[index], index),
      overscan: options.overscan ?? 4,
    }
  }))
  const items = computed(() => engine.value.getVirtualItems().flatMap(entry => entry.index < rows.value.length
    ? [{ ...entry, item: rows.value[entry.index] }] : []))
  const size = computed(() => engine.value.getTotalSize())
  return { engine, items, size }
}
