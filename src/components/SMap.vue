<script setup lang="ts">
import { prefersReducedMotion } from '../internal/reduced-motion'
import type { GeoJSONSource, Map as LibreMap, MapMouseEvent, MapOptions, Marker, Popup } from 'maplibre-gl'
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import SButton from './SButton.vue'
import SMotionText from './SMotionText.vue'
import SSpinner from './SSpinner.vue'
import {
  arcCoordinates, clusterLayer, routeLayer, validLocation, type MapArcSpec, type MapClusterSpec, type MapFeature, type MapLayerSet,
  type MapLocation, type MapMarkerSpec, type MapPopupSpec, type MapRouteSpec, type MapStyle, type MapViewport,
} from '../map/layers'

type Control = 'zoom' | 'compass' | 'locate' | 'fullscreen'
type Labels = { zoomIn: string; zoomOut: string; compass: string; locate: string; fullscreen: string; exit: string; close: string; retry: string }
const props = withDefaults(defineProps<{
  label: string
  center?: MapLocation
  zoom?: number
  mapStyle?: MapStyle
  styles?: { light?: MapStyle; dark?: MapStyle }
  theme?: 'light' | 'dark'
  options?: Omit<MapOptions, 'container' | 'style'>
  workerUrl?: string
  markers?: readonly MapMarkerSpec[]
  routes?: readonly MapRouteSpec[]
  arcs?: readonly MapArcSpec[]
  clusters?: readonly MapClusterSpec[]
  layers?: readonly MapLayerSet[]
  interactiveLayers?: readonly string[]
  popup?: MapPopupSpec
  controls?: readonly Control[]
  controlsPosition?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
  labels?: Partial<Labels>
  clusterLabel?: (count: number) => string
  loading?: boolean
  height?: string
  loadingText?: string
  errorText?: string
  locationErrorText?: string
}>(), {
  markers: () => [], routes: () => [], arcs: () => [], clusters: () => [], layers: () => [], interactiveLayers: () => [],
  controls: () => ['zoom', 'compass'], controlsPosition: 'bottom-end', height: '23rem',
  loadingText: 'Loading map', errorText: 'Map unavailable', locationErrorText: 'Location unavailable',
})

const emit = defineEmits<{
  ready: [map: LibreMap]
  move: [viewport: MapViewport]
  error: [error: unknown]
  markerPress: [marker: MapMarkerSpec, event: MouseEvent]
  markerMove: [id: string, location: MapLocation]
  featurePress: [feature: MapFeature, event: MapMouseEvent]
  popupClose: []
}>()
const viewport = defineModel<Partial<MapViewport>>('viewport')
const selected = defineModel<string | null>('selected')
const component = getCurrentInstance()
defineSlots<{
  marker(props: { marker: MapMarkerSpec; open: boolean }): unknown
  popup(props: { marker?: MapMarkerSpec; popup: MapPopupSpec; close: () => void }): unknown
  controls(props: { map: LibreMap | undefined }): unknown
  fallback(props: { error?: unknown; retry: () => void }): unknown
  attribution(): unknown
}>()

