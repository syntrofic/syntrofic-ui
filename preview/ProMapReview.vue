<script setup lang="ts">
import { computed, ref } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import SMap, { type MapLocation, type MapViewport } from '../src/map'
import { SMotionText, SSwitch } from '../src'
import { arcs, center, clusters, layers, markers as initialMarkers, routes, styles } from './map-review-data'

const dark = ref(false)
const selected = ref<string | null>(null)
const camera = ref<Partial<MapViewport>>({ center, zoom: 13.5 })
const markers = ref(initialMarkers)
const report = ref('')
const zoom = computed(() => camera.value.zoom?.toFixed(1) ?? '13.5')
const labels = { zoomIn: '放大', zoomOut: '缩小', compass: '正北', fullscreen: '全屏', exit: '退出全屏', close: '关闭', retry: '重试' }
const interactive = ['review-zone']

function moveMarker(id: string, location: MapLocation) {
  markers.value = markers.value.map(marker => marker.id === id ? { ...marker, location } : marker)
  report.value = '已更新收件位置'
}
</script>

<template>
  <section class="review-map">
    <div class="review-map__tools">
      <SSwitch v-model="dark">深色地图</SSwitch>
      <output aria-label="地图缩放级别"><SMotionText :value="zoom" motion="roll" /> 级</output>
    </div>
    <SMap v-model:viewport="camera" v-model:selected="selected" label="制作园区地图" class="review-map__surface"
      :styles="styles" :theme="dark ? 'dark' : 'light'" :worker-url="workerUrl"
      :options="{ attributionControl: false }" :markers="markers" :routes="routes" :arcs="arcs" :clusters="clusters" :layers="layers"
      :interactive-layers="interactive" :controls="['zoom', 'compass', 'fullscreen']" :labels="labels"
      :cluster-label="count => `${count} 个地点，放大查看`"
      loading-text="正在绘制园区地图" error-text="园区地图暂不可用"
      @marker-move="moveMarker" @feature-press="feature => report = String(feature.properties.name)">
      <template #attribution>园区示意数据</template>
    </SMap>
    <output class="review-map__result"><SMotionText :value="report" /></output>
  </section>
</template>
