import { computed, markRaw, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'
import type { TableVirtualOptions } from '../types'

export interface TableRowsVirtualizationOptions {
  rowHeight: number
  initialViewportHeight: number
  overscan?: number
}

export interface TableRowsVirtualization {
  geometry: ComputedRef<TableRowsVirtualizationOptions | undefined>
}

export function useTableRowsVirtualization(options: MaybeRefOrGetter<TableRowsVirtualizationOptions>): TableRowsVirtualization {
  const geometry = computed(() => {
    const value = toValue(options)
    if (!Number.isFinite(value.rowHeight) || value.rowHeight <= 0) return
    if (!Number.isFinite(value.initialViewportHeight) || value.initialViewportHeight <= 0) return
    return { ...value }
  })
  return markRaw({ geometry })
}

export function useTableFixedMeasurement(
  viewport: Readonly<Ref<HTMLDivElement | null>>,
  geometry: ComputedRef<TableRowsVirtualizationOptions | undefined>,
  readMountedRows: () => unknown,
) {
  const bounded = ref(true)
  const unequal = ref(false)
  const height = ref<number>()
  const measurement = computed<TableVirtualOptions | undefined>(() => geometry.value && bounded.value && !unequal.value ? {
    height: geometry.value.initialViewportHeight,
    estimatedRowHeight: height.value ?? geometry.value.rowHeight,
    overscan: geometry.value.overscan,
  } : undefined)

  watch([viewport, geometry], ([node, config], _, cleanup) => {
    bounded.value = true
    unequal.value = false
    height.value = undefined
    const view = node?.ownerDocument.defaultView
    if (!view || !node || !config) return
    let frame = 0
    let observed = new Set<Element>()
    const resizing = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(schedule) : undefined
    resizing?.observe(node)
    const stop = watch(readMountedRows, schedule, { flush: 'post' })

    function measure() {
      frame = 0
      const area = node!
      if (!area.clientHeight || area.getClientRects().length === 0) return
      bounded.value = area.scrollHeight > area.clientHeight + 1
      if (unequal.value || !bounded.value) return
      const rows = new Set(area.querySelectorAll(':scope > table > tbody > tr[data-index]'))
      const sizes = [...rows].map(row => row.getBoundingClientRect().height).filter(size => size > 0)
      for (const row of observed) if (!rows.has(row)) resizing?.unobserve(row)
      for (const row of rows) if (!observed.has(row)) resizing?.observe(row)
      observed = rows
      if (!sizes.length) return
      const smallest = Math.min(...sizes)
      const largest = Math.max(...sizes)
      if (largest - smallest > 1) { unequal.value = true; return }
      height.value = Math.max(config!.rowHeight, largest)
    }
    function schedule() { if (!frame) frame = view!.requestAnimationFrame(measure) }
    schedule()
    cleanup(() => {
      view.cancelAnimationFrame(frame)
      resizing?.disconnect()
      stop()
    })
  }, { flush: 'post', immediate: true })

  return { measurement, unequal, height }
}