type MapModule = typeof import('maplibre-gl')
type MarkerEntry = { marker: MapMarkerSpec; instance: Marker; host: HTMLDivElement }
type ActivePopup = { id?: string; marker?: MapMarkerSpec; spec: MapPopupSpec }
type ClusterEntry = { key: string; instance: Marker; host: HTMLButtonElement }
const root = useTemplateRef<HTMLElement>('root')
const canvas = useTemplateRef<HTMLDivElement>('canvas')
const id = `sy-map-${useId()}`
const map = shallowRef<LibreMap>()
const markerEntries = shallowRef<MarkerEntry[]>([])
const popupHost = shallowRef<HTMLDivElement>()
const popupContent = shallowRef<ActivePopup>()
const popupClosing = ref(false)
const ready = ref(false)
const failure = shallowRef<unknown>()
const locationFailure = ref(false)
const located = ref(false)
const fullscreen = ref(false)
const canFullscreen = ref(false)
const theme = ref<'light' | 'dark'>('light')
const dismissed = shallowRef<MapPopupSpec>()
const labels = computed<Labels>(() => ({
  zoomIn: 'Zoom in', zoomOut: 'Zoom out', compass: 'Reset north', locate: 'Locate me', fullscreen: 'Full screen',
  exit: 'Exit full screen', close: 'Close', retry: 'Retry', ...props.labels,
}))
const waiting = computed(() => !failure.value && (!ready.value || props.loading))
const blank: MapStyle = { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e7e8dd' } }] }
const activeTheme = computed(() => props.theme ?? theme.value)
const style = computed(() => props.mapStyle ?? props.styles?.[activeTheme.value] ?? props.styles?.light ?? props.styles?.dark ?? blank)
const activePopup = computed<ActivePopup | undefined>(() => {
  const marker = props.markers.find(item => item.id === selected.value && validLocation(item.location))
  if (marker) return { id: marker.id, marker, spec: { location: marker.location, title: marker.label, detail: marker.detail } }
  if (props.popup && props.popup !== dismissed.value && validLocation(props.popup.location)) return { spec: props.popup }
})
let runtime: MapModule | undefined
let popup: Popup | undefined
let popupIdentity: string | undefined
let generation = 0
let restoring = false
let focusPopup = false
let emittedReady: LibreMap | undefined
let themeObserver: MutationObserver | undefined
let media: MediaQueryList | undefined
let observer: ResizeObserver | undefined
let resizeFrame: number | undefined
let managed: MapLayerSet[] = []
let clusterMarkers = new Map<string, ClusterEntry>()
const clusterSources = computed(() => props.clusters.map(cluster => `${id}-cluster-${cluster.id}`))

function current(instance: LibreMap): MapViewport {
  const { lng, lat } = instance.getCenter()
  return { center: [lng, lat], zoom: instance.getZoom(), bearing: instance.getBearing(), pitch: instance.getPitch() }
}

function report(error: unknown, fatal = false) {
  if (fatal) failure.value = error
  emit('error', error)
}

function measureTheme() {
  const node = root.value
  if (!node) return
  const explicit = node.closest('[data-sy-theme]')?.getAttribute('data-sy-theme')
  theme.value = explicit === 'light' || explicit === 'dark' ? explicit : media?.matches ? 'dark' : 'light'
}

function motionDuration() {
  return root.value && prefersReducedMotion(root.value) ? 0 : 300
}

function removeLayers(instance: LibreMap) {
  for (const group of [...managed].reverse()) {
    for (const layer of [...group.layers].reverse()) if (instance.getLayer(layer.id)) instance.removeLayer(layer.id)
    if (instance.getSource(group.sourceId)) instance.removeSource(group.sourceId)
  }
  managed = []
  for (const marker of clusterMarkers.values()) marker.instance.remove()
  clusterMarkers = new Map()
}

function syncLayers() {
  const instance = map.value
  if (!instance || !ready.value) return
  removeLayers(instance)
  const accent = activeTheme.value === 'dark' ? '#aabcd0' : '#526c62'
  const routes = props.routes.map(route => routeLayer(`${id}-route`, route, accent))
  const arcs = props.arcs.map(arc => validLocation(arc.from) && validLocation(arc.to)
    ? routeLayer(`${id}-arc`, { ...arc, coordinates: arcCoordinates(arc.from, arc.to) }, accent) : undefined)
  const groups = props.clusters.map(cluster => clusterLayer(id, cluster, accent))
  for (const group of [...props.layers, ...routes, ...arcs, ...groups]) {
    if (!group) continue
    try {
      if (instance.getSource(group.sourceId) || group.layers.some(layer => instance.getLayer(layer.id))) {
        throw new Error(`Map source or layer already exists for ${group.sourceId}`)
      }
      instance.addSource(group.sourceId, group.source)
      managed.push(group)
      for (const layer of group.layers) instance.addLayer(layer, group.before && instance.getLayer(group.before) ? group.before : undefined)
    } catch (error) { report(error) }
  }
}

function syncMarkers() {
  const instance = map.value
  const document = root.value?.ownerDocument
  if (!instance || !runtime || !document) return
  const previous = new Map(markerEntries.value.map(entry => [entry.marker.id, entry]))
  const entries: MarkerEntry[] = []
  for (const marker of props.markers) {
    if (!validLocation(marker.location)) continue
    const entry = previous.get(marker.id)
    if (entry) {
      previous.delete(marker.id)
      entry.instance.setLngLat(marker.location).setDraggable(Boolean(marker.draggable))
      entries.push({ ...entry, marker })
      continue
    }
    const host = document.createElement('div')
    host.className = 'sy-map__marker'
    const engineMarker = new runtime.Marker({ element: host, draggable: marker.draggable, anchor: 'center' })
    engineMarker.setLngLat(marker.location).addTo(instance)
    engineMarker.on('dragend', () => {
      const { lng, lat } = engineMarker.getLngLat()
      emit('markerMove', marker.id, [lng, lat])
    })
    entries.push({ host, instance: engineMarker, marker })
  }
  for (const entry of previous.values()) entry.instance.remove()
  markerEntries.value = entries
}

function expansion(instance: LibreMap, feature: MapFeature, sourceId: string, trigger: HTMLButtonElement) {
  const source = instance.getSource<GeoJSONSource>(sourceId)
  if (!source || feature.geometry.type !== 'Point') return
  const point = feature.geometry.coordinates as MapLocation
  void source.getClusterExpansionZoom(Number(feature.properties.cluster_id)).then(zoom => {
    if (map.value !== instance || instance.getSource(sourceId) !== source) return
    if (trigger.ownerDocument.activeElement === trigger) instance.getCanvas().focus({ preventScroll: true })
    instance.easeTo({ center: point, zoom, duration: motionDuration() })
  }).catch(report)
}

function syncClusters() {
  const instance = map.value
  const document = root.value?.ownerDocument
  if (!ready.value || !instance || !runtime || !document) return
  const active = new Set<string>()
  const sources = clusterSources.value
  for (const source of sources) {
    const layer = `${source}-group`
    if (!instance.getLayer(layer)) continue
    for (const feature of instance.queryRenderedFeatures({ layers: [layer] })) {
      if (feature.geometry.type !== 'Point') continue
      const clusterId = feature.properties.cluster_id
      const key = `${source}:${clusterId}`
      if (active.has(key)) continue
      active.add(key)
      let entry = clusterMarkers.get(key)
      if (!entry) {
        const host = document.createElement('button')
        host.type = 'button'
        host.className = 'sy-map__cluster'
        const cluster = new runtime.Marker({ element: host, anchor: 'center' })
        host.addEventListener('click', event => {
          event.stopPropagation()
          expansion(instance, feature, source, host)
        })
        entry = { key, instance: cluster, host }
        clusterMarkers.set(key, entry)
        cluster.setLngLat(feature.geometry.coordinates as MapLocation).addTo(instance)
      }
      const count = Number(feature.properties.point_count)
      entry.host.textContent = String(count)
      entry.host.setAttribute('aria-label', props.clusterLabel?.(count) ?? `${count} locations, zoom in`)
      entry.instance.setLngLat(feature.geometry.coordinates as MapLocation)
    }
  }
  for (const [key, entry] of clusterMarkers) {
    if (!active.has(key)) {
      entry.instance.remove()
      clusterMarkers.delete(key)
    }
  }
}

function restoreFocus(markerId?: string) {
  const entry = markerEntries.value.find(item => item.marker.id === markerId)
  const destination = entry?.host.querySelector<HTMLElement>('button') ?? map.value?.getCanvas()
  destination?.focus({ preventScroll: true })
}

function closePopup(returnFocus = true) {
  const active = activePopup.value
  if (!active) return
  if (active.marker) selected.value = null
  else dismissed.value = props.popup
  emit('popupClose')
  if (returnFocus) restoreFocus(active.id)
}

function markerPress(marker: MapMarkerSpec, event: MouseEvent) {
  emit('markerPress', marker, event)
  if (event.defaultPrevented || !(marker.detail || props.popup || marker.label)) return
  if (selected.value === marker.id) closePopup(false)
  else {
    focusPopup = event.detail === 0
    selected.value = marker.id
  }
}

function syncPopup() {
  const instance = map.value
  const active = activePopup.value
  const identity = active?.id ?? 'standalone'
  const document = root.value?.ownerDocument
  if (!instance || !runtime || !active || !document || !ready.value) {
    if (popupHost.value) popupClosing.value = true
    return
  }
  if (!popup) {
    const host = document.createElement('div')
    host.className = 'sy-map__popup-content'
    popupHost.value = host
    popup = new runtime.Popup({ closeButton: false, closeOnClick: false, focusAfterOpen: false, offset: 14, className: 'sy-map__popup' })
      .setDOMContent(host).setLngLat(active.spec.location).addTo(instance)
  } else if (identity !== popupIdentity || popupContent.value?.spec.location !== active.spec.location) popup.setLngLat(active.spec.location)
  popupIdentity = identity
  popupContent.value = active
  popupClosing.value = false
  if (focusPopup) {
    focusPopup = false
    void nextTick(() => popupHost.value?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true }))
  }
}

