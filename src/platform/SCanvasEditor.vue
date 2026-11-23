<script lang="ts">
export interface CanvasLayer {
  id: string; label: string; kind: 'text' | 'shape' | 'image'; x: number; y: number; width: number; height: number
  text?: string; fill: string; opacity?: number; fontSize?: number; src?: string; blur?: number; contrast?: number; rotation?: number
}
export interface CanvasDocument { id: string; label: string; width: number; height: number; layers: readonly CanvasLayer[] }
</script>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import SButton from '../components/SButton.vue'
import SInput from '../components/SInput.vue'
import SNumberStepper from '../components/SNumberStepper.vue'
import SSlider from '../components/SSlider.vue'
import { createPanGesture } from '../internal/pan-gesture'
import { createTransformGesture } from '../internal/transform-gesture'
import { contentUrl } from '../internal/content-url'

const props = defineProps<{
  label: string
  labels?: Partial<Record<'documents' | 'layers' | 'properties' | 'zoom' | 'x' | 'y' | 'size' | 'text' | 'opacity' | 'blur' | 'contrast' | 'rotation' | 'empty', string>>
}>()
const documents = defineModel<readonly CanvasDocument[]>({ required: true })
const documentId = defineModel<string>('document')
const selected = defineModel<string>('layer')
const zoom = ref(80)
const gestureZoom = ref<number>()
const dragging = ref(false)
const scale = computed(() => (gestureZoom.value ?? zoom.value) / 100)
const board = useTemplateRef<HTMLElement>('board')
const active = computed(() => documents.value.find(document => document.id === documentId.value) ?? documents.value[0])
const layer = computed(() => active.value?.layers.find(item => item.id === selected.value) ?? active.value?.layers[0])
const text = computed(() => ({ documents: 'Documents', layers: 'Layers', properties: 'Properties', zoom: 'Zoom', x: 'Horizontal position',
  y: 'Vertical position', size: 'Font size', text: 'Text', opacity: 'Opacity', blur: 'Blur', contrast: 'Contrast',
  rotation: 'Rotation', empty: 'No artboard selected', ...props.labels }))

function angle(value: number) {
  return Number.isFinite(value) ? ((Math.round(value) + 180) % 360 + 360) % 360 - 180 : 0
}
function filter(item: CanvasLayer) {
  const blur = Number.isFinite(item.blur) ? Math.max(0, item.blur!) : 0
  const contrast = Number.isFinite(item.contrast) ? Math.max(0, item.contrast!) : 100
  return blur || contrast !== 100 ? `blur(${blur}px) contrast(${contrast}%)` : undefined
}

function activate(id: string) { documentId.value = id; selected.value = undefined }
function patch(id: string, values: Partial<CanvasLayer>) {
  documents.value = documents.value.map(document => document.id === active.value?.id
    ? { ...document, layers: document.layers.map(item => item.id === id ? { ...item, ...values } : item) } : document)
}
function position(item: CanvasLayer, x: number, y: number) {
  const document = active.value
  if (!document) return
  const limit = (value: number, span: number) => Number.isFinite(value) ? Math.round(Math.max(0, Math.min(span, value))) : 0
  patch(item.id, { x: limit(x, document.width - item.width), y: limit(y, document.height - item.height) })
}
function nudge(item: CanvasLayer, event: KeyboardEvent) {
  const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  const movement = arrows[event.key]
  if (!movement || event.altKey || event.ctrlKey || event.metaKey) return
  event.preventDefault()
  const step = event.shiftKey ? 10 : 1
  selected.value = item.id
  position(item, item.x + step * movement[0], item.y + step * movement[1])
}
watch([board, () => active.value?.id], ([root], _, cleanup) => {
  if (!root) return
  dragging.value = false
  gestureZoom.value = undefined
  let origin: CanvasLayer | undefined
  let transform: { layer: CanvasLayer; zoom: number } | undefined
  let ignorePan = false
  function itemAt(event: PointerEvent) {
    const node = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-canvas-layer]') : undefined
    return active.value?.layers.find(item => item.id === node?.dataset.canvasLayer)
  }
  const removePan = createPanGesture(root, {
    threshold: 4,
    shouldStart(event) {
      if (transform) return false
      ignorePan = false
      origin = itemAt(event)
      return Boolean(origin)
    },
    onStart() { if (origin && !ignorePan) { selected.value = origin.id; dragging.value = true } },
    onMove({ x, y }) { if (origin && !ignorePan) position(origin, origin.x + x / scale.value, origin.y + y / scale.value) },
    onEnd(_, __, cancelled) {
      if (origin && cancelled && !ignorePan) position(origin, origin.x, origin.y)
      origin = undefined
      ignorePan = false
      if (!transform) dragging.value = false
    },
  })
  const removeTransform = createTransformGesture(root, {
    shouldStart: event => Boolean(itemAt(event)),
    onStart() {
      const item = origin ?? layer.value
      if (!item) return
      if (origin && dragging.value) position(origin, origin.x, origin.y)
      transform = { layer: item, zoom: zoom.value }
      ignorePan = true
      dragging.value = true
      selected.value = item.id
    },
    onMove({ rotation, scale }) {
      if (!transform) return
      gestureZoom.value = Math.min(140, Math.max(40, transform.zoom * scale))
      patch(transform.layer.id, { rotation: angle((transform.layer.rotation ?? 0) + rotation * 180 / Math.PI) })
    },
    onEnd(_, __, cancelled) {
      if (!transform) return
      if (!cancelled && gestureZoom.value !== undefined) zoom.value = Math.round(gestureZoom.value / 10) * 10
      if (cancelled) patch(transform.layer.id, { rotation: transform.layer.rotation })
      gestureZoom.value = undefined
      transform = undefined
      dragging.value = false
    },
  })
  cleanup(() => { removePan(); removeTransform() })
}, { flush: 'post', immediate: true })
</script>

