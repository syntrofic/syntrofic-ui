<script setup lang="ts">
import { computed } from 'vue'
import SMotionText from '../components/SMotionText.vue'
const props = defineProps<{ source: string; streaming?: boolean; locale?: string }>()
const segmenter = computed(() => typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(props.locale, { granularity: 'word' }) : undefined)
const endPunctuation = /^[、。，．！？：；…）》〉」』】〕〗〙〛％]+$/u
const lines = computed(() => props.source.replace(/\r\n?/g, '\n').split('\n').map(line => {
  const words = segmenter.value ? Array.from(segmenter.value.segment(line), part => part.segment) : line.split(/(\s+)/u).filter(Boolean)
  const grouped: string[] = []
  for (const word of words) {
    if (endPunctuation.test(word) && grouped.length && !/\s$/u.test(grouped.at(-1)!)) grouped[grouped.length - 1] += word
    else grouped.push(word)
  }
  return grouped
}))
</script>

<template>
  <div class="sy-chat-text">
    <span class="sy-visually-hidden">{{ source }}</span>
    <div aria-hidden="true" class="sy-chat-text__visual">
      <template v-for="(line, index) in lines" :key="index">
        <br v-if="index">
        <template v-for="(word, position) in line" :key="position">
          <span v-if="/^\s+$/u.test(word)">{{ word }}</span>
          <SMotionText v-else :value="word" :appear="streaming" motion="roll" />
        </template>
      </template>
    </div>
  </div>
</template>
