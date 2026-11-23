<script lang="ts">
import type { CommentVersion } from '../internal/comment-data'
export type { CommentVersion } from '../internal/comment-data'
export type CommentThreadLabels = Partial<Record<'reply' | 'writeReply' | 'resolve' | 'reopen' | 'resolved' | 'edit' | 'save' | 'cancel' | 'remove' | 'confirmRemove'
  | 'retry' | 'close' | 'history' | 'loading' | 'emptyHistory' | 'draftWarning' | 'actionError' | 'addReaction' | 'reactions'
  | 'openThread' | 'hideReplies' | 'outdated' | 'edited' | 'unread' | 'pending' | 'historyError' | 'historyClose' | 'currentVersion', string>>
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import type { CommentAnchor, CommentMessage, CommentParticipant, CommentThread } from '../internal/comment-data'
import type { CommentImage } from './SCommentComposer.vue'
import type { ChatComposerTrigger } from './SChatComposerInput.vue'
import type { MarkdownTransform } from '../internal/markdown-content'
import { useCollectionContentMotion } from '../internal/collection-motion'
import { createAnimator } from '../internal/motion'
import SCommentThreadMessage from '../internal/SCommentThreadMessage.vue'
import SAlertDialog from './SAlertDialog.vue'
import SBadge from './SBadge.vue'
import SButton from './SButton.vue'
import SChatReactionBar from './SChatReactionBar.vue'
import SCommentComposer from './SCommentComposer.vue'
import SDialog from './SDialog.vue'
import SMarkdown from './SMarkdown.vue'
import SMotionText from './SMotionText.vue'
import SSkeleton from './SSkeleton.vue'
import SSpinner from './SSpinner.vue'
import STimestamp from './STimestamp.vue'

const props = withDefaults(defineProps<{
  thread: CommentThread
  currentUser?: string
  anchor?: CommentAnchor
  highlightColor?: string
  dismissible?: boolean
  selectOnPress?: boolean
  preserveDraftOnCollapse?: boolean
  replyBehavior?: 'when-selected' | 'explicit'
  mode?: 'interactive' | 'non-editable' | 'read-only'
  container?: 'section' | 'card'
  submitting?: boolean
  disabled?: boolean
  animate?: boolean
  locale?: 'en' | 'zh'
  typingLabel?: (users: readonly CommentParticipant[]) => string
  replyCountLabel?: (count: number) => string
  composerTriggers?: readonly ChatComposerTrigger[]
  markdownPlugins?: readonly MarkdownTransform[]
  labels?: CommentThreadLabels
  submitReply?: (text: string, parent: string) => void | Promise<void>
  saveEdit?: (message: CommentMessage, text: string) => void | Promise<void>
  deleteComment?: (message: CommentMessage) => void | Promise<void>
  react?: (message: CommentMessage, emoji: string, selected: boolean) => void
  retryComment?: (message: CommentMessage) => void
  changeResolved?: (resolved: boolean) => void
  loadVersions?: (message: CommentMessage, signal: AbortSignal) => readonly CommentVersion[] | Promise<readonly CommentVersion[]>
  uploadImages?: (files: readonly File[], signal: AbortSignal) => readonly CommentImage[] | Promise<readonly CommentImage[]>
}>(), { mode: 'interactive', container: 'section', animate: true, replyBehavior: 'when-selected' })
const selected = defineModel<boolean>('selected', { default: true })
const emit = defineEmits<{ dismiss: []; draftChange: [text: string, context: { type: 'reply' | 'edit'; id: string }] }>()
const slots = defineSlots<{
  composer?(props: { message: CommentMessage | undefined; draft: string }): unknown
  anchor?(props: { anchor: CommentAnchor }): unknown
  body?(props: { message: CommentMessage }): unknown
  metadata?(props: { message: CommentMessage }): unknown
}>()
const id = `sy-comment-thread-${useId()}`
const root = useTemplateRef<HTMLElement>('root')
const composer = useTemplateRef<InstanceType<typeof SCommentComposer>>('composer')
const historyStage = useTemplateRef<HTMLDivElement>('historyStage')
const historyNotice = useTemplateRef<HTMLDivElement>('historyNotice')
const editBox = shallowRef<InstanceType<typeof SCommentComposer>>()
const reply = ref('')
const replyRequested = ref(false)
const editing = shallowRef<CommentMessage>()
const editDraft = ref('')
const activeDelete = shallowRef<CommentMessage>()
const historyMessage = shallowRef<CommentMessage>()
const historyOpen = ref(false)
const history = shallowRef<readonly CommentVersion[]>([])
const loading = ref(false)
const historyError = ref(false)
const error = ref('')
const warned = ref(false)
const saving = ref(false)
const deleting = computed({ get: () => Boolean(activeDelete.value), set: open => { if (!open) activeDelete.value = undefined } })
const readOnly = computed(() => props.mode === 'read-only' || props.disabled)
const locked = computed(() => readOnly.value || props.submitting || saving.value)
const first = computed(() => props.thread.messages[0])
const anchorText = computed(() => props.anchor ?? props.thread.anchor)
const replyCount = computed(() => Math.max(0, props.thread.messages.length - 1))
const unreadReveal = computed(() => !selected.value && props.thread.messages.slice(1).some(message => message.unread))
const repliesVisible = computed(() => selected.value || unreadReveal.value)
const visible = computed(() => repliesVisible.value ? props.thread.messages : props.thread.messages.slice(0, 1))
const ready = (message: CommentMessage) => !message.progress && (!message.status || message.status === 'ready')
const canReply = computed(() => !readOnly.value && !props.thread.resolved && Boolean(props.submitReply || slots.composer)
  && (first.value ? ready(first.value) && first.value.canReply !== false : Boolean(slots.composer)))
