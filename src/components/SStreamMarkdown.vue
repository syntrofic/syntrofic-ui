<script setup lang="ts">
import { computed } from 'vue'
import SMarkdown from './SMarkdown.vue'
import type { MarkdownDisplayOptions } from '../internal/markdown-content'
import { useStreamingText, type StreamingTextSpeed } from '../internal/streaming-text'

const props = withDefaults(defineProps<MarkdownDisplayOptions & { source: string; streaming?: boolean; speed?: StreamingTextSpeed }>(),
  { streaming: true, copyCode: true })
const displayed = useStreamingText(() => props.source, () => props.streaming, () => ({ speed: props.speed }))
const markdown = computed(() => {
  const { speed, ...settings } = props
  return settings
})
</script>

<template>
  <SMarkdown v-bind="markdown" :source="displayed"><template v-if="$slots.footer" #footer="state"><slot name="footer" v-bind="state" /></template></SMarkdown>
</template>
