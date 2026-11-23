<script setup lang="ts">
import { computed } from 'vue'
import type { ChatActivityStep } from '../chat/types'
import SChatLoader from './SChatLoader.vue'
import SDisclosure from './SDisclosure.vue'
import SMotionText from './SMotionText.vue'
import STimeline from './STimeline.vue'
import STimelineItem from './STimelineItem.vue'

const props = withDefaults(defineProps<{
  title?: string
  pending?: boolean
  pendingLabel?: string
  elapsed?: number
  locale?: string
  durationUnit?: string
  formatDuration?: (seconds: number) => string
  steps?: readonly ChatActivityStep[]
  stepsLabel?: string
  defaultOpen?: boolean
  disabled?: boolean
}>(), {
  title: 'Activity', pendingLabel: 'In progress', durationUnit: 's', locale: 'en', steps: () => [], stepsLabel: 'Activity steps',
})
const open = defineModel<boolean>('open')
defineSlots<{
  trigger(props: { title: string; duration: string; pending: boolean }): unknown
  step(props: { step: ChatActivityStep; index: number }): unknown
  meta(props: { step: ChatActivityStep; index: number }): unknown
  default(props: { steps: readonly ChatActivityStep[]; pending: boolean }): unknown
}>()

const formatter = computed(() => new Intl.NumberFormat(props.locale, { maximumFractionDigits: 0 }))
const duration = computed(() => {
  if (props.elapsed === undefined || !Number.isFinite(props.elapsed) || props.elapsed < 0) return ''
  const seconds = Math.floor(props.elapsed)
  return props.formatDuration?.(seconds) ?? `${formatter.value.format(seconds)}${props.durationUnit ? ` ${props.durationUnit}` : ''}`
})
</script>

<template>
  <div class="sy-chain-of-thought">
    <SDisclosure class="sy-chain-of-thought__disclosure" v-model:open="open" :default-open="defaultOpen" :disabled="disabled">
      <template #title>
        <span class="sy-chain-of-thought__trigger">
          <slot name="trigger" :title="title" :duration="duration" :pending="Boolean(pending)">
            <span class="sy-chain-of-thought__title"><SMotionText :value="title" /></span>
            <span v-if="elapsed !== undefined" class="sy-chain-of-thought__duration"><SMotionText :value="duration" motion="roll" /></span>
            <SChatLoader :active="pending" :label="pendingLabel" size="sm" decorative class="sy-chain-of-thought__pending" />
          </slot>
        </span>
      </template>
      <slot :steps="steps" :pending="Boolean(pending)">
        <STimeline :aria-label="stepsLabel" density="compact" size="sm">
          <STimelineItem v-for="(step, index) in steps" :key="step.id" :title="step.title" :description="step.description"
            :status="step.status" :status-label="step.statusLabel" :datetime="step.datetime" :time-label="step.time">
            <template v-if="$slots.step" #default><slot name="step" :step="step" :index="index" /></template>
            <template v-if="$slots.meta" #meta><slot name="meta" :step="step" :index="index" /></template>
          </STimelineItem>
        </STimeline>
      </slot>
    </SDisclosure>
    <span class="sy-visually-hidden" role="status">{{ pending ? pendingLabel : '' }}</span>
  </div>
</template>
