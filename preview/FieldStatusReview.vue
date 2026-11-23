<script setup lang="ts">
import { ref, useId } from 'vue'
import { SCheckbox, SDatePicker, SFieldStatus, SFileInput, SInput, SInputGroup, SNumberField, STextArea, type FieldStatus } from '../src'

const fieldVariant = ref<FieldStatus['variant']>('tooltip')
const message = '请填写工作邮箱。'
const confirmed = ref(false)
const reviewId = 'review-confirm-status-' + useId()
</script>

<template>
  <section class="review__stack" aria-label="表单状态呈现">
    <label>验证反馈方式
      <select v-model="fieldVariant">
        <option value="tooltip">提示</option>
        <option value="attached">附着</option>
        <option value="detached">独立</option>
      </select>
    </label>
    <SInput label="工作邮箱" type="email" :status="{ type: 'error', variant: fieldVariant, message, label: '工作邮箱提示', live: 'off' }" />
    <SInputGroup :status="{ type: 'warning', variant: 'tooltip', message: '项目代号将在归档中显示。', label: '代号输入提示' }">
      <SInput aria-label="项目代号" :status="{ type: 'info', variant: 'tooltip', message: '代号备用提示', label: '备用提示' }" />
    </SInputGroup>
    <STextArea label="交接说明" :status="{ type: 'warning', variant: 'detached', message: '请补充交接人。', live: 'off' }" />
    <SNumberField label="交付数量" :status="{ type: 'success', message: '数量在预算内。', live: 'off' }" />
    <SDatePicker label="交付日期" :status="{ type: 'error', variant: 'tooltip', message: '请选择工作日。', label: '日期输入提示' }" />
    <SFileInput label="附件" browse-label="选择交接文件" :status="{ type: 'info', variant: 'tooltip', message: '请上传 PDF 文件。', label: '文件输入提示' }" />
  </section>
  <section class="review__stack" aria-label="交付确认">
    <SCheckbox v-model="confirmed" :aria-describedby="reviewId" :aria-invalid="!confirmed || undefined">已核对交付文件</SCheckbox>
    <SFieldStatus :id="reviewId" variant="detached" :type="confirmed ? 'success' : 'error'"
      :message="confirmed ? '交付文件已核对。' : '发布前请确认文件清单。'" live="off" />
  </section>
</template>
