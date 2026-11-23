<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { SButton, SCard, SMotionText, createDragToSnapPoints, useDragToSnapPoints } from '../src'

const props = defineProps<{ api: 'useDragToSnapPoints' | 'createDragToSnapPoints'; direction: 'ltr' | 'rtl' }>()
const places = ['待处理', '复核中', '已归档']
const place = ref(0)
const stops = [0, 68, 136] as const
const positions = computed<readonly number[]>(() => props.direction === 'rtl' ? stops.map(point => -point) : stops)
const tile = useTemplateRef<HTMLElement>('tile')
function directionIndex(index: number) { return props.direction === 'rtl' ? places.length - 1 - index : index }
const hook = props.api === 'useDragToSnapPoints' ? useDragToSnapPoints(tile, () => ({
  axis: 'x',
  snapPoints: positions.value,
  onSettle: index => { place.value = directionIndex(index) },
})) : undefined
let factory: ReturnType<typeof createDragToSnapPoints> | undefined
if (!hook) {
  watch([tile, positions], ([element, points], _, cleanup) => {
    if (!element) return
    const control = createDragToSnapPoints(element, {
      points, initial: points[place.value], flickThreshold: 1008,
      onSettle: point => { place.value = points.indexOf(point) },
    })
    factory = control
    cleanup(() => { control.dispose(); factory = undefined })
  }, { flush: 'post' })
} else {
  watch(() => props.direction, () => { hook.settleTo(directionIndex(place.value)) }, { flush: 'post' })
}
function settle(index: number) {
  if (hook) hook.settleTo(directionIndex(index))
  else factory?.snapTo(positions.value[index])
}
</script>

<template>
  <section class="snap-card-motion-review" :aria-label="api + ' 卡片'" :dir="direction">
    <code dir="ltr">{{ api }}</code>
    <div class="snap-card-motion-review__track" aria-hidden="true">
      <span v-for="stop in stops" :key="stop" class="snap-card-motion-review__stop" :style="{ insetInlineStart: stop + 8 + 'px' }" />
      <div ref="tile" class="snap-card-motion-review__tile" data-snap-card>
        <SCard padding="sm">文档</SCard>
      </div>
    </div>
    <div class="review__row" role="group" aria-label="卡片位置">
      <SButton v-for="(label, index) in places" :key="label" size="sm" variant="secondary" :aria-pressed="place === index" @click="settle(index)">
        {{ label }}
      </SButton>
    </div>
    <output aria-label="卡片当前位置"><SMotionText :value="places[place]" /></output>
  </section>
</template>

<style scoped>
.snap-card-motion-review { display: grid; justify-items: start; gap: var(--sy-space-2); min-inline-size: 0; }
.snap-card-motion-review__track { position: relative; box-sizing: border-box; min-block-size: 4.2rem; inline-size: min(100%, 13.25rem); background: var(--sy-surface-muted); border-radius: var(--sy-radius-md); }
.snap-card-motion-review__stop, .snap-card-motion-review__tile { position: absolute; inset-block-start: .5rem; inline-size: 3.65rem; }
.snap-card-motion-review__stop { block-size: 3.1rem; border: 1px dashed var(--sy-border-strong); border-radius: var(--sy-radius-sm); }
.snap-card-motion-review__tile { inset-inline-start: 8px; cursor: grab; user-select: none; touch-action: pan-y; }
.snap-card-motion-review__tile :deep(.sy-card) { block-size: 3.1rem; text-align: center; }
</style>