function removePopup() {
  popup?.remove()
  popup = undefined
  popupIdentity = undefined
  popupHost.value = undefined
  popupContent.value = undefined
}

function updateViewport() {
  const instance = map.value
  if (!instance || restoring) return
  const next = { center: props.center, zoom: props.zoom, ...viewport.value }
  const last = current(instance)
  const center = next.center && validLocation(next.center) ? next.center : last.center
  const zoom = Number.isFinite(next.zoom) ? next.zoom ?? last.zoom : last.zoom
  const pitch = Number.isFinite(next.pitch) ? next.pitch ?? last.pitch : last.pitch
  const bearing = Number.isFinite(next.bearing) ? next.bearing ?? last.bearing : last.bearing
  if (Math.abs(center[0] - last.center[0]) < 1e-7 && Math.abs(center[1] - last.center[1]) < 1e-7 &&
    Math.abs(zoom - last.zoom) < 1e-7 && Math.abs(pitch - last.pitch) < 1e-7 && Math.abs(bearing - last.bearing) < 1e-7) return
  restoring = true
  instance.jumpTo({ center, zoom, pitch, bearing })
  restoring = false
}

function onStyle(instance: LibreMap) {
  if (map.value !== instance) return
  failure.value = undefined
  ready.value = true
  syncLayers()
  syncPopup()
  if (emittedReady !== instance) {
    emittedReady = instance
    emit('ready', instance)
  }
}

