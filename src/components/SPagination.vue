<script setup lang="ts">
import { computed, onBeforeUnmount, onBeforeUpdate, onUpdated, ref, useTemplateRef, watch } from 'vue'
import type { ButtonSize } from '../types'
import { contentUrl } from '../internal/content-url'
import type { LinkComponent } from '../internal/link-component'
import SButton from './SButton.vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'
import SSelect from './SSelect.vue'
import SSpinner from './SSpinner.vue'

const props = withDefaults(defineProps<{
  total?: number
  totalPages?: number
  totalItems?: number
  hasMore?: boolean
  defaultPage?: number
  label?: string
  variant?: 'pages' | 'compact' | 'count' | 'dots' | 'input' | 'none'
  size?: ButtonSize
  disabled?: boolean
  step?: number
  siblingCount?: number
  hasFirstLast?: boolean
  previousLabel?: string
  nextLabel?: string
  firstLabel?: string
  lastLabel?: string
  pageLabel?: (page: number) => string
  jumpLabel?: (page: number) => string
  rangeLabel?: (start: number, end: number, total: number) => string
  compactLabel?: (page: number, total?: number) => string
  pageInputLabel?: string
  pageSizeOptions?: readonly number[]
  pageSizeLabel?: string
  loadingLabel?: string
  getPageHref?: (page: number, pageSize: number) => string
  as?: LinkComponent
  changeAction?: (page: number, signal: AbortSignal, pageSize: number) => void | Promise<void>
  locale?: string
}>(), {
  defaultPage: 1,
  label: 'Pagination',
  variant: 'pages',
  size: 'sm',
  hasFirstLast: undefined,
  previousLabel: 'Previous',
  nextLabel: 'Next',
  firstLabel: 'First page',
  lastLabel: 'Last page',
  pageLabel: (page: number) => `Page ${page}`,
  jumpLabel: (page: number) => `Jump to page ${page}`,
  pageInputLabel: 'Page',
  pageSizeLabel: 'Rows per page',
  loadingLabel: 'Loading page',
})
const model = defineModel<number>()
const pageSize = defineModel<number>('pageSize', { default: 10 })
const emit = defineEmits<{ change: [page: number]; changeError: [error: unknown] }>()
const navigation = useTemplateRef<HTMLElement>('navigation')
let focusedControl: HTMLElement | undefined
onBeforeUpdate(() => {
  const root = navigation.value
  const control = root?.ownerDocument.activeElement?.closest<HTMLElement>('[data-page-control]')
  focusedControl = control && root?.contains(control) ? control : undefined
})
onUpdated(() => {
  const control = focusedControl
  focusedControl = undefined
  const root = navigation.value
  if (!root || !control || control.isConnected || root.ownerDocument.activeElement !== root.ownerDocument.body) return
  root.querySelector<HTMLElement>(`[data-page-control="${control.dataset.pageControl}"]`)?.focus({ preventScroll: true })
})
const validCount = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value) && value >= 0
const itemCount = computed(() => validCount(props.totalItems) ? Math.trunc(props.totalItems) : undefined)
const currentSize = computed(() => Number.isFinite(pageSize.value) ? Math.max(1, Math.trunc(pageSize.value)) : 10)
const knownTotal = computed(() => {
  const count = props.totalPages ?? props.total
  if (count !== undefined) return validCount(count) ? Math.max(1, Math.trunc(count)) : 1
  return itemCount.value === undefined ? undefined : Math.max(1, Math.ceil(itemCount.value / currentSize.value))
})
const page = computed(() => {
  const requested = model.value ?? props.defaultPage
  return Math.min(knownTotal.value ?? Infinity, Math.max(1, Number.isFinite(requested) ? Math.trunc(requested) : 1))
})
const total = computed(() => knownTotal.value ?? page.value + Number(Boolean(props.hasMore)))
const ends = computed(() => knownTotal.value !== undefined && (props.variant === 'input'
  ? props.hasFirstLast !== false : props.variant === 'compact' && props.hasFirstLast))
