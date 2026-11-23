<script setup lang="ts">
import { computed, ref } from 'vue'
import { SButton, SChatMessage, SChatMessageActions, SChatSource, SChatSources, SChatTool, SChatToolGroup, SMotionText } from '../src'
import type { ChatMessageFeedback, ChatSourceInfo, ChatToolInfo, ChatToolState } from '../src'
import chartFavicon from './assets/delivery-area.png'
import ReferenceScenariosReview from './ReferenceScenariosReview.vue'
import ChatToolCallScenariosReview from './ChatToolCallScenariosReview.vue'

defineProps<{ id: string }>()
const labels = { copy: '复制', copied: '已复制', 'copy-error': '复制失败', like: '有帮助', dislike: '没帮助', retry: '重试', share: '分享' }
const response = '已核对交付清单。其中 12 份文件已通过核对，另有两份需补充签名。'
const feedback = ref<ChatMessageFeedback>(null)
const actionNote = ref('')
const roles = { assistant: '助手', user: '你', system: '系统' }

const handbook: ChatSourceInfo = {
  id: 'handbook', title: '交付手册', href: 'https://kb.syntrofic.com/?id=20261120144442-j5v9ov3',
  description: '包括文件命名、复核范围和归档位置。', newWindow: true,
}
const checklist: ChatSourceInfo = { id: 'checklist', type: 'document', title: '复核清单.pdf', actionable: true }
const chart: ChatSourceInfo = {
  id: 'chart', title: '每日交付量', href: '/?component=WP.area-chart', faviconUrl: chartFavicon,
  description: '按日汇总使用规范和源文件的交付数量。',
}
const sources = [handbook, checklist, chart]
const openedSource = ref(false)

const states = {
  'input-streaming': '准备参数', 'input-available': '等待结果', 'output-available': '已完成',
  'output-error': '未完成', 'requires-action': '等待确认',
}
const actionState = ref<ChatToolState>('requires-action')
const actionTool = computed<ChatToolInfo>(() => ({
  id: 'archive', toolName: '登记交付归档', state: actionState.value, input: { 项目: '交付材料', 保留原始文件: true },
  output: { 归档编号: 'D-034', 文件: 12 }, errorText: '登记已取消，原始文件仍可查看。',
}))
const group: ChatToolInfo[] = [
  { id: 'count', toolName: '核对材料数量', state: 'output-available', input: { 版本: 'R2' }, output: { 已通过: 12, 待补签: 2 } },
  { id: 'signed', toolName: '读取文件签名', state: 'output-error', errorText: '签名文件尚未上传。' },
]
const collected = ref(false)
const liveTool = computed<ChatToolInfo>(() => ({
  toolName: '查找待复核材料', state: collected.value ? 'input-available' : 'input-streaming',
  argsText: collected.value ? '{"目录": "交付/待复核"}' : '{"目录": "交付/',
}))
</script>

<template>
  <section v-if="id === 'WP.chat-message-actions'" class="review-chat-review review-chat-actions">
    <SChatMessage :role-labels="roles" :source="response" author="交付校对">
      <template #actions>
        <SChatMessageActions v-model:feedback="feedback" :text="response" label="回复操作" :labels="labels"
          :actions="['copy', 'like', 'dislike', 'retry', 'share']"
          @retry="actionNote = '已请求重新核对。'" @share="actionNote = '已打开分享入口。'">
          <template #end><SButton variant="ghost" size="sm" @click="actionNote = '已记录这条回复。'">记录</SButton></template>
        </SChatMessageActions>
      </template>
    </SChatMessage>
    <p class="review-chat-action-note" role="status"><SMotionText :value="actionNote" /></p>
    <SChatMessage message-role="user" :role-labels="roles" source="列出仍需签名的文件。">
      <template #actions>
        <SChatMessageActions text="列出仍需签名的文件。" label="提问操作" :labels="labels" :actions="['copy']" />
      </template>
    </SChatMessage>
  </section>

  <section v-else-if="id === 'WP.chat-source'" class="review-chat-review review-chat-citations">
    <SChatMessage :role-labels="roles" source="归档前请核对文件数量和命名。下面是这次复核用过的材料。"
      author="交付校对" />
    <div class="review-chat-citations__inline">
      <SChatSource :source="handbook" />
      <SChatSource :source="checklist" document-label="归档文件" @activate="openedSource = !openedSource">
        <template #preview><p>核对签名、文件名称和交付批次。</p></template>
      </SChatSource>
    </div>
    <p class="review-chat-action-note" role="status"><SMotionText :value="openedSource ? '已选中复核清单。' : ''" /></p>
    <SChatSources :sources="sources" title="查看引用" label="复核引用" document-label="归档文件" stack-favicons :format-count="count => `${count} 项`">
      <template #source="{ source }">
        <SChatSource :source="source" @activate="item => { if (item.id === checklist.id) openedSource = !openedSource }" />
      </template>
    </SChatSources>
    <ReferenceScenariosReview kind="citation" />
  </section>

  <section v-else class="review-chat-review review-chat-tools">
    <SChatTool :tool="liveTool" :state-labels="states" input-label="输入参数" default-open />
    <SButton size="sm" variant="secondary" @click="collected = !collected">切换参数状态</SButton>
    <SChatTool :tool="actionTool" :state-labels="states" input-label="输入参数" output-label="归档结果"
      approve-label="确认登记" reject-label="取消登记" approval-text="确认后会登记本次交付。"
      @approve="actionState = 'output-available'" @reject="actionState = 'output-error'" />
    <SChatToolGroup :tools="group" :state-labels="states" input-label="输入参数" output-label="复核结果" title="复核工具" />
    <ChatToolCallScenariosReview />
  </section>
</template>
