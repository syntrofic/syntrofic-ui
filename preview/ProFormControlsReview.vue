<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { SButton, SCheckboxButtonGroup, SDropZone, SMotionText, SNumberStepper, SRadioButtonGroup, type DropZoneFileState, type DropZoneRejection } from '../src'

defineProps<{ id: string }>()
const subscriptions = [
  { value: 'design', label: '设计动态', description: '设计文件和规范更新' },
  { value: 'product', label: '产品简报', description: '每周发布与功能改动' },
  { value: 'security', label: '安全公告', description: '由组织统一订阅', disabled: true },
]
const deliveries = [
  { value: 'digital', label: '电子交付', description: '发送下载链接' },
  { value: 'paper', label: '纸质邮寄', description: '寄送至工作地址' },
  { value: 'self', label: '前台自取', description: '本周暂不可选', disabled: true },
]
const channels = ref<readonly string[]>(['design'])
const delivery = ref('digital')
const output = ref('')
const guests = ref(9)
const speed = ref(1.25)
const seats = ref(2)
const uploads = ref<File[]>([])
const states = ref(new Map<File, DropZoneFileState>())
const timers = new Map<File, ReturnType<typeof setInterval>>()
const errors = { type: '类型不支持', size: '超过文件大小限制', limit: '达到文件数量上限', directory: '请选择文件' }

function fileErrors(entries: readonly DropZoneRejection[]) {
  return entries.map(entry => `${entry.name} · ${errors[entry.reason]}`).join('，')
}

function formatStatus(state: DropZoneFileState) {
  if (state.status === 'complete') return '已上传'
  if (state.status === 'failed') return '上传失败'
  return `上传中 ${state.progress ?? 0}%`
}

function finishTimer(file: File) {
  clearInterval(timers.get(file))
  timers.delete(file)
}

function startUpload(file: File, canFail: boolean) {
  finishTimer(file)
  states.value.set(file, { status: 'uploading', progress: 0 })
  let progress = 0
  timers.set(file, setInterval(() => {
    progress = Math.min(100, progress + 16)
    const failed = canFail && file.name.startsWith('retry-') && progress === 48
    const status = failed ? 'failed' : progress === 100 ? 'complete' : 'uploading'
    states.value.set(file, { status, progress })
    if (status !== 'uploading') finishTimer(file)
  }, 125))
}

function removeUpload(file: File) {
  finishTimer(file)
  states.value.delete(file)
}

onBeforeUnmount(() => { for (const timer of timers.values()) clearInterval(timer) })

function save(event: SubmitEvent) {
  const data = new FormData(event.currentTarget as HTMLFormElement)
  const topics = data.getAll('channels').map(key => subscriptions.find(option => option.value === key)?.label)
  const method = deliveries.find(option => option.value === data.get('delivery'))?.label
  const transfer = data.getAll('attachments').flatMap(file => typeof file === 'string' || !file.name ? [] : [file.name])
  output.value = method ? `已保存 ${method}`
    : topics.length ? `已订阅 ${topics.join('、')}`
    : `已登记 ${transfer.join('、')}`
}
</script>

<template>
  <form v-if="id === 'WP.checkbox-button-group'" class="pro-form-review" @submit.prevent="save" @reset="output = ''">
    <SCheckboxButtonGroup v-model="channels" name="channels" label="订阅内容" :options="subscriptions" layout="grid"
      description="可同时选择多项。" required required-message="至少选择一项订阅。" />
    <SCheckboxButtonGroup label="接收方式" :model-value="['email']" disabled appearance="pill" :indicator="false"
      :options="[{ value: 'email', label: '电子邮件' }, { value: 'inbox', label: '站内通知' }]" />
    <div class="review__row">
      <SButton type="submit" size="sm">保存订阅</SButton>
      <SButton type="reset" size="sm" variant="secondary">恢复初始值</SButton>
    </div>
    <p class="review__result"><SMotionText :value="output" announce /></p>
  </form>
  <form v-else-if="id === 'WP.radio-button-group'" class="pro-form-review" @submit.prevent="save" @reset="output = ''">
    <SRadioButtonGroup v-model="delivery" name="delivery" label="交付方式" :options="deliveries"
      layout="stack" effect="ripple" required>
      <template #indicator>✓</template>
    </SRadioButtonGroup>
    <SRadioButtonGroup label="付款周期" model-value="annual" appearance="pill"
      :options="[{ value: 'monthly', label: '按月' }, { value: 'annual', label: '按年' }]" :indicator="false" />
    <div class="review__row">
      <SButton type="submit" size="sm">保存交付方式</SButton>
      <SButton type="reset" size="sm" variant="secondary">恢复初始值</SButton>
    </div>
    <p class="review__result"><SMotionText :value="output" announce /></p>
  </form>
  <form v-else-if="id === 'WP.number-stepper'" class="pro-form-review pro-form-review--stepper" @reset="output = ''">
    <SNumberStepper v-model="guests" name="guests" label="访客人数" :min="1" :max="50" :reserve="3"
      decrease-label="减少人数" increase-label="增加人数" />
    <SNumberStepper v-model="speed" name="speed" size="sm" label="播放倍速" :min=".25" :max="2" :step=".25"
      :format-options="{ minimumFractionDigits: 2 }" reversed decrease-label="减慢速度" increase-label="加快速度">
      <template #value="{ text }"><SMotionText :value="text" motion="roll" />×</template>
    </SNumberStepper>
    <SNumberStepper v-model="seats" label="保留名额" size="lg" :min="0" :reserve="3" disabled
      decrease-label="减少名额" increase-label="增加名额" />
    <div class="review__row"><SButton type="reset" size="sm" variant="secondary">重置数字</SButton></div>
  </form>
  <form v-else class="pro-form-review" @submit.prevent="save">
    <SDropZone v-model="uploads" label="拖放文件" description="PNG、JPEG 或 PDF。最多 3 个，单个不超过 2 MB。"
      browse-label="选择文件" accept="image/png,image/jpeg,.pdf" name="attachments" multiple :max-files="3" :max-size="2_000_000"
      :format-rejections="fileErrors" :get-file-state="file => states.get(file)" :format-file-state="formatStatus"
      :remove-label="file => '移除 ' + file.name" :retry-label="file => '重试 ' + file.name" remove-text="移除" retry-text="重试" required
      @accept="files => files.forEach(file => startUpload(file, true))" @remove="removeUpload" @retry="startUpload($event, false)" />
    <SDropZone label="归档附件" description="已归档记录保留原始附件。" browse-label="选择归档附件" disabled compact />
    <div class="review__row"><SButton type="submit" size="sm">登记附件</SButton></div>
    <p class="review__result"><SMotionText :value="output" announce /></p>
  </form>
</template>
