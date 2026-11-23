<script setup lang="ts">
import { computed, defineComponent, type PropType } from 'vue'
import { markdownBlocks, markdownNodes, type MarkdownDisplayOptions } from '../internal/markdown-content'

const props = withDefaults(defineProps<MarkdownDisplayOptions & {
  source: string
  streaming?: boolean
}>(), { copyCode: true, scrollLabel: 'Code', tableLabel: 'Table' })
defineSlots<{ footer(props: { streaming: boolean }): unknown }>()
const blocks = computed<Array<{ tokens: ReturnType<typeof markdownBlocks>[number]; signature: string }>>(previous => (
  markdownBlocks(props.source, props, !props.streaming).map((tokens, index) => {
    const signature = props.streaming ? JSON.stringify(tokens) : ''
    const stable = previous?.[index]
    return signature && stable?.signature === signature ? stable : { tokens, signature }
  })
))
const options = computed<MarkdownDisplayOptions>(() => ({
  externalLinks: props.externalLinks, copyCode: props.copyCode,
  copyLabel: props.copyLabel, copiedLabel: props.copiedLabel, failureLabel: props.failureLabel,
  scrollLabel: props.scrollLabel, tableLabel: props.tableLabel,
  headingLevelStart: props.headingLevelStart, sources: props.sources, citationStyle: props.citationStyle,
  citationNumberLabel: props.citationNumberLabel,
}))
const Block = defineComponent({
  props: {
    tokens: { type: Array as PropType<ReturnType<typeof markdownBlocks>[number]>, required: true },
    options: { type: Object as PropType<MarkdownDisplayOptions>, required: true },
  },
  setup: block => () => markdownNodes(block.tokens, block.options),
})
</script>

<template>
  <article class="sy-markdown sy-prose" :data-density="density" :aria-busy="streaming || undefined">
    <Block v-for="(block, index) in blocks" :key="index" :tokens="block.tokens" :options="options" />
    <slot name="footer" :streaming="Boolean(streaming)" />
  </article>
</template>
