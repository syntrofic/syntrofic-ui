<script setup lang="ts">
import { computed, inject, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { layerLength, layerTarget, layerViewportInset, layerViewportPadding, type LayerInset, type LayerToastConfig } from '../internal/layer-context'
import { toastQueueContext } from '../internal/toast-context'
import SToastProvider from './SToastProvider.vue'

const props = defineProps<{ inset?: LayerInset; toast?: LayerToastConfig }>()
const host = useTemplateRef<HTMLElement>('host')
const gauge = useTemplateRef<HTMLElement>('gauge')
const parentInset = inject(layerViewportInset, undefined)
const hasToast = Boolean(inject(toastQueueContext, undefined))
const inset = computed(() => ({ ...parentInset?.value, ...props.inset }))
const padding = shallowRef<{ top: number; right: number; bottom: number; left: number }>()
const gaugeStyle = computed(() => ({
  paddingBlockStart: layerLength(inset.value.blockStart),
  paddingBlockEnd: layerLength(inset.value.blockEnd),
  paddingInlineStart: layerLength(inset.value.inlineStart),
  paddingInlineEnd: layerLength(inset.value.inlineEnd),
}))
provide(layerTarget, host)
provide(layerViewportInset, inset)
provide(layerViewportPadding, padding)

watch([gauge, inset], ([node, edges], _, cleanup) => {
  const view = node?.ownerDocument.defaultView
  if (!node || !view || !Object.keys(edges).length) { padding.value = undefined; return }
  const read = () => {
    const style = view.getComputedStyle(node)
    const next = { top: parseFloat(style.paddingTop) || 0, right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0, left: parseFloat(style.paddingLeft) || 0 }
    const previous = padding.value
    if (!previous || previous.top !== next.top || previous.right !== next.right
      || previous.bottom !== next.bottom || previous.left !== next.left) padding.value = next
  }
  read()
  const observer = new ResizeObserver(read)
  observer.observe(node, { box: 'border-box' })
  const contextStyles = new MutationObserver(read)
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    contextStyles.observe(parent, { attributes: true, attributeFilter: ['dir', 'style', 'class'] })
  }
  cleanup(() => { observer.disconnect(); contextStyles.disconnect() })
}, { flush: 'post' })
</script>

<template>
  <SToastProvider v-if="!hasToast" top-layer :placement="toast?.position ?? 'bottom-end'" :max-visible="toast?.maxVisible ?? 5"
    :viewport-label="toast?.viewportLabel" :inset="{ ...inset, ...toast?.inset }"><slot /></SToastProvider>
  <slot v-else />
  <div ref="host" class="sy-layer-host">
    <span ref="gauge" class="sy-layer__inset-gauge" :style="gaugeStyle" aria-hidden="true" />
  </div>
</template>
