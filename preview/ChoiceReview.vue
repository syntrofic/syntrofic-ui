<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { SBadge, SButton, SCard, SCheckbox, SCheckboxGroup, SForm, SIcon, SMotionText, SRadio, SRadioGroup, SSwitch } from '../src'
import type { FieldStatus } from '../src'

defineProps<{ kind: 'checkbox' | 'checkbox-group' | 'switch' | 'radio' }>()

const includeMetadata = ref(false)
const permission = ref(false)
const notifications = ref(true)
const digest = ref(false)
const labelsFirst = ref(true)
const labelPosition = computed(() => labelsFirst.value ? 'start' : 'end')
const archive = ref(true)
const repository = ref('team')
const delivery = ref<string>()
const attemptedDelivery = ref(false)
const result = ref('')
const listId = 'review-choice-' + useId()
const resources = [
  { id: 'design', label: '设计更新', description: '每周汇总组件库和视觉规范的变更。', badge: '每周', disabled: false },
  { id: 'product', label: '产品公告', description: '收到影响交付计划的新功能通知。', badge: '按需', disabled: false },
  { id: 'engineering', label: '工程公告', description: '此渠道由工作区管理员管理。', badge: '内部', disabled: true },
]
const topics = ref<readonly string[]>(['design'])
const available = resources.filter(resource => !resource.disabled).map(resource => resource.id)
const allSelected = computed(() => available.every(value => topics.value.includes(value)))
const mixed = computed(() => !allSelected.value && available.some(value => topics.value.includes(value)))
const approvedStatus = computed<FieldStatus>(() => permission.value
  ? { type: 'success', message: '已确认可随简报交付这些资料。' }
  : { type: 'error', message: '请先确认已取得资料使用授权。' })
const deliveryStatus = computed<FieldStatus | undefined>(() => attemptedDelivery.value && !delivery.value
  ? { type: 'error', message: '请选择一种交付方式。' }
  : undefined)

function selectEvery(value: boolean | undefined) {
  topics.value = [...topics.value.filter(id => !available.includes(id)), ...(value ? available : [])]
}

function pause(signal: AbortSignal) {
  return new Promise<void>(resolve => {
    const timer = setTimeout(resolve, 525)
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
  })
}

async function saveDigest(checked: boolean, _event: Event, signal: AbortSignal) {
  await pause(signal)
  if (!signal.aborted) result.value = checked ? '已订阅每周简报' : '已取消每周简报'
}

async function saveTopics(values: readonly string[], _event: Event, signal: AbortSignal) {
  await pause(signal)
  if (!signal.aborted) result.value = `已保存 ${values.length} 个订阅渠道`
}

function submitDelivery(_event: SubmitEvent, data: FormData) {
  result.value = data.get('delivery') === 'mail' ? '已安排邮件交付' : '已安排工作区交付'
}
</script>

