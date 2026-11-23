<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { SFieldLabel, SInput, STextField, type FieldStatus } from '../src'
import I18nProvider from '../src/rac/I18nProvider.vue'

defineProps<{ kind: 'field' | 'label' }>()

const id = 'field-demo-' + useId()
const email = ref('')
const alias = ref('admin')
const key = ref('syn_demo')
const emailStatus = computed<FieldStatus | undefined>(() => {
  const address = email.value.trim()
  if (!address) return undefined
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
    ? { type: 'success', message: '邮箱格式正确。' }
    : { type: 'error', message: '请输入完整的邮箱地址。' }
})
const aliasStatus = computed<FieldStatus | undefined>(() => alias.value.trim().toLowerCase() === 'admin'
  ? { type: 'warning', message: 'admin 通常留给系统账户。', live: 'off' }
  : undefined)
const keyStatus = computed<FieldStatus | undefined>(() => key.value.startsWith('syn_')
  ? { type: 'success', message: '密钥前缀正确。', live: 'off' }
  : key.value ? { type: 'error', message: '密钥应以 syn_ 开头。', variant: 'detached', live: 'off' } : undefined)
</script>

<template>
  <I18nProvider class="review__stack field-scenarios" locale="zh-CN" :messages="{ 'field.optional': '选填' }">
    <template v-if="kind === 'field'">
      <STextField label="工作邮箱" required description-placement="label"
        description="发送交付确认和访问通知。" :status="emailStatus">
        <SInput v-model="email" name="email" type="email" autocomplete="email" placeholder="name@example.com" />
      </STextField>
      <div class="review__columns">
        <STextField label="显示名称" required><SInput autocomplete="name" placeholder="林舟" /></STextField>
        <STextField label="备用联系方式" optional description-placement="label" description="跨地区电话请包含国家区号。">
          <SInput type="tel" autocomplete="tel" />
        </STextField>
      </div>
      <div class="review__columns">
        <STextField label="项目代号" :status="aliasStatus"><SInput v-model="alias" /></STextField>
        <STextField label="交付密钥" :status="keyStatus"><SInput v-model="key" autocomplete="off" /></STextField>
      </div>
    </template>
    <template v-else>
      <div class="review__stack" style="gap: 6px">
        <SFieldLabel :for="id + '-email'" label="项目联系人" required />
        <SInput :id="id + '-email'" type="email" autocomplete="email" required placeholder="name@example.com" />
      </div>
      <div class="review__stack" style="gap: 6px">
        <SFieldLabel :for="id + '-phone'" label="电话" optional description="请包含国家或地区代码。" />
        <SInput :id="id + '-phone'" :aria-describedby="id + '-phone-description'" type="tel" autocomplete="tel" />
      </div>
      <div class="review__stack" style="gap: 6px">
        <SFieldLabel :for="id + '-key'" label="接口密钥" icon="lock" tooltip="在工作区的开发者设置中生成密钥。" tooltip-label="接口密钥说明" />
        <SInput :id="id + '-key'" autocomplete="off" />
      </div>
      <div class="review__stack" style="gap: 6px">
        <SFieldLabel :for="id + '-id'" label="工作区 ID" disabled />
        <SInput :id="id + '-id'" model-value="studio-024" disabled />
      </div>
    </template>
  </I18nProvider>
</template>

<style scoped>
.field-scenarios { justify-items: stretch; gap: var(--sy-space-3); min-inline-size: 0; }
.field-scenarios > .review__stack { justify-items: stretch; }
</style>
