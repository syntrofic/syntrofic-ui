<script lang="ts">
export interface SankeyChartNode { id: string; label: string; color?: string }
export interface SankeyChartLink { id?: string; source: string; target: string; value: number }
</script>

<script setup lang="ts">
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { computed, ref } from 'vue'
import SChartFrame from '../charts/SChartFrame.vue'
import type { ChartHit, ChartOptions, ChartSelection } from '../charts/types'
import { chartDefaults, clamp, frameOptions, numberAt, seriesColor } from '../charts/values'

const props = withDefaults(defineProps<ChartOptions & {
  nodes: readonly SankeyChartNode[]
  links: readonly SankeyChartLink[]
  totalLabel?: string
  cycleLabel?: string
}>(), { ...chartDefaults, totalLabel: 'Total', cycleLabel: 'The flow diagram requires directed links with no cycles.' })
const emit = defineEmits<{ inspect: [selection?: ChartSelection, index?: number] }>()
const width = ref(640)
const height = computed(() => clamp(numberAt(props.height, 250), 100, 960))
const path = sankeyLinkHorizontal<SankeyChartNode, { id: string }>()
const graph = computed(() => {
  const nodes = [...new Map(props.nodes.map(item => [item.id, item])).values()].map(node => ({ ...node }))
  const ids = new Set(nodes.map(item => item.id))
  const links = props.links.filter(link => ids.has(link.source) && ids.has(link.target)
    && Number.isFinite(link.value) && link.value > 0).map((link, index) => ({ ...link, id: link.id ?? 'flow-' + index }))
  if (!links.length) return { empty: true } as const
  try {
    const generator = sankey<SankeyChartNode, { id: string }>().nodeId(node => node.id).nodeWidth(12).nodePadding(12)
      .extent([[8, 12], [Math.max(width.value - 8, 45), height.value - 12]])
    const chart = generator({ nodes, links })
    const flows = chart.links.flatMap((link, index) => {
      const color = typeof link.source === 'object' ? link.source.color ?? seriesColor(link.source.index ?? 0) : seriesColor(0)
      const description = typeof link.source === 'object' && typeof link.target === 'object'
        ? link.source.label + ' → ' + link.target.label : link.id
      return { id: link.id + '-' + index, path: path(link) ?? '', width: link.width ?? 0, color, description, value: link.value,
        from: typeof link.source === 'object' ? link.source.index : undefined, to: typeof link.target === 'object' ? link.target.index : undefined }
    })
    const points = chart.nodes.map((node, index) => ({
      id: node.id, label: node.label, color: node.color ?? seriesColor(index),
      x: node.x0 ?? 0, y: node.y0 ?? 0, x2: node.x1 ?? 0, y2: node.y1 ?? 0,
      value: node.value ?? 0, incoming: node.targetLinks ?? [], outgoing: node.sourceLinks ?? [],
    }))
    return { empty: false, points, flows } as const
  } catch {
    return { empty: true, invalid: true } as const
  }
})
const options = computed<ChartSelection[]>(() => graph.value.empty ? [] : graph.value.points.map(point => ({
  key: point.id, label: point.label,
  items: [{ key: 'total', label: props.totalLabel, value: point.value, color: point.color },
    ...point.outgoing.flatMap(link => typeof link.target !== 'object' ? [] : [{
      key: link.id, label: link.target.label, value: link.value, color: link.target.color,
    }])],
})))
function hit({ x, y }: ChartHit) {
  if (graph.value.empty) return
  const index = graph.value.points.findIndex(node => x >= node.x - 7 && x <= node.x2 + 7 && y >= node.y - 3 && y <= node.y2 + 3)
  return index < 0 ? undefined : index
}
function anchor(index: number) {
  const node = graph.value.empty ? undefined : graph.value.points[index]
  return node ? { x: (node.x + node.x2) / 2, y: (node.y + node.y2) / 2 } : { x: 0, y: 0 }
}
</script>

<template>
  <SChartFrame v-bind="frameOptions($props)" class="sy-sankey" :options="options" :hit="hit" :anchor="anchor" :is-empty="graph.empty"
    :empty-text="graph.empty && graph.invalid ? cycleLabel : emptyText" @resize="width = $event" @inspect="(...args) => emit('inspect', ...args)">
    <template #plot="{ active }">
      <svg v-if="!graph.empty" aria-hidden="true" class="sy-chart__svg" :viewBox="'0 0 ' + width + ' ' + height" preserveAspectRatio="none">
        <path v-for="flow in graph.flows" :key="flow.id" :d="flow.path" :stroke="flow.color" :stroke-width="Math.max(1, flow.width)"
          :data-highlight="active !== undefined && (flow.from === active || flow.to === active) || undefined">
          <title>{{ flow.description }} · {{ flow.value }}</title>
        </path>
        <g v-for="(node, index) in graph.points" :key="node.id" :data-active="index === active || undefined">
          <rect :x="node.x" :y="node.y" :width="node.x2 - node.x" :height="Math.max(1, node.y2 - node.y)" :fill="node.color" rx="2" />
          <text v-if="node.y2 - node.y >= 12" :x="node.x < width / 2 ? node.x2 + 5 : node.x - 5"
            :text-anchor="node.x < width / 2 ? 'start' : 'end'" :y="(node.y + node.y2) / 2 + 3">{{ node.label }}</text>
        </g>
      </svg>
    </template>
  </SChartFrame>
</template>
