<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import SDisclosure from '../components/SDisclosure.vue'
import SButton from '../components/SButton.vue'
import SChartTooltip from '../components/SChartTooltip.vue'
import SChartLegend from '../components/SChartLegend.vue'
import SFocusGroup from '../components/SFocusGroup.vue'
import SIcon from '../components/SIcon.vue'
import SMotionText from '../components/SMotionText.vue'
import SSkeleton from '../components/SSkeleton.vue'
import SSpinner from '../components/SSpinner.vue'
import { useCollectionContentMotion } from '../internal/collection-motion'
import { useShellMeasurement } from '../internal/shell-layout'
import type { ChartFrameSlots, ChartHit, ChartLegendItem, ChartOptions, ChartPoint, ChartSelection } from './types'
import { clamp, numberAt, textValue } from './values'

const props = withDefaults(defineProps<ChartOptions & {
  options?: readonly ChartSelection[]
  legend?: readonly ChartLegendItem[]
  isEmpty?: boolean
  supplement?: string
  orientation?: 'vertical' | 'horizontal'
  placeholderShape?: 'bars' | 'circle'
  hit?: (position: ChartHit) => number | undefined
  anchor?: (index: number) => ChartPoint
}>(), {
  options: () => [], legend: () => [], height: 232, inspect: true, showLegend: true, showData: true,
  tooltipPlacement: 'overlay', emptyText: 'No data to display', missingText: 'No data', loadingText: 'Loading chart data', retryLabel: 'Retry',
  dataLabel: 'View data', legendLabel: 'Series', categoryLabel: 'Category', orientation: 'vertical', placeholderShape: 'bars',
})
defineSlots<ChartFrameSlots & { plot(props: { active: number | undefined }): unknown }>()
const emit = defineEmits<{ resize: [width: number]; inspect: [selection: ChartSelection | undefined, index?: number] }>()
const figure = useTemplateRef<HTMLElement>('figure')
const plot = useTemplateRef<HTMLDivElement>('plot')
const status = useTemplateRef<HTMLElement>('status')
const measuredWidth = useShellMeasurement(plot, node => node.clientWidth)
const selected = ref<number>()
const focused = ref(false)
const cursor = ref<ChartPoint>()
const tableOpen = ref(false)
const tableMounted = ref(false)
const id = `sy-chart-${useId()}`
const describedBy = computed(() => [props.description && `${id}-caption`, props.supplement && `${id}-supplement`].filter(Boolean).join(' ') || undefined)
const format = computed(() => new Intl.NumberFormat(props.locale, { maximumFractionDigits: 3 }))
const state = computed(() => props.loading ? 'loading' : props.error ? 'error' : props.isEmpty ? 'empty' : 'ready')
const blocked = computed(() => state.value === 'loading' || state.value === 'error')
const interactive = computed(() => props.inspect && !props.isEmpty && props.options.length > 0)
const inspectable = computed(() => interactive.value && !blocked.value)
const hasLegend = computed(() => props.showLegend && props.legend.length > 0)
const hasData = computed(() => props.showData && props.options.length > 0)
const skeletonHeights = ['32%', '53%', '40%', '65%', '48%']
const height = computed(() => clamp(numberAt(props.height, 232), 72, 960))
const active = computed(() => inspectable.value && selected.value !== undefined ? props.options[selected.value] : undefined)
const cursorIndex = computed(() => selected.value ?? 0)
const accessible = computed(() => {
  const option = props.options[cursorIndex.value]
  return option ? [option.label, ...option.items.map(item => `${item.label} ${print(item)}`)].join(', ') : undefined
})
const point = computed(() => selected.value === undefined ? undefined : props.anchor?.(selected.value) ?? cursor.value)
const summaryColumns = computed(() => {
  const labels = new Map<string, string>()
  for (const option of props.options) for (const item of option.items) labels.set(item.key, item.label)
  return [...labels].map(([key, label]) => ({ key, label }))
})
const summaryRows = computed(() => tableMounted.value ? props.options.map(option => ({
  key: option.key, label: option.label,
  values: new Map(option.items.map(item => [item.key, print(item)])),
})) : [])

function print(item: ChartSelection['items'][number]) {
  return textValue(item, value => format.value.format(value), props.missingText)
}

