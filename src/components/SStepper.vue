<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import SButton from './SButton.vue'
import SFocusGroup from './SFocusGroup.vue'
import SIcon from './SIcon.vue'
import SMotionText from './SMotionText.vue'
import type { ButtonSize, ToggleItem } from '../types'

export interface StepperItem extends ToggleItem {
  description?: string
  progress?: number
  indicator?: 'auto' | 'number' | 'none' | 'bullet'
  tone?: 'accent' | 'success' | 'warning' | 'error'
  density?: StepperDensity
  optional?: boolean
}
export type StepperStatus = 'current' | 'complete' | 'pending'
export type StepperDensity = 'compact' | 'balanced' | 'spacious'
export type StepperCollapsedVariant = 'withLabelAndControls' | 'withLabel' | 'hiddenLabel'
export interface StepperSlotProps {
  step: StepperItem
  index: number
  status: StepperStatus
  reachable: boolean
}

const props = withDefaults(defineProps<{
  label: string
  steps: readonly StepperItem[]
  defaultValue?: string
  completed?: readonly string[]
  maxReachable?: string
  interactive?: boolean
  disabled?: boolean
  size?: ButtonSize
  orientation?: 'horizontal' | 'vertical'
  direction?: 'ltr' | 'rtl'
  marker?: 'number' | 'bullet'
  density?: StepperDensity
  indicatorPosition?: 'separated' | 'on-track'
  horizontalOptions?: { minimumStepWidth?: number; collapsedVariant?: StepperCollapsedVariant }
  optionalLabel?: string
  previousLabel?: string
  nextLabel?: string
  toneLabels?: Partial<Record<NonNullable<StepperItem['tone']>, string>>
  statusLabels?: Partial<Record<StepperStatus | 'unreachable', string>>
}>(), { size: 'md', orientation: 'horizontal', marker: 'number', optionalLabel: 'Optional',
  previousLabel: 'Previous step', nextLabel: 'Next step', indicatorPosition: 'separated' })
defineSlots<{
  indicator(props: StepperSlotProps): unknown
  title(props: StepperSlotProps): unknown
  description(props: StepperSlotProps): unknown
  connector(props: StepperSlotProps & { progress: number }): unknown
  end?(props: StepperSlotProps): unknown
  content?(props: StepperSlotProps): unknown
}>()
const model = defineModel<string>()
const emit = defineEmits<{ change: [value: string] }>()
const list = useTemplateRef<HTMLOListElement>('list')
const width = ref(0)
const focused = ref<string>()
const uid = useId()
const currentIndex = computed(() => {
  const value = model.value ?? props.defaultValue
  const index = props.steps.findIndex(step => step.value === value)
  return index < 0 ? props.steps.findIndex(step => !step.disabled) : index
})
const maxIndex = computed(() => {
  if (props.maxReachable === undefined) return props.steps.length - 1
  return Math.max(currentIndex.value, props.steps.findIndex(step => step.value === props.maxReachable))
})
const completedSteps = computed(() => props.completed ? new Set(props.completed) : undefined)
const steps = computed(() => props.steps.map((step, index) => {
  const complete = completedSteps.value?.has(step.value) ?? (!step.disabled && index < currentIndex.value)
  const status: StepperStatus = index === currentIndex.value ? 'current' : complete ? 'complete' : 'pending'
  const reachable = !props.disabled && !step.disabled && index <= maxIndex.value
  const progress = step.progress !== undefined && Number.isFinite(step.progress)
    ? Math.max(0, Math.min(1, step.progress))
    : complete ? 1 : 0
  const indicator = step.indicator ?? (props.marker === 'number' ? 'auto' : 'bullet')
  const icon = indicator === 'auto' && status !== 'current' && step.tone && step.tone !== 'accent' ? step.tone : undefined
  return { step, index, status, reachable, progress, indicator, icon }
}))
const tabbable = computed(() => [
  steps.value.find(item => item.reachable && item.step.value === focused.value),
  steps.value.find(item => item.reachable && item.status === 'current'),
  steps.value.find(item => item.reachable),
].find(Boolean)?.step.value)
const labels = computed(() => ({ current: 'Current step', complete: 'Completed', pending: 'Upcoming', unreachable: 'Unavailable', ...props.statusLabels }))
const tones = computed(() => ({ accent: '', success: 'Successful', warning: 'Warning', error: 'Error', ...props.toneLabels }))
const collapsedVariant = computed(() => props.horizontalOptions?.collapsedVariant ?? 'withLabelAndControls')
const responsive = computed(() => Boolean(props.horizontalOptions && props.orientation === 'horizontal'))
const compact = computed(() => {
  const minimum = props.horizontalOptions?.minimumStepWidth ?? 112
  return Boolean(responsive.value && width.value
    && props.steps.length > 1 && width.value < minimum * props.steps.length)
})
const activeStep = computed(() => steps.value[currentIndex.value])
const hasCompactControls = computed(() => props.interactive && collapsedVariant.value === 'withLabelAndControls')
function adjacent(direction: -1 | 1) {
  const items = direction < 0 ? steps.value.slice(0, currentIndex.value).reverse() : steps.value.slice(currentIndex.value + 1)
  return items.find(item => item.reachable)
}
watch([list, responsive], ([element, enabled], _, cleanup) => {
  const view = element?.ownerDocument.defaultView
  if (!enabled || !element || !view?.ResizeObserver) {
    width.value = 0
    return
  }
  let frame = 0
  const observer = new view.ResizeObserver(([entry]) => {
    const measured = entry.contentRect.width
    view.cancelAnimationFrame(frame)
    // Compact layout changes the height of the observed list.
    frame = view.requestAnimationFrame(() => { width.value = measured })
  })
  observer.observe(element)
  cleanup(() => {
    observer.disconnect()
    view.cancelAnimationFrame(frame)
  })
}, { flush: 'post' })

