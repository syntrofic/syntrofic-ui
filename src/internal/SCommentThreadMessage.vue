<script setup lang="ts">
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import type { CommentMessage } from './comment-data'
import type { MarkdownTransform } from './markdown-content'
import { contentUrl } from './content-url'
import { createAnimator, prefersReducedMotion } from './motion'
import SAvatar from '../components/SAvatar.vue'
import SBadge from '../components/SBadge.vue'
import SLink from '../components/SLink.vue'
import SMarkdown from '../components/SMarkdown.vue'
import SSpinner from '../components/SSpinner.vue'
import STextShimmer from '../components/STextShimmer.vue'
import STimestamp from '../components/STimestamp.vue'

const props = defineProps<{
  message: CommentMessage
  reply?: boolean
  clamped?: boolean
  animate?: boolean
  editedText: string
  unreadText: string
  pendingText: string
  locale?: 'en' | 'zh'
  markdownPlugins?: readonly MarkdownTransform[]
}>()
defineSlots<{ editor?(): unknown; body?(): unknown; metadata?(): unknown; actions?(): unknown }>()
const copy = useTemplateRef<HTMLElement>('copy')
const mounted = shallowRef(false)
const showUnread = shallowRef(Boolean(props.message.unread))
const progressHref = computed(() => contentUrl(props.message.progress?.link?.href ?? ''))
onMounted(() => { mounted.value = true })
watch(() => [mounted.value, props.message.id, props.message.unread] as const, ([ready, , unread], _, cleanup) => {
  showUnread.value = Boolean(unread)
  if (ready && unread) {
    const timeout = setTimeout(() => { showUnread.value = false }, 5000)
    cleanup(() => clearTimeout(timeout))
  }
})
watch(() => props.message.text, (_, __, cleanup) => {
  const node = copy.value
  if (!node || !props.animate || prefersReducedMotion(node) || typeof node.animate !== 'function') return
  const animator = createAnimator(node)
  animator.animate('text', [{ opacity: .38 }, { opacity: 1 }], { role: 'move' })
  cleanup(animator.dispose)
}, { flush: 'post' })
</script>

<template>
  <li class="sy-comment-thread__message" :data-comment-id="message.id" :data-reply="reply || undefined">
    <div class="sy-comment-thread__author">
      <SAvatar :name="message.author" :src="message.avatar" size="sm" :tooltip="false" aria-hidden="true" />
      <strong>{{ message.author }}</strong>
      <STimestamp v-if="message.createdAt" :value="message.createdAt" :locale="locale" :tooltip="false" />
      <span v-if="message.edited || message.updatedAt" class="sy-comment-thread__edited">{{ editedText }}</span>
      <Transition name="sy-comment-part" :css="animate">
        <SBadge v-if="showUnread" tone="blue" :label="unreadText" />
      </Transition>
      <slot name="metadata" />
    </div>
    <div ref="copy" class="sy-comment-thread__content">
      <slot v-if="$slots.editor" name="editor" />
      <div v-else-if="message.progress" class="sy-comment-thread__progress" role="status">
        <STextShimmer v-if="animate" :text="message.progress.label" />
        <span v-else>{{ message.progress.label }}</span>
        <SLink v-if="progressHref && message.progress.link" :href="progressHref">{{ message.progress.link.label }}</SLink>
      </div>
      <div v-else class="sy-comment-thread__body" :data-clamped="clamped || undefined">
        <slot name="body">
          <SMarkdown v-if="message.format === 'markdown'" :source="message.text" :plugins="markdownPlugins" />
          <p v-else class="sy-comment-thread__text">{{ message.text }}</p>
        </slot>
      </div>
    </div>
    <Transition name="sy-comment-part" :css="animate">
      <SSpinner v-if="message.status === 'pending' && !message.progress" size="sm" :label="pendingText" show-label />
      <p v-else-if="message.status === 'error' && message.errorMessage" class="sy-comment-thread__error" role="alert">{{ message.errorMessage }}</p>
    </Transition>
    <slot name="actions" />
  </li>
</template>
