<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { SButton, SComments, type CommentActivityEvent, type CommentAnchor, type CommentThread } from '../src'
import bundledArchive from './assets/earlier-discussions.json'
import archive from './assets/earlier-discussions.json?url&no-inline'

const threads = shallowRef<readonly CommentThread[]>([
  { id: 'review', label: '状态提示', messages: [{ id: '1', author: '林舟', text: '请为禁用状态补充可读的说明。', createdAt: '2026-11-19T09:00:00Z' }] },
  { id: 'keyboard', label: '键盘检查', anchor: { text: '关闭面板后，焦点应返回原来的打开按钮。', label: '交互规范' }, messages: [
    { id: '2', author: '杨帆', text: '已经补上关闭面板时的焦点恢复规则。', createdAt: '2026-11-19T10:00:00Z' },
    { id: '3', author: '许宁', text: '请一并检查 Escape 和关闭按钮。', createdAt: '2026-11-19T10:20:00Z' },
  ] },
])
const events = shallowRef<readonly CommentActivityEvent[]>([
  { id: 'review-started', label: '将版本移入评审', actor: { id: 'ning', name: '许宁' }, createdAt: '2026-11-19T09:30:00Z' },
])
const selected = ref<string | null>('review')
const quoted = shallowRef<CommentAnchor>()
const activityFirst = ref(false)
const hasOlder = ref(true)
const labels = {
  newThread: '发表评论', newPlaceholder: '填写评论', reply: '回复', replyPlaceholder: '填写回复', resolve: '解决', reopen: '重新打开',
  resolved: '已解决', openThread: '展开讨论', close: '收起讨论', hideReplies: '收起回复', edit: '编辑', save: '保存', cancel: '取消',
  remove: '删除', confirmRemove: '删除这条评论？', retry: '重试', history: '编辑记录', historyClose: '关闭历史记录', actionError: '暂时无法保存更改。',
  empty: '还没有讨论。', loadingComments: '正在加载讨论', loadOlder: '加载更早的讨论', loadingOlder: '正在加载更早的讨论',
  olderError: '无法加载更早的讨论。', retryLoad: '重试加载讨论', postError: '暂时无法发表评论。', addReaction: '添加回应', reactions: '回应', dismissAnchor: '移除引用',
}
let controller: AbortController | undefined
let messageId = 3
onBeforeUnmount(() => controller?.abort())

function newMessage(text: string) {
  return { id: String(++messageId), author: '我', authorId: 'viewer', text, createdAt: new Date().toISOString() }
}
function updateThread(thread: CommentThread, change: (current: CommentThread) => CommentThread) {
  threads.value = threads.value.map(item => item.id === thread.id ? change(item) : item)
}
function reply(thread: CommentThread, text: string) {
  updateThread(thread, current => ({ ...current, messages: [...current.messages, newMessage(text)] }))
}
function addThread(text: string, { anchor }: { anchor?: CommentAnchor }) {
  const message = newMessage(text)
  threads.value = [...threads.value, { id: message.id, label: '组件评审', anchor, messages: [message] }]
  if (quoted.value === anchor) quoted.value = undefined
}
function resolve(thread: CommentThread, resolved: boolean) {
  updateThread(thread, current => ({ ...current, resolved }))
  events.value = [...events.value, {
    id: `status-${++messageId}`, label: `${resolved ? '解决了' : '重新打开了'}「${thread.label}」`, actor: { id: 'viewer', name: '我' }, createdAt: new Date().toISOString(),
  }]
}
function prependEarlier(previous: readonly CommentThread[]) {
  const known = new Set(threads.value.map(thread => thread.id))
  threads.value = [...previous.filter(thread => !known.has(thread.id)), ...threads.value]
  hasOlder.value = false
}
async function loadOlder() {
  if (import.meta.env.MODE === 'theme-sheet') {
    prependEarlier(bundledArchive)
    return
  }
  const request = new AbortController()
  controller = request
  try {
    const response = await fetch(archive, { signal: request.signal })
    if (!response.ok) throw new Error('Unable to load earlier discussions')
    const previous = await response.json() as CommentThread[]
    if (!request.signal.aborted) prependEarlier(previous)
  } finally {
    if (controller === request) controller = undefined
  }
}
</script>

<template>
  <div class="review__row comments-review__actions">
    <SButton size="sm" variant="secondary" :aria-pressed="activityFirst" @click="activityFirst = !activityFirst">最近活动优先</SButton>
    <SButton size="sm" variant="secondary" @click="selected = 'keyboard'">查看键盘检查</SButton>
    <SButton size="sm" variant="secondary" @click="quoted = { label: '交互规范', text: '组件预览在加载时继续保持纯白底色。' }">引用交互规范</SButton>
  </div>
  <SComments v-model:selected-thread-id="selected" variant="timeline" layout="pane" locale="zh" current-user="viewer" class="comments-review__pane"
    :threads="threads" :events="events" :order="activityFirst ? 'activity' : 'oldest'" label="评审讨论" :labels="labels"
    :has-older-comments="hasOlder" :load-older="loadOlder" :composer-anchor="quoted" dismiss-composer-anchor :submit-comment="addThread"
    @composer-anchor-dismiss="quoted = undefined" @reply="reply" @resolve="resolve" />
</template>

<style scoped>
.comments-review__actions { margin-block-end: var(--sy-space-3); }
.comments-review__pane { block-size: min(36rem, 78dvh); }
</style>