<template>
  <section class="sy-canvas-editor" :aria-label="label">
    <header class="sy-canvas-editor__tools">
      <div role="group" :aria-label="text.documents">
        <SButton v-for="document in documents" :key="document.id" size="sm" variant="secondary" :aria-pressed="document.id === active?.id"
          @click="activate(document.id)">{{ document.label }}</SButton>
      </div>
      <SSlider v-model="zoom" :label="text.zoom" :min="40" :max="140" :step="10" :format-options="{ maximumFractionDigits: 0 }" />
    </header>
    <div v-if="active" class="sy-canvas-editor__grid">
      <aside class="sy-canvas-editor__pane" :aria-label="text.layers">
        <h3>{{ text.layers }}</h3>
        <SButton v-for="item in active.layers" :key="item.id" size="sm" variant="ghost" :aria-pressed="layer?.id === item.id" @click="selected = item.id">{{ item.label }}</SButton>
      </aside>
      <div class="sy-canvas-editor__viewport" role="region" :aria-label="active.label" tabindex="0">
        <div :style="{ width: active.width * scale + 'px', height: active.height * scale + 'px' }" class="sy-canvas-editor__frame">
          <div ref="board" class="sy-canvas-editor__board" :data-dragging="dragging || undefined" :style="{ width: active.width + 'px', height: active.height + 'px', transform: `scale(${scale})` }">
            <button v-for="item in active.layers" :key="item.id" type="button" class="sy-canvas-editor__layer" :aria-label="item.label"
              :aria-pressed="layer?.id === item.id" :data-canvas-layer="item.id" :data-kind="item.kind" @click="selected = item.id" @keydown="nudge(item, $event)"
              :style="{ left: item.x + 'px', top: item.y + 'px', width: item.width + 'px', height: item.height + 'px', rotate: angle(item.rotation ?? 0) + 'deg' }">
              <span class="sy-canvas-editor__paint" aria-hidden="true"
                :style="{ color: item.kind === 'text' ? item.fill : undefined, background: item.kind === 'text' ? 'transparent' : item.fill,
                  opacity: item.opacity ?? 1, fontSize: (item.fontSize ?? 16) + 'px', filter: filter(item) }">
                <img v-if="item.kind === 'image' && contentUrl(item.src, true)" :src="contentUrl(item.src, true)" alt="" draggable="false">
                <template v-else>{{ item.text }}</template>
              </span>
            </button>
          </div>
        </div>
      </div>
      <aside v-if="layer" class="sy-canvas-editor__pane" :aria-label="text.properties">
        <h3>{{ text.properties }}</h3>
        <SNumberStepper :model-value="layer.x" :label="text.x" :min="0" :max="Math.max(0, active.width - layer.width)" @update:model-value="value => value !== undefined && position(layer!, value, layer!.y)" />
        <SNumberStepper :model-value="layer.y" :label="text.y" :min="0" :max="Math.max(0, active.height - layer.height)" @update:model-value="value => value !== undefined && position(layer!, layer!.x, value)" />
        <SInput v-if="layer.kind === 'text'" :model-value="layer.text" :label="text.text" @update:model-value="value => patch(layer!.id, { text: value })" />
        <SNumberStepper v-if="layer.kind === 'text'" :model-value="layer.fontSize ?? 16" :label="text.size" :min="10" :max="42"
          @update:model-value="value => value !== undefined && patch(layer!.id, { fontSize: value })" />
        <SSlider :model-value="Math.round((layer.opacity ?? 1) * 100)" :label="text.opacity" :min="0" :max="100"
          @update:model-value="value => typeof value === 'number' && patch(layer!.id, { opacity: value / 100 })" />
        <SNumberStepper :model-value="layer.blur ?? 0" :label="text.blur" :min="0" :max="16"
          @update:model-value="value => value !== undefined && patch(layer!.id, { blur: value })" />
        <SNumberStepper :model-value="layer.contrast ?? 100" :label="text.contrast" :min="0" :max="200" :step="5"
          @update:model-value="value => value !== undefined && patch(layer!.id, { contrast: value })" />
        <SNumberStepper :model-value="layer.rotation ?? 0" :label="text.rotation" :min="-180" :max="179"
          @update:model-value="value => value !== undefined && patch(layer!.id, { rotation: angle(value) })" />
      </aside>
    </div>
    <p v-else role="status">{{ text.empty }}</p>
  </section>
</template>
