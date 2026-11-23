<script setup lang="ts">
import type { ScrollView } from '@nativescript/core'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'nativescript-vue'
import { scrollEdges } from '../collection-state'
import { useNativeUI } from '../context'

const props = withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
  sides?: 'start' | 'end' | 'both' | 'none'
  size?: number
  color?: string
  label?: string
  scrollbar?: boolean
}>(), { orientation: 'vertical', sides: 'both', size: 20 })
const { theme, direction, reducedMotion } = useNativeUI()
const scroll = useTemplateRef<{ nativeView: ScrollView }>('scroll')
const edges = shallowRef({ leading: 0, trailing: 0 })
const horizontal = computed(() => props.orientation === 'horizontal')
const reversed = computed(() => horizontal.value && direction.value === 'rtl')
const length = computed(() => Number.isFinite(props.size) ? Math.max(0, props.size) : 20)
const color = computed(() => props.color ?? theme.value.colors.canvas)
const leading = computed(() => props.sides === 'both' || props.sides === (reversed.value ? 'end' : 'start'))
const trailing = computed(() => props.sides === 'both' || props.sides === (reversed.value ? 'start' : 'end'))
let initialized = false

function measure() {
  const view = scroll.value?.nativeView
  if (!view?.isLoaded) return
  const maximum = horizontal.value ? view.scrollableWidth : view.scrollableHeight
  if (!initialized && maximum > 1) {
    initialized = true
    if (reversed.value) view.scrollToHorizontalOffset(maximum, false)
  }
  const offset = horizontal.value ? view.horizontalOffset : view.verticalOffset
  const next = scrollEdges(offset, maximum, length.value)
  if (next.leading !== edges.value.leading || next.trailing !== edges.value.trailing)
    edges.value = next
}

watch([horizontal, reversed], () => {
  initialized = false
  void nextTick(measure)
})
watch(length, measure)

function scrollTo(offset: number, animated = true) {
  const view = scroll.value?.nativeView
  if (!view) return
  const motion = animated && !reducedMotion.value
  if (horizontal.value) view.scrollToHorizontalOffset(reversed.value ? view.scrollableWidth - offset : offset, motion)
  else view.scrollToVerticalOffset(offset, motion)
}
defineExpose({ scrollTo })
</script>

<template>
  <GridLayout>
    <ScrollView
      ref="scroll"
      direction="ltr"
      :orientation="orientation"
      :scrollBarIndicatorVisible="scrollbar"
      :accessibilityLabel="label"
      @loaded="measure"
      @layoutChanged="measure"
      @scroll="measure"
    >
      <StackLayout :orientation="orientation" :direction="direction" @layoutChanged="measure"><slot /></StackLayout>
    </ScrollView>
    <ContentView
      v-if="leading && length"
      :width="horizontal ? length : undefined"
      :height="horizontal ? undefined : length"
      :horizontalAlignment="horizontal ? 'left' : 'stretch'"
      :verticalAlignment="horizontal ? 'stretch' : 'top'"
      :backgroundImage="`linear-gradient(${horizontal ? 90 : 180}deg, ${color}, transparent)`"
      :opacity="edges.leading"
      :isUserInteractionEnabled="false"
      :accessibilityHidden="true"
    />
    <ContentView
      v-if="trailing && length"
      :width="horizontal ? length : undefined"
      :height="horizontal ? undefined : length"
      :horizontalAlignment="horizontal ? 'right' : 'stretch'"
      :verticalAlignment="horizontal ? 'stretch' : 'bottom'"
      :backgroundImage="`linear-gradient(${horizontal ? 270 : 0}deg, ${color}, transparent)`"
      :opacity="edges.trailing"
      :isUserInteractionEnabled="false"
      :accessibilityHidden="true"
    />
  </GridLayout>
</template>
