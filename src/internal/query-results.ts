import { onMounted, ref, shallowRef, watch, type MaybeRefOrGetter, toValue } from 'vue'

export type QuerySource<T> = (query: string, signal: AbortSignal) => readonly T[] | Promise<readonly T[]>

export function useQueryResults<T>(options: {
  query: MaybeRefOrGetter<string>
  source: MaybeRefOrGetter<QuerySource<T> | undefined>
  active: MaybeRefOrGetter<boolean>
  delay: MaybeRefOrGetter<number>
  onError?: (error: unknown) => void
}) {
  const mounted = ref(false)
  const results = shallowRef<readonly T[]>([])
  const pending = ref(false)
  const failed = ref(false)
  onMounted(() => { mounted.value = true })

  watch([mounted, () => toValue(options.active), () => toValue(options.query).trim(), () => toValue(options.source), () => toValue(options.delay)],
    ([ready, active, term, loader, delay], _, cleanup) => {
      failed.value = false
      pending.value = false
      results.value = []
      if (!ready || !active || !term || !loader) return
      const controller = new AbortController()
      pending.value = true
      const timer = setTimeout(async () => {
        try {
          const response = await loader(term, controller.signal)
          if (!controller.signal.aborted) results.value = response
        } catch (error) {
          if (!controller.signal.aborted) {
            failed.value = true
            options.onError?.(error)
          }
        } finally {
          if (!controller.signal.aborted) pending.value = false
        }
      }, Math.max(0, delay))
      cleanup(() => {
        clearTimeout(timer)
        controller.abort()
      })
    }, { flush: 'sync' })
  return { results, pending, failed }
}
