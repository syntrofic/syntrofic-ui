import { computed, markRaw, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'

export interface SnapPagingOptions {
  pages?: 'view' | 'item'
}

export interface SnapPaging {
  pages: ComputedRef<NonNullable<SnapPagingOptions['pages']>>
}

export function useSnapPaging(options: MaybeRefOrGetter<SnapPagingOptions> = {}): SnapPaging {
  return markRaw({ pages: computed(() => toValue(options).pages ?? 'view') })
}
