<script lang="ts">
import type { CommentActivityEvent, CommentAnchor, CommentMessage, CommentThread, CommentVersion } from '../internal/comment-data'
export type { CommentActivityEvent, CommentMessage, CommentParticipant, CommentProgress, CommentThread } from '../internal/comment-data'

export type CommentDraftContext = { type: 'comment'; anchor?: CommentAnchor }
  | { type: 'reply' | 'edit'; threadId: string; id: string }
</script>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, shallowRef, useTemplateRef, watch } from 'vue'
import type { MarkdownTransform } from '../internal/markdown-content'
import type { ChatComposerTrigger } from './SChatComposerInput.vue'
import { useCollectionContentMotion } from '../internal/collection-motion'
import { contentUrl } from '../internal/content-url'
import { prefersReducedMotion } from '../internal/motion'
import SButton from './SButton.vue'
import SCommentComposer, { type CommentImage } from './SCommentComposer.vue'
import SCommentThread, { type CommentThreadLabels } from './SCommentThread.vue'
import SMotionText from './SMotionText.vue'
import SSkeleton from './SSkeleton.vue'
import SSpinner from './SSpinner.vue'
import STextArea from './STextArea.vue'
import STimestamp from './STimestamp.vue'

type TimelineEntry = { key: string; time: number | undefined } & (
  { kind: 'thread'; thread: CommentThread } | { kind: 'event'; event: CommentActivityEvent }
)
const props = withDefaults(defineProps<{
  threads: readonly CommentThread[]
  label: string
  labels?: CommentThreadLabels & Partial<Record<'newThread' | 'newPlaceholder' | 'replyPlaceholder' | 'loadingComments'
    | 'empty' | 'retryLoad' | 'loadOlder' | 'loadingOlder' | 'olderError' | 'postError' | 'dismissAnchor', string>>
  disabled?: boolean
  variant?: 'inline' | 'timeline'
  events?: readonly CommentActivityEvent[]
  order?: 'auto' | 'oldest' | 'newest' | 'activity'
  layout?: 'embedded' | 'pane'
  density?: 'compact' | 'balanced'
  container?: 'section' | 'card'
  composerPosition?: 'top' | 'bottom' | 'none'
  composerAnchor?: CommentAnchor
  dismissComposerAnchor?: boolean
  highlightColor?: string
  replyBehavior?: 'explicit' | 'when-selected'
  mode?: 'interactive' | 'non-editable' | 'read-only'
  currentUser?: string
  animate?: boolean
  locale?: 'en' | 'zh'
  loading?: boolean
  loadError?: string
  retryLoad?: () => void | Promise<void>
  hasOlderComments?: boolean
  loadingOlder?: boolean
  loadOlder?: () => void | Promise<void>
  composerError?: string
  composerTriggers?: readonly ChatComposerTrigger[]
  markdownPlugins?: readonly MarkdownTransform[]
  uploadImages?: (files: readonly File[], signal: AbortSignal) => readonly CommentImage[] | Promise<readonly CommentImage[]>
  submitComment?: (text: string, context: { anchor?: CommentAnchor }) => void | Promise<void>
  submitReply?: (thread: CommentThread, text: string, parentId: string) => void | Promise<void>
  saveEdit?: (thread: CommentThread, message: CommentMessage, text: string) => void | Promise<void>
  deleteComment?: (thread: CommentThread, message: CommentMessage) => void | Promise<void>
  react?: (thread: CommentThread, message: CommentMessage, emoji: string, selected: boolean) => void
  retryComment?: (thread: CommentThread, message: CommentMessage) => void
  loadVersions?: (thread: CommentThread, message: CommentMessage, signal: AbortSignal) => readonly CommentVersion[] | Promise<readonly CommentVersion[]>
}>(), { variant: 'inline', order: 'auto', layout: 'embedded', density: 'balanced', container: 'section', composerPosition: 'bottom',
  mode: 'interactive', replyBehavior: 'explicit', animate: true })