<template>
  <section v-if="kind === 'checkbox'" class="review__choice" aria-label="复选框状态">
    <SCheckbox v-model="includeMetadata" description="让评审者查看版本来源和创建日期。">包括文件信息</SCheckbox>
    <SCheckbox disabled disabled-message="供应商合同仅对法务团队开放。" description="合同会保留在私有目录。">供应商合同</SCheckbox>
    <SCheckbox :model-value="true" read-only size="sm" description="设为模板后将始终包含。">包括清单首页</SCheckbox>
    <SCheckbox :model-value="allSelected" :indeterminate="mixed" :aria-controls="listId" @update:model-value="selectEvery">
      选中所有附件
    </SCheckbox>
    <SCheckboxGroup :id="listId" v-model="topics" label="交付附件" density="compact" dividers>
      <SCheckbox value="design">设计说明</SCheckbox>
      <SCheckbox value="product">交付记录</SCheckbox>
    </SCheckboxGroup>
    <SForm @submit="result = '资料通过校验'">
      <SCheckbox v-model="permission" name="permission" :status="approvedStatus">
        <template #start><SIcon name="file" size="sm" /></template>
        确认资料使用授权
      </SCheckbox>
      <SCheckbox :status="{ type: 'warning', message: '外部评审者只能查看当前版本。', variant: 'detached' }">允许外部评审</SCheckbox>
      <SButton size="sm" type="submit">验证资料</SButton>
    </SForm>
    <SMotionText :value="result" announce />
  </section>

  <section v-else-if="kind === 'checkbox-group'" class="review__choice" aria-label="分组复选框">
    <SForm @submit="result = '已提交订阅设置'">
      <SCheckbox :model-value="allSelected" :indeterminate="mixed" :aria-controls="listId" @update:model-value="selectEvery">全选可用渠道</SCheckbox>
      <SCheckboxGroup :id="listId" v-model="topics" label="订阅内容" description="选择希望接收的消息。"
        name="topics" required required-message="请至少选择一种消息。" dividers density="balanced" :change-action="saveTopics">
        <SCheckbox v-for="item in resources" :key="item.id" :value="item.id" :description="item.description" :disabled="item.disabled">
          {{ item.label }}<template #end><SBadge>{{ item.badge }}</SBadge></template>
        </SCheckbox>
      </SCheckboxGroup>
      <div class="review__row"><SButton size="sm" type="submit">提交订阅</SButton><SButton size="sm" type="reset" variant="secondary">恢复默认</SButton></div>
    </SForm>
    <SMotionText :value="result" announce />
  </section>

  <section v-else-if="kind === 'switch'" class="review__choice" aria-label="开关状态">
    <SCheckbox v-model="labelsFirst" size="sm">标签在开关前</SCheckbox>
    <SCard>
      <template #header><strong>通知偏好</strong></template>
      <div class="review__choice">
        <SSwitch v-model="notifications" :label-position="labelPosition" label-spacing="spread" description="有新的文件需要评审时发送邮件。">邮件提醒</SSwitch>
        <SSwitch v-model="digest" :label-position="labelPosition" label-spacing="spread" size="sm" :change-action="saveDigest"
          description="在工作周结束时汇总全部更新。" label-tooltip="简报通常在周五下班前发送。">每周简报</SSwitch>
        <SSwitch disabled disabled-message="仅组织管理员可以启用外部共享。" :label-position="labelPosition" label-spacing="spread"
          description="允许组织外的用户访问共享项目。">外部共享</SSwitch>
      </div>
    </SCard>
    <SSwitch v-model="archive" :status="archive ? { type: 'success', message: '归档副本已启用。' } : { type: 'warning', message: '关闭后只保留当前版本。' }">
      保留归档副本
    </SSwitch>
    <SSwitch :status="{ type: 'error', message: '目标空间不可用，请联系管理员。' }">跨空间同步</SSwitch>
    <SMotionText :value="result" announce />
  </section>

  <section v-else class="review__choice" aria-label="单选列表">
    <SRadioGroup v-model="repository" label="可见范围" description="决定谁可以查看交付资料。" name="visibility" orientation="horizontal">
      <SRadio value="team" description="工作区的所有成员。">团队可见</SRadio>
      <SRadio value="private" description="仅你和明确邀请的人。">仅自己</SRadio>
      <SRadio value="public" disabled description="由管理员设置。">公开</SRadio>
    </SRadioGroup>
    <SForm @invalid.capture="attemptedDelivery = true" @submit="submitDelivery">
      <SRadioGroup v-model="delivery" label="交付方式" name="delivery" required dividers density="spacious"
        description="两种方式均会发送交付记录。" required-message="请选择一种交付方式。" :status="deliveryStatus">
        <SRadio value="workspace" description="将文件加入团队的交付目录。">
          <template #start><SIcon name="file" size="sm" /></template>工作区交付
          <template #end><SBadge tone="success">免费</SBadge></template>
        </SRadio>
        <SRadio value="mail" description="为客户发送一份带收件确认的摘要。">
          邮件交付<template #end><strong>¥15</strong></template>
        </SRadio>
      </SRadioGroup>
      <SButton size="sm" type="submit">确认交付</SButton>
    </SForm>
    <SMotionText :value="result" announce />
  </section>
</template>
