<script setup lang="ts">
import { computed, ref, shallowRef, useId, watch, type CSSProperties } from 'vue'
import SShellResizeHandle from '../internal/SShellResizeHandle.vue'
import { useShellMeasurement, useShellPreference } from '../internal/shell-layout'
import {
  capacity, fitPanelSizes, panelBounds, parseCollapsedPanels, parseResizableLayout, readPanelSize, shiftPanelSizes, sumSizes,
  type ResizableLayout, type ResizablePanel,
} from '../internal/resizable'

const props = withDefaults(defineProps<{
  panels: readonly ResizablePanel[]
  label: string
  orientation?: 'horizontal' | 'vertical'
  direction?: 'ltr' | 'rtl'
  height?: string
  defaultLayout?: ResizableLayout
  defaultCollapsed?: readonly string[]
  storageKey?: string
  disabled?: boolean
  handle?: 'line' | 'drag' | 'pill' | 'grip' | 'hidden'
  handleVariant?: 'primary' | 'secondary' | 'tertiary'
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  handleSize?: number
  step?: number
  resizeLabel?: (before: ResizablePanel, after: ResizablePanel) => string
}>(), {
  orientation: 'horizontal', defaultLayout: () => ({}), defaultCollapsed: () => [],
  handle: 'line', handleVariant: 'primary', handleSize: 12, step: 8,
})

const model = defineModel<ResizableLayout>()
const collapsedModel = defineModel<readonly string[]>('collapsed')
const collapseMemory = ref<ResizableLayout>()
const emit = defineEmits<{
  resizeStart: [boundary: number]
  resizeEnd: [layout: ResizableLayout, boundary: number]
  collapse: [panel: ResizablePanel]
  expand: [panel: ResizablePanel]
}>()
const group = ref<HTMLElement | null>(null)
const groupId = `sy-resizable-${useId()}`
const inline = useShellMeasurement(group, node => node.clientWidth)
const block = useShellMeasurement(group, node => node.clientHeight)
const layout = useShellPreference(group, () => storage('layout'), model, () => props.defaultLayout, parseResizableLayout, () => props.storage)
const collapsed = useShellPreference<readonly string[]>(group, () => storage('collapsed'), collapsedModel,
  () => props.defaultCollapsed, parseCollapsedPanels, () => props.storage)
const previousSizes = useShellPreference<ResizableLayout>(group, () => storage('expanded'), collapseMemory,
  () => ({}), parseResizableLayout, () => props.storage)
const dragging = ref<number>()
const caught = shallowRef<readonly number[]>()
const handleSize = computed(() => Math.max(6, props.handleSize))
const measurement = computed(() => props.orientation === 'horizontal' ? inline.value : block.value)
const available = computed(() => Math.max(0, (measurement.value ?? 720) -
  Math.max(0, props.panels.length - 1) * handleSize.value))
