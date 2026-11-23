import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { observeLayout } from './scroll-layout'

export interface OverflowOptions {
  gap?: number
  minVisibleItems?: number
  maxVisibleItems?: number
  maxRows?: number
  collapseFrom?: 'start' | 'end'
  behavior?: 'observeParent' | 'observeSelf'
}

function countThatFits(widths: readonly number[], room: number, indicator: number, options: OverflowOptions) {
  const { gap = 0, minVisibleItems = 0, maxVisibleItems = widths.length, maxRows = 1, collapseFrom = 'end' } = options
  const space = Number.isFinite(gap) ? Math.max(0, gap) : 0
  const rowsAllowed = Number.isFinite(maxRows) ? Math.max(1, Math.floor(maxRows)) : 1
  let high = Math.min(widths.length, Number.isFinite(maxVisibleItems) ? Math.max(0, Math.floor(maxVisibleItems)) : widths.length)
  let low = Math.min(high, Number.isFinite(minVisibleItems) ? Math.max(0, Math.floor(minVisibleItems)) : 0)

  function fits(count: number) {
    const items = collapseFrom === 'end' ? widths.slice(0, count) : widths.slice(widths.length - count)
    const showIndicator = count < widths.length && indicator > 0
    if (showIndicator) {
      if (collapseFrom === 'end') items.push(indicator)
      else items.unshift(indicator)
    }
    let rows = 1
    let line = 0
    for (const [index, width] of items.entries()) {
      const marker = showIndicator && index === (collapseFrom === 'end' ? items.length - 1 : 0)
      if (width > room + .5 && !marker) return false
      if (line && line + space + width > room + .5) { rows++; line = 0 }
      line += (line ? space : 0) + width
    }
    return rows <= rowsAllowed
  }
  if (fits(high)) return high
  high = Math.max(low, high - 1)
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (fits(middle)) low = middle
    else high = middle - 1
  }
  return high
}

export function useOverflow(itemCount: MaybeRefOrGetter<number>, options: MaybeRefOrGetter<OverflowOptions> = {}) {
  const container = shallowRef<HTMLElement | null>(null)
  const measurements = shallowRef<HTMLElement | null>(null)
  const count = computed(() => Number.isFinite(toValue(itemCount)) ? Math.max(0, Math.floor(toValue(itemCount))) : 0)
  const measured = shallowRef<number>()
  const visibleCount = computed(() => Math.min(measured.value ?? count.value, count.value))
  const config = computed(() => toValue(options))
  const widthOwner = computed(() => config.value.behavior === 'observeParent' ? container.value?.parentElement : container.value)
  function measure() {
    const node = widthOwner.value
    const box = measurements.value ?? container.value
    if (!node || !box || node.clientWidth < 1) return
    const marker = box.querySelector<HTMLElement>(':scope > [data-overflow-indicator]')
    const marked = [...box.querySelectorAll<HTMLElement>(':scope > [data-overflow-item]')]
    const items = marked.length ? marked : [...box.children].filter(child => child !== marker)
    if (items.length !== count.value) return
    const widths = items.map(item => item.getBoundingClientRect().width)
    measured.value = countThatFits(widths, node.clientWidth, marker?.getBoundingClientRect().width ?? 0, config.value)
  }
  watch([widthOwner, measurements, count, config], ([node, box], _, cleanup) => {
    if (node) cleanup(observeLayout(node, box ?? container.value ?? undefined, measure))
  }, { immediate: true, flush: 'post', deep: true })
  return { container, measurements, containerRef: (node: HTMLElement | null) => { container.value = node },
    measureRef: (node: HTMLElement | null) => { measurements.value = node }, visibleCount,
    hasOverflow: computed(() => visibleCount.value < count.value), measure }
}
