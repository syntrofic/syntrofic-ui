<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { initialSpatialView, mountSpatialChart, spatialView, type SpatialMark, type SpatialPoint, type SpatialStyle, type SpatialView } from '../charts/spatial'
import { drawSpatialSvg, projectSpatialAxes } from '../charts/spatial-svg'
import { watchChartPalette } from '../charts/dom-palette'
import { useSpatialCamera } from '../charts/spatial-camera'
import { clamp, finite, numberAt } from '../charts/values'
import { createPanGesture } from '../internal/pan-gesture'
import { useShellMeasurement } from '../internal/shell-layout'
import SButton from './SButton.vue'
import SDisclosure from './SDisclosure.vue'
import SMotionText from './SMotionText.vue'
import SSkeleton from './SSkeleton.vue'
import SSpinner from './SSpinner.vue'

const props = withDefaults(defineProps<SpatialStyle & {
  data: readonly SpatialPoint[]
  label: string
  mark?: SpatialMark
  height?: number
  showData?: boolean
  dataLabel?: string
  controlsLabel?: string
  rotateLeftLabel?: string
  rotateRightLabel?: string
  resetLabel?: string
  unavailableLabel?: string
  interactive?: boolean
  autoRotate?: number
  animate?: boolean
  loading?: boolean
  loadingText?: string
  emptyText?: string
  error?: string
  retry?: () => void
  retryLabel?: string
  renderer?: 'auto' | 'svg' | 'webgl'
  axisLabels?: Partial<Record<'x' | 'y' | 'z', string>>
}>(), { mark: 'scatter', height: 240, showData: true, dataLabel: 'View data', controlsLabel: '3D view controls', renderer: 'auto',
  rotateLeftLabel: 'Rotate left', rotateRightLabel: 'Rotate right', resetLabel: 'Reset view', unavailableLabel: '3D rendering is unavailable.',
  interactive: true, animate: true, loadingText: 'Loading chart data', emptyText: 'No data to display', retryLabel: 'Retry' })
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const host = useTemplateRef<HTMLDivElement>('host')
const status = useTemplateRef<HTMLDivElement>('status')
const engine = shallowRef<ReturnType<typeof mountSpatialChart>>()
const unavailable = shallowRef(false)
const dataOpen = shallowRef(false)
const dataRevision = shallowRef(0)
const height = computed(() => Number.isFinite(props.height) ? Math.max(100, props.height) : 240)
const palette = shallowRef<string[]>()
const view = defineModel<SpatialView>('view')
const defaultView = shallowRef<SpatialView>({ ...initialSpatialView })
const pose = computed(() => spatialView(view.value ?? defaultView.value))
const gpu = computed(() => props.renderer !== 'svg' && Boolean(engine.value) && !unavailable.value)
const svg = computed(() => props.renderer !== 'webgl' && !gpu.value)
const hasData = computed(() => props.data.some(point => finite(point.x) && finite(point.y) && finite(point.z)))
const state = computed(() => props.loading ? 'loading' : props.error ? 'error' : !hasData.value ? 'empty'
  : !svg.value && !gpu.value ? unavailable.value ? 'unavailable' : 'initializing' : 'ready')
const canInteract = computed(() => props.interactive && state.value === 'ready')
const hovered = shallowRef(false)
const focused = shallowRef(false)
const interacting = shallowRef(false)
const spin = computed(() => numberAt(props.autoRotate, 0))
const camera = useSpatialCamera(host, pose, () => props.animate && state.value === 'ready' && !hovered.value && !focused.value && !interacting.value ? spin.value : 0,
  () => props.animate)
const width = useShellMeasurement(host, node => node.clientWidth)
const svgWidth = computed(() => Math.max(1, width.value ?? 600))
const coordinates = ['x', 'y', 'z'] as const
const spatialStyle = computed<SpatialStyle>(() => ({ domains: props.domains, opacity: props.opacity, barWidth: props.barWidth, pointSize: props.pointSize, wireframe: props.wireframe }))
const fallbackPalette = ['#577364', '#607e93', '#818880']
const drawing = computed(() => svg.value && hasData.value ? drawSpatialSvg(props.data, props.mark, palette.value ?? fallbackPalette,
  spatialStyle.value, camera.displayed.value, svgWidth.value, height.value) : undefined)
