<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { useChartColors } from './dom-palette'
import { mountWebGLPlot, type WebGLDatum, type WebGLDrawOptions, type WebGLProjection } from './gl-plot'

const props = defineProps<{
  data: readonly WebGLDatum[]
  kind: 'heatmap' | 'stream'
  projection: WebGLProjection
  options: WebGLDrawOptions
}>()
const emit = defineEmits<{ ready: [ready: boolean] }>()
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const renderer = shallowRef<ReturnType<typeof mountWebGLPlot>>()
const palette = useChartColors(canvas, () => props.options.colors)
const hasColors = computed(() => palette.value.length > 0)
const ready = shallowRef(false)

watch(canvas, (node, _, dispose) => {
  if (!node) return
  const notify = (value: boolean) => { ready.value = value; emit('ready', value) }
  try {
    const engine = mountWebGLPlot(node, notify)
    renderer.value = engine
    dispose(() => engine.dispose())
  } catch { notify(false) }
}, { flush: 'post' })
watch([renderer, hasColors, () => props.data, () => props.kind, () => props.projection, () => props.options],
  ([engine, available, rows, mark, projection, options]) => {
    if (engine && available) engine.update(rows, mark, projection, { ...options, colors: palette.value })
  })
watch(palette, colors => { if (colors.length) renderer.value?.setColors(colors) })
</script>

<template>
  <div xmlns="http://www.w3.org/1999/xhtml" class="sy-chart__gl-viewport">
    <canvas ref="canvas" :data-gl-layer="kind" :data-ready="ready || undefined" aria-hidden="true" />
  </div>
</template>
