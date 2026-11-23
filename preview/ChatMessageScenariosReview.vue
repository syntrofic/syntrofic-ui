<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SAvatar, SButton, SChatConversation, SChatMessage, SChatMessageActions, SChatMessageBubble, SChatMessageMetadata,
  SChatSystemMessage, SChatTokenizedText, SChip, SCodeBlock, SMarkdown, SMotionText, SSegment, SSwitch, STimestamp,
  type ChatDeliveryStatus, type ChatMessageFeedback, type ChatTextToken,
} from '../src'

defineProps<{ kind: 'messages' | 'transcript' }>()

const roles = { user: '发布同事', assistant: '校对助手', system: '发布记录' }
const deliveries: ChatDeliveryStatus[] = ['sending', 'sent', 'delivered', 'read', 'error']
const receiptLabels = { sending: '发送中', sent: '已发送', delivered: '已送达', read: '已读', error: '发送失败' }
const density = ref<'compact' | 'balanced' | 'spacious' | null>('balanced')
const densities = [
  { value: 'compact', label: '紧凑气泡' }, { value: 'balanced', label: '标准气泡' }, { value: 'spacious', label: '宽松气泡' },
]
const receipt = ref(0)
const receiptTime = computed(() => '14:' + String(26 + receipt.value).padStart(2, '0'))
const receiptDate = computed(() => `2026-11-22T${receiptTime.value}:00+08:00`)
function advanceReceipt() { receipt.value = (receipt.value + 1) % deliveries.length }
const selectedFeedback = ref<ChatMessageFeedback>(null)
const note = ref('')
const summary = ref('两份发布说明已校对。请在归档前核对许可证。')
const actions = { copy: '复制校对摘要', copied: '已复制摘要', 'copy-error': '摘要复制失败', like: '摘要有用', dislike: '摘要需调整', retry: '重新核对' }
function refreshSummary() {
  summary.value = '两份发布说明已校对。许可证已补齐，可以归档。'
  note.value = '已更新校对摘要'
}
const logIndex = ref(0)
const logUpdates = [
  { icon: 'users', text: '发布负责人已加入对话' },
  { icon: 'lock', text: '交付目录已设为只读' },
  { icon: 'success', text: '发布记录已归档' },
]
const approved = ref(false)
const tokens = computed<ChatTextToken[]>(() => [
  { value: '@校对组', label: '校对组', tone: 'blue' },
  { value: '@校对', label: '校对', tone: 'blue' },
  { value: '#范围', label: '发布范围', tone: 'teal' },
  { value: '#核对', label: '核对状态', tone: approved.value ? 'green' : 'red' },
])
const releaseCode = [
  'const releaseDay = new Intl.DateTimeFormat("zh-CN", {',
  '  timeZone: "Asia/Shanghai",',
  '  dateStyle: "medium",',
  '})',
  'export const formatReleaseDay = (date: Date) => releaseDay.format(date)',
].join('\n')
</script>

