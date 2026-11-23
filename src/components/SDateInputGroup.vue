<script setup lang="ts">
import { computed } from 'vue'
import { DateFieldInput, DateRangeFieldInput, TimeFieldInput } from 'reka-ui'
import type { DateInputSegment } from '../internal/date-controls'
import SMotionText from './SMotionText.vue'

const props = defineProps<{
  segments: readonly DateInputSegment[]
  kind?: 'date' | 'time'
  position?: 'start' | 'end'
  label?: string
  locale?: string
}>()

const input = computed(() => {
  if (props.position) return DateRangeFieldInput
  return props.kind === 'time' ? TimeFieldInput : DateFieldInput
})
const names = computed(() => typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(props.locale, { type: 'dateTimeField' })
  : undefined)

function segmentName(part: DateInputSegment['part']) {
  if (part === 'literal') return undefined
  return names.value?.of(part) ?? part
}
</script>

<template>
  <span class="sy-date-segments" :role="label ? 'group' : undefined" :aria-label="label">
    <span v-if="$slots.start" class="sy-date-segments__affix"><slot name="start" /></span>
    <component
      :is="input"
      v-for="(segment, index) in segments"
      :key="`${segment.part}-${index}`"
      :part="segment.part"
      :type="position"
      :aria-label="segmentName(segment.part)"
      class="sy-date-segment"
      :data-sy-part="segment.part"
    >
      <template v-if="segment.part === 'literal'">{{ segment.value.replace(/^\s*([/:.\uFF0F\uFF1A])\s*$/u, '$1') }}</template>
      <SMotionText v-else :value="segment.value" aria-hidden="true" motion="roll" />
    </component>
    <span v-if="$slots.end" class="sy-date-segments__affix"><slot name="end" /></span>
  </span>
</template>