function set(index?: number) {
  if (selected.value === index) return
  selected.value = index
  emit('inspect', index === undefined ? undefined : props.options[index], index)
}

function pointer(event: PointerEvent) {
  const element = plot.value
  if (!element || !inspectable.value || (event.pointerType === 'touch' && event.type !== 'pointerup')) return
  const rect = element.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const index = props.hit?.({ x, y, width: rect.width, height: rect.height })
  if (index === undefined || index < 0 || index >= props.options.length) {
    if (!focused.value) set()
    return
  }
  if (event.pointerType === 'touch') element.focus({ preventScroll: true })
  cursor.value = { x, y }
  set(index)
}

function keydown(event: KeyboardEvent) {
  if (!inspectable.value || event.altKey || event.ctrlKey || event.metaKey) return
  const rtl = props.direction === 'rtl'
  const last = props.options.length - 1
  if (event.key === 'Escape' && active.value) {
    set()
    event.stopPropagation()
  } else if (event.key === 'Home') set(0)
  else if (event.key === 'End') set(last)
  else if (event.key === 'ArrowLeft') set(clamp(cursorIndex.value + (rtl ? 1 : -1), 0, last))
  else if (event.key === 'ArrowRight') set(clamp(cursorIndex.value + (rtl ? -1 : 1), 0, last))
  else if (event.key === 'ArrowUp') set(clamp(cursorIndex.value + (props.orientation === 'horizontal' ? -1 : 1), 0, last))
  else if (event.key === 'ArrowDown') set(clamp(cursorIndex.value + (props.orientation === 'horizontal' ? 1 : -1), 0, last))
  else return
  event.preventDefault()
}

watch(measuredWidth, value => { if (value && value > 0) emit('resize', value) })
watch(() => props.options.map(option => option.key), (keys, previous) => {
  const current = selected.value
  if (current === undefined || keys[current] === previous[current]) return
  const index = keys.indexOf(previous[current])
  const next = index >= 0 ? index : keys.length ? Math.min(current, keys.length - 1) : undefined
  if (next === current) emit('inspect', props.options[current], current)
  else set(next)
})
watch(interactive, yes => { if (!yes) set() })
watch(inspectable, yes => { if (yes && focused.value && selected.value === undefined) set(0) })
watch(state, () => {
  const notice = status.value
  if (notice?.contains(notice.ownerDocument.activeElement)) plot.value?.focus({ preventScroll: true })
})
watch(hasData, visible => {
  const element = figure.value
  if (!visible && element?.querySelector('.sy-chart__data')?.contains(element.ownerDocument.activeElement)) {
    plot.value?.focus({ preventScroll: true })
  }
})
watch(tableOpen, yes => { if (yes) tableMounted.value = true }, { flush: 'sync' })
useCollectionContentMotion(figure, () => props.animate === false ? '' :
  `${hasLegend.value ? props.legendPosition ?? 'bottom' : ''}/${hasData.value}`, {
  content: element => element.querySelector('.sy-chart__display'), animateContent: false, clip: false,
})

function hideStatus(element: Element) {
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('inert', '')
}
</script>