const selectedThreadId = defineModel<string | null>('selectedThreadId', { default: null })
const emit = defineEmits<{
  create: [text: string]; reply: [thread: CommentThread, text: string]; resolve: [thread: CommentThread, resolved: boolean]
  draftChange: [text: string, context: CommentDraftContext]; composerAnchorDismiss: []
}>()
defineSlots<{
  event?(props: { event: CommentActivityEvent }): unknown
  empty?(): unknown
  anchor?(props: { thread: CommentThread; anchor: CommentAnchor }): unknown
  body?(props: { thread: CommentThread; message: CommentMessage }): unknown
  metadata?(props: { thread: CommentThread; message: CommentMessage }): unknown
  composerControls?(): unknown
}>()
const text = computed(() => ({
  newThread: 'Add comment', newPlaceholder: 'Write a comment', reply: 'Reply', replyPlaceholder: 'Write a reply',
  resolve: 'Resolve', reopen: 'Reopen', resolved: 'Resolved', loadingComments: 'Loading comments…', empty: 'No comments yet.',
  retryLoad: 'Retry loading comments', loadOlder: 'Load earlier comments', loadingOlder: 'Loading earlier comments…',
  olderError: 'Could not load earlier comments.', postError: 'Could not post the comment.', dismissAnchor: 'Remove quote', ...props.labels,
}))
const drafts = reactive(new Map<string, string>())
function submit(thread?: CommentThread) {
  const key = thread?.id ?? ''
  const value = drafts.get(key)?.trim()
  if (!value || props.disabled) return
  if (thread) emit('reply', thread, value)
  else emit('create', value)
  drafts.delete(key)
}

function timestamp(value: string | number | undefined) {
  const time = typeof value === 'string' ? Date.parse(value) : value
  return time !== undefined && Number.isFinite(time) ? time : undefined
}

const timeline = computed<TimelineEntry[]>(() => {
  if (props.variant !== 'timeline') return []
  const entries: TimelineEntry[] = props.threads.map(thread => {
    let time = timestamp(thread.messages[0]?.createdAt)
    if (props.order === 'activity') {
      for (const message of thread.messages) {
        for (const date of [timestamp(message.createdAt), timestamp(message.updatedAt)]) {
          if (date !== undefined && (time === undefined || date > time)) time = date
        }
      }
    }
    return { key: `thread:${thread.id}`, time, kind: 'thread', thread }
  })
  const dated = entries.filter(entry => entry.time !== undefined)
  const first = dated[0]?.time
  const last = dated.at(-1)?.time
  const newest = props.order === 'newest' || props.order === 'activity'
    || props.order === 'auto' && first !== undefined && last !== undefined && first > last
  for (const event of props.events ?? []) entries.push({ key: `event:${event.id}`, time: timestamp(event.createdAt), kind: 'event', event })
  return entries.sort((a, b) => {
    if (a.time === undefined) return b.time === undefined ? 0 : 1
    if (b.time === undefined) return -1
    return newest ? b.time - a.time : a.time - b.time
  })
})
const readOnly = computed(() => props.mode === 'read-only')
const parts = computed(() => readOnly.value || props.composerPosition === 'none' ? ['feed']
  : props.composerPosition === 'top' ? ['composer', 'feed'] : ['feed', 'composer'])
const panel = useTemplateRef<HTMLElement>('panel')
const viewport = shallowRef<HTMLDivElement | null>(null)
const listNodes = useTemplateRef<HTMLOListElement[]>('list')
const loadNotices = useTemplateRef<HTMLDivElement[]>('loadNotice')
const olderControls = useTemplateRef<HTMLDivElement[]>('olderControl')
const composers = useTemplateRef<InstanceType<typeof SCommentComposer>[]>('composer')
const draft = ref('')
const posting = ref(false)
const postError = ref('')
const retrying = ref(false)
const paging = ref(false)
const olderError = ref(false)
const busy = computed(() => props.loading || retrying.value)
const pageBusy = computed(() => props.loadingOlder || paging.value)
const empty = computed(() => !timeline.value.length)
const state = computed(() => busy.value && empty.value ? 'loading' : props.loadError && empty.value ? 'error' : empty.value ? 'empty' : 'ready')

