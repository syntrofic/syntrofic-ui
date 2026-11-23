<script setup lang="ts">
import { computed, inject, provide, watch } from 'vue'
import { fullBleed, layoutDimensions, layoutPadding, layoutPaddingContext, type LayoutDimensions, type LayoutPadding } from '../internal/layout-spacing'
import { useScrollableArea, type ScrollableAreaOptions } from '../internal/scroll-layout'
import { createScrollMotion } from '../internal/scroll-motion'

const props = withDefaults(defineProps<LayoutDimensions & LayoutPadding & {
  label: string
  axis?: 'inline' | 'block' | 'both'
  role?: 'group' | 'region'
  keyboardOwner?: ScrollableAreaOptions['keyboardOwner']
  overscroll?: 'allow' | 'contain'
  stickyContainment?: 'when-scrollable' | 'always'
  fullBleed?: boolean
}>(), { axis: 'block', role: 'group', overscroll: 'allow', stickyContainment: 'when-scrollable' })
const emit = defineEmits<{ scroll: [event: Event]; 'overflow-change': [state: { inline: boolean; block: boolean }] }>()
const { viewport, content, state, viewportAttrs } = useScrollableArea(props)
const parentInsets = inject(layoutPaddingContext, undefined)
const insets = computed(() => layoutPadding(props))
const dimensions = computed(() => ({ ...layoutDimensions(props), ...(props.fullBleed ? fullBleed(parentInsets?.value) : {}) }))
provide(layoutPaddingContext, insets)
watch([() => state.value.inline, () => state.value.block], ([inline, block]) => emit('overflow-change', { inline, block }))
let motion: ReturnType<typeof createScrollMotion> | undefined
watch(viewport, (node, _, cleanup) => {
  if (!node) return
  motion = createScrollMotion(node)
  cleanup(() => { motion?.dispose(); motion = undefined })
}, { flush: 'post' })
defineExpose({ viewport, state, scrollToStart: (axis?: 'block' | 'inline') => motion?.scrollToStart(axis) })
</script>

<template>
  <div ref="viewport" class="sy-scrollable-area" :role="role" :aria-label="label" :style="dimensions" v-bind="viewportAttrs"
    @scroll.passive="emit('scroll', $event)">
    <div ref="content" class="sy-scrollable-area__content" :style="insets"><slot /></div>
  </div>
</template>
