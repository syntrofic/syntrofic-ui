<script setup lang="ts">
import SAgentUI from '../agent-ui/SAgentUI.vue'
import type { AgentActionEvent } from '../agent-ui/schema'
import SButton from '../components/SButton.vue'
defineProps<{
  document: unknown
  label?: string
  welcome?: string
  placement?: 'inline' | 'floating' | 'sidebar'
  theme?: 'light' | 'dark' | 'system'
  font?: string
}>()
const open = defineModel<boolean>('open', { default: false })
defineEmits<{ action: [event: AgentActionEvent] }>()
</script>
<template>
  <section class="sy-agent-panel" :data-placement="placement ?? 'inline'" :data-sy-theme="theme" :style="{ '--sy-font': font }">
    <SButton v-if="placement && placement !== 'inline'" :aria-expanded="open" size="sm" @click="open = !open">{{ label ?? '助手' }}</SButton>
    <aside v-if="open || !placement || placement === 'inline'" class="sy-agent-card" :aria-label="label ?? '助手'">
      <h2 v-if="label">{{ label }}</h2>
      <p v-if="welcome">{{ welcome }}</p>
      <SAgentUI :document="document" @action="$emit('action', $event)" />
    </aside>
  </section>
</template>