function cleanup() {
  observer?.disconnect()
  if (resizeFrame !== undefined) canvas.value?.ownerDocument.defaultView?.cancelAnimationFrame(resizeFrame)
  resizeFrame = undefined
  for (const entry of markerEntries.value) entry.instance.remove()
  for (const entry of clusterMarkers.values()) entry.instance.remove()
  markerEntries.value = []
  clusterMarkers.clear()
  removePopup()
  const previous = map.value
  map.value = undefined
  previous?.remove()
  managed = []
  ready.value = false
}

async function boot() {
  const node = canvas.value
  if (!node) return
  const request = ++generation
  cleanup()
  failure.value = undefined
  locationFailure.value = false
  try {
    runtime ??= await import('maplibre-gl')
    if (request !== generation) return
    if (props.workerUrl) runtime.setWorkerUrl(props.workerUrl)
    const settings = { ...props.options, ...viewport.value }
    const instance = new runtime.Map({
      scrollZoom: false, ...settings, center: viewport.value?.center ?? props.center ?? props.options?.center,
      zoom: viewport.value?.zoom ?? props.zoom ?? props.options?.zoom, container: node, style: style.value,
    })
    map.value = instance
    instance.on('error', event => {
      if (map.value === instance) report(event.error, !ready.value && !instance.isStyleLoaded())
    })
    instance.on('style.load', () => onStyle(instance))
    instance.on('webglcontextlost', () => {
      if (map.value === instance) { ready.value = false; report(new Error('WebGL context lost'), true) }
    })
    instance.on('webglcontextrestored', () => onStyle(instance))
    instance.on('move', () => {
      if (map.value === instance) emit('move', current(instance))
    })
    instance.on('moveend', () => {
      if (map.value !== instance || restoring) return
      if (viewport.value !== undefined || component?.vnode.props?.['onUpdate:viewport']) viewport.value = current(instance)
      syncClusters()
    })
    instance.on('idle', syncClusters)
    instance.on('click', event => {
      const layers = props.interactiveLayers.filter(layer => instance.getLayer(layer))
      if (!layers.length) return
      const feature = instance.queryRenderedFeatures(event.point, { layers })[0]
      if (feature) emit('featurePress', feature, event)
    })
    syncMarkers()
    const view = node.ownerDocument.defaultView
    if (view?.ResizeObserver) {
      observer = new view.ResizeObserver(() => {
        if (resizeFrame !== undefined) return
        resizeFrame = view.requestAnimationFrame(() => {
          resizeFrame = undefined
          if (map.value === instance) instance.resize()
        })
      })
      observer.observe(node)
    }
  } catch (error) {
    if (request === generation) report(error, true)
  }
}

