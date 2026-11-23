<script setup lang="ts">
import { nextTick, onMounted, onScopeDispose, ref, useTemplateRef, watch } from 'vue'
import { childLayout, useAnimatedLayout } from '../internal/motion'

const props = withDefaults(defineProps<{ layout?: 'vertical' | 'horizontal' | 'horizontal-labels'; labelWidth?: string }>(), {
  layout: 'vertical', labelWidth: 'minmax(6rem, 1fr)',
})
const root = useTemplateRef<HTMLDivElement>('root')
const fields = useTemplateRef<HTMLDivElement>('fields')
const compact = ref<boolean>()
const capture = useAnimatedLayout()
let resize: ResizeObserver | undefined

onMounted(() => {
  const element = root.value
  const view = element?.ownerDocument.defaultView
  if (!element || !view?.ResizeObserver) return
  compact.value = Number.parseFloat(view.getComputedStyle(element).inlineSize) <= 480
  resize = new view.ResizeObserver(([entry]) => {
    if (entry) compact.value = (entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width) <= 480
  })
  resize.observe(element)
})
onScopeDispose(() => resize?.disconnect())

watch([() => props.layout, () => props.labelWidth, compact], ([layout], [previous]) => {
  if (!fields.value) return
  const children = [...fields.value.children].flatMap(childLayout)
  const candidates = layout === 'horizontal-labels' || previous === 'horizontal-labels'
    ? children.flatMap(child => child.matches('.sy-field')
      ? [...child.children].flatMap(childLayout)
      : [child])
    : children
  void nextTick(capture(candidates))
})
</script>

<template>
  <div ref="root" class="sy-form-layout" :data-layout="layout" :data-compact="compact" :style="{ '--sy-form-label': labelWidth }">
    <div ref="fields" class="sy-form-layout__fields"><slot /></div>
  </div>
</template>