function activate(item?: StepperSlotProps) {
  if (!props.interactive || !item?.reachable || item.status === 'current') return
  model.value = item.step.value
  emit('change', item.step.value)
}

function select(event: MouseEvent, item: StepperSlotProps) {
  if (!props.interactive || !item.reachable || compact.value) return
  const button = event.currentTarget as HTMLButtonElement
  if (event.detail > 0 && button.ownerDocument.activeElement !== button) button.focus({ preventScroll: true })
  activate(item)
}
function navigate(event: KeyboardEvent) {
  if (!props.interactive || compact.value || event.altKey || event.ctrlKey || event.metaKey) return
  const buttons = [...list.value?.querySelectorAll<HTMLButtonElement>('button[data-sy-step]:not(:disabled)') ?? []]
  const index = buttons.indexOf(event.target as HTMLButtonElement)
  if (index < 0) return
  const horizontal = props.orientation === 'horizontal'
  const rtl = list.value && getComputedStyle(list.value).direction === 'rtl'
  const previous = horizontal ? rtl ? 'ArrowRight' : 'ArrowLeft' : 'ArrowUp'
  const next = horizontal ? rtl ? 'ArrowLeft' : 'ArrowRight' : 'ArrowDown'
  const destination = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
    : event.key === previous ? Math.max(0, index - 1) : event.key === next ? Math.min(buttons.length - 1, index + 1) : -1
  if (destination < 0) return
  event.preventDefault()
  buttons[destination]?.focus()
}
function focusActive() {
  const element = list.value
  const destination = compact.value ? element?.parentElement?.querySelector<HTMLElement>('.sy-stepper__summary button:not(:disabled)')
    : element?.querySelector<HTMLElement>('button[aria-current="step"]:not(:disabled)')
      ?? element?.querySelector<HTMLElement>('button[tabindex="0"]:not(:disabled)')
  ;(destination ?? element)?.focus({ preventScroll: true })
}
watch(compact, () => {
  const element = list.value
  const focused = element?.ownerDocument.activeElement
  if (focused && element?.parentElement?.contains(focused)) void nextTick(focusActive)
})
watch(currentIndex, () => {
  if (list.value?.ownerDocument.activeElement?.closest('.sy-stepper__content') && list.value.contains(list.value.ownerDocument.activeElement))
    void nextTick(focusActive)
})
function move(direction: -1 | 1, event: MouseEvent) {
  activate(adjacent(direction))
  const trigger = event.currentTarget as HTMLButtonElement
  void nextTick(() => { if (trigger.disabled) focusActive() })
}
</script>

