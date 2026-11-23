<script setup lang="ts">
import type { TouchGestureEventData } from '@nativescript/core'
import { cancelAnimationFrame, requestAnimationFrame } from '@nativescript/core/animation-frame'
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'nativescript-vue'
import { useActionMeter } from '../action-motion'
import { actionRatio, holdRatio, type NativeActionStatus } from '../action-state'
import { nativeNumberFormat } from '../text-platform'
import SNativeActionTrack from './SNativeActionTrack.vue'

const props = withDefaults(defineProps<{
  label: string
  hint?: string
  workingLabel?: string
  successLabel?: string
  errorLabel?: string
  disabled?: boolean
  status?: NativeActionStatus
  progress?: number
  holdDuration?: number
  defaultCompleted?: boolean
  autoReset?: boolean
  autoResetDelay?: number
  minWidth?: number
  locale?: string
  variant?: 'primary' | 'secondary' | 'danger'
}>(), { holdDuration: 1800, autoResetDelay: 1600, locale: 'en' })
const model = defineModel<boolean | undefined>('completed', { default: undefined })
const emit = defineEmits<{ complete: []; retry: []; progress: [value: number]; cancel: [] }>()
defineSlots<{ label(props: { progress: number; color: string; label: string }): unknown }>()
const control = useTemplateRef<InstanceType<typeof SNativeActionTrack>>('control')
const holding = ref(false)
const position = ref(0)
const complete = computed(() => model.value ?? props.defaultCompleted ?? false)
const status = computed(() => props.status ?? (complete.value ? 'success' : holding.value ? 'running' : 'idle'))
const ratio = computed(() => status.value === 'success' ? 1 : props.progress !== undefined ? actionRatio(props.progress) : position.value)
const drawing = useActionMeter(ratio, holding)
const blocked = computed(() => props.disabled || status.value === 'success' || props.status === 'running')
const feedback = computed(() => status.value === 'success' ? props.successLabel ?? props.label
  : status.value === 'error' ? props.errorLabel ?? props.label : status.value === 'running' ? props.workingLabel ?? props.label : props.label)
const formatter = computed(() => nativeNumberFormat(props.locale, { style: 'percent' }))
const formatted = computed(() => formatter.value.format(ratio.value))
let animation: number | undefined
let resetJob: ReturnType<typeof setTimeout> | undefined
let ignoreTapUntil = 0

function stopHold(cancelled = false) {
  if (animation !== undefined) cancelAnimationFrame(animation)
  animation = undefined
  if (holding.value && cancelled) {
    position.value = 0
    emit('cancel')
  }
  holding.value = false
}

function reset() {
  clearTimeout(resetJob)
  stopHold()
  position.value = 0
  model.value = false
}

function confirm() {
  if (blocked.value || complete.value) return
  stopHold()
  position.value = 1
  model.value = true
  emit('complete')
  void nextTick(() => { if (!complete.value && !holding.value) position.value = 0 })
  if (props.autoReset) resetJob = setTimeout(reset, Math.max(0, props.autoResetDelay))
}

function touch(event: TouchGestureEventData) {
  if (event.action === 'down') {
    ignoreTapUntil = Date.now() + 350
    if (blocked.value || status.value === 'error' || holding.value) return
    const start = Date.now()
    holding.value = true
    function advance() {
      if (!holding.value) return
      position.value = holdRatio(start, Date.now(), props.holdDuration)
      emit('progress', position.value)
      if (position.value >= 1) {
        ignoreTapUntil = Date.now() + 350
        confirm()
      } else animation = requestAnimationFrame(advance)
    }
    animation = requestAnimationFrame(advance)
  } else if (event.action === 'move' && holding.value) {
    const { width, height } = event.view.getActualSize()
    const x = event.getX()
    const y = event.getY()
    if (x < 0 || x > width || y < 0 || y > height) stopHold(true)
  } else if (event.action === 'up' || event.action === 'cancel') {
    ignoreTapUntil = Date.now() + 350
    stopHold(true)
  }
}

function activate() {
  if (status.value === 'error' && !props.disabled) emit('retry')
  else if (Date.now() >= ignoreTapUntil) confirm()
}

watch(blocked, value => { if (value) stopHold(true) })
watch(complete, value => { if (!value && !holding.value) position.value = 0 })
onBeforeUnmount(() => { clearTimeout(resetJob); stopHold() })
defineExpose({ reset, focus: () => control.value?.focus() ?? false })
</script>

<template>
  <SNativeActionTrack ref="control" :label="feedback" :hint="hint ?? 'Hold to complete, or activate with an assistive control'"
    :progress="drawing" :status="status" :disabled="blocked" :variant="variant" :minWidth="minWidth" :accessibilityValue="formatted"
    @touch="touch" @activate="activate" @unloaded="stopHold(true)">
    <template v-if="$slots.label" #label="state"><slot name="label" v-bind="state" /></template>
  </SNativeActionTrack>
</template>
