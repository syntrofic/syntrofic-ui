<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'nativescript-vue'
import {
  SNativeButton, SNativeCheckbox, SNativeControlField, SNativeDescription, SNativeFocusGroup, SNativeInputGroup,
  SNativeInputOTP, SNativeLabel, SNativeMotionText, SNativeRadioGroup,
  SNativeSearchField, SNativeSwitch, SNativeTextArea,
  type NativeCheckState, type NativeRadioOption, type NativeRadioValue,
} from '@syntrofic/ui-native'
import SNativeRadio from '@syntrofic/ui-native/radio'
import type { ReviewID } from './review-items'

defineProps<{ id: ReviewID }>()

const budget = ref('120')
const query = ref('')
const result = ref('')
const code = ref('')
const invalid = ref(false)
const masked = ref(false)
const note = ref('')
const selected = ref<NativeCheckState>('mixed')
const enabled = ref(true)
const confirmation = ref<NativeCheckState>(false)
const frequency = ref<NativeRadioValue>()
const individual = ref(false)
const format = ref<NativeRadioValue>('design')
const selection = useTemplateRef<InstanceType<typeof SNativeRadioGroup>>('selection')
const options: readonly NativeRadioOption[] = [
  { value: 'now', label: '即时发送', description: '每次完成同步时收到通知。' },
  { value: 'daily', label: '每日汇总' },
  { value: 'weekly', label: '每周汇总', disabled: true },
]
const notesLength = computed(() => String(note.value.length))

function verify(code: string) {
  invalid.value = code.length !== 6
  result.value = invalid.value ? '请填满 6 位验证码' : '验证码已输入'
}
</script>

<template>
  <SNativeFocusGroup v-if="id === 'N.input-group'">
    <SNativeLabel text="素材预算" marginBottom="4" />
    <SNativeInputGroup v-model="budget" label="素材预算" keyboardType="decimal">
      <template #prefix><SNativeDescription text="¥" marginLeft="8" /></template>
      <template #suffix><SNativeDescription text="CNY" marginRight="8" /></template>
    </SNativeInputGroup>
    <SNativeInputGroup
      label="发票备注"
      placeholder="可选"
      variant="filled"
      marginTop="8"
    />
  </SNativeFocusGroup>

  <StackLayout v-else-if="id === 'N.search-field'">
    <SNativeSearchField
      v-model="query"
      label="搜索项目"
      placeholder="输入项目名称"
      clearLabel="清除搜索"
      @search="result = $event ? `已搜索「${$event}」` : ''"
      @clear="result = ''"
    />
    <SNativeMotionText :value="result" minHeight="24" marginTop="6" announce />
  </StackLayout>

  <StackLayout v-else-if="id === 'N.input-otp'">
    <SNativeLabel text="邮箱验证码" marginBottom="4" />
    <SNativeInputOTP
      v-model="code"
      label="邮箱验证码"
      hint="输入 6 位数字"
      :splitAt="3"
      :mask="masked"
      :invalid="invalid"
      @update:model-value="invalid = false; result = ''"
      @complete="verify"
    />
    <SNativeSwitch v-model="masked" label="隐藏验证码" marginTop="6" />
    <SNativeButton label="验证" size="sm" marginTop="6" @tap="verify(code)" />
    <SNativeMotionText :value="result" minHeight="24" marginTop="6" announce />
  </StackLayout>

  <StackLayout v-else-if="id === 'N.text-area'">
    <SNativeLabel text="项目说明" marginBottom="4" />
    <SNativeTextArea
      v-model="note"
      label="项目说明"
      placeholder="记录交付要点"
      :rows="3"
      :maxRows="6"
      :maxLength="120"
    />
    <StackLayout orientation="horizontal" marginTop="4">
      <SNativeMotionText :value="notesLength" :reserve="3" />
      <SNativeDescription text="/120" verticalAlignment="middle" />
    </StackLayout>
  </StackLayout>

  <StackLayout v-else-if="id === 'N.checkbox'">
    <SNativeCheckbox v-model="selected" label="选择全部素材" mixedLabel="部分选中" />
    <SNativeCheckbox :model-value="true" label="封面图" disabled />
    <SNativeCheckbox label="源文件" />
  </StackLayout>

  <StackLayout v-else-if="id === 'N.switch'">
    <SNativeSwitch v-model="enabled" label="接收同步提醒" description="同步完成后发送通知。" />
    <SNativeSwitch label="紧急提醒" disabled />
  </StackLayout>

  <StackLayout v-else-if="id === 'N.control-field'">
    <SNativeControlField
      v-model="confirmation"
      kind="checkbox"
      label="确认可发布"
      description="同一行内的说明和选择区域均可点按。"
    />
    <SNativeControlField
      :model-value="true"
      kind="switch"
      label="发送副本"
      readonly
    />
  </StackLayout>

  <StackLayout v-else-if="id === 'N.radio-group'">
    <SNativeRadioGroup
      ref="selection"
      v-model="frequency"
      label="通知频率"
      :items="options"
      required
      requiredMessage="请选择通知频率。"
    />
    <SNativeButton label="保存频率" size="sm" marginTop="6" @tap="selection?.check()" />
  </StackLayout>

  <StackLayout v-else-if="id === 'N.export.radio'">
    <SNativeRadioGroup v-model="format" label="交付包" orientation="horizontal">
      <SNativeRadio optionValue="design" label="设计" />
      <SNativeRadio optionValue="source" label="源文件" />
    </SNativeRadioGroup>
    <SNativeRadio v-model="individual" label="默认用于下次交付" marginTop="6" />
  </StackLayout>
</template>
