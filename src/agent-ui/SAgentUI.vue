<script setup lang="ts">
import { computed } from 'vue'
import SAgentNode from './SAgentNode.vue'
import { parseAgentDocument, type AgentActionEvent } from './schema'
const props = defineProps<{ document: unknown; errorLabel?: string }>()
const emit = defineEmits<{ action: [event: AgentActionEvent] }>()
const result = computed(() => {
  try { return { document: parseAgentDocument(props.document) } }
  catch (error) { return { error } }
})
</script>
<template>
  <div class="sy-agent-ui">
    <template v-if="result.document">
      <SAgentNode v-for="node in result.document.nodes" :key="node.id" :node="node" @action="emit('action', $event)" />
    </template>
    <p v-else role="alert">{{ errorLabel ?? '无法读取界面数据' }}</p>
  </div>
</template>
