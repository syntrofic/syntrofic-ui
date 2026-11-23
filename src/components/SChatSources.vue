<script setup lang="ts">
import { computed } from 'vue'
import SDisclosure from './SDisclosure.vue'
import SChatSource from './SChatSource.vue'
import SMotionText from './SMotionText.vue'
import { contentUrl } from '../internal/content-url'
import type { ChatSourceInfo } from '../chat/types'

const props = defineProps<{
  sources: readonly ChatSourceInfo[]
  title?: string
  label?: string
  formatCount?: (count: number) => string
  defaultOpen?: boolean
  stackFavicons?: boolean
  disabled?: boolean
  untitledLabel?: string
  documentLabel?: string
}>()
const open = defineModel<boolean | undefined>('open', { default: undefined })
const emit = defineEmits<{ activate: [source: ChatSourceInfo, event: MouseEvent] }>()
defineSlots<{
  title(props: { count: number; label: string }): unknown
  source(props: { source: ChatSourceInfo; index: number }): unknown
  default(props: { sources: readonly ChatSourceInfo[] }): unknown
}>()
const count = computed(() => props.formatCount?.(props.sources.length) ?? String(props.sources.length))
const stack = computed(() => props.stackFavicons
  ? [...new Set(props.sources.map(source => contentUrl(source.faviconUrl, true)).filter((url): url is string => Boolean(url)))].slice(0, 3)
  : [])
</script>

<template>
  <SDisclosure v-model:open="open" class="sy-chat-sources" :default-open="defaultOpen" :disabled="disabled">
    <template #title>
      <slot name="title" :count="sources.length" :label="count">
        <span class="sy-chat-sources__heading">
          <span v-if="stack.length" class="sy-chat-sources__stack" aria-hidden="true">
            <img v-for="icon in stack" :key="icon" :src="icon" alt="" @error="event => (event.currentTarget as HTMLImageElement).hidden = true">
          </span>
          <span>{{ title ?? 'Sources' }}</span>
          <SMotionText :value="count" motion="roll" class="sy-chat-sources__count" />
        </span>
      </slot>
    </template>
    <slot :sources="sources">
      <ul class="sy-chat-sources__list" role="list" :aria-label="label ?? title ?? 'Sources'">
        <li v-for="(source, index) in sources" :key="source.id ?? index">
          <slot name="source" :source="source" :index="index">
            <SChatSource :source="source" :untitled-label="untitledLabel" :document-label="documentLabel"
              @activate="(item, event) => emit('activate', item, event)" />
          </slot>
        </li>
      </ul>
    </slot>
  </SDisclosure>
</template>
