<script setup lang="ts">
import { computed, ref } from 'vue'
import { SAgentUI, type AgentActionEvent } from '../src'
import { agentReviews } from './agent-review'
const props = defineProps<{ selected?: string }>()
const review = computed(() => agentReviews.find(item => item.id === props.selected))
const action = ref<AgentActionEvent>()
</script>
<template>
  <div class="workbench">
    <header class="workbench__top"><a class="workbench__brand" href="./">Syntrofic UI</a><a href="?agent=all">Agent UI 验收</a></header>
    <main class="workbench__main">
      <article v-if="review" :data-agent-review="review.id">
        <h1>{{ review.number }} {{ review.label }}</h1>
        <SAgentUI :document="review.document" @action="action = $event" />
        <p v-if="action" role="status" data-agent-action>{{ action.action }} {{ JSON.stringify(action.values) }}</p>
      </article>
      <template v-else>
        <h1>Agent UI 验收</h1>
        <ul><li v-for="item in agentReviews" :key="item.id"><a :href="'?agent=' + item.id">{{ item.number }} {{ item.label }}</a></li></ul>
      </template>
    </main>
  </div>
</template>