function setDraft(value: string) {
  draft.value = value
  emit('draftChange', value, { type: 'comment', anchor: props.composerAnchor })
}
async function post() {
  const value = draft.value.trim()
  if (!value || posting.value || readOnly.value || props.disabled) return
  const anchor = props.composerAnchor
  posting.value = true
  postError.value = ''
  try {
    if (props.submitComment) await props.submitComment(value, { anchor })
    else emit('create', value)
    if (draft.value.trim() === value) setDraft('')
  } catch { postError.value = text.value.postError }
  finally { posting.value = false }
}
function reply(thread: CommentThread, message: string, parentId: string) {
  if (props.submitReply) return props.submitReply(thread, message, parentId)
  emit('reply', thread, message.trim())
}
async function retry() {
  if (!props.retryLoad || busy.value) return
  retrying.value = true
  try { await props.retryLoad() }
  catch { /* The host owns the load error. */ }
  finally { retrying.value = false }
}
async function loadPrevious() {
  if (!props.loadOlder || pageBusy.value) return
  paging.value = true
  try { await props.loadOlder(); olderError.value = false }
  catch { olderError.value = true }
  finally { paging.value = false }
}
function hide(element: Element) { element.setAttribute('inert', ''); element.setAttribute('aria-hidden', 'true') }
function focusViewportWhenRemoved(node: HTMLElement | null) {
  if (node?.contains(node.ownerDocument.activeElement)) viewport.value?.focus({ preventScroll: true })
}
watch(() => props.loadError, error => { if (!error) focusViewportWhenRemoved(loadNotices.value?.[0] ?? null) })
watch(() => props.hasOlderComments && Boolean(props.loadOlder), available => { if (!available) focusViewportWhenRemoved(olderControls.value?.[0] ?? null) })
watch(() => props.composerAnchor?.text, value => {
  if (value && !props.disabled) void nextTick(() => composers.value?.[0]?.focus())
})
function selectThread(id: string, active: boolean) {
  if (active) selectedThreadId.value = id
  else if (selectedThreadId.value === id) selectedThreadId.value = null
}
const selectedExists = computed(() => timeline.value.some(entry => entry.kind === 'thread' && entry.thread.id === selectedThreadId.value))
watch([selectedThreadId, selectedExists, viewport, () => props.layout], ([id, exists, scroller, layout], [previousId, previouslyExisted]) => {
  if (!scroller || !id || !exists) return
  const row = Array.from(listNodes.value?.[0]?.children ?? []).find(element => element instanceof HTMLElement && element.dataset.threadId === id)
  if (!(row instanceof HTMLElement)) return
  const behavior = props.animate && !prefersReducedMotion(scroller) ? 'smooth' : 'instant'
  if (layout === 'embedded') {
    if (previousId !== id || !previouslyExisted) row.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' })
    return
  }
  const view = scroller.getBoundingClientRect()
  const rect = row.getBoundingClientRect()
  const above = rect.top - view.top
  const below = rect.bottom - view.bottom
  const delta = above < 0 || below > 0 && rect.height > view.height ? above : Math.max(0, below)
  if (Math.abs(delta) > 1) scroller.scrollBy({ top: delta, behavior })
}, { flush: 'post' })
watch(timeline, (next, previous) => {
  const scroller = viewport.value
  const rows = listNodes.value?.[0]
  if (!scroller || !rows || next.length === previous.length && next.every((item, index) => item.key === previous[index].key)) return
  const focus = scroller.ownerDocument.activeElement
  const focused = focus instanceof HTMLElement && rows.contains(focus) ? focus : undefined
  const edge = scroller.getBoundingClientRect().top
  const keep = pageBusy.value && props.layout === 'pane'
    ? [...rows.children].find((node): node is HTMLElement => node instanceof HTMLElement && !node.inert && node.getBoundingClientRect().bottom > edge)
    : undefined
  const before = keep && rows.offsetTop + keep.offsetTop
  void nextTick(() => {
    if (keep?.isConnected && before !== undefined) scroller.scrollTop += rows.offsetTop + keep.offsetTop - before
    if (!focused || scroller.ownerDocument.activeElement !== scroller.ownerDocument.body) return
    if (focused.isConnected && !focused.closest('[inert]')) focused.focus({ preventScroll: true })
    else scroller.focus({ preventScroll: true })
  })
})
useCollectionContentMotion(panel, () => props.animate ? `${state.value}/${Boolean(props.loadError)}/${Boolean(olderError.value)}/${selectedThreadId.value ?? ''}` : '', {
  items: () => props.animate ? timeline.value : [], animateContent: false, clip: false,
  content: element => element.querySelector('.sy-comments__viewport'),
})
</script>