function locate() {
  const view = root.value?.ownerDocument.defaultView
  const instance = map.value
  if (!instance || located.value) return
  locationFailure.value = false
  if (!view?.navigator.geolocation) { locationFailure.value = true; return }
  located.value = true
  view.navigator.geolocation.getCurrentPosition(result => {
    located.value = false
    if (map.value === instance) instance.easeTo({ center: [result.coords.longitude, result.coords.latitude], zoom: Math.max(13, instance.getZoom()), duration: motionDuration() })
  }, error => {
    located.value = false
    if (map.value === instance) { locationFailure.value = true; report(error) }
  }, { timeout: 10000 })
}

function syncFullscreen() { fullscreen.value = root.value?.ownerDocument.fullscreenElement === root.value }

async function switchFullscreen() {
  const node = root.value
  if (!node || !canFullscreen.value) return
  try {
    if (node.ownerDocument.fullscreenElement === node) await node.ownerDocument.exitFullscreen()
    else await node.requestFullscreen()
  } catch (error) { report(error) }
}

function keydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !activePopup.value) return
  event.preventDefault()
  event.stopPropagation()
  closePopup()
}

watch(style, next => {
  const instance = map.value
  if (!instance) return
  failure.value = undefined
  ready.value = false
  removeLayers(instance)
  try { instance.setStyle(next, { diff: false }) }
  catch (error) { report(error, true) }
})
watch([viewport, () => props.center, () => props.zoom], updateViewport, { deep: true })
watch(() => props.markers, syncMarkers, { deep: true })
watch([() => props.layers, () => props.routes, () => props.arcs, () => props.clusters, activeTheme], syncLayers, { deep: true })
watch([activePopup, ready], syncPopup)
onMounted(() => {
  const node = root.value
  if (!node) return
  const view = node.ownerDocument.defaultView
  media = view?.matchMedia('(prefers-color-scheme: dark)')
  media?.addEventListener('change', measureTheme)
  if (view) {
    themeObserver = new view.MutationObserver(measureTheme)
    for (let parent: HTMLElement | null = node; parent; parent = parent.parentElement) {
      themeObserver.observe(parent, { attributes: true, attributeFilter: ['data-sy-theme'] })
    }
  }
  measureTheme()
  canFullscreen.value = Boolean(node.ownerDocument.fullscreenEnabled && node.requestFullscreen)
  node.ownerDocument.addEventListener('fullscreenchange', syncFullscreen)
  void boot()
})
onBeforeUnmount(() => {
  generation++
  media?.removeEventListener('change', measureTheme)
  themeObserver?.disconnect()
  root.value?.ownerDocument.removeEventListener('fullscreenchange', syncFullscreen)
  cleanup()
})
</script>

