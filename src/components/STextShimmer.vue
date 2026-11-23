<script setup lang="ts">
import { computed } from 'vue'
import SMotionText from './SMotionText.vue'

const props = withDefaults(defineProps<{
  text: string
  as?: 'span' | 'p' | 'div'
  active?: boolean
  duration?: number
  spread?: number
  announce?: boolean
}>(), { as: 'span', active: true, duration: 2100, spread: 25 })

const style = computed(() => ({
  '--sy-shimmer-period': `${Number.isFinite(props.duration) ? Math.max(400, props.duration) : 2100}ms`,
  '--sy-shimmer-band': `${Number.isFinite(props.spread) ? Math.min(70, Math.max(5, props.spread)) : 25}%`,
}))
</script>

<template>
  <component :is="as" class="sy-text-shimmer" :style="style" :data-active="active || undefined">
    <SMotionText :value="text" :announce="announce" class="sy-text-shimmer__text" />
    <Transition name="sy-shimmer-layer">
      <span v-if="active" aria-hidden="true" class="sy-text-shimmer__layer">
        <span class="sy-text-shimmer__highlight"><SMotionText :value="text" /></span>
      </span>
    </Transition>
  </component>
</template>
