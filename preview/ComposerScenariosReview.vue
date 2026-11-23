<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  SButton, SChatAttachment, SChatComposerDrawer, SChatDictationButton, SChatSendButton, SChip, SDropdown, SIcon, SMotionText,
  SProgressBar, SPromptInput, SSegment, SSwitch,
  type PromptFeedback, type PromptPayload, type PromptRunStatus,
} from '../src'
import chartPreview from './assets/delivery-area.png'

defineProps<{ kind: 'prompt' | 'drawer' }>()
const draft = ref('')
const files = ref<File[]>([])
const status = ref<PromptRunStatus>('ready')
const feedback = ref<PromptFeedback>()
const result = ref('')
const model = ref('自动')
const offline = ref(false)
const nearLimit = ref(false)
const flat = ref(false)
const agree = ref<string | null>(null)
const imageAttached = ref(true)
const simpleResult = ref('')
const iconResult = ref('')
const iconStatus = ref<PromptRunStatus>('ready')
const labels = {
  send: '发送交付消息', stop: '停止生成交付摘要', resend: '重试交付消息',
  attach: '选择交付附件', submitted: '正在发送交付消息', streaming: '正在生成交付摘要',
}
const choices = [
  { id: 'auto', label: '自动' },
  { id: 'quick', label: '快速浏览' },
  { id: 'complete', label: '逐项复核' },
]
const confirmation = [
  { value: 'yes', label: '确认交付' },
  { value: 'change', label: '需要调整' },
]
const context = computed(() => nearLimit.value ? 92 : Math.min(80, 18 + files.value.length * 8 + Math.floor(draft.value.length / 4)))
const notice = computed<PromptFeedback | undefined>(() => feedback.value ?? (context.value > 90
  ? { type: 'warning', message: '上下文已使用 92%，可移除附件或缩短草稿。' } : undefined))
let stream: ReturnType<typeof setTimeout> | undefined
let finish: ReturnType<typeof setTimeout> | undefined

function cancelTimers() {
  clearTimeout(stream)
  clearTimeout(finish)
}
function send(payload: PromptPayload) {
  cancelTimers()
  feedback.value = undefined
  status.value = 'submitted'
  result.value = ''
  stream = setTimeout(() => {
    if (offline.value) {
      status.value = 'error'
      feedback.value = { type: 'error', message: '发布服务暂时不可用，草稿已保留。' }
      return
    }
    status.value = 'streaming'
    finish = setTimeout(() => {
      status.value = 'ready'
      result.value = payload.text ? '已发送：' + payload.text : `已发送 ${payload.files.length} 个附件`
      draft.value = ''
      files.value = []
    }, 2800)
  }, 650)
}
function stop() {
  cancelTimers()
  status.value = 'ready'
  result.value = '已停止生成，草稿仍可编辑。'
}
function setModel(id: string) {
  const selection = choices.find(item => item.id === id)
  if (selection) model.value = selection.label
}
onMounted(() => {
  files.value = ['组件复核.txt', '发布清单.csv', '素材说明.md'].map(name => new File(['交付工作区示例'], name, { type: 'text/plain' }))
})
onBeforeUnmount(cancelTimers)
</script>

