<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SCheckbox, SCheckboxGroup, SForm, SFormLayout, SInput, SMotionText, SSegment, SSelect, STextArea } from '../src'

const layout = ref<'vertical' | 'horizontal-labels'>('horizontal-labels')
const layoutOptions = [{ value: 'horizontal-labels', label: '标签在左侧' }, { value: 'vertical', label: '标签在上方' }]
const region = ref('east')
const regions = [{ value: 'east', label: '华东' }, { value: 'north', label: '华北' }, { value: 'south', label: '华南' }]
const visibilityOptions = [{ value: 'team', label: '团队可见' }, { value: 'private', label: '仅自己' }]
const visibility = ref('team')
const channels = ref<readonly string[]>(['email'])
const summary = ref('')
function submit(_: SubmitEvent, data: FormData) {
  const scope = visibilityOptions.find(item => item.value === data.get('visibility'))?.label
  const notifications = data.getAll('channel').map(channel => channel === 'email' ? '邮件' : '站内通知')
  summary.value = [data.get('project'), scope, ...notifications].filter(Boolean).join(' · ')
}
</script>

<template>
  <div class="review__stack layout-review">
    <section class="review__stack" aria-label="账号信息">
      <h3>账号信息</h3>
      <SFormLayout data-demo-layout="account">
        <SInput label="账号名称" autocomplete="username" model-value="studio-lin" />
        <SInput label="联系邮箱" type="email" autocomplete="email" model-value="lin@example.com" />
        <STextArea label="个人简介" :rows="2" />
      </SFormLayout>
    </section>
    <section class="review__stack" aria-label="姓名并排输入">
      <h3>姓名</h3>
      <SFormLayout layout="horizontal" data-demo-layout="names">
        <SInput label="姓氏" autocomplete="family-name" model-value="林" />
        <SInput label="名字" autocomplete="given-name" model-value="舟" />
      </SFormLayout>
    </section>
    <section class="review__stack" aria-label="工作区设置">
      <h3>工作区设置</h3>
      <SSegment :model-value="layout" label="标签位置" :items="layoutOptions"
        @update:model-value="layout = $event === 'vertical' ? 'vertical' : 'horizontal-labels'" />
      <SFormLayout :layout="layout" label-width="minmax(7rem, 1fr)" data-demo-layout="settings">
        <SInput label="工作区名称" model-value="品牌工作室" />
        <SInput label="工作区代号" model-value="brand-studio" label-tooltip="代号用于工作区链接。"
          label-tooltip-label="工作区代号说明" description="可使用小写字母和连字符。" />
        <SSelect v-model="region" label="数据区域" :options="regions" />
      </SFormLayout>
    </section>
    <section class="review__stack" aria-label="收件地址">
      <h3>收件地址</h3>
      <SFormLayout data-demo-layout="address">
        <SInput label="街道地址" autocomplete="address-line1" />
        <SFormLayout layout="horizontal">
          <SInput label="城市" autocomplete="address-level2" />
          <SInput label="省份" autocomplete="address-level1" />
          <SInput label="邮政编码" autocomplete="postal-code" inputmode="numeric" />
        </SFormLayout>
      </SFormLayout>
    </section>
    <section class="review__stack" aria-label="项目通知设置">
      <h3>项目通知设置</h3>
      <SForm @submit="submit" @reset="summary = ''">
        <SFormLayout>
          <SInput label="通知项目" name="project" required model-value="品牌素材" />
          <SSelect v-model="visibility" label="通知范围" name="visibility" :options="visibilityOptions" />
          <SCheckboxGroup v-model="channels" label="通知方式" name="channel">
            <SCheckbox value="email">邮件</SCheckbox>
            <SCheckbox value="inbox">站内通知</SCheckbox>
          </SCheckboxGroup>
          <div class="review__row">
            <SButton size="sm" type="submit">保存通知设置</SButton>
            <SButton size="sm" variant="secondary" type="reset">恢复默认设置</SButton>
          </div>
          <output aria-label="已保存的通知设置"><SMotionText :value="summary" /></output>
        </SFormLayout>
      </SForm>
    </section>
  </div>
</template>

<style scoped>
.layout-review { gap: var(--sy-space-5); }
.layout-review > section { inline-size: 100%; min-inline-size: 0; justify-items: stretch; }
.layout-review h3 { margin: 0 0 var(--sy-space-2); }
.layout-review :deep(.sy-segment) { justify-self: start; }
</style>
