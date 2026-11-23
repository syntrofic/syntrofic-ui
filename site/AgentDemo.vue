<script setup lang="ts">
import { ref } from 'vue'
import SAgentUI from '../src/agent-ui/SAgentUI.vue'
import type { AgentActionEvent, AgentDocument } from '../src/agent-ui/schema'

const message = ref('')
const document: AgentDocument = {
  version: 1,
  nodes: [
    { id: 'delivery', kind: 'metric-grid', title: '交付概况', values: [
      { id: 'done', label: '已交付', value: 12, series: [4, 7, 8, 12] },
      { id: 'pending', label: '复核中', value: 3, series: [8, 6, 4, 3] },
    ] },
    { id: 'week', kind: 'bar-chart', title: '本周交付', values: [
      { id: 'mon', label: '周一', value: 2 }, { id: 'tue', label: '周二', value: 4 },
      { id: 'wed', label: '周三', value: 1 }, { id: 'thu', label: '周四', value: 3 },
      { id: 'fri', label: '周五', value: 2 },
    ] },
    { id: 'actions', kind: 'action-group', title: '操作', actions: [
      { id: 'review', label: '查看待复核项目', intent: 'secondary' },
    ] },
  ],
}
function onAction({ action }: AgentActionEvent) {
  if (action === 'review') message.value = '待复核：品牌图标、组件用法和交付说明。'
}
</script>

<template>
  <SAgentUI :document="document" @action="onAction" />
  <p class="agent-status" role="status">{{ message }}</p>
</template>

<style scoped>
:deep(.sy-kpi) {
  --sy-kpi-surface: var(--paper);
  box-shadow: inset 0 0 0 1px var(--line);
}
.agent-status:not(:empty) { margin-top: .75rem; color: var(--muted); }
</style>
