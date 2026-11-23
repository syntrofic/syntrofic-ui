<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { onFormReset } from '../internal/form-reset'
import { createAnimator, prefersReducedMotion } from '../internal/motion'
import { solveSpring, springFromResponse } from '../internal/motion-physics'
import { createPanGesture } from '../internal/pan-gesture'
import { useKeyboardHint } from '../internal/keyboard-hint'
import SInlineLabel from '../internal/SInlineLabel'
import type { ButtonSize, ToggleItem } from '../types'
import SIcon from './SIcon.vue'

const props = withDefaults(defineProps<{
  items: readonly ToggleItem[]
  label: string
  name?: string
  form?: string
  defaultValue?: string | null
  disabled?: boolean
  allowEmpty?: boolean
  showSeparators?: boolean
  expandLabels?: boolean
  iconOnly?: boolean
  fullWidth?: boolean
  size?: ButtonSize
  variant?: 'default' | 'ghost'
  orientation?: 'horizontal' | 'vertical'
  direction?: 'ltr' | 'rtl'
  loop?: boolean
  dragSelection?: boolean
  keyboardHint?: string | boolean
}>(), { size: 'md', variant: 'default', orientation: 'horizontal', loop: true, dragSelection: true, keyboardHint: true })
const model = defineModel<string | null>()
const emit = defineEmits<{ change: [value: string | null] }>()
defineSlots<{
  item(props: { item: ToggleItem; selected: boolean }): unknown
  icon(props: { item: ToggleItem; selected: boolean }): unknown
}>()
const host = useTemplateRef<HTMLDivElement>('host')
const native = useTemplateRef<HTMLInputElement>('native')
const indicator = useTemplateRef<HTMLSpanElement>('indicator')
const dragging = ref(false)
const lifted = ref(false)
const preview = ref<string>()
const value = computed(() => {
  const desired = model.value !== undefined ? model.value : props.defaultValue
  if (desired === null) return null
  if (desired !== undefined && props.items.some(item => item.value === desired)) return desired
  return props.allowEmpty ? null : props.items.find(item => !item.disabled)?.value ?? null
})
const initial = model.value
const hasIcons = computed(() => props.items.some(item => Boolean(item.icon)))
let resize: ResizeObserver | undefined
let animator: ReturnType<typeof createAnimator> | undefined
let dragCleanup: (() => void) | undefined
let blockClick = false
type Lens = { x: number; y: number; width: number; height: number }
let destination: Lens | undefined
const selectionSpring = springFromResponse({ response: .4, dampingRatio: .85 })
const { HintElement, onFocus, onBlur, onKeyDown } = useKeyboardHint(() => ({ orientation: props.orientation,
  isEnabled: !props.disabled && props.keyboardHint !== false && props.items.filter(item => !item.disabled).length > 1,
  label: typeof props.keyboardHint === 'string' ? props.keyboardHint : undefined }))
const coordinates = (node: HTMLElement): Lens => ({ x: node.offsetLeft, y: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight })
const rail = () => host.value?.querySelector<HTMLElement>('.sy-segment__rail')

function select(next: unknown) {
  if (props.disabled) return
  const chosen = typeof next === 'string' && props.items.some(item => item.value === next && !item.disabled) ? next : null
  if ((!props.allowEmpty && chosen === null) || value.value === chosen) return
  model.value = chosen
  emit('change', chosen)
}

function paint(root: HTMLElement, lens: Lens) {
  root.style.setProperty('--sy-segment-x', lens.x + 'px')
  root.style.setProperty('--sy-segment-y', lens.y + 'px')
  root.style.setProperty('--sy-segment-width', lens.width + 'px')
  root.style.setProperty('--sy-segment-height', lens.height + 'px')
}
function renderedLens(element: HTMLElement): Lens {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element)
  const [x = 0, y = 0] = (style?.translate ?? '').split(/\s+/).map(value => Number.parseFloat(value) || 0)
  return { x, y, width: element.offsetWidth, height: element.offsetHeight }
}
function measure() {
  const root = rail()
  const element = indicator.value
  if (!root || !element || dragging.value) return
  const active = root.querySelector<HTMLElement>('[data-sy-segment-item][data-state="on"]')
  if (active && active.offsetWidth > 0 && active.offsetHeight > 0) {
    const target = coordinates(active)
    const start = renderedLens(element)
    if (destination && Object.keys(target).every(key => target[key as keyof Lens] === destination![key as keyof Lens])) return
    animator?.cancel('selection')
    if (root.hasAttribute('data-indicator') && start.width > 0 && !prefersReducedMotion(element) && typeof element.animate === 'function') {
      const motion = solveSpring({ from: 0, to: 1, spring: selectionSpring })
      const duration = motion.settleTime(.003)
      const interpolate = (key: keyof Lens, progress: number) => start[key] + (target[key] - start[key]) * progress
      const frames = Array.from({ length: 42 }, (_, index) => {
        const progress = index === 41 ? 1 : motion.value(duration * index / 41)
        return { translate: `${interpolate('x', progress)}px ${interpolate('y', progress)}px`,
          inlineSize: interpolate('width', progress) + 'px', blockSize: interpolate('height', progress) + 'px' }
      })
      animator ??= createAnimator(element)
      animator.animate('selection', frames, { role: 'move', duration: duration * 1000, easing: 'linear' })
    }
    destination = target
    paint(root, target)
    root.setAttribute('data-indicator', '')
  } else {
    animator?.cancel('selection')
    destination = undefined
    root.removeAttribute('data-indicator')
  }
  root.setAttribute('data-measured', '')
}