const axes = computed(() => props.axisLabels && hasData.value && (svg.value || gpu.value)
  ? projectSpatialAxes(camera.displayed.value, svgWidth.value, height.value) : undefined)

function changeView(value: SpatialView, immediate = false) {
  const next = spatialView(value)
  if (immediate) camera.jump(next)
  else camera.settle(next)
  defaultView.value = next
  view.value = next
}
function rotate(azimuth: number, elevation = 0) {
  if (!canInteract.value) return
  const current = camera.destination()
  changeView({ ...current, azimuth: current.azimuth + azimuth, elevation: current.elevation + elevation })
}
function reset() { if (canInteract.value) changeView({ ...initialSpatialView }) }
function keyboard(event: KeyboardEvent) {
  if (!canInteract.value || event.altKey || event.ctrlKey || event.metaKey) return
  const step = Math.PI / 18
  switch (event.key) {
    case 'ArrowLeft': rotate(-step); break
    case 'ArrowRight': rotate(step); break
    case 'ArrowUp': rotate(0, step); break
    case 'ArrowDown': rotate(0, -step); break
    case 'Home': reset(); break
    case '+': case '=': case '-': {
      const current = camera.destination()
      changeView({ ...current, distance: current.distance * (event.key === '-' ? 1.18 : 1 / 1.18) })
      break
    }
    default: return
  }
  event.preventDefault()
}
function wheel(event: WheelEvent) {
  if (!svg.value || !canInteract.value || event.ctrlKey || !event.deltaY) return
  event.preventDefault()
  const current = camera.destination()
  changeView({ ...current, distance: current.distance * Math.exp(event.deltaY * .001) })
}
function interaction(active: boolean) {
  interacting.value = active
  if (active) camera.stop()
}
function leaveFocus(event: FocusEvent) {
  focused.value = event.relatedTarget instanceof Node && (event.currentTarget as HTMLElement).contains(event.relatedTarget)
}
watch(canvas, (node, _, cleanup) => {
  if (!node) return
  unavailable.value = false
  let active: ReturnType<typeof mountSpatialChart>
  try { active = mountSpatialChart(node, {
    contextLost: lost => { unavailable.value = lost; if (lost) interaction(false) },
    changeView: value => changeView(value, true), interacting: interaction,
  }) }
  catch { unavailable.value = true; return }
  engine.value = active
  cleanup(() => { active.dispose(); engine.value = undefined; interaction(false) })
}, { flush: 'post' })
watch(host, (node, _, cleanup) => {
  if (!node) return
  const stopTheme = watchChartPalette(node, ['chart-sage', 'chart-blue', 'border-strong'], colors => { palette.value = colors })
  let initial = camera.displayed.value
  const stopPan = createPanGesture(node, {
    shouldStart: () => svg.value && canInteract.value,
    onStart: () => { interaction(true); initial = camera.displayed.value },
    onMove: ({ x, y }) => { if (svg.value && canInteract.value) changeView({ ...initial, azimuth: initial.azimuth - x * .01, elevation: initial.elevation + y * .01 }, true) },
    onEnd: () => interaction(false),
  })
  cleanup(() => { stopTheme(); stopPan() })
}, { flush: 'post' })
watch([engine, camera.displayed], ([active, position]) => active?.setView(position))
watch([engine, canInteract], ([active, enabled]) => active?.setInteractive(enabled))
watch(() => props.data, () => { dataRevision.value++ })
watch([engine, palette, () => props.data, () => props.mark, spatialStyle, () => props.animate], ([active, colors, data, mark, style, animate]) => {
  const [primary, secondary, border] = colors ?? fallbackPalette
  active?.drawData(data, mark, primary, secondary, border, style, animate)
})
watch(state, () => {
  const notice = status.value
  if (notice?.contains(notice.ownerDocument.activeElement)) host.value?.focus({ preventScroll: true })
})
function leaveStatus(element: Element) {
  element.setAttribute('aria-hidden', 'true')
  element.setAttribute('inert', '')
}
</script>

