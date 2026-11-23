<script setup lang="ts">
import { computed, ref } from 'vue'
import { SBadge, SButton, SCommentThread, SDisclosure, type CommentMessage, type CommentParticipant, type CommentThread, type CommentVersion } from '../src'
import bundledHistory from './assets/comment-history.json'
import historyUrl from './assets/comment-history.json?url&no-inline'

const labels = { reply: '回复', writeReply: '写下回复', resolve: '标记完成', reopen: '重新打开', resolved: '已完成',
  edit: '编辑意见', save: '保存编辑', cancel: '取消', remove: '删除意见', confirmRemove: '删除这条意见？', retry: '重试',
  close: '收起讨论', openThread: '展开讨论', hideReplies: '收起回复', history: '版本历史', loading: '正在加载历史', emptyHistory: '暂无版本',
  actionError: '这条回复暂未发送', draftWarning: '草稿尚未发送，再次关闭将放弃草稿。',
  historyError: '版本历史加载失败。', historyClose: '关闭历史', currentVersion: '当前版本',
  edited: '已编辑', unread: '新回复', outdated: '原文已修改', pending: '正在发送…', addReaction: '添加回应', reactions: '回应',
}
const reviewer = { id: 'lin', name: '林舟' }
const collaborator = { id: 'zhou', name: '周昱' }
const author = { id: 'xu', name: '许然' }
const quote = { label: '引用交付说明', text: '发布前复核颜色与资源授权。' }
const review = ref<CommentThread>({ id: 'delivery-thread', label: '交付讨论', anchor: quote,
  messages: [{ id: 'first', author: reviewer.name, authorId: reviewer.id, text: '已复核交付说明。', seenBy: [collaborator] }] })
let sequence = 0
let replyFailed = false
function submitReply(value: string, parent: string) {
  if (!replyFailed) { replyFailed = true; throw new Error('Temporary local preview error') }
  review.value = { ...review.value, messages: [...review.value.messages,
    { id: `${parent}-${++sequence}`, author: reviewer.name, authorId: reviewer.id, text: value }] }
}
function edit(message: CommentMessage, value: string) {
  review.value = { ...review.value, messages: review.value.messages.map(entry => entry.id === message.id ? { ...entry, text: value, edited: true } : entry) }
}
function remove(message: CommentMessage) {
  review.value = { ...review.value, messages: review.value.messages.filter(entry => entry.id !== message.id) }
}
async function readVersions(message: CommentMessage, signal: AbortSignal): Promise<readonly CommentVersion[]> {
  let versions: unknown = bundledHistory
  if (import.meta.env.MODE !== 'theme-sheet') {
    const response = await fetch(historyUrl, { signal, cache: 'no-store' })
    if (!response.ok) throw new Error('Unable to load comment history')
    versions = await response.json()
  }
  if (!Array.isArray(versions) || !versions.every(version => version && typeof version.id === 'string' && typeof version.text === 'string')) {
    throw new Error('Invalid comment history')
  }
  return versions.map(version => ({ ...version, id: `${message.id}-${version.id}` }))
}

const collaborativeOpen = ref(false)
const unread = ref(false)
const outdated = ref(false)
const inputState = ref(0)
const reviewReady = ref(false)
const replies = ref<CommentMessage[]>([])
const participants: readonly (readonly CommentParticipant[])[] = [[], [collaborator, reviewer, collaborator], [collaborator, author, reviewer]]
const collaborative = computed<CommentThread>(() => ({
  id: 'passage-thread', label: '交付段落讨论', anchor: { label: '引用发布计划', text: '完成模板检查后，提交发布记录。', status: outdated.value ? 'orphaned' : 'anchored' },
  highlighted: unread.value, typingUsers: participants[inputState.value],
  messages: [
    { id: 'passage', author: author.name, authorId: author.id, format: 'markdown',
      text: '需要在 **发布记录** 里补充复核结果。\n\n先检查模板中的日期和时区，再核对文档中使用的名称。\n\n请在附件更新后通知负责发布的同事，并附上新版的文档链接。', seenBy: [collaborator] },
    { id: 'followup', author: collaborator.name, authorId: collaborator.id, text: '我会补上发布前的截图和核对记录。', unread: unread.value },
    { id: 'agent', author: '检查助手', authorId: 'agent', text: '模板检查完成，时间和时区已核对。',
      progress: reviewReady.value ? undefined : { label: '正在核对模板中的时间…', link: { label: '查看接入', href: '#接入' } } },
    ...replies.value,
  ],
}))
function addCollaborativeReply(value: string) {
  replies.value = [...replies.value, { id: `reply-${++sequence}`, author: reviewer.name, authorId: reviewer.id, text: value }]
}
</script>

<template>
  <SCommentThread :thread="review" current-user="lin" dismissible container="card" locale="zh" :labels="labels"
    :reply-count-label="count => `查看 ${count} 条回复`" :submit-reply="submitReply" :save-edit="edit" :delete-comment="remove" :load-versions="readVersions"
    :change-resolved="value => { review = { ...review, resolved: value, resolvedBy: value ? reviewer : undefined } }" />
  <SDisclosure title="协作状态" variant="plain">
    <div class="review__stack">
      <div class="review__row">
        <SButton size="sm" variant="secondary" :aria-pressed="collaborativeOpen" @click="collaborativeOpen = !collaborativeOpen">选中讨论</SButton>
        <SButton size="sm" variant="secondary" :aria-pressed="unread" @click="unread = !unread">{{ unread ? '标为已读' : '收到未读回复' }}</SButton>
        <SButton size="sm" variant="secondary" :aria-pressed="outdated" @click="outdated = !outdated">标记原文过期</SButton>
        <SButton size="sm" variant="secondary" @click="inputState = (inputState + 1) % 3">切换输入状态</SButton>
        <SButton size="sm" variant="ghost" :aria-pressed="reviewReady" @click="reviewReady = !reviewReady">完成助手检查</SButton>
      </div>
      <SCommentThread v-model:selected="collaborativeOpen" :thread="collaborative" current-user="lin" container="card" select-on-press
        reply-behavior="explicit" locale="zh" :labels="labels" :reply-count-label="count => `查看 ${count} 条回复`" :submit-reply="addCollaborativeReply">
        <template #metadata="{ message }">
          <SBadge v-if="message.seenBy?.length" tone="neutral" :label="`已读 ${message.seenBy.map(user => user.name).join('、')}`" />
        </template>
      </SCommentThread>
    </div>
  </SDisclosure>
</template>