const showComposer = computed(() => selected.value && canReply.value && (props.replyBehavior === 'when-selected' || replyRequested.value))
const typingUsers = computed(() => [...new Map((props.thread.typingUsers ?? [])
  .filter(user => user.id !== props.currentUser).map(user => [user.id, user])).values()])
const showTyping = computed(() => selected.value && !props.thread.resolved && typingUsers.value.length > 0)
const typing = computed(() => props.typingLabel?.(typingUsers.value) ?? (props.locale === 'zh'
  ? `${typingUsers.value.map(user => user.name).join('、')}正在输入…`
  : `${typingUsers.value.map(user => user.name).join(', ')} ${typingUsers.value.length === 1 ? 'is' : 'are'} typing…`))
const historyState = computed(() => loading.value ? 'loading' : historyError.value ? 'error' : history.value.length ? 'ready' : 'empty')
const text = computed(() => ({
  reply: 'Reply', writeReply: 'Write a reply…', resolve: 'Resolve', reopen: 'Reopen', resolved: 'Resolved',
  edit: 'Edit', save: 'Save', cancel: 'Cancel', remove: 'Delete', confirmRemove: 'Delete this comment?', retry: 'Retry',
  close: 'Close thread', openThread: 'Open thread', hideReplies: 'Hide replies', history: 'Edit history', loading: 'Loading history…',
  emptyHistory: 'No versions', historyError: 'Could not load the version history.', historyClose: 'Close history', currentVersion: 'Current version',
  draftWarning: 'A draft is unsaved. Close again to discard it.', actionError: 'Could not save the change.',
  addReaction: 'Add reaction', reactions: 'Reactions', outdated: 'Outdated', edited: 'Edited', unread: 'New', pending: 'Sending…', ...props.labels,
}))
const repliesLabel = computed(() => props.replyCountLabel?.(replyCount.value) ?? `View ${replyCount.value} ${replyCount.value === 1 ? 'reply' : 'replies'}`)
let historyRequest: AbortController | undefined
let draftAnimation: ReturnType<typeof createAnimator> | undefined
let revision = 0
onBeforeUnmount(() => { revision++; historyRequest?.abort(); draftAnimation?.dispose() })

