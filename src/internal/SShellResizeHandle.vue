<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { createResizeHandleGesture, useResizeMaximum } from './resize-handle-gesture'
import { useResizeGrabSpace } from './resize-grab'
import { resizeHandleState } from './resize-pane'
import type { ResizableControl } from './use-resizable'
import { useTranslator } from '../rac/locale'

const props = withDefaults(defineProps<{
  controls: string
  label: string
  value?: number
  min?: number
  max?: number
  edge?: 'start' | 'end'
  axis?: 'horizontal' | 'vertical'
  step?: number
  disabled?: boolean
  canToggle?: boolean
  valueText?: string
  preserveRaw?: boolean
  resizable?: ResizableControl | ResizableControl['props']['value']
  readDragSize?: (handle: HTMLElement) => number | undefined
  position?: 'inline' | 'overlay'
  hasDivider?: boolean
  alwaysVisible?: boolean
  pillPlacement?: 'auto' | 'start' | 'center' | 'end' | 'none'
}>(), { edge: 'start', step: 8, canToggle: undefined, preserveRaw: undefined, hasDivider: undefined, alwaysVisible: true, pillPlacement: 'auto' })
const emit = defineEmits<{
  resize: [size: number, rawSize?: number]
  dragging: [value: boolean, event?: PointerEvent, size?: number]
  keydown: [event: KeyboardEvent]
  toggle: []
}>()
const translate = useTranslator({ 'resize.collapsed': 'Collapsed' })
const handle = ref<HTMLElement | null>(null)
const region = computed(() => props.resizable && ('props' in props.resizable ? props.resizable.props.value : props.resizable))
const dragSizeReader = computed(() => props.readDragSize ?? region.value?.readDragSize)
const resizeState = computed(() => resizeHandleState(dragSizeReader.value))
const axis = computed(() => props.axis ?? region.value?.axis ?? 'horizontal')
const min = computed(() => props.min ?? region.value?.min ?? 0)
const max = computed(() => props.max ?? region.value?.max ?? Infinity)
const value = computed(() => Math.min(Math.max(props.value ?? region.value?.value ?? 0, min.value), max.value))
const canToggle = computed(() => props.canToggle ?? region.value?.canToggle ?? false)
const valueText = computed(() => props.valueText ?? (resizeState.value?.collapsed.value
  ? resizeState.value.collapsedLabel.value ?? translate('resize.collapsed')
  : undefined))
const closed = computed(() => Boolean(resizeState.value?.collapsed.value && value.value === 0))
const accessibleMaximum = useResizeMaximum(handle, () => ({
  axis: axis.value, value: value.value, max: max.value,
  min: resizeState.value?.minimum.value ?? min.value,
  measuredExtent: resizeState.value?.measuredExtent.value,
}))
const gripSide = computed(() => {
  if (props.pillPlacement !== 'auto') return props.pillPlacement
  const towards = props.edge === 'start' ? 'start' : 'end'
  return closed.value ? (towards === 'start' ? 'end' : 'start') : towards
})
useResizeGrabSpace(handle, () => ({ controls: props.controls, axis: axis.value, position: props.position, closed: closed.value }))
const gesture = createResizeHandleGesture(() => handle.value, () => ({
  axis: axis.value, edge: props.edge, step: props.step, value: value.value, min: min.value, max: max.value,
  accessibleMaximum: accessibleMaximum.value, disabled: props.disabled, canToggle: canToggle.value,
  preserveRaw: props.preserveRaw ?? region.value?.preserveRaw, readDragSize: dragSizeReader.value,
  onResize(size, raw) { region.value?.onResize(size, raw); emit('resize', size, raw) },
  onDragging(active, event, size) { region.value?.onDragging(active, event, size); emit('dragging', active, event, size) },
  onToggle() { region.value?.onToggle(); emit('toggle') },
}))
const { dragging, pointerDown, pointerMove, stop, toggle } = gesture
watch(() => props.disabled, disabled => { if (disabled) gesture.dispose() })
onBeforeUnmount(gesture.dispose)
function keyboard(event: KeyboardEvent) {
  emit('keydown', event)
  gesture.keyboard(event)
}
</script>

<template>
  <div
    ref="handle"
    class="sy-shell-resize"
    :data-resize-axis="axis"
    :data-resize-edge="edge"
    :data-resize-position="position"
    :data-resize-divider="(hasDivider ?? position === 'inline') || undefined"
    :data-resize-grip="(!alwaysVisible && gripSide !== 'none' ? 'hover' : undefined)"
    :data-dragging="dragging || undefined"
    role="separator"
    tabindex="0"
    :aria-disabled="disabled || undefined"
    :aria-orientation="axis === 'horizontal' ? 'vertical' : 'horizontal'"
    :aria-label="label"
    :aria-controls="controls"
    :aria-valuemin="min"
    :aria-valuemax="accessibleMaximum"
    :aria-valuenow="value"
    :aria-valuetext="valueText"
    @dblclick="toggle"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="stop"
    @pointercancel="stop"
    @lostpointercapture="stop"
    @keydown="keyboard"
  >
    <span class="sy-shell-resize__grab" aria-hidden="true" />
    <span v-if="gripSide !== 'none' || $slots.default" class="sy-shell-resize__grip"
      :class="{ 'sy-shell-resize__pill': !$slots.default }" :data-side="gripSide === 'none' ? 'center' : gripSide"
      :aria-hidden="!$slots.default || undefined"><slot /></span>
  </div>
</template>