const units = computed(() => {
  const element = group.value
  const view = element?.ownerDocument.defaultView
  if (!element || !view) return
  return {
    em: parseFloat(view.getComputedStyle(element).fontSize) || 16,
    rem: parseFloat(view.getComputedStyle(element.ownerDocument.documentElement).fontSize) || 16,
  }
})
const pixelSizes = ref<ResizableLayout>({})
const desired = computed(() => {
  const result = { ...layout.value }
  if (!available.value) return result
  for (const panel of props.panels) {
    if (panel.resizeBehavior === 'pixel' && typeof pixelSizes.value[panel.id] === 'number') {
      result[panel.id] = pixelSizes.value[panel.id] * 100 / available.value
    }
  }
  return result
})
const bounds = computed(() => panelBounds(props.panels, collapsed.value, available.value, units.value))
const sizes = computed(() => fitPanelSizes(props.panels, desired.value, bounds.value, available.value, units.value))
const shownSizes = computed(() => caught.value ?? sizes.value)
const dragBounds = computed(() => {
  const draft = caught.value
  const index = dragging.value
  if (!draft || index === undefined) return bounds.value
  const pane = props.panels.slice(index, index + 2).find(panel => panel.collapsible)
  const expanded = pane ? panelBounds(props.panels, collapsed.value.filter(id => id !== pane.id), available.value, units.value) : bounds.value
  return expanded.map((limit, at) => ({
    min: pane === props.panels[at] ? Math.min(draft[at], readPanelSize(pane.collapsedSize, available.value, 0, units.value)) : Math.min(draft[at], limit.min),
    max: Math.max(draft[at], limit.max),
  }))
})
const cuts = computed(() => props.panels.slice(0, -1).map((before, index) => {
  const left = Array.from({ length: index + 1 }, (_, i) => index - i)
  const right = Array.from({ length: props.panels.length - index - 1 }, (_, i) => index + i + 1)
  const shown = shownSizes.value
  const limits = dragBounds.value
  const position = sumSizes(left.map(i => shown[i]))
  const roomBefore = Math.min(capacity(shown, limits, left, false), capacity(shown, limits, right, true))
  const roomAfter = Math.min(capacity(shown, limits, left, true), capacity(shown, limits, right, false))
  const after = props.panels[index + 1]
  return { left, right, position, min: position - roomBefore, max: position + roomAfter,
    toggle: [before, after].find(panel => panel.collapsible),
    label: props.resizeLabel?.(before, after) ?? `Resize ${before.label ?? before.id} / ${after.label ?? after.id}` }
}))
const styles = computed<CSSProperties>(() => {
  const shown = shownSizes.value
  const tracks = shown.flatMap((size, index) => {
    const track = measurement.value === undefined ? `minmax(0, ${size}fr)` : `${size.toFixed(4)}px`
    return index < shown.length - 1 ? [track, `${handleSize.value}px`] : [track]
  }).join(' ')
  return { '--sy-resizable-tracks': tracks || undefined, '--sy-resizable-height': props.height }
})

function rememberPixels() {
  if (measurement.value === undefined || !available.value) return
  const next = { ...pixelSizes.value }
  for (const [index, panel] of props.panels.entries()) {
    if (panel.resizeBehavior === 'pixel' && !collapsed.value.includes(panel.id) && next[panel.id] === undefined) {
      next[panel.id] = sizes.value[index]
    }
  }
  pixelSizes.value = next
}

watch(layout, () => { pixelSizes.value = {} }, { flush: 'sync' })
watch([layout, available, () => props.panels], rememberPixels, { flush: 'post' })

function storage(part: string) {
  return props.storageKey && `${props.storageKey}:${part}`
}

function panelId(index: number) {
  return `${groupId}-${index}`
}

function toLayout(widths: readonly number[]) {
  const extent = Math.max(1, available.value)
  return Object.fromEntries(props.panels.map((panel, index) => [panel.id, widths[index] * 100 / extent]))
}

function collapseThreshold(panel: ResizablePanel) {
  return Math.max(12, Math.min(42, (readPanelSize(panel.minSize, available.value, 0, units.value)
    - readPanelSize(panel.collapsedSize, available.value, 0, units.value)) / 2))
}

function readShownTracks() {
  const node = group.value
  const view = node?.ownerDocument.defaultView
  if (!node || !view || measurement.value === undefined) return
  const property = props.orientation === 'horizontal' ? 'gridTemplateColumns' : 'gridTemplateRows'
  const tracks = view.getComputedStyle(node)[property].trim().split(/\s+/)
  if (tracks.length !== props.panels.length * 2 - 1 || !tracks.every(track => track.endsWith('px'))) return
  const widths = tracks.filter((_, index) => index % 2 === 0).map(track => parseFloat(track))
  if (!widths.every(Number.isFinite) || widths.every((size, index) => Math.abs(size - sizes.value[index]) < .5)) return
  if (node.getAnimations().some(animation => animation.playState !== 'finished'
    && (animation.effect as KeyframeEffect | null)?.getKeyframes().some(frame => frame[property]))) return widths
}