function authorCan(message: CommentMessage, action: 'canEdit' | 'canDelete') {
  return !readOnly.value && props.mode === 'interactive' && !message.progress && message.status !== 'pending'
    && (message[action] ?? props.currentUser === (message.authorId ?? message.author))
}
function canReact(message: CommentMessage) { return !readOnly.value && ready(message) && message.canReact !== false && Boolean(props.react) }
function bindEdit(node: unknown) { editBox.value = (node as InstanceType<typeof SCommentComposer> | null) ?? undefined }
function setDraft(value: string, type: 'reply' | 'edit', id: string) {
  warned.value = false
  emit('draftChange', value, { type, id })
}
function cancelEdit(restore = true) {
  const message = editing.value
  editing.value = undefined
  editDraft.value = ''
  if (message) setDraft('', 'edit', message.id)
  if (restore && message) void nextTick(() => {
    const row = [...(root.value?.querySelectorAll<HTMLElement>('[data-comment-id]') ?? [])].find(item => item.dataset.commentId === message.id)
    row?.querySelector<HTMLElement>('[data-edit-comment]')?.focus({ preventScroll: true })
  })
}
function edit(message: CommentMessage) {
  if (locked.value || !props.saveEdit || !authorCan(message, 'canEdit') || !ready(message)) return
  if (props.preserveDraftOnCollapse) selected.value = true
  editing.value = message
  editDraft.value = message.text
  error.value = ''
  setDraft(editDraft.value, 'edit', message.id)
  void nextTick(() => editBox.value?.focus())
}
async function perform(action: () => void | Promise<void>, success: () => void) {
  if (locked.value) return
  const current = ++revision
  error.value = ''
  saving.value = true
  try { await action(); if (current === revision) success() }
  catch { if (current === revision) error.value = text.value.actionError }
  finally { if (current === revision) saving.value = false }
}
function post() {
  const message = first.value
  if (!message || !canReply.value || !props.submitReply || !reply.value.trim()) return
  void perform(() => props.submitReply!(reply.value, message.id), () => { reply.value = ''; setDraft('', 'reply', message.id) })
}
function save() {
  const message = editing.value
  if (message && props.saveEdit && editDraft.value.trim()) void perform(() => props.saveEdit!(message, editDraft.value), () => cancelEdit())
}
function remove() {
  const message = activeDelete.value
  if (message && props.deleteComment) void perform(() => props.deleteComment!(message), () => { activeDelete.value = undefined })
}

function cancelHistory() {
  historyRequest?.abort()
  historyRequest = undefined
  loading.value = false
}
async function readHistory(message: CommentMessage) {
  if (!props.loadVersions) return
  cancelHistory()
  const controller = new AbortController()
  historyRequest = controller
  loading.value = true
  historyError.value = false
  try {
    const items = await props.loadVersions(message, controller.signal)
    if (historyRequest === controller && !controller.signal.aborted) history.value = items
  } catch {
    if (historyRequest === controller && !controller.signal.aborted) historyError.value = true
  } finally {
    if (historyRequest === controller) { historyRequest = undefined; loading.value = false }
  }
}
function versions(message: CommentMessage) {
  cancelHistory()
  historyMessage.value = message
  history.value = message.previousVersions ?? []
  historyError.value = false
  historyOpen.value = true
  if (!history.value.length) void readHistory(message)
}
watch(historyOpen, open => { if (!open) cancelHistory() })
watch(historyState, () => {
  const notice = historyNotice.value
  if (notice?.contains(notice.ownerDocument.activeElement)) historyStage.value?.focus({ preventScroll: true })
})