function observe() {
  const root = rail()
  if (!root) return
  resize?.disconnect()
  resize?.observe(root)
  for (const item of root.querySelectorAll('[data-sy-segment-item]')) resize?.observe(item)
  measure()
}

function bindDrag() {
  dragCleanup?.()
  const root = rail()
  const element = indicator.value
  const view = root?.ownerDocument.defaultView
  if (!root || !element || !view || !props.dragSelection) return
  let start: Lens
  let candidates: { value: string; midpoint: number }[] = []
  const horizontal = props.orientation === 'horizontal'
  const center = (lens: Lens) => horizontal ? lens.x + lens.width / 2 : lens.y + lens.height / 2
  function release() { lifted.value = false }
  view.addEventListener('pointerup', release)
  view.addEventListener('pointercancel', release)
  const detach = createPanGesture(root, {
    axis: horizontal ? 'horizontal' : 'vertical',
    shouldStart(event) {
      blockClick = false
      if (props.disabled || !(event.target instanceof Element) || !event.target.closest('[data-sy-segment-item][data-state="on"]:enabled')) return false
      lifted.value = true
      return true
    },
    onStart() {
      start = renderedLens(element)
      animator?.cancel('selection')
      candidates = [...root.querySelectorAll<HTMLElement>('[data-sy-segment-item]:enabled')].map(item => ({
        value: item.dataset.segmentValue!, midpoint: center(coordinates(item)),
      }))
      dragging.value = true
      blockClick = true
    },
    onMove({ x, y }) {
      const shift = horizontal ? x : y
      const midpoints = candidates.map(item => item.midpoint)
      if (!midpoints.length) return
      const at = Math.max(Math.min(...midpoints) - 11, Math.min(Math.max(...midpoints) + 11, center(start) + shift))
      const offset = at - center(start)
      paint(root, { ...start, x: start.x + (horizontal ? offset : 0), y: start.y + (horizontal ? 0 : offset) })
      preview.value = candidates.reduce((nearest, item) => Math.abs(item.midpoint - at) < Math.abs(nearest.midpoint - at) ? item : nearest).value
    },
    onEnd(_, __, cancelled) {
      if (!cancelled && preview.value) select(preview.value)
      dragging.value = lifted.value = false
      preview.value = undefined
      destination = undefined
      void nextTick(measure)
    },
  })
  dragCleanup = () => {
    detach()
    view.removeEventListener('pointerup', release)
    view.removeEventListener('pointercancel', release)
    dragging.value = lifted.value = false
    preview.value = undefined
  }
}
function click(event: MouseEvent) {
  if (!event.detail || !blockClick) return
  blockClick = false
  event.preventDefault()
  event.stopImmediatePropagation()
}

onMounted(() => {
  if (typeof ResizeObserver === 'function') resize = new ResizeObserver(measure)
  observe()
  bindDrag()
})
watch(() => [props.items, props.orientation, props.direction] as const, observe, { flush: 'post' })
watch(() => [props.orientation, props.dragSelection], bindDrag, { flush: 'post' })
watch(value, measure, { flush: 'post' })
onBeforeUnmount(() => { resize?.disconnect(); dragCleanup?.(); animator?.dispose() })
onFormReset(() => native.value, () => { model.value = initial })
</script>

<template>
  <div ref="host" class="sy-segment" :data-size="size" :data-variant="variant" :data-full-width="fullWidth || undefined"
    :data-orientation="orientation" :data-expand="expandLabels && !iconOnly && Boolean($slots.icon || hasIcons) || undefined">
    <ToggleGroupRoot class="sy-segment__rail" :aria-label="label" type="single" :disabled="disabled" data-sy-keyboard-hint-scope
      :model-value="value" :orientation="orientation" :dir="direction" :loop="loop" :data-dragging="dragSelection && dragging || undefined"
      :data-drag-enabled="dragSelection || undefined" :data-lifted="lifted || undefined" @update:model-value="select" @click.capture="click"
      @focusin="onFocus" @focusout="onBlur" @keydown="onKeyDown">
      <span ref="indicator" class="sy-segment__indicator" aria-hidden="true" />
      <ToggleGroupItem v-for="(item, index) in items" :key="item.value" class="sy-segment__item" data-sy-segment-item
        :value="item.value" :disabled="item.disabled" :aria-label="item.label" :data-segment-value="item.value"
        :data-preview-selected="dragging && preview === item.value || undefined">
        <span v-if="showSeparators && index > 0" class="sy-segment__separator"
          :data-hidden="value === item.value || value === items[index - 1].value || undefined" aria-hidden="true" />
        <span v-if="$slots.icon || item.icon" class="sy-segment__icon" aria-hidden="true">
          <slot name="icon" :item="item" :selected="value === item.value"><SIcon :name="item.icon" size="sm" /></slot>
        </span>
        <span v-if="!iconOnly || !$slots.icon && !item.icon" class="sy-segment__label">
          <SInlineLabel class="sy-segment__text" :text="item.label">
            <template v-if="$slots.item" #default><slot name="item" :item="item" :selected="value === item.value" /></template>
          </SInlineLabel>
        </span>
      </ToggleGroupItem>
      <HintElement />
    </ToggleGroupRoot>
    <input v-if="name" ref="native" type="hidden" :name="name" :form="form" :value="value ?? ''" :disabled="disabled">
  </div>
</template>