<template>
  <figure class="sy-spatial-chart" :aria-label="label" :data-spatial-state="state" :data-animated="animate || undefined"
    @pointerenter="hovered = true" @pointerleave="hovered = false" @focusin="focused = true" @focusout="leaveFocus">
    <div class="sy-spatial-chart__display" :style="{ '--sy-spatial-height': height + 'px' }">
      <div ref="host" class="sy-spatial-chart__view" role="img" :aria-label="label"
        :tabindex="interactive || spin ? 0 : -1" :aria-busy="state === 'loading' || state === 'initializing' || undefined"
        :aria-keyshortcuts="interactive ? 'ArrowLeft ArrowRight ArrowUp ArrowDown Home Plus Minus' : undefined"
        :data-interactive="canInteract || undefined" @wheel="wheel" @keydown="keyboard">
        <Transition name="sy-spatial-renderer" :css="animate">
          <canvas v-if="renderer !== 'svg'" ref="canvas" aria-hidden="true" :data-rendered="gpu || undefined" />
        </Transition>
        <Transition name="sy-spatial-renderer" :css="animate">
          <svg v-if="drawing" class="sy-spatial-chart__svg" :viewBox="`0 0 ${svgWidth} ${height}`" aria-hidden="true">
            <path :d="drawing.grid" stroke="var(--sy-border-strong)" stroke-opacity=".48" fill="none" />
            <Transition name="sy-spatial-renderer" :css="animate">
              <g :key="`${mark}-${dataRevision}`" :opacity="clamp(numberAt(opacity, 1), 0, 1)">
                <template v-for="shape in drawing.shapes" :key="shape.key">
                  <path v-if="'path' in shape" :d="shape.path" :fill="wireframe && mark === 'surface' ? 'none' : shape.color" :stroke="shape.color" />
                  <circle v-else :cx="shape.x" :cy="shape.y" :r="shape.radius" :fill="shape.color" />
                </template>
              </g>
            </Transition>
          </svg>
        </Transition>
        <Transition name="sy-spatial-renderer" :css="animate">
          <svg v-if="axes" class="sy-spatial-chart__axes" :viewBox="`0 0 ${svgWidth} ${height}`" aria-hidden="true">
            <text v-for="(point, axis) in axes" :key="axis" :x="point.x" :y="point.y">{{ axisLabels?.[axis] }}</text>
          </svg>
        </Transition>
      </div>
      <Transition name="sy-chart-feedback" :css="animate" @before-leave="leaveStatus">
        <div v-if="state !== 'ready'" :key="state" ref="status" class="sy-spatial-chart__status">
          <SSkeleton v-if="(!hasData && state === 'loading') || state === 'initializing'" class="sy-spatial-chart__skeleton"
            width="min(44%, 15rem)" height="min(calc(var(--sy-spatial-height) * .36), 7rem)" :animated="animate" aria-hidden="true" />
          <SSpinner v-if="state === 'loading' || state === 'initializing'" :label="loadingText" size="sm">{{ loadingText }}</SSpinner>
          <div v-else-if="state === 'error'" class="sy-spatial-chart__error">
            <span role="alert">{{ error }}</span>
            <SButton v-if="retry" size="sm" variant="secondary" @click="retry">{{ retryLabel }}</SButton>
          </div>
          <span v-else role="status">{{ state === 'unavailable' ? unavailableLabel : emptyText }}</span>
        </div>
        <p v-else-if="unavailable && renderer === 'auto'" key="fallback" class="sy-spatial-chart__fallback" role="status">{{ unavailableLabel }}</p>
      </Transition>
    </div>
    <div v-if="interactive" class="sy-spatial-chart__controls" role="group" :aria-label="controlsLabel">
      <SButton size="sm" variant="secondary" :aria-disabled="!canInteract || undefined" @click="rotate(-.25)">{{ rotateLeftLabel }}</SButton>
      <SButton size="sm" variant="secondary" :aria-disabled="!canInteract || undefined" @click="rotate(.25)">{{ rotateRightLabel }}</SButton>
      <SButton size="sm" variant="ghost" :aria-disabled="!canInteract || undefined" @click="reset">{{ resetLabel }}</SButton>
    </div>
    <SDisclosure v-if="showData || unavailable" v-model:open="dataOpen" :title="dataLabel">
      <table :aria-label="label">
        <thead><tr><th v-for="axis in coordinates" :key="axis" scope="col">{{ axisLabels?.[axis] ?? axis.toUpperCase() }}</th></tr></thead>
        <tbody v-if="dataOpen">
          <tr v-for="point in data" :key="point.id" :aria-label="point.label">
            <td v-for="axis in coordinates" :key="axis">
              <SMotionText v-if="animate" :value="String(point[axis])" motion="roll" />
              <template v-else>{{ point[axis] }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </SDisclosure>
  </figure>
</template>