<template>
  <section v-if="variant === 'timeline'" ref="panel" class="sy-comments sy-comments--timeline" :aria-label="label"
    :data-layout="layout" :data-density="density" :data-animated="animate || undefined">
    <template v-for="part in parts" :key="part">
      <div v-if="part === 'feed'" :ref="node => { viewport = node as HTMLDivElement | null }" class="sy-comments__viewport" tabindex="0">
        <Transition name="sy-comment-part" :css="animate" @before-leave="hide">
          <div v-if="loadError" ref="loadNotice" class="sy-comments__notice">
            <p role="alert"><SMotionText :animate="animate" :value="loadError" wrap /></p>
            <SButton v-if="retryLoad" size="sm" variant="secondary" :loading="retrying" :aria-disabled="busy || undefined" @click="retry">{{ text.retryLoad }}</SButton>
          </div>
        </Transition>
        <Transition name="sy-comment-part" :css="animate" @before-leave="hide">
          <div v-if="hasOlderComments && loadOlder" ref="olderControl" class="sy-comments__older">
            <p v-if="olderError" role="alert">{{ text.olderError }}</p>
            <SButton size="sm" variant="secondary" :loading="pageBusy" :aria-disabled="pageBusy || undefined" @click="loadPrevious">
              <SMotionText :animate="animate" :value="pageBusy ? text.loadingOlder : olderError ? text.retryLoad : text.loadOlder" />
            </SButton>
          </div>
        </Transition>
        <Transition name="sy-comment-part" :css="animate" @before-leave="hide">
          <div v-if="state === 'loading'" class="sy-comments__placeholder">
            <SSpinner size="sm" :label="text.loadingComments" show-label />
            <div v-for="index in 2" :key="index" class="sy-comments__placeholder-row" aria-hidden="true">
              <SSkeleton shape="circle" width="1.75rem" height="1.75rem" :animated="animate" :index="index" />
              <SSkeleton shape="line" width="34%" height=".7rem" :animated="animate" :index="index" />
              <SSkeleton shape="line" width="76%" height=".75rem" :animated="animate" :index="index + 1" />
            </div>
          </div>
        </Transition>
        <Transition name="sy-comment-part" :css="animate" @before-leave="hide">
          <div v-if="state === 'empty'" class="sy-comments__empty"><slot name="empty">{{ text.empty }}</slot></div>
        </Transition>
        <Transition name="sy-comment-part" :css="animate" @before-leave="hide">
          <div v-if="busy && !empty" class="sy-comments__refresh"><SSpinner size="sm" :label="text.loadingComments" /></div>
        </Transition>
        <ol ref="list" class="sy-comments__list" role="list" :aria-busy="busy || undefined">
          <TransitionGroup name="sy-comment-row" :css="animate" @before-leave="hide">
            <li v-for="entry in timeline" :key="entry.key" :data-thread-id="entry.kind === 'thread' ? entry.thread.id : undefined">
              <template v-if="entry.kind === 'event'">
                <slot name="event" :event="entry.event">
                  <div class="sy-comments__event">
                    <span v-if="entry.event.actor" class="sy-comments__actor">{{ entry.event.actor.name }}</span>
                    <SMotionText :animate="animate" :value="entry.event.label" wrap />
                    <component :is="contentUrl(entry.event.href) ? 'a' : 'span'" :href="contentUrl(entry.event.href)" class="sy-comments__time">
                      <STimestamp :value="entry.event.createdAt" :locale="locale" :tooltip="false" />
                    </component>
                    <SMotionText v-if="entry.event.description" class="sy-comments__event-description" :animate="animate" :value="entry.event.description" wrap />
                  </div>
                </slot>
              </template>
              <SCommentThread v-else :thread="entry.thread" :selected="selectedThreadId === entry.thread.id" select-on-press preserve-draft-on-collapse
                :locale="locale" :disabled="disabled" :mode="mode" :animate="animate" :current-user="currentUser" :highlight-color="highlightColor"
                :reply-behavior="replyBehavior" :container="container === 'section' ? 'card' : 'section'" :markdown-plugins="markdownPlugins"
                :composer-triggers="composerTriggers" :upload-images="uploadImages" :reply-count-label="locale === 'zh' ? count => `查看 ${count} 条回复` : undefined"
                :labels="{ ...text, writeReply: text.writeReply ?? `${text.replyPlaceholder} · ${entry.thread.label}` }"
                :submit-reply="(value, parent) => reply(entry.thread, value, parent)"
                :change-resolved="resolved => emit('resolve', entry.thread, resolved)"
                :save-edit="saveEdit ? (message, value) => saveEdit!(entry.thread, message, value) : undefined"
                :delete-comment="deleteComment ? message => deleteComment!(entry.thread, message) : undefined"
                :react="react ? (message, emoji, active) => react!(entry.thread, message, emoji, active) : undefined"
                :retry-comment="retryComment ? message => retryComment!(entry.thread, message) : undefined"
                :load-versions="loadVersions ? (message, signal) => loadVersions!(entry.thread, message, signal) : undefined"
                @update:selected="active => selectThread(entry.thread.id, active)"
                @draft-change="(value, context) => emit('draftChange', value, { ...context, threadId: entry.thread.id })">
                <template v-if="$slots.anchor" #anchor="scope"><slot name="anchor" :thread="entry.thread" v-bind="scope" /></template>
                <template v-if="$slots.body" #body="scope"><slot name="body" :thread="entry.thread" v-bind="scope" /></template>
                <template v-if="$slots.metadata" #metadata="scope"><slot name="metadata" :thread="entry.thread" v-bind="scope" /></template>
              </SCommentThread>
            </li>
          </TransitionGroup>
        </ol>
      </div>
      <div v-else class="sy-comments__composer" :data-position="composerPosition">
        <SCommentComposer ref="composer" :model-value="draft" :label="text.newPlaceholder" :placeholder="text.newPlaceholder"
          :submit-label="text.newThread" :retry-label="text.retry" :anchor="composerAnchor" :anchor-dismissible="dismissComposerAnchor"
          :dismiss-anchor-label="text.dismissAnchor" :highlight-color="highlightColor" :locale="locale" :disabled="disabled"
          :error="composerError || postError" :retryable="Boolean(postError)" :submitting="posting" :triggers="composerTriggers"
          :upload-images="uploadImages" @update:model-value="setDraft" @submit="post" @retry="post" @anchor-dismiss="emit('composerAnchorDismiss')">
          <template v-if="$slots.composerControls" #controls><slot name="composerControls" /></template>
        </SCommentComposer>
      </div>
    </template>
  </section>
  <section v-else class="sy-comments sy-comments--inline" :aria-label="label">
    <article v-for="thread in threads" :key="thread.id" class="sy-comments__thread" :aria-label="thread.label">
      <header>
        <strong>{{ thread.label }}</strong><span v-if="thread.resolved">{{ text.resolved }}</span>
        <SButton variant="ghost" size="sm" :disabled="disabled" @click="emit('resolve', thread, !thread.resolved)">
          {{ thread.resolved ? text.reopen : text.resolve }}
        </SButton>
      </header>
      <ol role="list">
        <li v-for="message in thread.messages" :key="message.id">
          <div><strong>{{ message.author }}</strong>
            <STimestamp v-if="message.createdAt" :value="message.createdAt" :tooltip="false" />
          </div>
          <p>{{ message.text }}</p>
        </li>
      </ol>
      <form v-if="!thread.resolved" @submit.prevent="submit(thread)">
        <STextArea auto-grow :rows="2" :max-rows="6" :model-value="drafts.get(thread.id)"
          :aria-label="text.replyPlaceholder + ' · ' + thread.label" :placeholder="text.replyPlaceholder"
          :disabled="disabled" @update:model-value="drafts.set(thread.id, $event ?? '')" />
        <SButton type="submit" variant="secondary" size="sm" :disabled="disabled || !drafts.get(thread.id)?.trim()">{{ text.reply }}</SButton>
      </form>
    </article>
    <form @submit.prevent="submit()">
      <STextArea auto-grow :rows="2" :max-rows="6" :model-value="drafts.get('')" :label="text.newPlaceholder"
        :disabled="disabled" @update:model-value="drafts.set('', $event ?? '')" />
      <SButton type="submit" size="sm" :disabled="disabled || !drafts.get('')?.trim()">{{ text.newThread }}</SButton>
    </form>
  </section>
</template>
