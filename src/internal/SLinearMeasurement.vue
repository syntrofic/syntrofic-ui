<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import { progressFillDuration, useMeasurement, type MeasurementProps } from './measurement'
import { prefersReducedMotion, themeTempo } from './motion'
import { resolveMotionTiming } from './motion-timing'
import SMotionText from '../components/SMotionText.vue'

const props = withDefaults(defineProps<MeasurementProps & {
  role: 'progressbar' | 'meter'
  indeterminate?: boolean
}>(), { size: 'md', tone: 'accent', showValue: true })
const labelId = `sy-measure-${useId()}`
const { value, fraction, display, bars, aria } = useMeasurement(props, props.role === 'progressbar', props.role === 'progressbar')
const pending = computed(() => props.role === 'progressbar' && (props.indeterminate || value.value === undefined))
const resolvedFill = ref(pending.value ? 0 : fraction.value)
const track = computed(() => props.role === 'progressbar' ? { ...bars.value, '--sy-arc-target': resolvedFill.value } : bars.value)
const fill = useTemplateRef<HTMLDivElement>('fill')
let motion: Animation | undefined

watch([fraction, pending], ([target, busy]) => {
  if (props.role !== 'progressbar') return
  const node = fill.value
  const view = node?.ownerDocument.defaultView
  const styles = node && view?.getComputedStyle(node)
  const painted = Number.parseFloat(styles?.getPropertyValue('--sy-measure-fraction') ?? '')
  const start = Number.isFinite(painted) ? painted : resolvedFill.value
  motion?.cancel()
  resolvedFill.value = busy ? start : target
  if (busy || !node || prefersReducedMotion(node) || Math.abs(target - start) < .001) return
  const { easing } = resolveMotionTiming(node, 'move')
  const playback = node.animate([{ '--sy-measure-fraction': String(start) }, { '--sy-measure-fraction': String(target) }],
    { duration: Math.abs(target - start) * progressFillDuration * themeTempo(node), easing })
  motion = playback
  const clear = () => { if (motion === playback) motion = undefined }
  playback.finished.then(clear, clear)
}, { flush: 'pre' })
onBeforeUnmount(() => motion?.cancel())
</script>

<template>
  <div
    class="sy-measure"
    :role="role"
    :aria-labelledby="label || $slots.label ? labelId : undefined"
    v-bind="aria"
    :aria-valuenow="pending ? undefined : aria['aria-valuenow']"
    :aria-valuetext="pending ? undefined : aria['aria-valuetext']"
    :data-size="size"
    :data-tone="tone"
    :data-indeterminate="pending || undefined"
    :style="track"
  >
    <div v-if="label || $slots.label || showValue" class="sy-measure__caption">
      <span :id="labelId"><slot name="label">{{ label }}</slot></span>
      <div v-if="showValue" class="sy-measure__value" aria-hidden="true">
        <slot name="value" :text="display" :value="value" :indeterminate="pending">
          <SMotionText :value="pending ? ' ' : display" motion="roll" />
        </slot>
      </div>
    </div>
    <div class="sy-measure__track" aria-hidden="true">
      <div ref="fill" class="sy-measure__fill" />
      <div v-if="role === 'progressbar'" class="sy-measure__sweep"><span /></div>
    </div>
  </div>
</template>