const numberSize = computed(() => props.size === 'lg' ? 42 : props.size === 'md' ? 38 : 34)
const format = computed(() => new Intl.NumberFormat(props.locale))
const formatted = (number: number) => format.value.format(number)
const step = computed(() => {
  const value = props.step
  return value !== undefined && Number.isInteger(value) && value > 0 ? value : 1
})
const previous = computed(() => Math.max(1, page.value - step.value))
const next = computed(() => Math.min(total.value, page.value + step.value))
const stepLabel = (text: string) => step.value > 1 ? text + ' · ' + formatted(step.value) : text
const currentLabel = computed(() => {
  if (props.variant === 'count' && itemCount.value !== undefined) {
    const count = itemCount.value
    const start = Math.min(count, (page.value - 1) * currentSize.value + 1)
    const end = Math.min(count, page.value * currentSize.value)
    return props.rangeLabel?.(start, end, count) ?? `${formatted(start)}–${formatted(end)} of ${formatted(count)}`
  }
  return props.compactLabel?.(page.value, knownTotal.value)
    ?? (knownTotal.value === undefined ? props.pageLabel(page.value) : `${formatted(page.value)} / ${formatted(total.value)}`)
})
const sizes = computed(() => [...new Set(props.pageSizeOptions?.filter(size => Number.isInteger(size) && size > 0))])
const sizeOptions = computed(() => [...new Set([...sizes.value, currentSize.value])].sort((a, b) => a - b)
  .map(size => ({ value: String(size), label: formatted(size) })))
const busy = ref(false)
let request: AbortController | undefined
const items = computed(() => {
  const last = total.value
  const current = page.value
  if (knownTotal.value === undefined) return [{ target: current, gap: false }]
  const configured = props.siblingCount
  const siblings = configured !== undefined && Number.isFinite(configured) ? Math.max(0, Math.trunc(configured)) : 1
  if (last <= siblings * 2 + 5) return Array.from({ length: last }, (_, index) => ({ target: index + 1, gap: false }))

  const edgeCount = siblings * 2 + 2
  const atStart = current <= siblings + 3
  const atEnd = current >= last - siblings - 2
  const start = atStart ? 2 : atEnd ? last - edgeCount : current - siblings
  const middle = Array.from({ length: atStart || atEnd ? edgeCount : siblings * 2 + 1 }, (_, index) => start + index)
  const slots = [1, ...middle, last]
  const result: { gap: boolean; target: number }[] = []
  for (const [index, number] of slots.entries()) {
    const previous = slots[index - 1]
    if (previous !== undefined && number > previous + 1) {
      result.push({ gap: true, target: Math.floor((previous + number) / 2) })
    }
    result.push({ gap: false, target: number })
  }
  return result
})

const canGo = (target: number) => !props.disabled && target >= 1 && target <= total.value && target !== page.value
const href = (target: number) => !props.disabled && target >= 1 && target <= total.value
  ? contentUrl(props.getPageHref?.(target, currentSize.value)) : undefined

function go(target: number) {
  if (canGo(target)) change(target, currentSize.value)
}
function change(target: number, size: number) {
  model.value = target
  emit('change', target)
  request?.abort()
  const load = props.changeAction
  if (!load) { request = undefined; busy.value = false; return }
  const controller = request = new AbortController()
  busy.value = true
  void Promise.resolve().then(() => {
    if (!controller.signal.aborted) return load(target, controller.signal, size)
  }).catch(error => {
    if (!controller.signal.aborted) emit('changeError', error)
  }).finally(() => {
    if (request === controller) { request = undefined; busy.value = false }
  })
}

function chooseSize(value: string | undefined) {
  const size = Number(value)
  if (props.disabled || !sizes.value.includes(size) || size === currentSize.value) return
  pageSize.value = size
  change(1, size)
}

function commitInput(event: Event) {
  const field = event.target as HTMLInputElement
  const number = field.valueAsNumber
  const target = Number.isFinite(number) ? Math.max(1, Math.min(total.value, Math.trunc(number))) : page.value
  field.value = String(target)
  go(target)
}
onBeforeUnmount(() => request?.abort())
watch(() => props.disabled, disabled => {
  if (!disabled) return
  request?.abort()
  request = undefined
  busy.value = false
})
</script>