function openThread(replyNow = false) {
  selected.value = true
  if (!replyNow || !canReply.value) return
  replyRequested.value = true
  void nextTick(() => composer.value?.focus())
}
function cardPress(event: MouseEvent) {
  if (!props.selectOnPress || selected.value || event.defaultPrevented || event.button !== 0) return
  const target = event.target
  if (!(target instanceof Element) || target.closest('button, a, input, textarea, select, label, summary, dialog, [tabindex]:not(.sy-comment-thread), [contenteditable], [role="button"], [role="dialog"]')) return
  if (target.ownerDocument.getSelection()?.isCollapsed === false) return
  openThread()
}
function collapse() {
  if (!selected.value || saving.value || props.submitting) return false
  if (props.preserveDraftOnCollapse) {
    selected.value = false
    return true
  }
  const unsaved = Boolean(reply.value.trim() || editing.value && editDraft.value !== editing.value.text)
  if (unsaved && !warned.value) {
    warned.value = true
    if (props.animate && root.value && typeof root.value.animate === 'function') {
      draftAnimation ??= createAnimator(root.value)
      draftAnimation.animate('draft', [{ translate: '0' }, { translate: '4px' }, { translate: '-4px' }, { translate: '0' }], { role: 'press' })
    }
    if (editing.value) editBox.value?.focus()
    else composer.value?.focus()
    return false
  }
  if (first.value) setDraft('', 'reply', first.value.id)
  reply.value = ''
  cancelEdit(false)
  replyRequested.value = false
  selected.value = false
  return true
}
function dismiss() { if (props.dismissible && collapse()) emit('dismiss') }
function escape(event: KeyboardEvent) {
  if (!props.dismissible || !selected.value || event.defaultPrevented) return
  const layer = (event.target as Element | null)?.closest?.('dialog[open], [role="dialog"], [role="alertdialog"], [role="listbox"]')
  if (layer && root.value?.contains(layer)) return
  event.preventDefault()
  event.stopPropagation()
  dismiss()
}
function rearm(event: PointerEvent) {
  if (!(event.target as Element | null)?.closest?.('[data-thread-close]')) warned.value = false
}
function dismissHistory(event: KeyboardEvent) {
  event.preventDefault()
  event.stopPropagation()
  historyOpen.value = false
}
function returnToThread(node: HTMLElement) {
  void nextTick(() => (node.querySelector<HTMLElement>('[data-thread-open], [data-thread-replies]') ?? node).focus({ preventScroll: true }))
}
watch(selected, active => {
  if (active) return
  const node = root.value
  const focused = node?.ownerDocument.activeElement
  const mayDisappear = focused?.closest('[data-thread-close], [data-reply], .sy-comment-thread__reply, [data-comment-editor]')
  if (mayDisappear && node?.contains(mayDisappear) && !(unreadReveal.value && mayDisappear.matches('[data-reply]'))) {
    returnToThread(node)
  }
  replyRequested.value = false
})
watch(repliesVisible, active => {
  const node = root.value
  const row = node?.ownerDocument.activeElement?.closest('[data-reply]')
  if (!active && row && node?.contains(row)) returnToThread(node)
})
watch(() => props.thread.id, () => {
  revision++
  historyOpen.value = false
  cancelHistory()
  editing.value = undefined
  activeDelete.value = undefined
  replyRequested.value = false
  reply.value = editDraft.value = error.value = ''
  saving.value = warned.value = false
})
watch([root, selected, () => props.dismissible], ([node, open, dismissible], _, cleanup) => {
  if (!node || !open || !dismissible) return
  const document = node.ownerDocument
  function outside(event: PointerEvent) {
    const target = event.target
    if (target instanceof Element && !node?.contains(target) && !target.closest('[role="dialog"],[role="alertdialog"]')) dismiss()
  }
  document.addEventListener('pointerdown', outside)
  cleanup(() => document.removeEventListener('pointerdown', outside))
}, { flush: 'post' })

const noRows: readonly unknown[] = []
useCollectionContentMotion(root, () => props.animate ? `${selected.value}/${unreadReveal.value}/${showComposer.value}/${showTyping.value}/${editing.value?.id ?? ''}/${warned.value}` : '', {
  items: () => props.animate ? visible.value : noRows, animateContent: false, clip: false,
  content: element => element.querySelector('.sy-comment-thread__messages'),
})
useCollectionContentMotion(historyStage, () => props.animate && historyOpen.value ? historyState.value : '', {
  items: () => props.animate && historyOpen.value ? history.value : noRows, animateContent: false,
  content: element => element.querySelector('.sy-comment-history__content'),
})
function hide(element: Element) { element.setAttribute('inert', ''); element.setAttribute('aria-hidden', 'true') }
</script>