<template>
  <figure ref="figure" class="sy-chart" :aria-label="label" :dir="direction" :data-chart-state="state" :data-animated="animate !== false || undefined"
    :data-legend-position="hasLegend && !$slots.legend ? legendPosition : undefined"
    :style="{ maxInlineSize: typeof width === 'number' ? width + 'px' : width, '--sy-chart-skeleton-height': height * .66 + 'px' }">
    <figcaption v-if="description" :id="`${id}-caption`" class="sy-chart__caption">{{ description }}</figcaption>
    <span v-if="supplement" :id="`${id}-supplement`" class="sy-visually-hidden">{{ supplement }}</span>
    <SFocusGroup class="sy-chart__display">
      <div ref="plot" class="sy-chart__plot" :style="{ blockSize: `${height}px` }"
        :role="interactive ? 'slider' : 'img'" :tabindex="interactive ? 0 : -1" :data-blocked="blocked || undefined"
        :data-blocked-empty="blocked && isEmpty || undefined" :aria-busy="loading || undefined" :aria-disabled="interactive && blocked || undefined"
        :data-sy-focus-target="interactive ? '' : undefined"
        :aria-label="state === 'empty' ? `${label} · ${emptyText}` : label" :aria-describedby="describedBy"
        :aria-orientation="interactive ? (orientation === 'horizontal' ? 'vertical' : 'horizontal') : undefined"
        :aria-valuemin="interactive ? 1 : undefined" :aria-valuemax="interactive ? options.length : undefined"
        :aria-valuenow="interactive ? cursorIndex + 1 : undefined" :aria-valuetext="interactive ? accessible : undefined"
        @pointermove="pointer" @pointerup="pointer" @pointerleave="inspectable && !focused && set()"
        @focus="focused = true; selected === undefined && inspectable && set(0)" @blur="focused = false; set()" @keydown="keydown">
        <slot name="plot" :active="inspectable ? selected : undefined" />
        <Transition name="sy-chart-feedback" :css="animate !== false">
          <div v-if="state === 'empty'" class="sy-chart__empty" aria-hidden="true"><slot name="empty">{{ emptyText }}</slot></div>
        </Transition>
      </div>
      <Transition name="sy-chart-feedback" :css="animate !== false" @before-leave="hideStatus">
        <div v-if="blocked" :key="state" ref="status" class="sy-chart__state">
          <div v-if="loading && isEmpty" class="sy-chart__skeleton" :data-shape="placeholderShape" aria-hidden="true">
            <SSkeleton v-if="placeholderShape === 'circle'" shape="circle" width="min(30vw, 6rem, var(--sy-chart-skeleton-height))"
              height="min(30vw, 6rem, var(--sy-chart-skeleton-height))" :animated="animate !== false" />
            <template v-else>
              <SSkeleton v-for="(size, index) in skeletonHeights" :key="index" width="100%" :height="size" :index="index" :animated="animate !== false" />
            </template>
          </div>
          <div class="sy-chart__message">
            <SSpinner v-if="loading" :label="loadingText" size="sm"><SMotionText :value="loadingText" wrap /></SSpinner>
            <div v-else class="sy-chart__error" role="alert"><SIcon name="error" color="error" size="sm" />{{ error }}</div>
            <SButton v-if="!loading && retry" size="sm" variant="secondary" @click="retry">{{ retryLabel }}</SButton>
          </div>
        </div>
      </Transition>
      <Transition v-if="tooltipPlacement === 'overlay'" name="sy-chart-tooltip">
        <div v-if="active" class="sy-chart__inspection" aria-hidden="true"
          :data-edge="point && point.x > (measuredWidth ?? 640) / 2 ? 'start' : 'end'"
          :style="{ '--sy-chart-inspect-x': `${point?.x ?? 0}px` }">
          <slot name="tooltip" :selection="active" :index="cursorIndex">
            <SChartTooltip :title="active.label" :items="active.items" :locale="locale" :missing-text="missingText" />
          </slot>
        </div>
      </Transition>
    </SFocusGroup>
    <div v-if="tooltipPlacement === 'below' && inspect" class="sy-chart__readout" aria-hidden="true">
      <Transition name="sy-chart-tooltip">
        <div v-if="active">
          <slot name="tooltip" :selection="active" :index="cursorIndex">
            <SChartTooltip :title="active.label" :items="active.items" :locale="locale" :missing-text="missingText" />
          </slot>
        </div>
      </Transition>
    </div>
    <slot v-if="hasLegend" name="legend" :items="legend">
      <SChartLegend :items="legend" :label="legendLabel" :position="legendPosition" :alignment="legendAlignment" />
    </slot>
    <SDisclosure v-if="hasData" v-model:open="tableOpen" :title="dataLabel" class="sy-chart__data">
      <slot v-if="tableMounted" name="data" :options="options">
        <div class="sy-chart__table-scroll">
          <table :aria-label="label" :style="{ '--sy-chart-table-columns': summaryColumns.length + 1 }">
            <thead><tr><th scope="col">{{ categoryLabel }}</th><th v-for="entry in summaryColumns" :key="entry.key" scope="col">{{ entry.label }}</th></tr></thead>
            <tbody>
              <tr v-for="entry in summaryRows" :key="entry.key">
                <th scope="row">{{ entry.label }}</th>
                <td v-for="column in summaryColumns" :key="column.key">
                  <SMotionText :value="entry.values.get(column.key) ?? missingText" motion="roll" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </slot>
    </SDisclosure>
  </figure>
</template>