<template>
  <template v-if="kind === 'messages'">
    <section class="chat-message-scenarios" aria-label="连续气泡与回执">
      <h3>连续气泡与回执</h3>
      <div class="review__row">
        <SSegment v-model="density" label="气泡密度" :items="densities" size="sm" />
        <SButton variant="secondary" size="sm" @click="advanceReceipt">推进发送回执</SButton>
      </div>
      <SChatConversation initial-position="start" height="33rem" label="发布对话气泡" :density="density ?? 'balanced'">
        <SChatMessage message-role="user" :role-labels="roles">
          <template #bubbles>
            <SChatMessageBubble group="first" name="发布同事">这是新版发布说明。</SChatMessageBubble>
            <SChatMessageBubble group="middle">先核对版权和下载链接。</SChatMessageBubble>
            <SChatMessageBubble group="last">
              确认后把摘要放入归档。
              <template #metadata>
                <SChatMessageMetadata sender="user" :datetime="receiptDate" :timestamp="receiptTime"
                  :status="deliveries[receipt]" :status-labels="receiptLabels" />
              </template>
            </SChatMessageBubble>
          </template>
        </SChatMessage>
        <SChatMessage :role-labels="roles" show-avatar>
          <template #avatar><SAvatar name="校对助手" initials="校" size="md" :tooltip="false" /></template>
          <template #bubbles>
            <SChatMessageBubble group="first" name="校对助手">
              <SMarkdown source="我会先校对 **发布范围** 和许可证。" density="compact" />
            </SChatMessageBubble>
            <SChatMessageBubble group="last" variant="ghost" width="28rem">
              <SMotionText :value="summary" wrap />
              <template #metadata>
                <SChatMessageMetadata sender="assistant">
                  <template #timestamp>
                    <STimestamp value="2026-11-22T14:31:00+08:00" format="time" locale="zh-CN" time-zone="Asia/Shanghai" :tooltip="false" />
                  </template>
                  <template #footer>
                    <SChatMessageActions v-model:feedback="selectedFeedback" :text="summary" label="校对摘要操作" :labels="actions"
                      :actions="['copy', 'retry', 'like', 'dislike']" @retry="refreshSummary" />
                  </template>
                </SChatMessageMetadata>
              </template>
            </SChatMessageBubble>
          </template>
        </SChatMessage>
      </SChatConversation>
      <output aria-label="摘要操作结果"><SMotionText :value="note" wrap /></output>
    </section>
    <section class="chat-message-scenarios" aria-label="系统消息与彩色引用">
      <h3>系统消息与彩色引用</h3>
      <div class="review__row">
        <SButton variant="secondary" size="sm" @click="logIndex = (logIndex + 1) % logUpdates.length">下一条发布事件</SButton>
        <SSwitch v-model="approved">引用已核对</SSwitch>
      </div>
      <SChatSystemMessage variant="divider" text="11 月 22 日" />
      <SChatSystemMessage :text="logUpdates[logIndex].text" :icon="logUpdates[logIndex].icon" announce />
      <SChatSystemMessage>
        <template #icon><SAvatar name="发布工作区" initials="发" size="sm" :tooltip="false" /></template>
        附件保存在发布工作区。
      </SChatSystemMessage>
      <SChatSystemMessage variant="divider">复核记录</SChatSystemMessage>
      <SChatMessage message-role="system" :role-labels="roles">
        <template #bubbles>
          <SChatMessageBubble>
            <SChatTokenizedText text="@校对组 与 @校对 已检查 #范围。请查看 #核对。" :tokens="tokens" />
          </SChatMessageBubble>
        </template>
      </SChatMessage>
    </section>
  </template>

  <section v-else class="chat-message-scenarios" aria-label="带代码与附件的完整消息列表">
    <h3>带代码与附件的完整消息列表</h3>
    <SChatConversation height="36rem" initial-position="start" label="日期格式交接记录" content-width="36rem">
      <SChatSystemMessage variant="divider" text="今天" />
      <SChatMessage message-role="user" :role-labels="roles">
        <template #bubbles>
          <div class="review__row">
            <SChip label="release-date.ts" icon="file" /><SChip label="time-zones.md" icon="file" />
          </div>
          <SChatMessageBubble>
            归档记录能否统一使用北京时间？
            <template #metadata>
              <SChatMessageMetadata sender="user" timestamp="14:40" datetime="2026-11-22T14:40:00+08:00" status="read" :status-labels="receiptLabels" />
            </template>
          </SChatMessageBubble>
        </template>
      </SChatMessage>
      <SChatMessage :role-labels="roles" show-avatar>
        <template #bubbles>
          <SChatMessageBubble name="校对助手" group="first">
            <SMarkdown source="显示日期时统一使用工作区的 **时区设置**。" density="compact" />
          </SChatMessageBubble>
          <SChatMessageBubble variant="ghost" group="middle" width="26rem">
            <SCodeBlock label="日期格式示例" language="typescript" :code="releaseCode" wrap copy-label="复制日期示例" />
            <template #metadata><SChatMessageMetadata timestamp="14:41" datetime="2026-11-22T14:41:00+08:00" /></template>
          </SChatMessageBubble>
          <SChatMessageBubble group="last">
            <SMarkdown source="存档仍保存原始时间，只在界面上应用格式。" density="compact" />
          </SChatMessageBubble>
        </template>
      </SChatMessage>
      <SChatSystemMessage icon="file" text="校对助手分享了一段代码" />
      <SChatMessage message-role="user" :role-labels="roles" source="按此方式更新发布文档。" time="14:42"
        datetime="2026-11-22T14:42:00+08:00" delivery="delivered" :delivery-labels="receiptLabels" />
    </SChatConversation>
  </section>
</template>

<style scoped>
.chat-message-scenarios { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sy-space-3); min-inline-size: 0; }
.chat-message-scenarios h3 { margin: 0; font-size: 1rem; }
</style>