<template>
  <div class="composer-scenarios">
    <section v-if="kind === 'prompt'" class="composer-scenarios__section" aria-label="简洁消息编辑器">
      <h3>简洁消息</h3>
      <SPromptInput label="填写简短消息" placeholder="补充交付备注" layout="compact" variant="flat" :allow-attachments="false"
        :labels="{ send: '发送简短消息' }" @submit="simpleResult = $event.text" />
      <output aria-label="已发简短消息"><SMotionText :value="simpleResult" wrap /></output>
    </section>

    <section class="composer-scenarios__section" aria-label="完整交付编辑器">
      <h3>带上下文的交付消息</h3>
      <div class="review__row">
        <SSwitch v-model="flat">平面输入框</SSwitch>
        <SSwitch v-model="nearLimit">接近上下文上限</SSwitch>
      </div>
      <SPromptInput v-model="draft" v-model:files="files" label="交付消息正文" placeholder="输入交付要求"
        :variant="flat ? 'flat' : 'primary'" :status="status" :feedback="notice" :feedback-position="feedback ? 'top' : 'bottom'"
        :show-attachments="false" :clear-on-submit="false" :labels="labels" :max-files="8"
        :format-file-rejections="entries => entries.map(item => item.name + ' 无法添加').join('、')"
        @submit="send" @stop="stop">
        <template #drawer="{ files: attached, remove, disabled }">
          <SChatComposerDrawer v-if="attached.length" :count="attached.length" label="交付消息附件">
            <SChip v-for="file in attached" :key="file.name + file.lastModified + file.size" :label="file.name"
              icon="file" removable :disabled="disabled" :remove-label="'从草稿移除 ' + file.name" @remove="remove(file)" />
          </SChatComposerDrawer>
        </template>
        <template #headerActions="{ attach, disabled }">
          <SButton size="sm" variant="ghost" :disabled="disabled" @click="draft += (draft ? ' ' : '') + '@校对组 '">
            <template #start><SIcon name="users" size="sm" /></template>提及校对组
          </SButton>
          <SButton size="sm" variant="ghost" :disabled="disabled" @click="attach">
            <template #start><SIcon name="plus" size="sm" /></template>添加交付附件
          </SButton>
        </template>
        <template #headerContext>
          <SProgressBar :value="context" :show-value="false" label="上下文使用率" />
        </template>
        <template #toolbarStart="{ disabled }">
          <div class="review__row">
            <SDropdown label="选择复核方式" :disabled="disabled" :items="choices" @action="setModel">
              <template #trigger>
                <SButton variant="secondary" size="sm" aria-label="选择复核方式"><SMotionText :value="model" /></SButton>
              </template>
            </SDropdown>
            <SDropdown label="交付设置" :disabled="disabled" @action="offline = !offline"
              :items="[{ id: 'offline', label: offline ? '恢复连接' : '模拟连接中断' }]" />
          </div>
        </template>
        <template #sendActions="{ disabled }">
          <SChatDictationButton size="sm" locale="zh-CN" label="听写交付要求" stop-label="停止听写交付要求" :disabled="disabled"
            @transcript="(text, final) => { if (final) draft += (draft ? ' ' : '') + text.trim() }" />
        </template>
      </SPromptInput>
      <output aria-label="交付消息状态"><SMotionText :value="result" wrap /></output>
    </section>

    <section v-if="kind === 'drawer'" class="composer-scenarios__section" aria-label="审核回复与附件预览">
      <h3>审核回复与附件预览</h3>
      <SChatComposerDrawer>
        <SChatAttachment v-if="imageAttached" :attachment="{ id: 'chart', name: '交付量预览.png', kind: 'image', src: chartPreview, alt: '交付量面积图' }"
          class="composer-scenarios__image" locale="zh-CN" removable remove-label="移除预览" @remove="imageAttached = false" />
        <SButton v-else variant="secondary" size="sm" @click="imageAttached = true">恢复预览</SButton>
        <SChip label="检查记录.csv" icon="file" />
      </SChatComposerDrawer>
      <SChatComposerDrawer :count="1" label="等待审核回复" default-collapsed>
        <SSegment v-model="agree" label="审核回复" :items="confirmation" />
        <output aria-label="审核决定"><SMotionText :value="confirmation.find(item => item.value === agree)?.label ?? ''" /></output>
      </SChatComposerDrawer>
    </section>

    <section v-else class="composer-scenarios__section" aria-label="独立发送与停止按钮">
      <h3>发送与停止</h3>
      <div class="review__row">
        <SChatSendButton :can-send="false" send-label="草稿为空" />
        <SChatSendButton send-label="发送默认图标" @send="iconResult = '默认发送按钮已触发'" />
        <SChatSendButton :status="iconStatus" send-label="提交审核" stop-label="中止审核"
          @send="iconStatus = 'streaming'; iconResult = '正在审核'" @stop="iconStatus = 'ready'; iconResult = '已中止审核'">
          <template #sendIcon><SIcon name="check" size="sm" /></template>
          <template #stopIcon><SIcon name="close" size="sm" /></template>
        </SChatSendButton>
      </div>
      <output aria-label="发送按钮状态"><SMotionText :value="iconResult" /></output>
    </section>
  </div>
</template>

<style scoped>
.composer-scenarios, .composer-scenarios__section { display: grid; gap: var(--sy-space-3); min-inline-size: 0; }
.composer-scenarios__section { padding: var(--sy-space-3); border: 1px solid var(--sy-border); border-radius: var(--sy-radius-md); }
.composer-scenarios__section h3 { margin: 0; font-size: 1rem; }
.composer-scenarios__section output { overflow-wrap: anywhere; }
.composer-scenarios__section :deep(.sy-prompt-input__header-context) { flex: 1 0 7rem; max-inline-size: 12rem; }
.composer-scenarios__image { inline-size: min(10rem, 100%); }
</style>
