<script setup lang="ts">
import type { TouchGestureEventData } from '@nativescript/core'
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'nativescript-vue'
import { useActionMeter } from '../action-motion'
import { slideCompleted, slideRatio } from '../action-state'
import { useNativeUI } from '../context'
import { lockGestureScroll } from '../scroll-gesture'
import { nativeNumberFormat } from '../text-platform'
import SNativeActionTrack from './SNativeActionTrack.vue'

const props = withDefaults(defineProps<{
  label: string
  completeLabel?: string
  hint?: string
  disabled?: boolean
  defaultCompleted?: boolean
  autoReset?: boolean
  autoResetDelay?: number
  completionThreshold?: number
  direction?: 'start-to-end' | 'end-to-start'
  minWidth?: number
  locale?: string
  variant?: 'primary' | 'secondary' | 'danger'
}>(), { autoResetDelay: 1600, completionThreshold: .85, direction: 'start-to-end', locale: 'en' })
const model = defineModel<boolean | undefined>('completed', { default: undefined })
const emit = defineEmits<{ complete: []; progress: [value: number]; cancel: [] }>()
defineSlots<{
  thumb(props: { progress: number; color: string }): unknown
  label(props: { progress: number; color: string; label: string }): unknown
}>()
const { direction } = useNativeUI()
const control = useTemplateRef<InstanceType<typeof SNativeActionTrack>>('control')
const width = ref(0)
const drag = ref(false)
const position = ref(0)
const completed = computed(() => model.value ?? props.defaultCompleted ?? false)
const physicalReverse = computed(() => (props.direction === 'end-to-start') !== (direction.value === 'rtl'))
const ratio = computed(() => completed.value ? 1 : position.value)
const drawing = useActionMeter(ratio, drag)
const formatter = computed(() => nativeNumberFormat(props.locale, { style: 'percent' }))
const percent = computed(() => formatter.value.format(ratio.value))
let origin = 0
let unlock: (() => void) | undefined
let resetJob: ReturnType<typeof setTimeout> | undefined
let ignoreTapUntil = 0

function finishGesture() {
  unlock?.()
  unlock = undefined
  drag.value = false
}

function cancel() {
  if (!drag.value) return
  finishGesture()
  position.value = 0
  emit('cancel')
}

function reset() {
  clearTimeout(resetJob)
  finishGesture()
  position.value = 0
  model.value = false
}

function commit() {
  if (completed.value || props.disabled) return
  finishGesture()
  position.value = 1
  model.value = true
  emit('complete')
  void nextTick(() => { if (!completed.value) position.value = 0 })
  if (props.autoReset) resetJob = setTimeout(reset, Math.max(0, props.autoResetDelay))
}

function touch(event: TouchGestureEventData) {
  if (props.disabled || completed.value) return
  const measured = width.value || event.view.getActualSize().width
  const x = event.getX()
  if (event.action === 'down') {
    ignoreTapUntil = Date.now() + 350
    const proximity = physicalReverse.value ? measured - x : x
    if (drag.value || measured <= 44 || proximity > 48) return
    origin = x
    unlock = lockGestureScroll(event)
    drag.value = true
    return
  }
  if (event.action === 'cancel' || event.action === 'up') ignoreTapUntil = Date.now() + 350
  if (!drag.value) return
  if (event.action === 'cancel') return cancel()
  if (event.action !== 'move' && event.action !== 'up') return
  const fromRelease = Number.isFinite(x) ? slideRatio(origin, x, measured - 44, physicalReverse.value) : position.value
  position.value = fromRelease
  emit('progress', position.value)
  if (event.action === 'up') {
    if (slideCompleted(position.value, props.completionThreshold)) commit()
    else cancel()
  }
}

function activate() {
  if (Date.now() >= ignoreTapUntil) commit()
}

watch([() => props.disabled, physicalReverse, completed], ([blocked, reverse, done], [, previous]) => {
  if (blocked || reverse !== previous || done) cancel()
  if (!done && !drag.value) position.value = 0
})
onBeforeUnmount(() => { clearTimeout(resetJob); finishGesture() })
defineExpose({ reset, focus: () => control.value?.focus() ?? false })
</script>

<template>
  <SNativeActionTrack ref="control" :label="completed ? completeLabel ?? label : label"
    :hint="hint ?? 'Slide to confirm, or activate with an assistive control'"
    :progress="drawing" :status="completed ? 'success' : drag ? 'running' : 'idle'" :reversed="physicalReverse"
    :disabled="disabled || completed" :variant="variant" :minWidth="minWidth" :accessibilityValue="percent" thumb
    @touch="touch" @activate="activate" @width="width = $event" @unloaded="cancel">
    <template v-if="$slots.thumb" #thumb="state"><slot name="thumb" v-bind="state" /></template>
    <template v-if="$slots.label" #label="state"><slot name="label" v-bind="state" /></template>
  </SNativeActionTrack>
</template>
