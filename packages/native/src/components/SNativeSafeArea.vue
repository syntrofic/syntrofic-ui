<script setup lang="ts">
import { type GridLayout } from '@nativescript/core'
import { ref, useTemplateRef } from 'nativescript-vue'
type Edge = 'top' | 'right' | 'bottom' | 'left'
const props = withDefaults(defineProps<{ edges?: readonly Edge[]; minimum?: number }>(), {
  edges: () => ['top', 'right', 'bottom', 'left'], minimum: 0,
})
const host = useTemplateRef<{ nativeView: GridLayout }>('host')
const insets = ref<Record<Edge, number>>({ top: 0, right: 0, bottom: 0, left: 0 })
function measure() {
  const next = host.value?.nativeView.getSafeAreaInsets()
  if (next) insets.value = { top: next.top ?? 0, right: next.right ?? 0, bottom: next.bottom ?? 0, left: next.left ?? 0 }
}
function padding(edge: Edge) { return props.edges.includes(edge) ? Math.max(props.minimum, insets.value[edge]) : 0 }
</script>
<template>
  <GridLayout ref="host" :paddingTop="padding('top')" :paddingRight="padding('right')" :paddingBottom="padding('bottom')"
    :paddingLeft="padding('left')" @loaded="measure" @layoutChanged="measure">
    <slot />
  </GridLayout>
</template>
