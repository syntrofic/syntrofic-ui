<script lang="ts">
import type { EmbedOptions, VisualizationSpec } from 'vega-embed'

export type VegaChartSpec = VisualizationSpec
export type VegaChartConfig = Exclude<EmbedOptions['config'], string | undefined>
</script>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import type { Result } from 'vega-embed'
import type { View } from 'vega'
import { watchChartPalette } from '../charts/dom-palette'
import { parseVegaSchema, type VegaSchemaLibrary } from '../charts/vega-schema'
import { createAnimator, prefersReducedMotion, startLayoutCompanion } from '../internal/motion'
import { categoricalChartColorNames } from '../internal/data-colors'
import SSpinner from './SSpinner.vue'

const props = withDefaults(defineProps<{
  spec: VegaChartSpec | string
  label: string
  description?: string
  mode?: VegaSchemaLibrary
  renderer?: 'canvas' | 'svg'
  config?: VegaChartConfig
  height?: number
  loadingLabel?: string
  errorLabel?: string
}>(), { renderer: 'svg', height: 210, loadingLabel: 'Loading chart', errorLabel: 'The chart could not be displayed.' })
const emit = defineEmits<{ ready: [view: View]; error: [error: unknown] }>()
const host = useTemplateRef<HTMLDivElement>('host')
const current = shallowRef<Result>()
type Layer = { target: HTMLDivElement; result: Result }
let painted: Layer | undefined
let leaving: { layer: Layer; animation: Animation } | undefined
let entry: Animation | undefined
let resize: Animation | undefined
const status = shallowRef<'loading' | 'ready' | 'error'>('loading')
const palette = shallowRef<string[]>([])
const minHeight = computed(() => Math.max(72, props.height) + 'px')
const tokenKeys = ['canvas', 'text', 'text-muted', 'border', ...categoricalChartColorNames]
let stopTheme: (() => void) | undefined
onMounted(() => {
  if (host.value) stopTheme = watchChartPalette(host.value, tokenKeys, colors => { palette.value = colors })
})
function release(layer: Layer) {
  layer.result.finalize()
  layer.target.remove()
}
function finishLeave() {
  const outgoing = leaving
  if (!outgoing) return
  leaving = undefined
  outgoing.animation.cancel()
  release(outgoing.layer)
}
onScopeDispose(() => {
  stopTheme?.()
  entry?.cancel()
  resize?.cancel()
  finishLeave()
  if (painted) release(painted)
})

function present(host: HTMLElement, next?: Layer) {
  finishLeave()
  const view = host.ownerDocument.defaultView
  const canAnimate = view && typeof host.animate === 'function' && !prefersReducedMotion(host)
  const before = canAnimate ? parseFloat(view.getComputedStyle(host).blockSize) : 0
  resize?.cancel()
  const previous = painted
  painted = next
  if (previous) {
    if (canAnimate) {
      const opacity = view.getComputedStyle(previous.target).opacity
      previous.target.dataset.vegaLayer = 'leaving'
      const animation = createAnimator(previous.target).animate('leave', [{ opacity }, { opacity: 0 }], { role: 'exit', fill: 'backwards' })
      const outgoing = leaving = { layer: previous, animation }
      const done = () => { if (leaving === outgoing) finishLeave() }
      animation.finished.then(done, done)
    } else release(previous)
  }
  if (next) {
    next.target.dataset.vegaLayer = 'ready'
    next.target.inert = false
    next.target.removeAttribute('aria-hidden')
    if (canAnimate) {
      entry = createAnimator(next.target).animate('chart-ready', [{ opacity: .25 }, { opacity: 1 }], { role: 'enter', fill: 'backwards' })
      startLayoutCompanion(next.target, entry, leaving?.animation)
    }
  }
  const after = canAnimate ? parseFloat(view.getComputedStyle(host).blockSize) : before
  if (Math.abs(before - after) > 1) {
    resize = createAnimator(host).animate('height', [{ blockSize: before + 'px' }, { blockSize: after + 'px' }], { role: 'move', fill: 'backwards' })
    startLayoutCompanion(host, resize, next ? entry : leaving?.animation)
  }
}

watch(() => [host.value, palette.value, props.spec, props.config, props.mode, props.renderer] as const,
  async ([node, colors, source, config, mode, renderer], _, cleanup) => {
    if (!node || !colors.length) return
    let superseded = false
    let committed = false
    const target = node.ownerDocument.createElement('div')
    target.className = 'sy-vega-chart__view'
    target.dataset.vegaLayer = 'pending'
    target.inert = true
    target.setAttribute('aria-hidden', 'true')
    entry?.cancel()
    finishLeave()
    if (painted) {
      if (painted.target.contains(node.ownerDocument.activeElement)) node.focus({ preventScroll: true })
      painted.target.inert = true
      painted.target.setAttribute('aria-hidden', 'true')
    }
    node.append(target)
    current.value = undefined
    status.value = 'loading'
    cleanup(() => {
      superseded = true
      if (!committed) target.remove()
    })

    try {
      const spec = JSON.parse(typeof source === 'string' ? source : JSON.stringify(source)) as VegaChartSpec
      if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new TypeError('Expected a Vega specification object')
      let library = mode
      if (!library && spec.$schema !== undefined) {
        const schema = parseVegaSchema(spec.$schema)
        if (!schema.ok) throw new TypeError(schema.error)
        library = schema.library
      }
      const { default: embed } = await import('vega-embed')
      if (superseded) return
      const [background, color, muted, border, ...categorical] = colors
      const result = await embed(target, { ...spec, usermeta: undefined }, {
        mode: library, renderer, actions: false, defaultStyle: false, ast: true,
        config: {
          background,
          font: 'Arial, sans-serif',
          ...config,
          axis: { labelColor: muted, titleColor: color, domainColor: border, gridColor: border, tickColor: border, ...config?.axis },
          legend: { labelColor: color, titleColor: color, ...config?.legend },
          title: { color, ...config?.title },
          range: { category: categorical, ...config?.range },
        } as VegaChartConfig,
      })
      if (superseded) { result.finalize(); return }
      committed = true
      current.value = result
      status.value = 'ready'
      present(node, { target, result })
      emit('ready', result.view)
    } catch (error) {
      if (superseded) return
      status.value = 'error'
      target.remove()
      present(node)
      emit('error', error)
    }
  }, { flush: 'post' })

function getView(): View | undefined { return current.value?.view }
defineExpose({ getView })
</script>

<template>
  <figure class="sy-vega-chart" :aria-label="label" :aria-busy="status === 'loading'" :style="{ '--sy-vega-height': minHeight }">
    <figcaption v-if="description">{{ description }}</figcaption>
    <div class="sy-vega-chart__stage">
      <div ref="host" class="sy-vega-chart__host" tabindex="-1" />
      <Transition name="sy-vega-status">
        <p v-if="status === 'loading'" class="sy-vega-chart__status" role="status">
          <span class="sy-vega-chart__message"><SSpinner size="sm" decorative />{{ loadingLabel }}</span>
        </p>
        <div v-else-if="status === 'error'" class="sy-vega-chart__status" role="status">
          <div class="sy-vega-chart__message"><slot name="error">{{ errorLabel }}</slot></div>
        </div>
      </Transition>
    </div>
    <slot v-if="$slots.data" name="data" />
  </figure>
</template>
