<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'
import { useScrollOverflow, type ScrollEdge } from '../internal/scroll-layout'

export type { ScrollEdge } from '../internal/scroll-layout'

const props = withDefaults(defineProps<{
  label?: string
  orientation?: 'vertical' | 'horizontal' | 'both'
  size?: number
  offset?: number
  hideScrollBar?: boolean
  edges?: readonly ScrollEdge[]
}>(), { orientation: 'vertical', size: 22, offset: 1 })
const emit = defineEmits<{ 'visibility-change': [edges: ScrollEdge[]]; scroll: [event: Event] }>()
const viewport = useTemplateRef<HTMLDivElement>('viewport')
const content = useTemplateRef<HTMLDivElement>('content')
const { edges: visible, hasOverflow: scrollable } = useScrollOverflow(viewport, () => ({
  orientation: props.orientation, threshold: props.offset, edges: props.edges, content,
}))
watch(visible, edges => emit('visibility-change', edges))
</script>

<template>
  <div
    class="sy-scroll-shadow"
    :data-orientation="orientation"
    :data-hide-scrollbar="hideScrollBar || undefined"
    :style="{ '--sy-scroll-edge-size': `${Number.isFinite(size) ? Math.max(0, size) : 22}px` }"
  >
    <div
      ref="viewport"
      class="sy-scroll-shadow__viewport"
      :role="label ? 'region' : undefined"
      :aria-label="label"
      :tabindex="scrollable ? 0 : undefined"
      @scroll.passive="emit('scroll', $event)"
    >
      <div ref="content" class="sy-scroll-shadow__content"><slot /></div>
    </div>
    <span
      v-for="edge in (['top', 'bottom', 'start', 'end'] as const)"
      :key="edge"
      class="sy-scroll-shadow__edge"
      :data-edge="edge"
      :data-visible="visible.includes(edge) || undefined"
      aria-hidden="true"
    />
  </div>
</template>