function readDragSize(index: number) {
  const shown = readShownTracks()
  return shown && sumSizes(shown.slice(0, index + 1))
}

function resize(index: number, position: number, raw?: number) {
  const cut = cuts.value[index]
  if (!cut || props.disabled || !available.value) return
  const shown = caught.value
  if (shown && raw !== undefined && dragging.value === index) {
    const delta = raw - cut.position
    caught.value = shiftPanelSizes(shown, dragBounds.value, delta >= 0 ? cut.left : cut.right,
      delta >= 0 ? cut.right : cut.left, Math.abs(delta))
    return
  }
  if (raw !== undefined && cut.toggle) {
    const target = cut.toggle
    const before = target.id === props.panels[index].id
    const closed = collapsed.value.includes(target.id)
    const threshold = collapseThreshold(target)
    if (closed ? (before ? raw > cut.position + threshold : raw < cut.position - threshold) :
      (before ? raw < cut.min - threshold : raw > cut.max + threshold)) {
      setCollapsed(target.id, !closed)
      return
    }
  }
  const delta = position - cut.position
  const next = shiftPanelSizes(sizes.value, bounds.value,
    delta >= 0 ? cut.left : cut.right, delta >= 0 ? cut.right : cut.left, Math.abs(delta))
  if (next !== sizes.value) layout.value = toLayout(next)
}

function setCollapsed(id: string, closed: boolean, shown?: readonly number[]) {
  const index = props.panels.findIndex(panel => panel.id === id && panel.collapsible)
  if (index < 0 || props.disabled || closed === collapsed.value.includes(id)) return
  const current = toLayout(sizes.value)
  const nextClosed = closed ? [...collapsed.value, id] : collapsed.value.filter(value => value !== id)
  const panel = props.panels[index]
  if (closed) {
    previousSizes.value = { ...previousSizes.value, [id]: current[id] }
    current[id] = readPanelSize(panel.collapsedSize, available.value, 0, units.value) * 100 / Math.max(available.value, 1)
    const article = group.value?.ownerDocument.getElementById(panelId(index))
    if (article?.contains(group.value?.ownerDocument.activeElement ?? null)) {
      const boundary = group.value?.querySelector<HTMLElement>(`[aria-controls="${panelId(index)}"]`) ??
        group.value?.querySelector<HTMLElement>(`[aria-controls="${panelId(index - 1)}"]`)
      boundary?.focus({ preventScroll: true })
    }
  } else {
    const fallback = readPanelSize(panel.defaultSize, available.value, available.value / props.panels.length, units.value)
    current[id] = previousSizes.value[id] ?? fallback * 100 / Math.max(available.value, 1)
    const leftover = 100 - current[id]
    const others = sumSizes(props.panels.filter(pane => pane.id !== id).map(pane => current[pane.id]))
    if (others > 0) {
      for (const pane of props.panels) if (pane.id !== id) current[pane.id] *= Math.max(0, leftover) / others
    }
  }
  collapsed.value = nextClosed
  if (available.value > 0) layout.value = toLayout(fitPanelSizes(props.panels, shown ? toLayout(shown) : current,
    panelBounds(props.panels, nextClosed, available.value, units.value), available.value, units.value))
  if (closed) emit('collapse', panel)
  else emit('expand', panel)
}

function toggle(id: string) {
  setCollapsed(id, !collapsed.value.includes(id))
}

function commitDrag(index: number, shown: readonly number[]) {
  const pane = cuts.value[index]?.toggle
  if (pane) {
    const at = props.panels.indexOf(pane)
    const closedSize = readPanelSize(pane.collapsedSize, available.value, 0, units.value)
    const closed = shown[at] <= closedSize + collapseThreshold(pane)
    if (collapsed.value.includes(pane.id) !== closed) {
      setCollapsed(pane.id, closed, shown)
      return
    }
  }
  layout.value = toLayout(fitPanelSizes(props.panels, toLayout(shown), bounds.value, available.value, units.value))
}

