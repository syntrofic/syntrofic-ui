<script lang="ts">
export interface DemoPayment {
  method: 'card' | 'wallet'
  number: string
  holder: string
  month: string
  year: string
  code: string
  walletConfirmed: boolean
}
export const emptyDemoPayment = (): DemoPayment => ({ method: 'card', number: '', holder: '', month: '', year: '', code: '', walletConfirmed: false })
</script>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { SButton, SCheckbox, SInput, SRadio, SRadioGroup } from '../src'

defineProps<{ disabled?: boolean }>()
const model = defineModel<DemoPayment>({ required: true })
const ready = defineModel<boolean>('ready')
const yearInput = useTemplateRef<InstanceType<typeof SInput>>('yearInput')
const demoNumber = '4242 4242 4242 4242'
const number = computed(() => model.value.number.replace(/\s/g, ''))
const expiration = computed(() => {
  if (!/^(0?[1-9]|1[0-2])$/.test(model.value.month) || !/^20\d{2}$/.test(model.value.year)) return false
  const today = new Date()
  return Number(model.value.year) * 12 + Number(model.value.month) >= today.getFullYear() * 12 + today.getMonth() + 1
})
const expired = computed(() => Boolean(model.value.month && model.value.year) && !expiration.value)
const cardReady = computed(() => number.value === demoNumber.replace(/\s/g, '') && Boolean(model.value.holder.trim())
  && expiration.value && /^\d{3}$/.test(model.value.code))
watch(() => model.value.method === 'wallet' ? model.value.walletConfirmed : cardReady.value, value => { ready.value = value }, { immediate: true })
watch([yearInput, expired], ([field, invalid]) => field?.input?.setCustomValidity(invalid ? '请输入有效的测试卡有效期。' : ''), { flush: 'post' })

function update<Key extends keyof DemoPayment>(key: Key, value: DemoPayment[Key] | undefined) {
  if (value !== undefined) model.value = { ...model.value, [key]: value }
}

function fillSample() {
  model.value = { ...model.value, number: demoNumber, holder: '林舟', month: '12', year: String(new Date().getFullYear() + 1), code: '123' }
}
</script>

<template>
  <div class="demo-payment">
    <SRadioGroup :model-value="model.method" name="payment-method" aria-label="演示付款渠道" :disabled="disabled"
      @update:model-value="update('method', $event === 'wallet' ? 'wallet' : 'card')">
      <SRadio value="card">测试银行卡</SRadio>
      <SRadio value="wallet">演示钱包</SRadio>
    </SRadioGroup>
    <template v-if="model.method === 'card'">
      <SButton variant="secondary" size="sm" :disabled="disabled" @click="fillSample">使用演示付款方式</SButton>
      <div class="demo-payment__details">
        <SInput :model-value="model.number" class="demo-payment__wide" name="demo-card-number" label="测试卡号"
          :description="demoNumber" inputmode="numeric" autocomplete="off" pattern="4242 ?4242 ?4242 ?4242" maxlength="19"
          :disabled="disabled" required @update:model-value="update('number', $event)" />
        <SInput :model-value="model.holder" class="demo-payment__wide" name="demo-card-holder" label="测试持卡人"
          autocomplete="off" :disabled="disabled" required @update:model-value="update('holder', $event)" />
        <SInput :model-value="model.month" name="demo-card-month" label="月份" inputmode="numeric" pattern="0?[1-9]|1[0-2]"
          maxlength="2" autocomplete="off" :disabled="disabled" required @update:model-value="update('month', $event)" />
        <SInput ref="yearInput" :model-value="model.year" name="demo-card-year" label="年份" inputmode="numeric" pattern="20[0-9]{2}"
          maxlength="4" autocomplete="off" :error="expired ? '请输入有效的测试卡有效期。' : undefined"
          :disabled="disabled" required @update:model-value="update('year', $event)" />
        <SInput :model-value="model.code" name="demo-card-code" label="测试安全码" inputmode="numeric" pattern="[0-9]{3}"
          maxlength="3" autocomplete="off" :disabled="disabled" required @update:model-value="update('code', $event)" />
      </div>
    </template>
    <SCheckbox v-else :model-value="model.walletConfirmed" name="demo-wallet-confirmed" :disabled="disabled" required
      @update:model-value="update('walletConfirmed', $event)">确认使用本地演示钱包</SCheckbox>
  </div>
</template>

<style scoped>
.demo-payment, .demo-payment__details { display: grid; gap: var(--sy-space-2); min-width: 0; }
.demo-payment > button { justify-self: start; }
.demo-payment__details { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.demo-payment__wide { grid-column: 1 / -1; }
</style>