<template>
  <SFocusGroup class="sy-stepper" :data-size="size" :data-orientation="orientation" :data-marker="marker" :data-density="density"
    :data-indicator-position="indicatorPosition" :data-compact="compact || undefined" :dir="direction">
    <ol ref="list" class="sy-stepper__list" role="list" :aria-label="label" tabindex="-1"
      :style="{ '--sy-step-count': Math.max(1, steps.length) }" @keydown="navigate" @focusout="!list?.contains($event.relatedTarget as Node) && (focused = undefined)">
      <li v-for="item in steps" :key="item.step.value" class="sy-stepper__step" :data-status="item.status"
        :data-unreachable="!item.reachable || undefined" :data-tone="item.step.tone" :data-indicator="item.indicator" :data-density="item.step.density">
        <component :is="interactive ? 'button' : 'div'" class="sy-stepper__control" :type="interactive ? 'button' : undefined"
          :disabled="interactive && (compact || !item.reachable) || undefined" :tabindex="interactive ? (!compact && tabbable === item.step.value ? 0 : -1) : undefined"
          :data-sy-step="interactive || undefined" :data-sy-focus-target="interactive || undefined"
          :aria-current="item.status === 'current' ? 'step' : undefined"
          :aria-labelledby="interactive ? uid + '-step-' + item.index : undefined"
          :aria-describedby="interactive ? uid + '-details-' + item.index : undefined"
          @focus="focused = item.step.value" @click="select($event, item)">
          <span class="sy-stepper__marker" :data-custom="Boolean($slots.indicator) || undefined" aria-hidden="true">
            <slot name="indicator" v-bind="item">
              <Transition name="sy-stepper-mark">
                <SIcon v-if="item.icon || (item.indicator === 'auto' && item.status === 'complete')"
                  class="sy-stepper__marker-content" :name="item.icon || 'check'" size="sm" />
                <SMotionText v-else-if="item.indicator === 'auto' || item.indicator === 'number'"
                  class="sy-stepper__marker-content" :value="String(item.index + 1)" />
              </Transition>
            </slot>
          </span>
          <span class="sy-stepper__text">
            <span class="sy-stepper__title" :id="uid + '-step-' + item.index"><slot name="title" v-bind="item">{{ item.step.label }}</slot></span>
            <span :id="uid + '-details-' + item.index">
              <span v-if="item.step.description || $slots.description" class="sy-stepper__description"><slot name="description" v-bind="item">{{ item.step.description }}</slot></span>
              <span v-if="item.step.optional" class="sy-stepper__optional">{{ optionalLabel }}</span>
              <span class="sy-visually-hidden">{{ labels[item.status] }}{{ item.reachable ? '' : ' · ' + labels.unreachable
              }}{{ item.step.tone && tones[item.step.tone] ? ' · ' + tones[item.step.tone] : '' }}</span>
            </span>
          </span>
          <span v-if="$slots.end && !compact" class="sy-stepper__end"><slot name="end" v-bind="item" /></span>
        </component>
        <div v-if="$slots.content" class="sy-stepper__content" :data-expanded="item.status === 'current' && !compact || undefined"
          :inert="item.status !== 'current' || compact || undefined" :aria-hidden="item.status !== 'current' || compact || undefined">
          <div><slot name="content" v-bind="item" /></div>
        </div>
        <span v-if="item.index + 1 < steps.length" class="sy-stepper__connector" aria-hidden="true"
          :style="{ '--sy-step-progress': item.progress }">
          <slot name="connector" v-bind="item"><span /></slot>
        </span>
      </li>
    </ol>
    <Transition name="sy-stepper-summary">
      <div v-if="horizontalOptions && collapsedVariant !== 'hiddenLabel' && activeStep" v-show="compact"
        class="sy-stepper__summary" :inert="!compact || undefined">
        <SButton v-if="hasCompactControls" size="sm" variant="ghost" icon-only :aria-label="previousLabel" :disabled="!adjacent(-1)"
          @click="move(-1, $event)"><template #start><SIcon name="chevronLeft" size="sm" mirror /></template></SButton>
        <div class="sy-stepper__summary-text">
          <span class="sy-stepper__title"><SMotionText :value="activeStep.step.label" wrap /></span>
          <span class="sy-stepper__description"><SMotionText :value="activeStep.step.description ?? ''" wrap /></span>
        </div>
        <SButton v-if="hasCompactControls" size="sm" variant="ghost" icon-only :aria-label="nextLabel" :disabled="!adjacent(1)"
          @click="move(1, $event)"><template #start><SIcon name="chevronRight" size="sm" mirror /></template></SButton>
      </div>
    </Transition>
  </SFocusGroup>
</template>