function showingCaughtPane(panel: ResizablePanel, index: number) {
  const shown = caught.value?.[index]
  return shown !== undefined && collapsed.value.includes(panel.id)
    && shown > readPanelSize(panel.collapsedSize, available.value, 0, units.value) + .5
}

function drag(index: number, active: boolean, event?: PointerEvent, shown?: number) {
  if (active) {
    if (dragging.value !== undefined) return
    caught.value = shown === undefined ? undefined : readShownTracks()
    dragging.value = index
    emit('resizeStart', index)
  } else if (dragging.value === index) {
    const draft = caught.value
    if (draft && event?.type === 'pointerup') commitDrag(index, draft)
    caught.value = undefined
    dragging.value = undefined
    emit('resizeEnd', toLayout(sizes.value), index)
  }
}

defineExpose({
  getLayout: () => toLayout(sizes.value),
  setLayout: (value: ResizableLayout) => { layout.value = toLayout(fitPanelSizes(props.panels, value, bounds.value, available.value, units.value)) },
  collapse: (id: string) => setCollapsed(id, true),
  expand: (id: string) => setCollapsed(id, false),
  toggle,
})
</script>

<template>
  <div
    ref="group" class="sy-resizable" role="group" :aria-label="label" :dir="direction" :style="styles"
    :data-orientation="orientation" :data-handle="handle" :data-handle-variant="handleVariant"
    :data-custom-indicator="Boolean($slots.indicator) || undefined" :data-dragging="dragging !== undefined || undefined"
  >
    <template v-for="(panel, index) in panels" :key="panel.id">
      <div
        :id="panelId(index)" class="sy-resizable__panel" :data-panel="panel.id" :aria-label="panel.label"
        :data-collapsed="panel.collapsible && collapsed.includes(panel.id) || undefined"
        :data-showing-caught="showingCaughtPane(panel, index) || undefined"
      >
        <div class="sy-resizable__slot" :inert="panel.collapsible && collapsed.includes(panel.id)">
          <slot :panel="panel" :index="index" :size="shownSizes[index]" :toggle="() => toggle(panel.id)" />
        </div>
        <Transition v-if="panel.collapsible && $slots.collapsed" name="sy-resizable-fold">
          <div v-show="collapsed.includes(panel.id) && !showingCaughtPane(panel, index)" class="sy-resizable__folded"
            :inert="!collapsed.includes(panel.id) || showingCaughtPane(panel, index)">
            <slot name="collapsed" :panel="panel" :expand="() => setCollapsed(panel.id, false)" />
          </div>
        </Transition>
      </div>
      <SShellResizeHandle
        v-if="cuts[index]" class="sy-resizable__handle" :data-active="dragging === index || undefined"
        :controls="panelId(index)" :label="cuts[index].label" :edge="'start'" :axis="orientation"
        :value="cuts[index].position" :min="Math.ceil(cuts[index].min)" :max="Math.max(Math.ceil(cuts[index].min), Math.floor(cuts[index].max))"
        :step="step" :disabled="disabled" :can-toggle="Boolean(cuts[index].toggle)" pill-placement="none"
        :value-text="`${Math.round(cuts[index].position * 100 / Math.max(available, 1))}%`" :read-drag-size="() => readDragSize(index)"
        @resize="(position, raw) => resize(index, position, raw)" @dragging="(active, event, shown) => drag(index, active, event, shown)"
        @toggle="cuts[index].toggle && toggle(cuts[index].toggle.id)"
      >
        <template v-if="$slots.indicator" #default><slot name="indicator" :index="index" :dragging="dragging === index" /></template>
      </SShellResizeHandle>
    </template>
  </div>
</template>