<template>
  <section ref="root" class="sy-map" :aria-label="label" :aria-busy="waiting || undefined"
    :data-ready="ready && !failure ? 'true' : undefined" :style="{ '--sy-map-height': height }" @keydown="keydown">
    <div class="sy-map__frame" :inert="waiting || Boolean(failure)" :aria-hidden="waiting || Boolean(failure) || undefined">
      <div ref="canvas" class="sy-map__canvas" />
    </div>
    <div v-if="controls.length || $slots.controls" class="sy-map__controls" :data-position="controlsPosition"
      :inert="!ready || waiting || Boolean(failure)" :aria-hidden="!ready || waiting || Boolean(failure) || undefined">
      <template v-if="controls.includes('zoom')">
        <SButton size="sm" variant="ghost" @click="map?.zoomIn({ duration: motionDuration() })">{{ labels.zoomIn }}</SButton>
        <SButton size="sm" variant="ghost" @click="map?.zoomOut({ duration: motionDuration() })">{{ labels.zoomOut }}</SButton>
      </template>
      <SButton v-if="controls.includes('compass')" size="sm" variant="ghost"
        @click="map?.easeTo({ bearing: 0, pitch: 0, duration: motionDuration() })">{{ labels.compass }}</SButton>
      <SButton v-if="controls.includes('locate')" size="sm" variant="ghost" :loading="located" @click="locate">{{ labels.locate }}</SButton>
      <SButton v-if="controls.includes('fullscreen')" size="sm" variant="ghost" class="sy-map__fullscreen"
        :disabled="!canFullscreen" :aria-pressed="fullscreen" @click="switchFullscreen">
        <span class="sy-map__toggle-label">
          <span aria-hidden="true">{{ labels.fullscreen }}</span><span aria-hidden="true">{{ labels.exit }}</span>
          <SMotionText :value="fullscreen ? labels.exit : labels.fullscreen" />
        </span>
      </SButton>
      <slot name="controls" :map="map" />
    </div>
    <Transition name="sy-map-state">
      <div v-if="waiting || failure" :key="String(Boolean(failure))" class="sy-map__state" :role="failure ? 'alert' : 'status'">
        <slot v-if="failure" name="fallback" :error="failure" :retry="boot">
          <span>{{ errorText }}</span>
          <SButton size="sm" variant="secondary" @click="boot">{{ labels.retry }}</SButton>
        </slot>
        <template v-else><SSpinner decorative /><span>{{ loadingText }}</span></template>
      </div>
    </Transition>
    <div v-if="locationFailure" role="status" class="sy-map__location-error">{{ locationErrorText }}</div>
    <div v-if="$slots.attribution" class="sy-map__attribution"><slot name="attribution" /></div>
    <Teleport v-for="entry in markerEntries" :key="entry.marker.id" :to="entry.host">
      <button type="button" class="sy-map__pin" :data-position="entry.marker.labelPosition ?? 'bottom'"
        :aria-label="entry.marker.label" :aria-expanded="activePopup?.id === entry.marker.id"
        :title="entry.marker.tooltip" :style="{ '--sy-map-pin': entry.marker.color, '--sy-map-pin-ring': entry.marker.ringColor }"
        @click="markerPress(entry.marker, $event)">
        <slot name="marker" :marker="entry.marker" :open="activePopup?.id === entry.marker.id">
          <span class="sy-map__dot" aria-hidden="true" /><span class="sy-map__pin-label">{{ entry.marker.label }}</span>
        </slot>
      </button>
    </Teleport>
    <Teleport v-if="popupHost" :to="popupHost">
      <Transition name="sy-map-popup" appear @after-leave="popupClosing && removePopup()">
        <div v-if="popupContent && !popupClosing" class="sy-map__popup-panel" role="dialog" :aria-label="popupContent.spec.title ?? label">
          <slot name="popup" :popup="popupContent.spec" :marker="popupContent.marker" :close="closePopup">
            <strong v-if="popupContent.spec.title"><SMotionText :value="popupContent.spec.title" /></strong>
            <p v-if="popupContent.spec.detail"><SMotionText :value="popupContent.spec.detail" /></p>
            <SButton size="sm" variant="ghost" @click="closePopup()">{{ labels.close }}</SButton>
          </slot>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
