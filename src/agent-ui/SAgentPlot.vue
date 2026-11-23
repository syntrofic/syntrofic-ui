<script setup lang="ts">
import { computed, ref } from 'vue'
import { agentMarks } from './plots'
import type { AgentEntry, AgentNodeKind } from './schema'
const props = defineProps<{ label: string; kind: AgentNodeKind; entries: readonly AgentEntry[] }>()
const active = ref<string>()
const marks = computed(() => agentMarks(props.kind, props.entries))
const items = computed(() => [...new Set(marks.value.map(mark => mark.label))])
const colors = ['var(--sy-chart-sage)', 'var(--sy-chart-clay)', 'var(--sy-chart-blue)', 'var(--sy-chart-ochre)', 'var(--sy-chart-plum)', 'var(--sy-chart-teal)']
</script>

<template>
  <figure class="sy-agent-plot">
    <figcaption>{{ label }}</figcaption>
    <svg v-if="marks.length" viewBox="0 0 520 180" role="img" :aria-label="label" @pointerleave="active = undefined">
      <g v-for="mark in marks" :key="mark.id" :fill="colors[mark.color % colors.length]" :opacity="active && active !== mark.label ? .4 : 1"
        @pointerenter="active = mark.label">
        <title>{{ mark.label }}</title>
        <rect v-if="mark.kind === 'rect'" :x="mark.x" :y="mark.y" :width="mark.w" :height="mark.h" :opacity="mark.opacity" rx="2" />
        <circle v-else-if="mark.kind === 'point'" :cx="mark.x" :cy="mark.y" :r="mark.radius" :opacity="mark.opacity" />
        <path v-else :d="mark.path" :fill="mark.stroke ? 'none' : undefined" :stroke="mark.stroke ? colors[mark.color % colors.length] : undefined"
          :stroke-width="mark.stroke" :opacity="mark.opacity" />
        <text v-if="mark.text" :x="mark.text.x" :y="mark.text.y" fill="currentColor" font-size="10" text-anchor="middle">{{ mark.text.value }}</text>
      </g>
    </svg>
    <p v-else>暂无数据</p>
    <details v-if="items.length">
      <summary>查看数据</summary>
      <ul><li v-for="item in items" :key="item">{{ item }}</li></ul>
    </details>
  </figure>
</template>
