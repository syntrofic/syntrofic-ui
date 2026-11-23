<script setup lang="ts">
import { computed } from 'vue'
import SBadge from './SBadge.vue'
import type { ChatTextToken } from '../chat/types'

const props = withDefaults(defineProps<{ text: string; tokens?: readonly ChatTextToken[] }>(), { tokens: () => [] })
const parts = computed(() => {
  const definitions = new Map<string, ChatTextToken>()
  for (const token of props.tokens) if (token.value && !definitions.has(token.value)) definitions.set(token.value, token)
  if (!definitions.size) return [{ text: props.text, offset: 0 }]
  const values = [...definitions.keys()].sort((left, right) => right.length - left.length)
  const pattern = new RegExp(values.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu')
  const parts: { text: string; offset: number; token?: ChatTextToken }[] = []
  let index = 0
  for (const match of props.text.matchAll(pattern)) {
    if (match.index > index) parts.push({ text: props.text.slice(index, match.index), offset: index })
    parts.push({ text: match[0], token: definitions.get(match[0]), offset: match.index })
    index = match.index + match[0].length
  }
  if (index < props.text.length) parts.push({ text: props.text.slice(index), offset: index })
  return parts
})
</script>

<template>
  <span class="sy-chat-tokenized-text"><template v-for="part in parts" :key="part.offset"><slot v-if="part.token" name="token" :token="part.token">
    <SBadge :tone="part.token.tone">{{ part.token.label ?? part.token.value }}</SBadge>
  </slot><template v-else>{{ part.text }}</template></template></span>
</template>