<template>
  <nav ref="navigation" class="sy-pagination" :data-variant="variant" :data-size="size" :aria-label="label" :aria-busy="busy || undefined">
    <div class="sy-pagination__controls">
      <SButton v-if="ends" class="sy-pagination__item" data-page-control="first" :size="size" variant="secondary" icon-only :as="as" :disabled="disabled" :href="page === 1 ? undefined : href(1)" :aria-label="firstLabel"
        :aria-disabled="page === 1 || undefined" @click="go(1)"><template #start><SIcon name="chevronsLeft" size="sm" mirror /></template></SButton>
      <SButton
        v-if="variant !== 'dots'"
        :size="size"
        variant="secondary"
        class="sy-pagination__previous sy-pagination__item"
        data-page-control="previous"
        :as="as"
        :disabled="disabled"
        :href="previous === page ? undefined : href(previous)"
        :icon-only="variant !== 'pages'"
        :aria-label="stepLabel(previousLabel)"
        :aria-disabled="page === 1 || undefined"
        @click="go(previous)"
      >
        <template v-if="variant !== 'pages'" #start><SIcon name="chevronLeft" size="sm" mirror /></template>
        <template v-if="variant === 'pages'" #default>{{ previousLabel }}</template>
      </SButton>
      <div v-if="variant === 'pages'" class="sy-pagination__numbers" :style="{ '--sy-page-width': `max(${numberSize}px, calc(${formatted(total).length}ch + 12px))` }">
        <SButton
          v-for="(item, i) in items"
          :key="i"
          :size="size"
          :variant="!item.gap && item.target === page ? 'primary' : 'ghost'"
          class="sy-pagination__page sy-pagination__item"
          :data-page-control="'number-' + i"
          :href="href(item.target)"
          :as="as"
          :disabled="disabled"
          :aria-label="item.gap ? jumpLabel(item.target) : pageLabel(item.target)"
          :aria-current="!item.gap && item.target === page ? 'page' : undefined"
          @click="go(item.target)"
        ><SMotionText :value="item.gap ? '…' : formatted(item.target)" motion="roll" /></SButton>
      </div>
      <div v-else-if="variant === 'dots'" class="sy-pagination__dots">
        <button v-for="target in total" :key="target" type="button" class="sy-pagination__dot sy-pagination__item" :aria-label="pageLabel(target)"
          :aria-current="target === page ? 'page' : undefined" :disabled="disabled" @click="go(target)" />
      </div>
      <span v-else-if="variant === 'compact' || variant === 'count'" class="sy-pagination__readout" role="status">
        <SMotionText :value="currentLabel" motion="roll" />
      </span>
      <label v-else-if="variant === 'input'" class="sy-pagination__entry">
        <span>{{ pageInputLabel }}</span>
        <input :value="page" min="1" :max="knownTotal" type="number" inputmode="numeric" :disabled="disabled || knownTotal === undefined"
          @change="commitInput" @keydown.enter.prevent="commitInput">
        <SMotionText v-if="knownTotal !== undefined" :value="'/ ' + formatted(total)" motion="roll" />
      </label>
      <SButton
        v-if="variant !== 'dots'"
        :size="size"
        variant="secondary"
        class="sy-pagination__next sy-pagination__item"
        data-page-control="next"
        :as="as"
        :disabled="disabled"
        :href="next === page ? undefined : href(next)"
        :icon-only="variant !== 'pages'"
        :aria-label="stepLabel(nextLabel)"
        :aria-disabled="page === total || undefined"
        @click="go(next)"
      >
        <template v-if="variant !== 'pages'" #start><SIcon name="chevronRight" size="sm" mirror /></template>
        <template v-if="variant === 'pages'" #default>{{ nextLabel }}</template>
      </SButton>
      <SButton v-if="ends" class="sy-pagination__item" data-page-control="last" :size="size" variant="secondary" icon-only :as="as" :disabled="disabled" :href="page === total ? undefined : href(total)" :aria-label="lastLabel"
        :aria-disabled="page === total || undefined" @click="go(total)"><template #start><SIcon name="chevronsRight" size="sm" mirror /></template></SButton>
    </div>
    <SSelect v-if="sizes.length" class="sy-pagination__size" :model-value="String(currentSize)" :label="pageSizeLabel"
      :options="sizeOptions" :size="size" :disabled="disabled" presentation="adaptive" @update:model-value="chooseSize" />
    <span v-if="changeAction" class="sy-pagination__loading">
      <Transition name="sy-field-feedback"><SSpinner v-if="busy" size="sm" :label="loadingLabel" /></Transition>
    </span>
  </nav>
</template>