<template>
  <article ref="root" class="sy-comment-thread" :data-container="container" :data-selected="selected || undefined" tabindex="-1"
    :data-highlighted="thread.highlighted || undefined" :data-resolved="thread.resolved || undefined" :data-animated="animate || undefined"
    :data-unread-replies="unreadReveal || undefined" :aria-label="thread.label" @keydown.esc="escape" @pointerdown="rearm" @click="cardPress">
    <header class="sy-comment-thread__header">
      <strong>{{ thread.label }}</strong>
      <Transition name="sy-comment-part" :css="animate">
        <SBadge v-if="thread.resolved" tone="green" :label="text.resolved" :title="thread.resolvedBy?.name" />
      </Transition>
      <SButton v-if="changeResolved && !readOnly && thread.canResolve !== false" size="sm" variant="ghost" :disabled="locked" @click="changeResolved(!thread.resolved)">
        <SMotionText v-if="animate" :value="thread.resolved ? text.reopen : text.resolve" /><template v-else>{{ thread.resolved ? text.reopen : text.resolve }}</template>
      </SButton>
      <SButton v-if="canReply && !showComposer" size="sm" variant="secondary" data-thread-open @click="openThread(true)">{{ text.reply }}</SButton>
      <SButton v-if="!replyCount && (preserveDraftOnCollapse || !selected && !canReply)" size="sm" variant="ghost" data-thread-open
        :aria-expanded="selected" :aria-controls="`${id}-messages`" :aria-disabled="saving || submitting || undefined" @click="selected ? collapse() : openThread()">
        <SMotionText :animate="animate" :value="selected ? text.close : text.openThread" />
      </SButton>
      <SButton v-if="dismissible && selected" size="sm" variant="ghost" data-thread-close @click="dismiss">{{ text.close }}</SButton>
    </header>
    <Transition name="sy-comment-part" :css="animate" @before-leave="hide">
      <blockquote v-if="anchorText" class="sy-comment-composer__quote sy-comment-thread__quote" :style="{ '--sy-comment-border': highlightColor }">
        <slot name="anchor" :anchor="anchorText">
          <div><strong v-if="anchorText.label">{{ anchorText.label }}</strong><p>{{ anchorText.text }}</p></div>
        </slot>
        <Transition name="sy-comment-part" :css="animate">
          <SBadge v-if="anchorText.status === 'orphaned'" tone="warning" :label="text.outdated" />
        </Transition>
      </blockquote>
    </Transition>
    <Transition name="sy-comment-part" :css="animate" @before-leave="hide"><p v-if="warned" role="status">{{ text.draftWarning }}</p></Transition>
    <p v-if="error && !submitReply && !editing && !activeDelete" class="sy-comment-thread__error" role="alert">{{ error }}</p>
    <TransitionGroup :id="`${id}-messages`" tag="ol" name="sy-comment-row" :css="animate" class="sy-comment-thread__messages" role="list" @before-leave="hide">
      <SCommentThreadMessage v-for="(message, index) in visible" :key="message.id" :message="message" :reply="index > 0"
        :clamped="!index && !selected" :animate="animate" :edited-text="text.edited" :unread-text="text.unread" :pending-text="text.pending" :locale="locale" :markdown-plugins="markdownPlugins">
        <template v-if="editing?.id === message.id && (!preserveDraftOnCollapse || selected)" #editor>
          <SCommentComposer :ref="bindEdit" v-model="editDraft" data-comment-editor :label="text.edit" :submit-label="text.save" :submitting="saving"
            :error="error" :retryable="Boolean(error)" :retry-label="text.retry" :triggers="composerTriggers" :upload-images="uploadImages"
            @submit="save" @retry="save" @update:model-value="setDraft($event, 'edit', message.id)">
            <template #controls><SButton size="sm" variant="ghost" :disabled="saving" @click="cancelEdit()">{{ text.cancel }}</SButton></template>
          </SCommentComposer>
        </template>
        <template v-if="$slots.body" #body><slot name="body" :message="message" /></template>
        <template v-if="$slots.metadata" #metadata><slot name="metadata" :message="message" /></template>
        <template #actions>
          <SChatReactionBar v-if="message.reactions?.length || canReact(message)" :reactions="message.reactions ?? []"
            :label="text.reactions" :addable="canReact(message)" :add-label="text.addReaction" :locale="locale" :disabled="!canReact(message)"
            @toggle="(emoji, next) => canReact(message) && react?.(message, emoji, next)" @add="emoji => canReact(message) && react?.(message, emoji, true)" />
          <div class="sy-comment-thread__actions">
            <SButton v-if="authorCan(message, 'canEdit') && ready(message) && saveEdit && editing?.id !== message.id" size="sm" variant="ghost" data-edit-comment :disabled="locked" @click="edit(message)">{{ text.edit }}</SButton>
            <SButton v-if="authorCan(message, 'canDelete') && deleteComment" size="sm" variant="ghost" :disabled="locked" @click="activeDelete = message">{{ text.remove }}</SButton>
            <SButton v-if="loadVersions || message.previousVersions?.length" size="sm" variant="ghost" @click="versions(message)">{{ text.history }}</SButton>
            <SButton v-if="message.status === 'error' && retryComment && !readOnly" size="sm" variant="secondary" :disabled="locked" @click="retryComment(message)">{{ text.retry }}</SButton>
          </div>
        </template>
      </SCommentThreadMessage>
    </TransitionGroup>
    <SButton v-if="replyCount && !unreadReveal" data-thread-close data-thread-replies size="sm" variant="ghost" class="sy-comment-thread__replies"
      :aria-expanded="repliesVisible" :aria-controls="`${id}-messages`" :aria-disabled="saving || submitting || undefined" @click="selected ? collapse() : openThread()">
      <SMotionText v-if="animate" :value="repliesVisible ? text.hideReplies : repliesLabel" /><template v-else>{{ repliesVisible ? text.hideReplies : repliesLabel }}</template>
    </SButton>
    <Transition name="sy-comment-part" :css="animate" @before-leave="hide">
      <div v-if="showTyping" class="sy-comment-thread__typing" role="status">
        <span class="sy-comment-thread__dots" :data-animated="animate || undefined" aria-hidden="true"><i></i><i></i><i></i></span>
        <SMotionText v-if="animate" :value="typing" wrap /><template v-else>{{ typing }}</template>
      </div>
    </Transition>
    <Transition name="sy-comment-part" :css="animate" @before-leave="hide">
      <div v-if="showComposer && (submitReply || $slots.composer)" class="sy-comment-thread__reply">
        <slot name="composer" :message="first" :draft="reply">
          <SCommentComposer v-if="submitReply && first" ref="composer" v-model="reply" :label="text.writeReply" :placeholder="text.writeReply"
            :submit-label="text.reply" :submitting="submitting || saving" :error="editing ? '' : error" :retryable="Boolean(error)" :retry-label="text.retry"
            :triggers="composerTriggers" :upload-images="uploadImages" :locale="locale"
            @submit="post" @retry="post" @update:model-value="setDraft($event, 'reply', first.id)" />
        </slot>
      </div>
    </Transition>
    <SAlertDialog v-model:open="deleting" :title="text.confirmRemove" :cancel-label="text.cancel" :confirm-label="text.remove"
      :close-on-confirm="false" :pending="saving" @confirm="remove">
      <p v-if="error" role="alert">{{ error }}</p>
    </SAlertDialog>
    <SDialog v-model:open="historyOpen" class="sy-comment-history-dialog" :title="text.history" :dismiss-label="text.historyClose"
      max-height="min(75dvh, 36rem)" @keydown.esc="dismissHistory">
      <div ref="historyStage" class="sy-comment-history" tabindex="-1" role="group" :aria-label="text.history" :data-state="historyState">
        <div class="sy-comment-history__content">
          <Transition name="sy-comment-part" :css="animate" @before-leave="hide">
            <div v-if="historyState !== 'ready'" :key="historyState" ref="historyNotice" class="sy-comment-history__notice">
              <template v-if="loading">
                <div class="sy-comment-history__skeleton" aria-hidden="true">
                  <SSkeleton v-for="(width, index) in ['32%', '86%', '69%']" :key="width" shape="line" :width="width" height=".68rem" :index="index" :animated="animate" />
                </div>
                <SSpinner size="sm" :label="text.loading" show-label />
              </template>
              <template v-else-if="historyError">
                <span role="alert">{{ text.historyError }}</span>
                <SButton v-if="historyMessage" size="sm" variant="secondary" @click="readHistory(historyMessage)">{{ text.retry }}</SButton>
              </template>
              <span v-else role="status">{{ text.emptyHistory }}</span>
            </div>
            <ol v-else class="sy-comment-history__versions" role="list">
              <li v-for="version in history" :key="version.id">
                <div v-if="version.updatedAt || version.author || version.current" class="sy-comment-history__metadata">
                  <strong v-if="version.author">{{ version.author.name }}</strong>
                  <STimestamp v-if="version.updatedAt" :value="version.updatedAt" :tooltip="false" />
                  <SBadge v-if="version.current" :label="text.currentVersion" />
                </div>
                <SMarkdown :source="version.text" :plugins="markdownPlugins" />
              </li>
            </ol>
          </Transition>
        </div>
      </div>
    </SDialog>
  </article>
</template>
