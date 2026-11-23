<script setup lang="ts">
import { computed, defineComponent, h, ref, watch, type VNode } from 'vue'
import SHoverCard from './SHoverCard.vue'
import SIcon from './SIcon.vue'
import { contentUrl } from '../internal/content-url'
import type { ChatSourceInfo } from '../chat/types'

const props = withDefaults(defineProps<{
  source: ChatSourceInfo
  enablePreview?: boolean
  untitledLabel?: string
  documentLabel?: string
  variant?: 'label' | 'number'
  number?: number
  numberLabel?: (number: number, title: string) => string
  icon?: string
}>(), { enablePreview: undefined, variant: 'label' })
const emit = defineEmits<{ activate: [source: ChatSourceInfo, event: MouseEvent] }>()
const slots = defineSlots<{
  icon(props: { source: ChatSourceInfo }): VNode[]
  title(props: { text: string; source: ChatSourceInfo }): VNode[]
  preview(props: { source: ChatSourceInfo; title: string; domain: string }): unknown
}>()
const href = computed(() => contentUrl(props.source.href))
const favicon = computed(() => contentUrl(props.source.faviconUrl, true))
const failed = ref(false)
watch(favicon, () => { failed.value = false })
const domain = computed(() => {
  if (!href.value || !/^(https?:)?\/\//i.test(href.value)) return ''
  try { return new URL(href.value, 'https://example.invalid').hostname }
  catch { return '' }
})
const type = computed(() => props.source.type ?? (href.value ? 'url' : 'document'))
const title = computed(() => props.source.title || domain.value || props.untitledLabel || 'Untitled source')
const description = computed(() => props.source.description)
const number = computed(() => props.variant === 'number' && Number.isFinite(props.number) ? props.number : undefined)
const name = computed(() => number.value === undefined ? undefined
  : props.numberLabel?.(number.value, title.value) ?? `Citation ${number.value}: ${title.value}`)
const preview = computed(() => props.enablePreview ?? Boolean(description.value || slots.preview || number.value !== undefined))
const tag = computed(() => href.value ? 'a' : props.source.actionable ? 'button' : 'span')
const windowTarget = computed(() => href.value && props.source.newWindow ? '_blank' : undefined)
const Pill = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs }) {
    return () => h(tag.value, {
      ...attrs, class: 'sy-chat-source__pill',
      href: href.value, type: tag.value === 'button' ? 'button' : undefined,
      target: windowTarget.value, rel: windowTarget.value ? 'noopener noreferrer' : undefined,
      role: tag.value === 'span' && name.value ? 'note' : undefined,
      'aria-label': name.value,
      tabindex: tag.value === 'span' && preview.value ? 0 : undefined,
      onClick: tag.value === 'span' ? undefined : (event: MouseEvent) => emit('activate', props.source, event),
    }, [
      slots.icon?.({ source: props.source }) ?? (favicon.value && !failed.value
        ? h('img', { class: 'sy-chat-source__icon', src: favicon.value, alt: '', loading: 'lazy', onError: () => { failed.value = true } })
        : props.icon ? h(SIcon, { name: props.icon, size: 'xsm', class: 'sy-chat-source__icon' }) : undefined),
      h('span', { class: 'sy-chat-source__title' }, number.value ?? slots.title?.({ text: title.value, source: props.source }) ?? title.value),
    ])
  },
})
</script>

<template>
  <span class="sy-chat-source" :data-type="type" :data-variant="number === undefined ? undefined : 'number'">
    <SHoverCard v-if="preview" :label="title" :interactive="Boolean($slots.preview)" class="sy-chat-source__hover">
      <template #trigger="{ triggerProps }"><Pill v-bind="triggerProps" /></template>
      <div class="sy-chat-source__preview">
        <slot name="preview" :source="source" :title="title" :domain="domain">
          <strong>{{ title }}</strong>
          <span v-if="domain || type === 'document'" class="sy-chat-source__meta">{{ domain || documentLabel || 'Document' }}</span>
          <p v-if="description">{{ description }}</p>
        </slot>
      </div>
    </SHoverCard>
    <Pill v-else />
  </span>
</template>
